'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildTextFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { prisma } from '@/shared/lib/prisma';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const logger = new Logger('PedidosMantenimiento/Pendientes');

// ── Campos válidos para ordenamiento ──────────────────────────────────────────
// Solo campos REALES de la tabla maintenance_orders
const VALID_SORT_FIELDS = new Set(['status', 'created_at', 'scheduled_date', 'order_number', 'source']);

// ── Columnas de texto con filtro individual ────────────────────────────────────
const TEXT_COLUMNS = ['order_number'];

// ── Select de campos compartido ───────────────────────────────────────────────
const PENDING_ORDER_SELECT = {
  id: true,
  status: true,
  created_at: true,
  scheduled_date: true,
  source: true,
  preventive_type: true,
  order_number: true,
  equipment_id: true,
  maintenance_request_id: true,
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
    },
  },
  maintenance_requests: {
    select: {
      id: true,
      supervisor_id: true,
    },
  },
  _count: {
    select: {
      maintenance_order_items: true,
    },
  },
} as const;

// ── buildWhereClause — Helper DRY compartido ─────────────────────────────────
// Usado por las 3 funciones: paginated, export y facets
function buildWhereClause(
  companyId: string,
  state: ReturnType<typeof parseSearchParams>,
  supervisorId?: string | null
) {
  // Filtros facetados — columnas simples (status y source)
  const filtersWhere = buildFiltersWhere(
    state.filters,
    {
      status: 'status',
      source: 'source',
    },
    { exclude: TEXT_COLUMNS }
  );

  // Filtros de texto por columna individual
  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);

  // Filtros de rango de fecha
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, ['created_at', 'scheduled_date']);

  // Filtro de vehículo (FK por ID)
  const vehicleFilter = state.filters.vehicle?.length ? { equipment_id: { in: state.filters.vehicle } } : {};

  // Búsqueda global: busca en equipo (domain, serie, intern_number) O en nro. pedido
  const searchCondition = state.search
    ? {
        OR: [
          {
            vehicles: {
              OR: [
                { domain: { contains: state.search, mode: 'insensitive' as const } },
                { serie: { contains: state.search, mode: 'insensitive' as const } },
                { intern_number: { contains: state.search, mode: 'insensitive' as const } },
              ],
            },
          },
          { order_number: { contains: state.search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  return {
    // Status base de pendientes (puede ser sobrescrito por filtersWhere.status si el usuario filtra)
    status: { in: ['pending_scheduling', 'scheduled'] },
    // Vehicles con company_id (siempre requerido para aislar la empresa)
    vehicles: { company_id: companyId },
    // Búsqueda global si hay término de búsqueda
    ...searchCondition,
    // Filtro de supervisor si aplica
    ...(supervisorId ? { maintenance_requests: { supervisor_id: supervisorId } } : {}),
    // Filtros del usuario (status sobrescribe el baseWhere si el usuario lo filtra)
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...vehicleFilter,
  };
}

// ── Query paginada ────────────────────────────────────────────────────────────

export async function getPendingOrdersPaginated(searchParams: DataTableSearchParams) {
  const logger_fn = logger;
  logger_fn.debug('Obteniendo pedidos pendientes paginados');

  try {
    const [companyId, filterInfo] = await Promise.all([getServerCompanyId(), getSupervisorFilterInfo()]);

    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    const supervisorId = filterInfo?.shouldFilterBySupervisor ? filterInfo.userId : null;
    const where = buildWhereClause(companyId, state, supervisorId);

    // Ordenamiento validado: pending_scheduling primero, luego scheduled; por created_at ASC
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        resolvedSorts.push({ [s.id]: dir });
      }
    }
    // Default: pending_scheduling antes que scheduled, de más viejo a más reciente
    const safeOrderBy =
      resolvedSorts.length > 0 ? resolvedSorts : [{ status: 'desc' as const }, { created_at: 'asc' as const }];

    const [data, total] = await Promise.all([
      prisma.maintenance_orders.findMany({
        where,
        skip,
        take,
        orderBy: safeOrderBy,
        select: PENDING_ORDER_SELECT,
      }),
      prisma.maintenance_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger_fn.error('Error al obtener pedidos pendientes', { data: { error } });
    throw new Error('No se pudo obtener la lista. Intente nuevamente.');
  }
}

// ── Export completo (sin paginación) ─────────────────────────────────────────

export async function getAllPendingOrdersForExport(searchParams: DataTableSearchParams) {
  logger.debug('Exportando pedidos pendientes');

  try {
    const [companyId, filterInfo] = await Promise.all([getServerCompanyId(), getSupervisorFilterInfo()]);

    const state = parseSearchParams(searchParams);
    const supervisorId = filterInfo?.shouldFilterBySupervisor ? filterInfo.userId : null;
    const where = buildWhereClause(companyId, state, supervisorId);

    return await prisma.maintenance_orders.findMany({
      where,
      orderBy: [{ status: 'desc' as const }, { created_at: 'asc' as const }],
      select: PENDING_ORDER_SELECT,
    });
  } catch (error) {
    logger.error('Error al exportar pedidos pendientes', { data: { error } });
    throw new Error('No se pudo exportar la lista. Intente nuevamente.');
  }
}

// ── Facetas para filtros (counts + opciones FK) ───────────────────────────────
// Implementa crossWhere para filtros precisos con otros filtros activos

export async function getPendingOrdersFacets(searchParams?: DataTableSearchParams) {
  logger.debug('Obteniendo facetas de pedidos pendientes');

  try {
    const [companyId, filterInfo] = await Promise.all([getServerCompanyId(), getSupervisorFilterInfo()]);

    const state = searchParams ? parseSearchParams(searchParams) : null;
    const supervisorId = filterInfo?.shouldFilterBySupervisor ? filterInfo.userId : null;

    // Función helper para construir el where de cross-filtering
    // Excluye el filtro de la columna propia para que los counts sean correctos
    const crossWhere = (excludeColumn: string) => {
      if (!state) {
        return {
          status: { in: ['pending_scheduling', 'scheduled'] },
          vehicles: { company_id: companyId },
          ...(supervisorId ? { maintenance_requests: { supervisor_id: supervisorId } } : {}),
        };
      }
      const stateWithout = {
        ...state,
        filters: Object.fromEntries(Object.entries(state.filters).filter(([key]) => key !== excludeColumn)),
      };
      return buildWhereClause(companyId, stateWithout, supervisorId);
    };

    // Ronda 1: groupBy para counts con cross-filtering
    const whereForStatus = crossWhere('status');
    const whereForVehicle = crossWhere('vehicle');
    const whereForSource = crossWhere('source');

    const [statusCounts, vehicleCounts, sourceCounts] = await Promise.all([
      prisma.maintenance_orders.groupBy({
        by: ['status'],
        where: whereForStatus,
        _count: true,
      }),
      prisma.maintenance_orders.groupBy({
        by: ['equipment_id'],
        where: whereForVehicle,
        _count: true,
      }),
      prisma.maintenance_orders.groupBy({
        by: ['source'],
        where: whereForSource,
        _count: true,
      }),
    ]);

    // Ronda 2: resolver nombres de vehículos solo para los IDs que tienen datos
    const vehicleIds = vehicleCounts.filter((r) => r.equipment_id).map((r) => r.equipment_id);
    const vehicleOptions =
      vehicleIds.length > 0
        ? await prisma.vehicles.findMany({
            where: { id: { in: vehicleIds } },
            select: { id: true, domain: true, serie: true, intern_number: true },
            orderBy: { domain: 'asc' },
          })
        : [];

    return {
      status: new Map(statusCounts.map((r) => [r.status as string, r._count])),
      vehicle: new Map(vehicleCounts.filter((r) => r.equipment_id).map((r) => [r.equipment_id!, r._count])),
      vehicleOptions,
      source: new Map(sourceCounts.filter((r) => r.source != null).map((r) => [r.source as string, r._count])),
    };
  } catch (error) {
    logger.error('Error al obtener facetas de pedidos pendientes', { data: { error } });
    return null;
  }
}

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type PendingOrderListItem = Awaited<ReturnType<typeof getPendingOrdersPaginated>>['data'][number];
export type PendingOrderFacets = Awaited<ReturnType<typeof getPendingOrdersFacets>>;
