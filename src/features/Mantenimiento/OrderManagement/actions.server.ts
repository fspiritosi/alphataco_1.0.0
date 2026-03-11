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

const logger = new Logger('OrderManagement/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos reales de maintenance_orders ordenables server-side */
const VALID_SORT_FIELDS = new Set([
  'created_at',
  'workshop_entry_date',
  'order_number',
  // FK columns resueltas via FK_SORT_MAP
  'vehicle',
  'vehicleType',
]);

/** Mapeo de columnId → orderBy de Prisma para columnas FK */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
  vehicleType: (dir) => ({ vehicles: { types_of_vehicles: { name: dir } } }),
};

/** Params de URL que NO son filtros de la tabla (tabs, subtabs, etc.) */
const IGNORED_PARAMS = new Set(['tab', 'subtab', 'operations_subtab', 'taller_subtab', 'config_subtab']);

/** Columnas con filtro de texto libre en vehicles */
const VEHICLE_TEXT_FILTER_COLUMNS = ['domain', 'serie', 'intern_number'];

/** Columnas con filtro de texto libre directo */
const TEXT_FILTER_COLUMNS = ['order_number'];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['created_at', 'workshop_entry_date'];

/** Mapping de columnId (URL) → campo real en Prisma */
const COLUMN_MAP: Record<string, string> = {
  vehicle: 'equipment_id',
};

/** Select común con todas las relaciones resueltas */
const ORDER_MANAGEMENT_SELECT = {
  id: true,
  status: true,
  order_number: true,
  workshop_entry_date: true,
  created_at: true,
  // FK: vehicle con tipo anidado (second-level FK)
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
      kilometer: true,
      condition: true,
      types_of_vehicles: {
        select: { id: true, name: true },
      },
    },
  },
  maintenance_requests: {
    select: {
      id: true,
      kilometer: true,
      created_at: true,
      supervisor_id: true,
      source: true,
    },
  },
  maintenance_order_items: {
    select: {
      id: true,
      description: true,
      assigned_sector_id: true,
      is_diagnostico: true,
      sector_sequence_order: true,
      is_critical: true,
      is_rejected: true,
      maintenance_request_item_id: true,
      repair_type_id: true,
      workshop_sectors: {
        select: { id: true, name: true },
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
    },
  },
} as const;

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Construye el WHERE base para órdenes en gestión (status = 'in_workshop').
 */
