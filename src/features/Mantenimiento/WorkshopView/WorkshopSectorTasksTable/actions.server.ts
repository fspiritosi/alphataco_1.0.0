'use server';

import { Logger } from '@/lib/logger';
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

const logger = new Logger('features/WorkshopView/WorkshopSectorTasksTable');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos reales de maintenance_order_items ordenables server-side */
const VALID_SORT_FIELDS = new Set([
  'description',
  'planned_start_date',
  'planned_end_date',
  'assigned_at',
  'is_critical',
  'is_rejected',
  'created_at',
  // FK columns via FK_SORT_MAP:
  'repair_type',
  'maintenance_order',
  // 'vehicle' omitido — enableSorting: false en columns (anidamiento vehicle via maintenance_orders)
]);

/** Mapeo de columnId → orderBy de Prisma para columnas FK */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  repair_type: (dir) => ({ types_of_repairs: { name: dir } }),
  maintenance_order: (dir) => ({ maintenance_orders: { order_number: dir } }),
  vehicle: (dir) => ({ maintenance_orders: { vehicles: { domain: dir } } }),
};

/** Columnas de texto libre (buildTextFiltersWhere) */
const TEXT_COLUMNS = ['description'];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['planned_start_date', 'planned_end_date', 'assigned_at', 'created_at'];

/** Mapping columnId (URL) → campo real en Prisma para buildFiltersWhere */
const COLUMN_MAP: Record<string, string> = {
  repair_type: 'repair_type_id',
  maintenance_order: 'maintenance_order_id',
  is_critical: 'is_critical',
  is_rejected: 'is_rejected',
  is_diagnostico: 'is_diagnostico',
};

/** Select con todas las relaciones necesarias para la tabla */
const SECTOR_TASKS_SELECT = {
  id: true,
  description: true,
  planned_start_date: true,
  planned_end_date: true,
  assigned_at: true,
  is_critical: true,
  is_rejected: true,
  is_diagnostico: true,
  rejection_reason: true,
  sector_sequence_order: true,
  created_at: true,
  // FK: tipo de reparación (directo en el item)
  types_of_repairs: {
    select: { id: true, name: true },
  },
  // FK: orden de mantenimiento (para número/código y link)
  maintenance_orders: {
    select: {
      id: true,
      order_number: true,
      status: true,
      // FK: vehículo dentro de la OM
      vehicles: {
        select: { id: true, domain: true, serie: true, intern_number: true },
      },
    },
  },
};

// ============================================================================
// INTERNAL HELPER: buildWhereClause (DRY — compartido entre paginated/export/facets)
// ============================================================================

