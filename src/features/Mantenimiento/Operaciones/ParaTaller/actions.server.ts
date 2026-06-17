'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import {
  buildDateRangeFiltersWhere,
  buildTextFiltersWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const logger = new Logger('Mantenimiento/ParaTaller/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos de maintenance_orders que se pueden ordenar server-side */
const VALID_SORT_FIELDS = new Set([
  'scheduled_date',
  'created_at',
  'order_number',
  // FK columns (sorted via relation)
  'vehicle',
]);

/** Mapeo de columnId → orderBy de Prisma para columnas FK */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
};

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['scheduled_date', 'created_at'];

/** Columnas de texto con filtro individual */
const TEXT_COLUMNS = ['order_number'];

/** Select común con todas las relaciones resueltas */
const FOR_WORKSHOP_SELECT = {
  id: true,
  status: true,
  scheduled_date: true,
  created_at: true,
  order_number: true,
  equipment_id: true,
  maintenance_request_id: true,
  source: true,
  description: true,
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
      condition: true,
      kilometer: true,
      engine_hours: true,
    },
  },
  maintenance_requests: {
    select: {
      id: true,
      supervisor_id: true,
      source: true,
      preventive_type: true,
      kilometer: true,
      created_at: true,
      description: true,
      profile_maintenance_requests_supervisor_idToprofile: {
        select: { id: true, fullname: true },
      },
    },
  },
  maintenance_order_items: {
    select: {
      id: true,
      maintenance_request_items: {
        select: {
          id: true,
          description: true,
          driver_comment: true,
          supervisor_comment: true,
          validator_comment: true,
          checklist_deviations: {
            select: {
              id: true,
              item_code: true,
              item_label: true,
              section_code: true,
              driver_comment: true,
            },
          },
        },
      },
      types_of_repairs: {
        select: { id: true, name: true },
      },
      maintenance_order_item_repair_types: {
        select: {
          repair_type_id: true,
          types_of_repairs: {
            select: { id: true, name: true },
          },
        },
      },
    },
  },
} as const;

// ============================================================================
// WHERE CLAUSE BUILDER
// ============================================================================

function buildWhereClause(
  companyId: string,
  state: ReturnType<typeof parseSearchParams>,
  supervisorUserId?: string | null,
  excludeColumn?: string
) {
  // Filtros de rango de fechas (scheduled_date y created_at)
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // Filtros de texto individuales (order_number)
  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);

  // Filtro de equipo (vehicle) — faceted con vehicle ID
  const vehicleFilter = excludeColumn !== 'vehicle' ? state.filters['vehicle'] : undefined;

  const andConditions: Record<string, unknown>[] = [];

  // Búsqueda global sobre domain, serie, intern_number del vehículo y N° de pedido
  if (state.search) {
    andConditions.push({
      OR: [
        { vehicles: { domain: { contains: state.search, mode: 'insensitive' } } },
        { vehicles: { serie: { contains: state.search, mode: 'insensitive' } } },
        { vehicles: { intern_number: { contains: state.search, mode: 'insensitive' } } },
        { order_number: { contains: state.search, mode: 'insensitive' } },
      ],
    });
  }

  // Filtro faceted por equipo
  if (vehicleFilter?.length) {
    const hasNull = vehicleFilter.includes(NULL_FILTER_VALUE);
    const realValues = vehicleFilter.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      andConditions.push({
        OR: [{ equipment_id: { in: realValues } }, { equipment_id: null }],
      });
    } else if (hasNull) {
      andConditions.push({ equipment_id: null });
    } else {
      andConditions.push({ equipment_id: { in: realValues } });
    }
  }

  // Filtro de condition del vehículo
  const conditionFilter = excludeColumn !== 'condition' ? state.filters['condition'] : undefined;
  if (conditionFilter?.length) {
    const hasNull = conditionFilter.includes(NULL_FILTER_VALUE);
    const realValues = conditionFilter.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      andConditions.push({
        OR: [{ vehicles: { condition: { in: realValues } } }, { vehicles: { condition: null } }],
      });
    } else if (hasNull) {
      andConditions.push({ vehicles: { condition: null } });
    } else {
      andConditions.push({ vehicles: { condition: { in: realValues } } });
    }
  }

  // Filtro de texto de descripción del pedido (order o solicitud vinculada)
  const descriptionFilter = excludeColumn !== 'description' ? state.filters['description'] : undefined;
  if (descriptionFilter?.length && typeof descriptionFilter[0] === 'string') {
    const term = descriptionFilter[0];
    andConditions.push({
      OR: [
        { description: { contains: term, mode: 'insensitive' } },
        { maintenance_requests: { description: { contains: term, mode: 'insensitive' } } },
      ],
    });
  }

  // Filtro de supervisor — solo ve los propios si no tiene permiso view_all
  if (supervisorUserId) {
    andConditions.push({
      maintenance_requests: {
        supervisor_id: supervisorUserId,
      },
    });
  }

  return {
    status: 'date_confirmed',
    vehicles: {
      company_id: companyId,
    },
    ...dateFiltersWhere,
    ...textFiltersWhere,
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getForWorkshopOrdersPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  const filterInfo = await getSupervisorFilterInfo();
  const supervisorUserId = filterInfo?.shouldFilterBySupervisor ? filterInfo.userId : null;

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    // Multi-sort con FK_SORT_MAP
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }
    const safeOrderBy = resolvedSorts.length > 0 ? resolvedSorts : [{ scheduled_date: 'asc' as const }];

    const where = buildWhereClause(companyId, state, supervisorUserId);

    const [data, total] = await Promise.all([
      prisma.maintenance_orders.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: FOR_WORKSHOP_SELECT,
      }),
      prisma.maintenance_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener pedidos para taller', { data: { error } });
    throw new Error('No se pudo obtener la lista. Intente nuevamente.');
  }
}

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllForWorkshopOrdersForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  const filterInfo = await getSupervisorFilterInfo();
  const supervisorUserId = filterInfo?.shouldFilterBySupervisor ? filterInfo.userId : null;

  try {
    const state = parseSearchParams(searchParams);

    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }
    const safeOrderBy = resolvedSorts.length > 0 ? resolvedSorts : [{ scheduled_date: 'asc' as const }];

    const where = buildWhereClause(companyId, state, supervisorUserId);

    return await prisma.maintenance_orders.findMany({
      where,
      orderBy: safeOrderBy,
      select: FOR_WORKSHOP_SELECT,
    });
  } catch (error) {
    logger.error('Error al exportar pedidos para taller', { data: { error } });
    throw new Error('No se pudo exportar la lista. Intente nuevamente.');
  }
}

