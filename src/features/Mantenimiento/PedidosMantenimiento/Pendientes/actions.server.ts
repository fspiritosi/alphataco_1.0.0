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
import { resourceCompanyCondition } from '../../shared/maintenance-resource';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const logger = new Logger('PedidosMantenimiento/Pendientes');

// ── Campos válidos para ordenamiento ──────────────────────────────────────────
// Solo campos REALES de la tabla maintenance_orders
const VALID_SORT_FIELDS = new Set(['status', 'created_at', 'scheduled_date', 'order_number', 'source']);

// ── Columnas de texto con filtro individual ────────────────────────────────────
const TEXT_COLUMNS = ['order_number', 'description'];

// ── Select de campos compartido ───────────────────────────────────────────────
const PENDING_ORDER_SELECT = {
  id: true,
  status: true,
  created_at: true,
  scheduled_date: true,
  source: true,
  preventive_type: true,
  order_number: true,
  description: true,
  equipment_id: true,
  other_equipment_id: true,
  maintenance_request_id: true,
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
    },
  },
  // Ticket 596: el pedido puede ser de un equipamiento en vez de un vehiculo
  other_equipment: {
    select: {
      id: true,
      serial_number: true,
      intern_number: true,
    },
  },
  maintenance_requests: {
    select: {
      id: true,
      supervisor_id: true,
      description: true,
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
  // Excluir 'vehicle' porque se procesa aparte con equipment_id
  const filtersWhere = buildFiltersWhere(
    state.filters,
    {
      status: 'status',
      source: 'source',
    },
    { exclude: [...TEXT_COLUMNS, 'vehicle'] }
  );

  // Filtros de texto por columna individual
  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);

  // Filtros de rango de fecha
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, ['created_at', 'scheduled_date']);

  // Filtro de recurso (FK por ID): el id puede ser de un vehiculo o de un
  // equipamiento (ticket 596), asi que se compara contra las dos columnas.
  const vehicleFilter = state.filters.vehicle?.length
    ? {
        OR: [
          { equipment_id: { in: state.filters.vehicle } },
          { other_equipment_id: { in: state.filters.vehicle } },
        ],
      }
    : {};

  // Búsqueda global: busca en el recurso (vehiculo o equipamiento) O en nro. pedido
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
          {
            other_equipment: {
              OR: [
                { serial_number: { contains: state.search, mode: 'insensitive' as const } },
                { intern_number: { contains: state.search, mode: 'insensitive' as const } },
              ],
            },
          },
          { order_number: { contains: state.search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  return {
    // Status base de pendientes (puede ser sobrescrito por filtersWhere.status si el usuario filtra).
    // Al programar la fecha el pedido pasa directo a 'date_confirmed', por eso ya no
    // existen pedidos en 'scheduled' esperando aprobacion de Operaciones.
    status: 'pending_scheduling',
    // Empresa: vehiculo o equipamiento (ticket 596). Va dentro de AND porque
    // produce un OR y chocaria con el OR de la busqueda global.
    // Busqueda global y filtro de recurso tambien producen OR: los tres van
    // dentro del AND para que ninguno pise a otro.
    AND: [
      resourceCompanyCondition(companyId),
      ...(state.search ? [searchCondition] : []),
      ...(state.filters.vehicle?.length ? [vehicleFilter] : []),
    ],
    // Filtro de supervisor si aplica
    ...(supervisorId ? { maintenance_requests: { supervisor_id: supervisorId } } : {}),
    // Filtros del usuario (status sobrescribe el baseWhere si el usuario lo filtra)
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
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
          status: 'pending_scheduling',
          AND: [resourceCompanyCondition(companyId)],
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
        by: ['equipment_id', 'other_equipment_id'],
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
    // `equipment_id` es nullable desde el ticket 596 (el pedido puede ser de un
    // equipamiento): el filter descarta los null y el guard se lo dice a TypeScript.
    const vehicleIds = vehicleCounts.map((r) => r.equipment_id).filter((id): id is string => id !== null);
    const otherEquipmentIds = vehicleCounts
      .map((r) => r.other_equipment_id)
      .filter((id): id is string => id !== null);

    const [vehicles, otherEquipment] = await Promise.all([
      vehicleIds.length > 0
        ? prisma.vehicles.findMany({
            where: { id: { in: vehicleIds } },
            select: { id: true, domain: true, serie: true, intern_number: true },
            orderBy: { domain: 'asc' },
          })
        : Promise.resolve([]),
      otherEquipmentIds.length > 0
        ? prisma.other_equipment.findMany({
            where: { id: { in: otherEquipmentIds } },
            select: { id: true, serial_number: true, intern_number: true },
            orderBy: { serial_number: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    // Los equipamientos se normalizan a la forma de vehiculo para que el filtro
    // los muestre en la misma lista: su numero de serie ocupa el lugar del dominio.
    const vehicleOptions = [
      ...vehicles,
      ...otherEquipment.map((oe) => ({
        id: oe.id,
        domain: oe.serial_number,
        serie: null as string | null,
        intern_number: oe.intern_number,
      })),
    ];

    return {
      status: new Map(statusCounts.map((r) => [r.status as string, r._count])),
      vehicle: new Map(
        vehicleCounts
          .map((r) => [r.equipment_id ?? r.other_equipment_id, r._count] as const)
          .filter((entry): entry is readonly [string, number] => entry[0] !== null)
      ),
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
