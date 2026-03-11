'use server';

import { Logger } from '@/lib/logger';
import {
  NULL_FILTER_VALUE,
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { CACHE_TAGS, CACHE_TTL } from '@/shared/constants/cache';
import { prisma } from '@/shared/lib/prisma';
import { cacheLife, cacheTag } from 'next/cache';

const logger = new Logger('MaintenanceOrders/table/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos reales de maintenance_orders ordenables server-side */
const VALID_SORT_FIELDS = new Set([
  'order_number',
  'workshop_entry_date',
  'created_at',
  'status',
  // FK columns resueltas via FK_SORT_MAP
  'vehicle',
]);

/** Mapeo de columnId → orderBy de Prisma para columnas FK */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
};

/** Columnas con filtro de texto libre en vehicles */
const VEHICLE_TEXT_FILTER_COLUMNS = ['domain', 'serie', 'intern_number'];

/** Columnas con filtro de texto libre en la tabla principal */
const TEXT_FILTER_COLUMNS = ['order_number'];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['workshop_entry_date', 'created_at'];

/** Params de URL que NO son filtros de la tabla */
const IGNORED_PARAMS = new Set(['tab', 'subtab', 'operations_subtab', 'taller_subtab', 'config_subtab']);

/** Select común con todas las relaciones resueltas */
const MAINTENANCE_ORDERS_SELECT = {
  id: true,
  order_number: true,
  status: true,
  workshop_entry_date: true,
  created_at: true,
  equipment_id: true,
  // FK relations
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
  maintenance_requests: {
    select: {
      id: true,
      kilometer: true,
      created_at: true,
      source: true,
    },
  },
  // Items para calcular progreso y sector actual
  maintenance_order_items: {
    select: {
      id: true,
      assigned_sector_id: true,
      sector_sequence_order: true,
      is_diagnostico: true,
      workshop_sectors: {
        select: { id: true, name: true },
      },
      work_orders: {
        select: {
          id: true,
          order_number: true,
          status: true,
          work_order_items: {
            select: {
              id: true,
              status: true,
              work_order_item_repairs: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

// ============================================================================
// INTERNAL WHERE BUILDER
// ============================================================================

/**
 * Construye el WHERE para maintenance_orders.
 * Solo muestra órdenes con status relevante para el taller.
 * Nota: maintenance_orders no tiene company_id — no se filtra por empresa.
 */
function buildWhereClause(state: ReturnType<typeof parseSearchParams>, options?: { excludeColumn?: string }) {
  const excludeColumn = options?.excludeColumn;

  const cleanFilters = Object.fromEntries(Object.entries(state.filters).filter(([key]) => !IGNORED_PARAMS.has(key)));
  const cleanState = { ...state, filters: cleanFilters };

  const searchWhere = buildSearchWhere(cleanState.search, ['order_number']);

  const filtersState = excludeColumn === 'status' ? { ...cleanState.filters, status: [] } : cleanState.filters;

  const filtersWhere = buildFiltersWhere(
    filtersState,
    {
      status: 'status',
    },
    {
      exclude: [
        ...VEHICLE_TEXT_FILTER_COLUMNS,
        ...TEXT_FILTER_COLUMNS,
        ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
        'vehicle',
        'status',
      ],
    }
  );

  const textFiltersWhere = buildTextFiltersWhere(
    excludeColumn === 'order_number' ? { ...cleanState.filters, order_number: [] } : cleanState.filters,
    TEXT_FILTER_COLUMNS
  );

  const dateFiltersWhere = buildDateRangeFiltersWhere(cleanState.filters, DATE_RANGE_COLUMNS);

  // ─── Filtro status (enum directo) ──────────────────────────────────────────
  const statusValues = excludeColumn === 'status' ? undefined : cleanState.filters['status'];
  const statusWhere: Record<string, unknown> = {};
  if (statusValues?.length) {
    const hasNull = statusValues.includes(NULL_FILTER_VALUE);
    const realValues = statusValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // mixto: incluir null y valores reales — ver abajo en OR conditions
    } else if (hasNull) {
      statusWhere.status = null;
    } else {
      statusWhere.status = { in: realValues };
    }
  }

  // ─── Filtro vehicle (FK UUID → equipment_id) ───────────────────────────────
  const vehicleFilter: Record<string, unknown> = {};
  const vehicleValues = excludeColumn === 'vehicle' ? undefined : cleanState.filters['vehicle'];
  if (vehicleValues?.length) {
    const hasNull = vehicleValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (!hasNull) {
      vehicleFilter.equipment_id = { in: realValues };
    } else if (realValues.length === 0) {
      vehicleFilter.equipment_id = null;
    }
    // hasNull + realValues: caso mixto — se ignora (poco común)
  }

  // ─── Filtros de texto en vehicles (domain, serie, intern_number) ───────────
  const vehicleTextConditions: Record<string, unknown>[] = [];
  if (excludeColumn !== 'domain') {
    const domainVals = cleanState.filters['domain'];
    if (domainVals?.length) {
      vehicleTextConditions.push({ vehicles: { domain: { contains: domainVals[0], mode: 'insensitive' } } });
    }
  }
  if (excludeColumn !== 'serie') {
    const serieVals = cleanState.filters['serie'];
    if (serieVals?.length) {
      vehicleTextConditions.push({ vehicles: { serie: { contains: serieVals[0], mode: 'insensitive' } } });
    }
  }
  if (excludeColumn !== 'intern_number') {
    const internVals = cleanState.filters['intern_number'];
    if (internVals?.length) {
      vehicleTextConditions.push({
        vehicles: { intern_number: { contains: internVals[0], mode: 'insensitive' } },
      });
    }
  }

  // ─── Filtro status directo con valores mixtos ──────────────────────────────
  let statusConditions: Record<string, unknown> = {};
  if (statusValues?.length) {
    const hasNull = statusValues.includes(NULL_FILTER_VALUE);
    const realValues = statusValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // Para maintenance_orders el status nunca es null en la práctica,
      // pero soportamos el patrón
      statusConditions = {};
    } else if (hasNull) {
      statusConditions = { status: null };
    } else {
      statusConditions = { status: { in: realValues } };
    }
  }

  const where: Record<string, unknown> = {
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...vehicleFilter,
    ...statusConditions,
  };

  // Añadir condiciones de texto en vehicles como AND
  if (vehicleTextConditions.length > 0) {
    where.AND = vehicleTextConditions;
  }

  // Filtrar para mostrar solo órdenes relevantes de taller (excluir scheduled/pending_scheduling)
  // pending_workshop_validation se mueve al paso 4 (Aprobaciones)
  // Si ya hay un filtro de status aplicado, NO sobreescribir
  if (!statusValues?.length) {
    where.status = {
      in: ['in_workshop', 'pending_operations_validation', 'operations_rejected', 'workshop_rejected', 'completed'],
    };
  }

  return where;
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getMaintenanceOrdersPaginated(searchParams: DataTableSearchParams) {
  'use cache';
  cacheTag(CACHE_TAGS.TAB_IN_WORKSHOP, CACHE_TAGS.MAINTENANCE_ORDERS);
  cacheLife({ expire: CACHE_TTL.PAGINATED_LIST, revalidate: CACHE_TTL.PAGINATED_LIST, stale: 30 });

  logger.debug('Obteniendo órdenes de mantenimiento paginadas', { data: { searchParams } });

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    // Multi-sort con validación
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }
    const safeOrderBy = resolvedSorts.length > 0 ? resolvedSorts : [{ created_at: 'desc' as const }];

    const where = buildWhereClause(state);

    const [data, total] = await Promise.all([
      prisma.maintenance_orders.findMany({
        where,
        skip,
        take,
        orderBy: safeOrderBy,
        select: MAINTENANCE_ORDERS_SELECT,
      }),
      prisma.maintenance_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener órdenes de mantenimiento paginadas', { data: { error } });
    throw error;
  }
}

export type MaintenanceOrderListItem = Awaited<ReturnType<typeof getMaintenanceOrdersPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY
// ============================================================================

export async function getAllMaintenanceOrdersForExport(searchParams: DataTableSearchParams) {
  'use cache';
  cacheTag(CACHE_TAGS.TAB_IN_WORKSHOP, CACHE_TAGS.MAINTENANCE_ORDERS);
  cacheLife({ expire: CACHE_TTL.EXPORT, revalidate: CACHE_TTL.EXPORT, stale: 30 });

  logger.debug('Exportando órdenes de mantenimiento', { data: { searchParams } });

  try {
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(state);

    const data = await prisma.maintenance_orders.findMany({
      where,
      orderBy: [{ created_at: 'desc' }],
      select: MAINTENANCE_ORDERS_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar órdenes de mantenimiento', { data: { error } });
    throw error;
  }
}

// ============================================================================
// FACETS QUERY (con cross-filtering)
// ============================================================================

export async function getMaintenanceOrdersFacets(searchParams?: DataTableSearchParams) {
  'use cache';
  cacheTag(CACHE_TAGS.TAB_IN_WORKSHOP, CACHE_TAGS.MAINTENANCE_ORDERS);
  cacheLife({ expire: CACHE_TTL.FACETS, revalidate: CACHE_TTL.FACETS, stale: 30 });

  logger.debug('Obteniendo facets de órdenes de mantenimiento', { data: { searchParams } });

  try {
    const state = searchParams ? parseSearchParams(searchParams) : parseSearchParams({});

    /**
     * crossWhere: construye el WHERE excluyendo el filtro de la columna indicada.
     * Esto permite que los counts de cada facet sean precisos con otros filtros activos.
     */
    const crossWhere = (excludeColumn: string) => buildWhereClause(state, { excludeColumn });

    // Ejecutar todos los groupBy en paralelo con cross-filtering
    const [statusCounts, vehicleCounts] = await Promise.all([
      // Status: contar por valor de status
      prisma.maintenance_orders.groupBy({
        by: ['status'],
        where: crossWhere('status'),
        _count: true,
      }),
      // Vehicle (equipment_id): contar por FK
      prisma.maintenance_orders.groupBy({
        by: ['equipment_id'],
        where: crossWhere('vehicle'),
        _count: true,
      }),
    ]);

    // Resolver nombres de vehículos
    const vehicleIds = vehicleCounts.filter((r) => r.equipment_id).map((r) => r.equipment_id!);
    const vehicleOptions =
      vehicleIds.length > 0
        ? await prisma.vehicles.findMany({
            where: { id: { in: vehicleIds } },
            select: { id: true, domain: true, serie: true, intern_number: true },
            orderBy: { domain: 'asc' },
          })
        : [];

    // Construir Maps
    const statusMap = new Map<string, number>();
    for (const r of statusCounts) {
      const key = r.status == null ? NULL_FILTER_VALUE : r.status;
      statusMap.set(key, r._count);
    }

    const vehicleMap = new Map<string, number>();
    for (const r of vehicleCounts) {
      const key = r.equipment_id == null ? NULL_FILTER_VALUE : r.equipment_id;
      vehicleMap.set(key, r._count);
    }

    return {
      status: statusMap,
      vehicle: vehicleMap,
      vehicleOptions,
    };
  } catch (error) {
    logger.error('Error al obtener facets de órdenes de mantenimiento', { data: { error } });
    throw error;
  }
}

export type MaintenanceOrdersFacets = Awaited<ReturnType<typeof getMaintenanceOrdersFacets>>;