// ============================================================================
// FACETS
// ============================================================================

export async function getForWorkshopOrdersFacets(searchParams?: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  const filterInfo = await getSupervisorFilterInfo();
  const supervisorUserId = filterInfo?.shouldFilterBySupervisor ? filterInfo.userId : null;

  try {
    const state = searchParams ? parseSearchParams(searchParams) : parseSearchParams({});

    // crossWhere: construye WHERE excluyendo la columna propia para cross-filtering
    const crossWhere = (excludeColumn: string) => buildWhereClause(companyId, state, supervisorUserId, excludeColumn);

    // Ronda 1: groupBy para counts de vehículos con cross-filtering
    const [vehicleCountsRaw, conditionCountsRaw] = await Promise.all([
      prisma.maintenance_orders.groupBy({
        by: ['equipment_id'],
        where: crossWhere('vehicle'),
        _count: true,
      }),
      prisma.maintenance_orders.findMany({
        where: crossWhere('condition'),
        select: {
          vehicles: { select: { condition: true } },
        },
      }),
    ]);

    // Ronda 2: resolver nombres de vehículos
    const vehicleIds = vehicleCountsRaw.filter((r) => r.equipment_id).map((r) => r.equipment_id);

    const vehicles =
      vehicleIds.length > 0
        ? await prisma.vehicles.findMany({
            where: { id: { in: vehicleIds } },
            select: { id: true, domain: true, serie: true, intern_number: true },
            orderBy: { domain: 'asc' },
          })
        : [];

    // Construir Maps de counts (null → NULL_FILTER_VALUE para consistencia con filterFn)
    const vehicleCounts = new Map<string, number>();
    for (const r of vehicleCountsRaw) {
      const key = r.equipment_id ?? NULL_FILTER_VALUE;
      vehicleCounts.set(key, (vehicleCounts.get(key) ?? 0) + r._count);
    }

    // Contar por condición desde los datos
    const conditionMap = new Map<string, number>();
    for (const row of conditionCountsRaw) {
      const cond = row.vehicles?.condition ?? NULL_FILTER_VALUE;
      conditionMap.set(cond, (conditionMap.get(cond) ?? 0) + 1);
    }

    return {
      vehicleCounts,
      vehicles,
      conditionCounts: conditionMap,
    };
  } catch (error) {
    logger.error('Error al obtener facetas para taller', { data: { error } });
    return null;
  }
}

// ============================================================================
// TYPES
// ============================================================================

export type ForWorkshopOrderListItem = Awaited<ReturnType<typeof getForWorkshopOrdersPaginated>>['data'][number];
export type ForWorkshopOrderFacets = Awaited<ReturnType<typeof getForWorkshopOrdersFacets>>;