function buildWhereClause(sectorId: string, state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, ['description']);

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...TEXT_COLUMNS,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      'maintenance_order', // manejado manualmente (FK UUID)
      'vehicle', // filtro virtual via maintenance_orders.vehicles
      'is_critical', // booleano — manejado manualmente
      'is_rejected', // booleano — manejado manualmente
      'is_diagnostico', // booleano — manejado manualmente
    ],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // ─── Filtro repair_type (FK UUID nullable) ──────────────────────────────
  const repairTypeValues = state.filters['repair_type'];
  if (repairTypeValues?.length) {
    const hasNull = repairTypeValues.includes(NULL_FILTER_VALUE);
    const realValues = repairTypeValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // mixto: manejado en AND abajo
    } else if (hasNull) {
      filtersWhere.repair_type_id = null;
    } else {
      filtersWhere.repair_type_id = { in: realValues };
    }
  }

  // ─── Filtro maintenance_order (FK UUID nullable) ────────────────────────
  const moValues = state.filters['maintenance_order'];
  if (moValues?.length) {
    const hasNull = moValues.includes(NULL_FILTER_VALUE);
    const realValues = moValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // mixto: manejado en AND abajo
    } else if (hasNull) {
      filtersWhere.maintenance_order_id = null;
    } else {
      filtersWhere.maintenance_order_id = { in: realValues };
    }
  }

  // ─── Filtro is_critical (booleano) ──────────────────────────────────────
  const isCriticalValues = state.filters['is_critical'];
  if (isCriticalValues?.length) {
    filtersWhere.is_critical = isCriticalValues[0] === 'true';
  }

  // ─── Filtro is_rejected (booleano) ──────────────────────────────────────
  const isRejectedValues = state.filters['is_rejected'];
  if (isRejectedValues?.length) {
    filtersWhere.is_rejected = isRejectedValues[0] === 'true';
  }

  // ─── Filtro is_diagnostico (booleano) ───────────────────────────────────
  const isDiagnosticoValues = state.filters['is_diagnostico'];
  if (isDiagnosticoValues?.length) {
    filtersWhere.is_diagnostico = isDiagnosticoValues[0] === 'true';
  }

  // ─── Filtro vehicle (texto en campos de vehicles anidados) ──────────────
  const vehicleValues = state.filters['vehicle'];
  const vehicleExtraConditions: Record<string, unknown>[] = [];
  if (vehicleValues?.length) {
    // vehicle filter: vehicleId exacto via maintenance_orders.equipment_id
    const hasNull = vehicleValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      vehicleExtraConditions.push({
        OR: [
          { maintenance_orders: { equipment_id: { in: realValues } } },
          { maintenance_orders: { equipment_id: null } },
        ],
      });
    } else if (hasNull) {
      vehicleExtraConditions.push({ maintenance_orders: { equipment_id: null } });
    } else {
      vehicleExtraConditions.push({ maintenance_orders: { equipment_id: { in: realValues } } });
    }
  }

  // ─── Condiciones AND mixtas ─────────────────────────────────────────────
  const extraAndConditions: Record<string, unknown>[] = [...vehicleExtraConditions];

  // Caso mixto repair_type
  const rtValues = state.filters['repair_type'];
  if (
    rtValues?.length &&
    rtValues.includes(NULL_FILTER_VALUE) &&
    rtValues.filter((v) => v !== NULL_FILTER_VALUE).length > 0
  ) {
    extraAndConditions.push({
      OR: [{ repair_type_id: { in: rtValues.filter((v) => v !== NULL_FILTER_VALUE) } }, { repair_type_id: null }],
    });
  }

  // Caso mixto maintenance_order
  const moVals = state.filters['maintenance_order'];
  if (
    moVals?.length &&
    moVals.includes(NULL_FILTER_VALUE) &&
    moVals.filter((v) => v !== NULL_FILTER_VALUE).length > 0
  ) {
    extraAndConditions.push({
      OR: [
        { maintenance_order_id: { in: moVals.filter((v) => v !== NULL_FILTER_VALUE) } },
        { maintenance_order_id: null },
      ],
    });
  }

  return {
    assigned_sector_id: sectorId,
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...(extraAndConditions.length > 0 ? { AND: extraAndConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getWorkshopSectorTasksPaginated(sectorId: string, searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(sectorId, state);

    // Multi-sort: solo campos válidos
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }

    // Rechazadas al final, luego críticas primero, luego por fecha de inicio planificada
    const safeOrderBy: Record<string, unknown>[] = [
      ...resolvedSorts,
      { is_rejected: 'asc' as const }, // false antes que true (rechazadas al final)
      { is_critical: 'desc' as const }, // true antes que false (críticas primero)
      { planned_start_date: 'asc' as const },
    ];

    const [data, total] = await Promise.all([
      prisma.maintenance_order_items.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: SECTOR_TASKS_SELECT,
      }),
      prisma.maintenance_order_items.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener tareas del sector', { data: { error, sectorId } });
    throw new Error('Error al obtener las tareas del sector');
  }
}

export type WorkshopSectorTaskListItem = Awaited<ReturnType<typeof getWorkshopSectorTasksPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllWorkshopSectorTasksForExport(sectorId: string, searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(sectorId, state);

    return await prisma.maintenance_order_items.findMany({
      orderBy: [
        { is_rejected: 'asc' as const },
        { is_critical: 'desc' as const },
        { planned_start_date: 'asc' as const },
      ],
      where,
      select: SECTOR_TASKS_SELECT,
    });
  } catch (error) {
    logger.error('Error al exportar tareas del sector', { data: { error, sectorId } });
    throw new Error('Error al exportar las tareas del sector');
  }
}

// ============================================================================
// FACETS (con cross-filtering)
// ============================================================================

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

