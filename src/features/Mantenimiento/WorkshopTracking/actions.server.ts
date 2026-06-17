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
import { getSupervisorFilterInfo } from '../utils/supervisorFilter';

const logger = new Logger('WorkshopTracking/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Statuses shown in workshop tracking */
const WORKSHOP_TRACKING_STATUSES: string[] = [
  'in_workshop',
  'pending_workshop_validation',
  'pending_operations_validation',
  'operations_rejected',
  'workshop_rejected',
  'completed',
];

/** Campos reales de maintenance_orders ordenables server-side */
const VALID_SORT_FIELDS = new Set([
  'order_number',
  'created_at',
  'workshop_entry_date',
  'status',
  // FK columns via FK_SORT_MAP
  'vehicle',
]);

/** Mapeo de columnId → orderBy de Prisma para columnas FK */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
};

/** Params de URL que NO son filtros de la tabla */
const IGNORED_PARAMS = new Set(['tab', 'subtab', 'operations_subtab', 'taller_subtab', 'config_subtab']);

/** Columnas de texto libre de maintenance_orders (filtradas con buildTextFiltersWhere) */
const TEXT_COLUMNS = ['order_number'];

/** Columnas con filtro de texto libre en vehicles */
const VEHICLE_TEXT_FILTER_COLUMNS = ['domain', 'serie', 'intern_number'];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['workshop_entry_date', 'created_at'];

/** Mapping de columnId (URL) → campo real en Prisma */
const COLUMN_MAP: Record<string, string> = {
  vehicle: 'equipment_id',
  status: 'status',
};

/** Select común con todas las relaciones resueltas para el tracking */
const WORKSHOP_TRACKING_SELECT = {
  id: true,
  order_number: true,
  status: true,
  workshop_entry_date: true,
  created_at: true,
  kilometer_at_entry: true,
  engine_hours_at_entry: true,
  description: true,
  // FK: vehicle
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
      kilometer: true,
      condition: true,
    },
  },
  // Solicitud vinculada (fallback de descripción)
  maintenance_requests: {
    select: {
      id: true,
      description: true,
    },
  },
  // Items con sectores, work orders y repairs (para "Recorrido Sectores" y progreso)
  maintenance_order_items: {
    select: {
      id: true,
      assigned_sector_id: true,
      sector_sequence_order: true,
      is_diagnostico: true,
      workshop_sectors: {
        select: {
          id: true,
          name: true,
        },
      },
      work_orders: {
        select: {
          id: true,
          order_number: true,
          status: true,
          work_order_items: {
            select: {
              id: true,
              maintenance_order_item_id: true,
              status: true,
              work_order_item_repairs: {
                select: {
                  id: true,
                  status: true,
                  repair_type_id: true,
                },
              },
            },
          },
        },
      },
    },
  },
};

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Construye el WHERE base para workshop tracking.
 * Muestra órdenes en todos los estados relevantes de taller.
 * Aplica filtro de supervisor: si el usuario no tiene view_all_requests,
 * solo ve órdenes donde él es supervisor de la solicitud.
 */
