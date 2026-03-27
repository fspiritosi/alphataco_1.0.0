'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const logger = new Logger('PedidosMantenimiento/Confirmados/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos reales de maintenance_orders ordenables server-side */
const VALID_SORT_FIELDS = new Set([
  'created_at',
  'scheduled_date',
  'date_approved_at',
  'order_number',
  // FK columns resueltas via FK_SORT_MAP
  'vehicle',
]);

/** Mapeo de columnId → orderBy de Prisma para columnas FK */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
};

/** Params de URL que NO son filtros de la tabla (tabs, subtabs, etc.) */
const IGNORED_PARAMS = new Set(['tab', 'subtab', 'operations_subtab', 'taller_subtab', 'config_subtab']);

/** Columnas con filtro de texto libre en vehicles */
const VEHICLE_TEXT_FILTER_COLUMNS = ['domain', 'serie', 'intern_number'];

/** Columnas con filtro de texto libre en maintenance_orders */
const TEXT_COLUMNS = ['order_number'];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['created_at', 'scheduled_date', 'date_approved_at'];

/** Mapping de columnId (URL) → campo real en Prisma */
const COLUMN_MAP: Record<string, string> = {
  vehicle: 'equipment_id',
  condition: 'condition', // campo en vehicles, manejado manualmente
  source: 'source', // campo en maintenance_requests, manejado manualmente
};

/** Select común con todas las relaciones resueltas */
const CONFIRMED_ORDERS_SELECT = {
  id: true,
  status: true,
  scheduled_date: true,
  created_at: true,
  date_approved_at: true,
  order_number: true,
  source: true,
  // FK relations
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
      kilometer: true,
      condition: true,
      engine_hours: true,
    },
  },
  maintenance_requests: {
    select: {
      id: true,
      kilometer: true,
      created_at: true,
      source: true,
      supervisor_id: true,
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

/**
 * Construye el WHERE base de mantenimiento confirmado.
 * Solo muestra órdenes con status = 'date_confirmed'.
 */
async function buildBaseWhere(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const supervisorFilter = await getSupervisorFilterInfo();

  const searchWhere = buildSearchWhere(state.search, ['order_number']);

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...VEHICLE_TEXT_FILTER_COLUMNS,
      ...TEXT_COLUMNS,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      'condition', // manejado manualmente (en vehicles)
      'vehicle', // manejado manualmente (FK)
      'source', // manejado manualmente (en maintenance_requests)
    ],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // ─── Filtro vehicle (FK UUID → equipment_id) ─────────────────────────────
  const vehicleFilter: Record<string, unknown> = {};
  const vehicleValues = state.filters['vehicle'];
  if (vehicleValues?.length) {
    const hasNull = vehicleValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // caso mixto: se agrega en AND abajo
    } else if (hasNull) {
      vehicleFilter.equipment_id = null;
    } else {
      vehicleFilter.equipment_id = { in: realValues };
    }
  }

  // ─── Filtros de texto en campos de vehicles ────────────────────────────────
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

  // ─── Filtro condition (campo en vehicles) ─────────────────────────────────
  const conditionFilter: Record<string, unknown> = {};
  const conditionValues = state.filters['condition'];
  if (conditionValues?.length) {
    const hasNull = conditionValues.includes(NULL_FILTER_VALUE);
    const realValues = conditionValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // caso mixto: se agrega en AND abajo
    } else if (hasNull) {
      conditionFilter.vehicles = { condition: null };
    } else {
      conditionFilter.vehicles = { condition: { in: realValues } };
    }
  }

  // ─── Filtro source (campo en maintenance_requests) ────────────────────────
  const sourceFilter: Record<string, unknown> = {};
  const sourceValues = state.filters['source'];
  if (sourceValues?.length) {
    const hasNull = sourceValues.includes(NULL_FILTER_VALUE);
    const realValues = sourceValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // caso mixto: se agrega en AND abajo
    } else if (hasNull) {
      sourceFilter.maintenance_requests = { source: null };
    } else {
      sourceFilter.maintenance_requests = { source: { in: realValues } };
    }
  }

  // ─── Condiciones AND para casos mixtos ────────────────────────────────────
  const extraAndConditions: Record<string, unknown>[] = [...vehicleTextConditions];

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

  if (sourceValues?.length) {
    const hasNull = sourceValues.includes(NULL_FILTER_VALUE);
    const realValues = sourceValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [{ maintenance_requests: { source: { in: realValues } } }, { maintenance_requests: { source: null } }],
      });
    }
  }

  // ─── Filtro supervisor ─────────────────────────────────────────────────────
  const supervisorCondition: Record<string, unknown> = {};
  if (supervisorFilter?.shouldFilterBySupervisor) {
    supervisorCondition.maintenance_requests = {
      supervisor_id: supervisorFilter.userId,
    };
  }

  return {
    status: 'date_confirmed' as const,
    vehicles: { company_id: companyId },
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...vehicleFilter,
    ...conditionFilter,
    ...sourceFilter,
    ...supervisorCondition,
    ...(extraAndConditions.length > 0 ? { AND: extraAndConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getConfirmedOrdersPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const { skip, take } = stateToPrismaParams(state);
    const where = await buildBaseWhere(companyId, state);

    // Safe multi-sort: solo campos válidos
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }

    // Más viejo a más reciente (como en la implementación original)
    const safeOrderBy = [...resolvedSorts, { created_at: 'asc' as const }];

    const [data, total] = await Promise.all([
      prisma.maintenance_orders.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: CONFIRMED_ORDERS_SELECT,
      }),
      prisma.maintenance_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener pedidos confirmados paginados', { data: { error } });
    throw new Error('Error al obtener los pedidos confirmados');
  }
}