async function buildBaseWhere(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const supervisorFilter = await getSupervisorFilterInfo();

  const searchWhere = buildSearchWhere(state.search, ['order_number']);

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...VEHICLE_TEXT_FILTER_COLUMNS,
      ...TEXT_FILTER_COLUMNS,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      'vehicle', // manejado manualmente (FK UUID → equipment_id)
      'vehicleType', // manejado manualmente (nested FK via vehicles.types_of_vehicles)
    ],
  });

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // ─── Filtro de texto en order_number ──────────────────────────────────────
  const orderNumberValues = state.filters['order_number'];
  const orderNumberFilter: Record<string, unknown> = {};
  if (orderNumberValues?.length && orderNumberValues[0]) {
    orderNumberFilter.order_number = { contains: orderNumberValues[0], mode: 'insensitive' };
  }

  // ─── Filtro vehicle (FK UUID → equipment_id) ─────────────────────────────
  const vehicleFilter: Record<string, unknown> = {};
  const vehicleValues = state.filters['vehicle'];
  if (vehicleValues?.length) {
    const hasNull = vehicleValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (!hasNull) {
      vehicleFilter.equipment_id = { in: realValues };
    } else if (realValues.length === 0) {
      vehicleFilter.equipment_id = null;
    }
    // caso mixto → manejado en extraAndConditions
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

  // ─── Filtro vehicleType (FK BigInt anidado: vehicles.type_of_vehicle) ─────
  const vehicleTypeConditions: Record<string, unknown>[] = [];
  const vehicleTypeValues = state.filters['vehicleType'];
  if (vehicleTypeValues?.length) {
    const hasNull = vehicleTypeValues.includes(NULL_FILTER_VALUE);
    const realBigInts = vehicleTypeValues
      .filter((v) => v !== NULL_FILTER_VALUE)
      .map(Number)
      .filter((n) => !isNaN(n));

    if (hasNull && realBigInts.length > 0) {
      vehicleTypeConditions.push({
        OR: [{ vehicles: { type_of_vehicle: { in: realBigInts } } }, { vehicles: { type_of_vehicle: null } }],
      });
    } else if (hasNull) {
      vehicleTypeConditions.push({ vehicles: { type_of_vehicle: null } });
    } else if (realBigInts.length > 0) {
      vehicleTypeConditions.push({ vehicles: { type_of_vehicle: { in: realBigInts } } });
    }
  }

  // ─── Condiciones AND para casos mixtos ────────────────────────────────────
  const extraAndConditions: Record<string, unknown>[] = [
    ...vehicleTextConditions,
    ...vehicleTypeConditions,
  ];

  if (vehicleValues?.length) {
    const hasNull = vehicleValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [{ equipment_id: { in: realValues } }, { equipment_id: null }],
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
    status: 'in_workshop' as const,
    vehicles: { company_id: companyId },
    ...searchWhere,
    ...filtersWhere,
    ...dateFiltersWhere,
    ...orderNumberFilter,
    ...vehicleFilter,
    ...supervisorCondition,
    ...(extraAndConditions.length > 0 ? { AND: extraAndConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getOrderManagementPaginated(searchParams: DataTableSearchParams) {
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

    const safeOrderBy = [...resolvedSorts, { created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.maintenance_orders.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: ORDER_MANAGEMENT_SELECT,
      }),
      prisma.maintenance_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener órdenes para gestión (paginado)', { data: { error } });
    throw new Error('Error al obtener las órdenes de gestión');
  }
}

export type OrderManagementListItem = Awaited<ReturnType<typeof getOrderManagementPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllOrderManagementForExport(searchParams: DataTableSearchParams) {
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
      select: ORDER_MANAGEMENT_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar órdenes para gestión', { data: { error } });
    throw new Error('Error al exportar las órdenes de gestión');
  }
}

// ============================================================================
// FACETS (con cross-filtering)
// ============================================================================

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro.
 */
export async function getOrderManagementFacets(searchParams?: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  const supervisorFilter = await getSupervisorFilterInfo();

  const supervisorCondition: Record<string, unknown> = {};
  if (supervisorFilter?.shouldFilterBySupervisor) {
    supervisorCondition.maintenance_requests = {
      supervisor_id: supervisorFilter.userId,
    };
  }

  const baseWhere = {
    status: 'in_workshop' as const,
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

  function toFacetMap(rows: { key: string | number | bigint | null | undefined; count: number }[]): Map<string, number> {
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
    const [crossWhereVehicle, crossWhereVehicleType] = await Promise.all([
      crossWhere('vehicle'),
      crossWhere('vehicleType'),
    ]);

    const [vehicleCounts, vehicleTypeCounts] = await Promise.all([
      prisma.maintenance_orders.groupBy({
        by: ['equipment_id'],
        where: crossWhereVehicle,
        _count: true,
      }),
      // vehicleType está anidado en vehicles → traemos via findMany
      prisma.vehicles.findMany({
        where: {
          maintenance_orders: {
            some: crossWhereVehicleType,
          },
        },
        select: {
          type_of_vehicle: true,
          types_of_vehicles: { select: { id: true, name: true } },
          _count: { select: { maintenance_orders: true } },
        },
        distinct: ['type_of_vehicle'],
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
      vehicleType: toFacetMap(
        vehicleTypeCounts.map((r) => ({ key: r.type_of_vehicle, count: r._count.maintenance_orders }))
      ),
      vehicleTypeOptions: vehicleTypeCounts
        .filter((r) => r.types_of_vehicles?.name)
        .map((r) => ({ id: String(r.type_of_vehicle), name: r.types_of_vehicles!.name! })),
    };
  } catch (error) {
    logger.error('Error al obtener facets de gestión de órdenes', { data: { error } });
    return null;
  }
}

export type OrderManagementFacets = Awaited<ReturnType<typeof getOrderManagementFacets>>;