async function buildBaseWhere(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const supervisorFilter = await getSupervisorFilterInfo();
  const searchWhere = buildSearchWhere(state.search, ['order_number']);

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...TEXT_COLUMNS,
      ...VEHICLE_TEXT_FILTER_COLUMNS,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      'vehicle', // manejado manualmente (FK)
      'description', // manejado manualmente (OR order/solicitud)
    ],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // ─── Filtro vehicle (FK UUID → equipment_id) ────────────────────────────
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

  // ─── Filtros de texto en campos de vehicles ──────────────────────────────
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

  // ─── Filtro de texto de descripción del pedido (order o solicitud) ───────
  const descriptionValues = state.filters['description'];
  if (descriptionValues?.length && typeof descriptionValues[0] === 'string') {
    const term = descriptionValues[0];
    vehicleTextConditions.push({
      OR: [
        { description: { contains: term, mode: 'insensitive' } },
        { maintenance_requests: { description: { contains: term, mode: 'insensitive' } } },
      ],
    });
  }

  // ─── Condiciones AND para casos mixtos ───────────────────────────────────
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

  // ─── Filtro supervisor: si no tiene view_all_requests, solo ve las suyas ──
  const supervisorCondition: Record<string, unknown> = {};
  if (supervisorFilter?.shouldFilterBySupervisor) {
    supervisorCondition.maintenance_requests = {
      supervisor_id: supervisorFilter.userId,
    };
  }

  return {
    status: { in: WORKSHOP_TRACKING_STATUSES },
    vehicles: { company_id: companyId },
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...vehicleFilter,
    ...supervisorCondition,
    ...(extraAndConditions.length > 0 ? { AND: extraAndConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getWorkshopTrackingPaginated(searchParams: DataTableSearchParams) {
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

    // Más reciente primero por defecto
    const safeOrderBy = [...resolvedSorts, { created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.maintenance_orders.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: WORKSHOP_TRACKING_SELECT,
      }),
      prisma.maintenance_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener seguimiento de taller paginado', { data: { error } });
    throw new Error('Error al obtener el seguimiento de taller');
  }
}

export type WorkshopTrackingListItem = Awaited<ReturnType<typeof getWorkshopTrackingPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllWorkshopTrackingForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const where = await buildBaseWhere(companyId, state);

    const data = await prisma.maintenance_orders.findMany({
      orderBy: [{ created_at: 'desc' }],
      where,
      select: WORKSHOP_TRACKING_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar seguimiento de taller', { data: { error } });
    throw new Error('Error al exportar el seguimiento de taller');
  }
}

// ============================================================================
// FACETS (con cross-filtering)
// ============================================================================

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro.
 */
export async function getWorkshopTrackingFacets(searchParams?: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  const supervisorFilter = await getSupervisorFilterInfo();

  // Filtro supervisor: si no tiene view_all_requests, solo ve las suyas
  const supervisorCondition: Record<string, unknown> = {};
  if (supervisorFilter?.shouldFilterBySupervisor) {
    supervisorCondition.maintenance_requests = {
      supervisor_id: supervisorFilter.userId,
    };
  }

  const baseWhere = {
    status: { in: WORKSHOP_TRACKING_STATUSES },
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

  async function crossWhere(excludeColumn: string): Promise<typeof baseWhere & Record<string, unknown>> {
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
    const [crossWhereStatus, crossWhereVehicle, crossWhereEntryDate, crossWhereCreatedAt] = await Promise.all([
      crossWhere('status'),
      crossWhere('vehicle'),
      crossWhere('workshop_entry_date'),
      crossWhere('created_at'),
    ]);

    const [statusCounts, vehicleCounts] = await Promise.all([
      prisma.maintenance_orders.groupBy({
        by: ['status'],
        where: crossWhereStatus,
        _count: { _all: true },
      }),
      prisma.maintenance_orders.groupBy({
        by: ['equipment_id'],
        where: crossWhereVehicle,
        _count: { _all: true },
      }),
    ]);

    // Resolver nombres de vehículos para el filtro
    const vehicleIds = vehicleCounts.map((r) => r.equipment_id).filter(Boolean) as string[];
    const vehicleOptions =
      vehicleIds.length > 0
        ? await prisma.vehicles.findMany({
            where: { id: { in: vehicleIds } },
            select: { id: true, domain: true, serie: true, intern_number: true },
            orderBy: { domain: 'asc' },
          })
        : [];

    // Usamos crossWhere params para date range (no agrupamos fechas, solo se usan para cross-filter)
    void crossWhereEntryDate;
    void crossWhereCreatedAt;

    return {
      status: toFacetMap(statusCounts.map((r) => ({ key: r.status, count: r._count._all }))),
      vehicle: toFacetMap(vehicleCounts.map((r) => ({ key: r.equipment_id, count: r._count._all }))),
      vehicleOptions,
    };
  } catch (error) {
    logger.error('Error al obtener facets de seguimiento de taller', { data: { error } });
    return null;
  }
}

export type WorkshopTrackingFacets = Awaited<ReturnType<typeof getWorkshopTrackingFacets>>;
