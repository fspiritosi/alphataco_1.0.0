'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildSearchWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';
import { getSupervisorFilterInfo } from '../utils/supervisorFilter';

const logger = new Logger('PendientesEjecutar/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

const PENDING_EXECUTION_STATUSES = ['pending_scheduling', 'scheduled'];

const VALID_SORT_FIELDS = new Set(['created_at', 'scheduled_date', 'vehicle']);

const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
};

const IGNORED_PARAMS = new Set(['tab', 'subtab', 'operations_subtab', 'taller_subtab', 'config_subtab']);

const VEHICLE_TEXT_FILTER_COLUMNS = ['domain', 'serie', 'intern_number'];

const DATE_RANGE_COLUMNS = ['created_at', 'scheduled_date'];

const COLUMN_MAP: Record<string, string> = {
  status: 'status',
  vehicle: 'equipment_id',
  condition: 'condition',
};

const PENDING_EXECUTION_SELECT = {
  id: true,
  status: true,
  scheduled_date: true,
  created_at: true,
  order_number: true,
  description: true,
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
      condition: true,
    },
  },
  maintenance_requests: {
    select: {
      id: true,
      kilometer: true,
      engine_hours: true,
      created_at: true,
      source: true,
      preventive_type: true,
      description: true,
      supervisor_id: true,
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
// INTERNAL HELPERS
// ============================================================================

async function buildBaseWhere(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const supervisorFilter = await getSupervisorFilterInfo();

  const searchWhere = buildSearchWhere(state.search, ['order_number']);

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...VEHICLE_TEXT_FILTER_COLUMNS,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      'condition',
      'vehicle',
      'description',
    ],
  });

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // Filtro vehicle (FK UUID -> equipment_id)
  const vehicleFilter: Record<string, unknown> = {};
  const vehicleValues = state.filters['vehicle'];
  if (vehicleValues?.length) {
    const hasNull = vehicleValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // caso mixto: manejado en extraAndConditions
    } else if (hasNull) {
      vehicleFilter.equipment_id = null;
    } else {
      vehicleFilter.equipment_id = { in: realValues };
    }
  }

  // Filtros de texto en campos de vehicles
  const vehicleTextConditions: Record<string, unknown>[] = [];
  const domainValues = state.filters['domain'];
  const serieValues = state.filters['serie'];
  const internNumberValues = state.filters['intern_number'];

  if (domainValues?.length && typeof domainValues[0] === 'string') {
    vehicleTextConditions.push({ vehicles: { domain: { contains: domainValues[0], mode: 'insensitive' } } });
  }
  if (serieValues?.length && typeof serieValues[0] === 'string') {
    vehicleTextConditions.push({ vehicles: { serie: { contains: serieValues[0], mode: 'insensitive' } } });
  }
  if (internNumberValues?.length && typeof internNumberValues[0] === 'string') {
    vehicleTextConditions.push({
      vehicles: { intern_number: { contains: internNumberValues[0], mode: 'insensitive' } },
    });
  }

  // Filtro condition (campo en vehicles)
  const conditionFilter: Record<string, unknown> = {};
  const conditionValues = state.filters['condition'];
  if (conditionValues?.length) {
    const hasNull = conditionValues.includes(NULL_FILTER_VALUE);
    const realValues = conditionValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // caso mixto
    } else if (hasNull) {
      conditionFilter.vehicles = { condition: null };
    } else {
      conditionFilter.vehicles = { condition: { in: realValues } };
    }
  }

  const extraAndConditions: Record<string, unknown>[] = [...vehicleTextConditions];

  // Filtro text de descripción del pedido (order o solicitud vinculada)
  const descriptionValues = state.filters['description'];
  if (descriptionValues?.length && typeof descriptionValues[0] === 'string') {
    const term = descriptionValues[0];
    extraAndConditions.push({
      OR: [
        { description: { contains: term, mode: 'insensitive' } },
        { maintenance_requests: { description: { contains: term, mode: 'insensitive' } } },
      ],
    });
  }

  if (vehicleValues?.length) {
    const hasNull = vehicleValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [{ equipment_id: { in: realValues } }, { equipment_id: null }],
      });
    }
  }

  if (conditionValues?.length) {
    const hasNull = conditionValues.includes(NULL_FILTER_VALUE);
    const realValues = conditionValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [{ vehicles: { condition: { in: realValues } } }, { vehicles: { condition: null } }],
      });
    }
  }

  const supervisorCondition: Record<string, unknown> = {};
  if (supervisorFilter?.shouldFilterBySupervisor) {
    supervisorCondition.maintenance_requests = {
      supervisor_id: supervisorFilter.userId,
    };
  }

  return {
    status: { in: PENDING_EXECUTION_STATUSES },
    vehicles: { company_id: companyId },
    ...searchWhere,
    ...filtersWhere,
    ...dateFiltersWhere,
    ...vehicleFilter,
    ...conditionFilter,
    ...supervisorCondition,
    ...(extraAndConditions.length > 0 ? { AND: extraAndConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getPendingExecutionOrdersPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const { skip, take } = stateToPrismaParams(state);
    const where = await buildBaseWhere(companyId, state);

    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }

    // scheduled primero (s > d alfabeticamente desc), luego scheduled_date asc
    const safeOrderBy = [...resolvedSorts, { status: 'desc' as const }, { scheduled_date: 'asc' as const }];

    const [data, total] = await Promise.all([
      prisma.maintenance_orders.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: PENDING_EXECUTION_SELECT,
      }),
      prisma.maintenance_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener pedidos pendientes de ejecucion paginados', { data: { error } });
    throw new Error('Error al obtener los pedidos pendientes de ejecutar');
  }
}