export type ConfirmedOrderListItem = Awaited<ReturnType<typeof getConfirmedOrdersPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllConfirmedOrdersForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const where = await buildBaseWhere(companyId, state);

    const data = await prisma.maintenance_orders.findMany({
      orderBy: [{ created_at: 'asc' }],
      where,
      select: CONFIRMED_ORDERS_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar pedidos confirmados', { data: { error } });
    throw new Error('Error al exportar los pedidos confirmados');
  }
}

// ============================================================================
// FACETS (con cross-filtering)
// ============================================================================

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro.
 */
export async function getConfirmedOrdersFacets(searchParams?: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  const supervisorFilter = await getSupervisorFilterInfo();

  const supervisorCondition: Record<string, unknown> = {};
  if (supervisorFilter?.shouldFilterBySupervisor) {
    supervisorCondition.maintenance_requests = {
      supervisor_id: supervisorFilter.userId,
    };
  }

  const baseWhere = {
    status: 'date_confirmed' as const,
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
    const [
      crossWhereVehicle,
      crossWhereCondition,
      crossWhereSource,
      crossWhereScheduledDate,
      crossWhereCreatedAt,
      crossWhereDateApproved,
    ] = await Promise.all([
      crossWhere('vehicle'),
      crossWhere('condition'),
      crossWhere('source'),
      crossWhere('scheduled_date'),
      crossWhere('created_at'),
      crossWhere('date_approved_at'),
    ]);

    const [vehicleCounts, conditionCounts, sourceCounts] = await Promise.all([
      prisma.maintenance_orders.groupBy({
        by: ['equipment_id'],
        where: crossWhereVehicle,
        _count: true,
      }),
      // condition está en vehicles — traemos via findMany
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
      // source está en maintenance_requests — agrupamos via la relación
      prisma.maintenance_requests.groupBy({
        by: ['source'],
        where: {
          maintenance_orders: {
            some: crossWhereSource,
          },
        },
        _count: true,
      }),
    ]);

    // Resolver nombres de vehículos para el filtro
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
      condition: toFacetMap(
        conditionCounts.map((r) => ({ key: r.condition as string | null, count: r._count.maintenance_orders }))
      ),
      source: toFacetMap(sourceCounts.map((r) => ({ key: r.source as string | null, count: r._count }))),
    };
  } catch (error) {
    logger.error('Error al obtener facets de pedidos confirmados', { data: { error } });
    return null;
  }
}

export type ConfirmedOrdersFacets = Awaited<ReturnType<typeof getConfirmedOrdersFacets>>;
