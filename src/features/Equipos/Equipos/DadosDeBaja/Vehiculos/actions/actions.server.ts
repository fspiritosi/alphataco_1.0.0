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

const logger = new Logger('InactiveVehicles/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Campos directos de vehicles que se pueden ordenar server-side.
 * Solo los campos directos + IDs de FK que tenemos en FK_SORT_MAP.
 */
const VALID_SORT_FIELDS = new Set([
  'domain',
  'intern_number',
  'chassis',
  'engine',
  'serie',
  'year',
  'kilometer',
  'engine_hours',
  'condition',
  'status',
  'cost_type',
  'currency',
  'type_of_contract',
  'reason_for_termination',
  'termination_date',
  'contract_expiration_date',
  'contract_start_date',
  'price',
  'created_at',
  // FK columns (sorted by relation name)
  'type',
  'sub_type',
  'brand',
  'model',
  'owner',
  'sector',
  'cost_center',
]);

/**
 * Mapeo de columnId → orderBy de Prisma para columnas FK.
 * Las columnas directas usan { field: dir } directamente,
 * pero las FK necesitan { relation: { campo: dir } }.
 */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  type: (dir) => ({ type_vehicles_typeTotype: { name: dir } }),
  sub_type: (dir) => ({ sub_type: { name: dir } }),
  brand: (dir) => ({ brand_vehicles: { name: dir } }),
  model: (dir) => ({ model_vehicles: { name: dir } }),
  owner: (dir) => ({ equipment_owners: { name: dir } }),
  sector: (dir) => ({ hierarchy: { name: dir } }),
  cost_center: (dir) => ({ cost_center: { name: dir } }),
};

/** Params de URL de navegación que NO son filtros de la tabla */
const IGNORED_PARAMS = new Set(['tab', 'subtab', 'inactive_subtab']);

/** Columnas con filtro de texto libre (contains insensitive) */
const TEXT_FILTER_COLUMNS = ['domain', 'intern_number', 'chassis', 'engine', 'serie'];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['termination_date', 'contract_expiration_date', 'contract_start_date', 'created_at'];

/**
 * Mapping de columnId (URL) → campo real en Prisma.
 * Solo para columnas cuyo ID en la URL difiere del campo en la BD.
 */
const COLUMN_MAP: Record<string, string> = {
  type: 'type',
  sub_type: 'subType',
  owner: 'owner_id',
  sector: 'sector',
  cost_center: 'cost_center_id',
};

/** Select común con todas las relaciones resueltas */
const INACTIVE_VEHICLE_SELECT = {
  id: true,
  domain: true,
  intern_number: true,
  chassis: true,
  engine: true,
  serie: true,
  year: true,
  kilometer: true,
  engine_hours: true,
  condition: true,
  status: true,
  cost_type: true,
  currency: true,
  price: true,
  type_of_contract: true,
  contract_number: true,
  contract_expiration_date: true,
  contract_start_date: true,
  reason_for_termination: true,
  termination_date: true,
  created_at: true,
  // FK relations
  type_vehicles_typeTotype: { select: { id: true, name: true } },
  sub_type: { select: { id: true, name: true } },
  brand_vehicles: { select: { id: true, name: true } },
  model_vehicles: { select: { id: true, name: true } },
  equipment_owners: { select: { id: true, name: true } },
  hierarchy: { select: { id: true, name: true } },
  cost_center: { select: { id: true, name: true } },
  // M:M relation
  contractor_equipment: {
    select: {
      customers: { select: { id: true, name: true } },
    },
  },
} as const;

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

function buildWhereClause(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, ['domain', 'intern_number', 'chassis', 'engine', 'serie']);

  // Columnas manejadas manualmente (BigInt FK, M:M)
  const MANUALLY_HANDLED = ['brand', 'model', 'contractor_equipment'];

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...TEXT_FILTER_COLUMNS,
      ...MANUALLY_HANDLED,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
    ],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // BigInt FK filters: brand (brand_id) y model (model_id en vehicles es el campo "model")
  const bigintFilters: Record<string, unknown> = {};
  const extraAndConditions: Record<string, unknown>[] = [];

  for (const [columnId, field] of [
    ['brand', 'brand'],
    ['model', 'model'],
  ] as const) {
    const values = state.filters[columnId];
    if (!values?.length) continue;
    const hasNull = values.includes(NULL_FILTER_VALUE);
    const realValues = values.filter((v) => v !== NULL_FILTER_VALUE);

    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [{ [field]: { in: realValues.map((v) => BigInt(v)) } }, { [field]: null }],
      });
    } else if (hasNull) {
      bigintFilters[field] = null;
    } else {
      bigintFilters[field] = { in: realValues.map((v) => BigInt(v)) };
    }
  }

  // M:M filter: contractor_equipment
  const m2mFilters: Record<string, unknown> = {};
  const contractorValues = state.filters['contractor_equipment'];
  if (contractorValues?.length) {
    const hasNull = contractorValues.includes(NULL_FILTER_VALUE);
    const realValues = contractorValues.filter((v) => v !== NULL_FILTER_VALUE);

    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [
          { contractor_equipment: { some: { contractor_id: { in: realValues } } } },
          { contractor_equipment: { none: {} } },
        ],
      });
    } else if (hasNull) {
      m2mFilters.contractor_equipment = { none: {} };
    } else {
      m2mFilters.contractor_equipment = {
        some: { contractor_id: { in: realValues } },
      };
    }
  }

  return {
    company_id: companyId,
    is_active: false,
    type_of_vehicle: BigInt(1),
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...bigintFilters,
    ...m2mFilters,
    ...(extraAndConditions.length > 0 ? { AND: extraAndConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getInactiveVehiclesPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const { skip, take } = stateToPrismaParams(state);

    const where = buildWhereClause(companyId, state);

    // Safe orderBy: multi-sort, solo campos válidos
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }

    const safeOrderBy = [...resolvedSorts, { termination_date: 'desc' as const }, { created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.vehicles.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: INACTIVE_VEHICLE_SELECT,
      }),
      prisma.vehicles.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener vehículos dados de baja paginados', { data: { error } });
    throw new Error('Error al obtener los vehículos dados de baja');
  }
}