export type PendingExecutionListItem = Awaited<ReturnType<typeof getPendingExecutionOrdersPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginacion)
// ============================================================================

export async function getAllPendingExecutionOrdersForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const where = await buildBaseWhere(companyId, state);

    const data = await prisma.maintenance_orders.findMany({
      orderBy: [{ status: 'desc' }, { scheduled_date: 'asc' }],
      where,
      select: PENDING_EXECUTION_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar pedidos pendientes de ejecucion', { data: { error } });
    throw new Error('Error al exportar los pedidos pendientes de ejecutar');
  }
}

// ============================================================================
// FACETS (con cross-filtering)
// ============================================================================

export async function getPendingExecutionFacets(searchParams?: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  const supervisorFilter = await getSupervisorFilterInfo();

  const supervisorCondition: Record<string, unknown> = {};
  if (supervisorFilter?.shouldFilterBySupervisor) {
    supervisorCondition.maintenance_requests = {
      supervisor_id: supervisorFilter.userId,
    };
  }

  const baseWhere = {
    status: { in: PENDING_EXECUTION_STATUSES },
    vehicles: { company_id: companyId },
    ...supervisorCondition,
  };

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete parsedState.filters[key];
    }
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  async function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) return baseWhere;
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildBaseWhere(companyId, modified);
  }

  function toFacetMap(rows: { key: string | null | undefined; count: number }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const { key, count } of rows) {
      if (key == null) {
        map.set(NULL_FILTER_VALUE, (map.get(NULL_FILTER_VALUE) ?? 0) + count);
      } else {
        map.set(String(key), count);
      }
    }
    return map;
  }

  try {
    const [crossWhereVehicle, crossWhereStatus, crossWhereCondition] = await Promise.all([
      crossWhere('vehicle'),
      crossWhere('status'),
      crossWhere('condition'),
    ]);

    const [vehicleCounts, statusCounts, conditionCounts] = await Promise.all([
      prisma.maintenance_orders.groupBy({
        by: ['equipment_id'],
        where: crossWhereVehicle,
        _count: true,
      }),
      prisma.maintenance_orders.groupBy({
        by: ['status'],
        where: crossWhereStatus,
        _count: true,
      }),
      prisma.vehicles.findMany({
        where: {
          maintenance_orders: {
            some: crossWhereCondition,
          },
        },
        select: {
          condition: true,
          _count: { select: { maintenance_orders: true } },
        },
        distinct: ['condition'],
      }),
    ]);

    const vehicleIds = vehicleCounts.map((r) => r.equipment_id).filter(Boolean) as string[];
    const vehicles =
      vehicleIds.length > 0
        ? await prisma.vehicles.findMany({
            where: { id: { in: vehicleIds } },
            select: { id: true, domain: true, serie: true, intern_number: true },
          })
        : [];

    return {
      vehicle: toFacetMap(vehicleCounts.map((r) => ({ key: r.equipment_id, count: r._count }))),
      vehicleOptions: vehicles,
      status: toFacetMap(statusCounts.map((r) => ({ key: r.status, count: r._count }))),
      condition: toFacetMap(
        conditionCounts.map((r) => ({ key: r.condition as string | null, count: r._count.maintenance_orders }))
      ),
    };
  } catch (error) {
    logger.error('Error al obtener facets de pedidos pendientes de ejecucion', { data: { error } });
    return null;
  }
}

export type PendingExecutionFacets = Awaited<ReturnType<typeof getPendingExecutionFacets>>;