export async function getWorkshopSectorTasksFacets(sectorId: string, searchParams?: DataTableSearchParams) {
  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  async function crossWhere(excludeColumn: string): Promise<ReturnType<typeof buildWhereClause>> {
    if (!parsedState || !hasActiveFilters) {
      return buildWhereClause(sectorId, parseSearchParams({}));
    }
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildWhereClause(sectorId, modified);
  }

  try {
    const [
      crossWhereRepairType,
      crossWhereMo,
      crossWhereVehicle,
      crossWhereIsCritical,
      crossWhereIsRejected,
      crossWhereIsDiagnostico,
    ] = await Promise.all([
      crossWhere('repair_type'),
      crossWhere('maintenance_order'),
      crossWhere('vehicle'),
      crossWhere('is_critical'),
      crossWhere('is_rejected'),
      crossWhere('is_diagnostico'),
    ]);

    const [repairTypeCounts, moCounts, vehicleCounts, isCriticalCounts, isRejectedCounts, isDiagnosticoCounts] =
      await Promise.all([
        prisma.maintenance_order_items.groupBy({
          by: ['repair_type_id'],
          where: crossWhereRepairType,
          _count: { _all: true },
        }),
        prisma.maintenance_order_items.groupBy({
          by: ['maintenance_order_id'],
          where: crossWhereMo,
          _count: { _all: true },
        }),
        prisma.maintenance_order_items.groupBy({
          // groupBy equipment_id vía maintenance_orders no es posible directamente,
          // así que usamos maintenance_order_id y luego resolvemos los vehicles
          by: ['maintenance_order_id'],
          where: crossWhereVehicle,
          _count: { _all: true },
        }),
        prisma.maintenance_order_items.groupBy({
          by: ['is_critical'],
          where: crossWhereIsCritical,
          _count: { _all: true },
        }),
        prisma.maintenance_order_items.groupBy({
          by: ['is_rejected'],
          where: crossWhereIsRejected,
          _count: { _all: true },
        }),
        prisma.maintenance_order_items.groupBy({
          by: ['is_diagnostico'],
          where: crossWhereIsDiagnostico,
          _count: { _all: true },
        }),
      ]);

    // Resolver nombres de tipos de reparación
    const repairTypeIds = repairTypeCounts
      .filter((r) => r.repair_type_id != null)
      .map((r) => r.repair_type_id as string);

    // Resolver maintenance_orders para obtener el vehículo
    const moIds = moCounts.map((r) => r.maintenance_order_id).filter(Boolean) as string[];

    const [repairTypeOptions, maintenanceOrders] = await Promise.all([
      repairTypeIds.length > 0
        ? prisma.types_of_repairs.findMany({
            where: { id: { in: repairTypeIds } },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          })
        : [],
      moIds.length > 0
        ? prisma.maintenance_orders.findMany({
            where: { id: { in: moIds } },
            select: {
              id: true,
              order_number: true,
              vehicles: { select: { id: true, domain: true, serie: true, intern_number: true } },
            },
          })
        : [],
    ]);

    // Map de maintenance_order_id → order info
    const moMap = new Map(maintenanceOrders.map((mo) => [mo.id, mo]));

    // Para el filtro de vehículo, agrupamos los counts por vehicle id
    const vehicleCountMap = new Map<string, number>();
    for (const r of vehicleCounts) {
      const mo = moMap.get(r.maintenance_order_id);
      if (mo?.vehicles?.id) {
        vehicleCountMap.set(mo.vehicles.id, (vehicleCountMap.get(mo.vehicles.id) ?? 0) + r._count._all);
      }
    }

    // Vehicles únicos con sus datos para opciones del filtro
    const vehicleOptionsMap = new Map<
      string,
      { id: string; domain: string | null; serie: string | null; intern_number: string | null }
    >();
    for (const mo of maintenanceOrders) {
      if (mo.vehicles?.id) {
        vehicleOptionsMap.set(mo.vehicles.id, mo.vehicles);
      }
    }
    const vehicleOptions = Array.from(vehicleOptionsMap.values()).sort((a, b) =>
      (a.domain ?? '').localeCompare(b.domain ?? '')
    );

    // Counts de maintenance_orders (para el filtro de OM)
    const moFacetMap = toFacetMap(moCounts.map((r) => ({ key: r.maintenance_order_id, count: r._count._all })));

    // Opciones de maintenance_orders para el filtro
    const moOptions = maintenanceOrders.map((mo) => ({
      id: mo.id,
      label: mo.order_number ?? mo.id.slice(0, 8),
    }));

    return {
      repair_type: toFacetMap(repairTypeCounts.map((r) => ({ key: r.repair_type_id, count: r._count._all }))),
      repairTypeOptions,
      maintenance_order: moFacetMap,
      moOptions,
      vehicle: new Map(Array.from(vehicleCountMap)),
      vehicleOptions,
      is_critical: toFacetMap(isCriticalCounts.map((r) => ({ key: String(r.is_critical), count: r._count._all }))),
      is_rejected: toFacetMap(isRejectedCounts.map((r) => ({ key: String(r.is_rejected), count: r._count._all }))),
      is_diagnostico: toFacetMap(
        isDiagnosticoCounts.map((r) => ({ key: String(r.is_diagnostico), count: r._count._all }))
      ),
    };
  } catch (error) {
    logger.error('Error al obtener facets de tareas del sector', { data: { error, sectorId } });
    return null;
  }
}

export type WorkshopSectorTasksFacets = Awaited<ReturnType<typeof getWorkshopSectorTasksFacets>>;