export type InactiveVehicleListItem = Awaited<ReturnType<typeof getInactiveVehiclesPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllInactiveVehiclesForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const where = buildWhereClause(companyId, state);

    const data = await prisma.vehicles.findMany({
      orderBy: [{ termination_date: 'desc' }, { created_at: 'desc' }],
      where,
      select: INACTIVE_VEHICLE_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar vehículos dados de baja', { data: { error } });
    throw new Error('Error al exportar los vehículos dados de baja');
  }
}

// ============================================================================
// FACETS
// ============================================================================

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro,
 * mostrando cuántos registros tendría cada opción si se cambiara solo ese filtro.
 */
export async function getInactiveVehicleFacets(searchParams?: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  const baseWhere = {
    company_id: companyId,
    is_active: false,
    type_of_vehicle: BigInt(1),
  };

  // Parsear filtros activos (si los hay)
  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete parsedState.filters[key];
    }
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  // Helper: WHERE con todos los filtros EXCEPTO el de la columna indicada
  function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) return baseWhere;
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildWhereClause(companyId, modified);
  }

  try {
    // Round 1: groupBy con cross-filter WHERE por columna
    const [
      conditionCounts,
      statusCounts,
      costTypeCounts,
      currencyCounts,
      reasonCounts,
      typeOfContractCounts,
      typeCounts,
      subTypeCounts,
      sectorCounts,
      ownerCounts,
      costCenterCounts,
      brandCounts,
      modelCounts,
    ] = await Promise.all([
      prisma.vehicles.groupBy({ by: ['condition'], where: crossWhere('condition'), _count: true }),
      prisma.vehicles.groupBy({ by: ['status'], where: crossWhere('status'), _count: true }),
      prisma.vehicles.groupBy({ by: ['cost_type'], where: crossWhere('cost_type'), _count: true }),
      prisma.vehicles.groupBy({ by: ['currency'], where: crossWhere('currency'), _count: true }),
      prisma.vehicles.groupBy({
        by: ['reason_for_termination'],
        where: crossWhere('reason_for_termination'),
        _count: true,
      }),
      prisma.vehicles.groupBy({
        by: ['type_of_contract'],
        where: crossWhere('type_of_contract'),
        _count: true,
      }),
      prisma.vehicles.groupBy({ by: ['type'], where: crossWhere('type'), _count: true }),
      prisma.vehicles.groupBy({ by: ['subType'], where: crossWhere('sub_type'), _count: true }),
      prisma.vehicles.groupBy({ by: ['sector'], where: crossWhere('sector'), _count: true }),
      prisma.vehicles.groupBy({ by: ['owner_id'], where: crossWhere('owner'), _count: true }),
      prisma.vehicles.groupBy({ by: ['cost_center_id'], where: crossWhere('cost_center'), _count: true }),
      prisma.vehicles.groupBy({ by: ['brand'], where: crossWhere('brand'), _count: true }),
      prisma.vehicles.groupBy({ by: ['model'], where: crossWhere('model'), _count: true }),
    ]);

    // Round 2: resolver nombres de FK (solo IDs que aparecen en los counts)
    const typeIds = typeCounts.map((r) => r.type).filter(Boolean) as string[];
    const subTypeIds = subTypeCounts.map((r) => r.subType).filter(Boolean) as string[];
    const sectorIds = sectorCounts.map((r) => r.sector).filter(Boolean) as string[];
    const ownerIds = ownerCounts.map((r) => r.owner_id).filter(Boolean) as string[];
    const costCenterIds = costCenterCounts.map((r) => r.cost_center_id).filter(Boolean) as string[];
    const brandIds = brandCounts.map((r) => r.brand).filter(Boolean) as bigint[];
    const modelIds = modelCounts.map((r) => r.model).filter(Boolean) as bigint[];

    const [types, subTypes, sectors, owners, costCenters, brands, models] = await Promise.all([
      typeIds.length > 0
        ? prisma.type.findMany({ where: { id: { in: typeIds } }, select: { id: true, name: true } })
        : [],
      subTypeIds.length > 0
        ? prisma.sub_type.findMany({ where: { id: { in: subTypeIds } }, select: { id: true, name: true } })
        : [],
      sectorIds.length > 0
        ? prisma.hierarchy.findMany({ where: { id: { in: sectorIds } }, select: { id: true, name: true } })
        : [],
      ownerIds.length > 0
        ? prisma.equipment_owners.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true } })
        : [],
      costCenterIds.length > 0
        ? prisma.cost_center.findMany({ where: { id: { in: costCenterIds } }, select: { id: true, name: true } })
        : [],
      brandIds.length > 0
        ? prisma.brand_vehicles.findMany({ where: { id: { in: brandIds } }, select: { id: true, name: true } })
        : [],
      modelIds.length > 0
        ? prisma.model_vehicles.findMany({ where: { id: { in: modelIds } }, select: { id: true, name: true } })
        : [],
    ]);

    // M:M facets: contractor_equipment (con cross-filter)
    const contractorCrossWhere = crossWhere('contractor_equipment');
    const contractorRelations = await prisma.contractor_equipment.findMany({
      where: { vehicles: contractorCrossWhere },
      select: { contractor_id: true },
      distinct: ['contractor_id'],
    });
    const contractorIds = contractorRelations.map((r) => r.contractor_id).filter(Boolean) as string[];
    const contractors =
      contractorIds.length > 0
        ? await prisma.customers.findMany({
            where: { id: { in: contractorIds } },
            select: { id: true, name: true },
          })
        : [];

    const contractorCountMap = new Map<string, number>();
    const allContractorRels = await prisma.contractor_equipment.findMany({
      where: { vehicles: contractorCrossWhere },
      select: { contractor_id: true },
    });
    for (const rel of allContractorRels) {
      if (rel.contractor_id) {
        contractorCountMap.set(rel.contractor_id, (contractorCountMap.get(rel.contractor_id) ?? 0) + 1);
      }
    }
    // Contar vehículos SIN ninguna afectación ("Sin afectar")
    const totalInCross = await prisma.vehicles.count({ where: contractorCrossWhere });
    const withContractor = await prisma.vehicles.count({
      where: { ...contractorCrossWhere, contractor_equipment: { some: {} } },
    });
    const unassignedCount = totalInCross - withContractor;
    if (unassignedCount > 0) {
      contractorCountMap.set(NULL_FILTER_VALUE, unassignedCount);
    }

    // Helper: construir Map<string, count> con soporte para null → NULL_FILTER_VALUE
    function toFacetMap(rows: { key: string | bigint | null | undefined; count: number }[]): Map<string, number> {
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

    return {
      condition: toFacetMap(conditionCounts.map((r) => ({ key: r.condition, count: r._count }))),
      status: toFacetMap(statusCounts.map((r) => ({ key: r.status, count: r._count }))),
      cost_type: toFacetMap(costTypeCounts.map((r) => ({ key: r.cost_type, count: r._count }))),
      currency: toFacetMap(currencyCounts.map((r) => ({ key: r.currency, count: r._count }))),
      reason_for_termination: toFacetMap(reasonCounts.map((r) => ({ key: r.reason_for_termination, count: r._count }))),
      type_of_contract: toFacetMap(typeOfContractCounts.map((r) => ({ key: r.type_of_contract, count: r._count }))),
      type: toFacetMap(typeCounts.map((r) => ({ key: r.type, count: r._count }))),
      typeOptions: types,
      sub_type: toFacetMap(subTypeCounts.map((r) => ({ key: r.subType, count: r._count }))),
      subTypeOptions: subTypes,
      sector: toFacetMap(sectorCounts.map((r) => ({ key: r.sector, count: r._count }))),
      sectorOptions: sectors,
      owner: toFacetMap(ownerCounts.map((r) => ({ key: r.owner_id, count: r._count }))),
      ownerOptions: owners,
      cost_center: toFacetMap(costCenterCounts.map((r) => ({ key: r.cost_center_id, count: r._count }))),
      costCenterOptions: costCenters,
      brand: toFacetMap(brandCounts.map((r) => ({ key: r.brand, count: r._count }))),
      brandOptions: brands,
      model: toFacetMap(modelCounts.map((r) => ({ key: r.model, count: r._count }))),
      modelOptions: models,
      contractor_equipment: contractorCountMap,
      contractorOptions: contractors,
    };
  } catch (error) {
    logger.error('Error al obtener facets de vehículos dados de baja', { data: { error } });
    return null;
  }
}

export type InactiveVehicleFacets = Awaited<ReturnType<typeof getInactiveVehicleFacets>>;
