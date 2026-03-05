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

const logger = new Logger('Employees/list/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos directos de la tabla employees que se pueden ordenar server-side */
const VALID_SORT_FIELDS = new Set([
  'lastname',
  'firstname',
  'email',
  'cuil',
  'document_number',
  'file',
  'born_date',
  'street',
  'street_number',
  'postal_code',
  'phone',
  'normal_hours',
  'date_of_admission',
  'created_at',
  'termination_date',
  'status',
  'gender',
  'nationality',
  'document_type',
  'marital_status',
  'level_of_education',
  'cost_type',
  'affiliate_status',
  'reason_for_termination',
  'is_active',
  // FK columns (sorted via FK_SORT_MAP)
  'hierarchy',
  'company_positions',
  'types_of_contract',
  'work_diagram',
  'workshop_sectors',
  'category',
  'covenant',
  'guild',
  'cost_center',
  'countries',
  'province',
  'city',
]);

/**
 * Mapeo de columnId → orderBy de Prisma para columnas FK.
 * Las columnas FK necesitan { relation: { campo: dir } }.
 */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  hierarchy: (dir) => ({ hierarchy: { name: dir } }),
  company_positions: (dir) => ({ company_positions: { name: dir } }),
  types_of_contract: (dir) => ({ types_of_contract: { name: dir } }),
  work_diagram: (dir) => ({ work_diagram: { name: dir } }),
  workshop_sectors: (dir) => ({ workshop_sectors: { name: dir } }),
  category: (dir) => ({ category: { name: dir } }),
  covenant: (dir) => ({ covenant: { name: dir } }),
  guild: (dir) => ({ guild: { name: dir } }),
  cost_center: (dir) => ({ cost_center: { name: dir } }),
  countries: (dir) => ({ countries: { name: dir } }),
  province: (dir) => ({ provinces: { name: dir } }),
  city: (dir) => ({ cities: { name: dir } }),
};

/** Params de URL que NO son filtros de la tabla (tabs de navegacion, etc.) */
const IGNORED_PARAMS = new Set(['tab', 'subtab']);

/** Columnas que son filtros de texto libre (contains insensitive) */
const TEXT_FILTER_COLUMNS = [
  'fullName',
  'email',
  'cuil',
  'document_number',
  'phone',
  'street',
  'street_number',
  'postal_code',
  'file',
  'normal_hours',
];

/** Columnas de rango de fecha */
const DATE_RANGE_COLUMNS = ['date_of_admission', 'created_at', 'termination_date', 'born_date'];

/**
 * Mapping de columnId (URL) → campo real en Prisma
 * Solo para columnas cuyo ID en la URL difiere del campo en la BD
 */
const COLUMN_MAP: Record<string, string> = {
  hierarchy: 'hierarchical_position',
  company_positions: 'company_position',
  types_of_contract: 'type_of_contract',
  work_diagram: 'workflow_diagram',
  workshop_sectors: 'workshop_sector_id',
  category: 'category_id',
  covenant: 'covenants_id',
  guild: 'guild_id',
  cost_center: 'cost_center_id',
  countries: 'birthplace',
};

/** Select comun con todas las relaciones resueltas */
const EMPLOYEE_SELECT = {
  id: true,
  created_at: true,
  lastname: true,
  firstname: true,
  full_name: true,
  cuil: true,
  document_type: true,
  document_number: true,
  nationality: true,
  gender: true,
  marital_status: true,
  level_of_education: true,
  born_date: true,
  picture: true,
  street: true,
  street_number: true,
  province: true,
  city: true,
  postal_code: true,
  phone: true,
  email: true,
  file: true,
  normal_hours: true,
  date_of_admission: true,
  affiliate_status: true,
  cost_type: true,
  status: true,
  is_active: true,
  reason_for_termination: true,
  termination_date: true,
  // FK relations resolved
  provinces: { select: { id: true, name: true } },
  cities: { select: { id: true, name: true } },
  countries: { select: { id: true, name: true } },
  hierarchy: { select: { id: true, name: true } },
  company_positions: { select: { id: true, name: true } },
  types_of_contract: { select: { id: true, name: true } },
  work_diagram: { select: { id: true, name: true } },
  workshop_sectors: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  covenant: { select: { id: true, name: true } },
  guild: { select: { id: true, name: true } },
  cost_center: { select: { id: true, name: true } },
  // M:M relations
  contractor_employee: {
    select: {
      customers: { select: { id: true, name: true } },
    },
  },
  empleado_aptitudes: {
    select: {
      aptitudes_tecnicas: { select: { id: true, nombre: true } },
    },
  },
} as const;

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/** Construye el WHERE clause compartido entre paginated, export y facets. */
function buildWhereClause(companyId: string, isActive: boolean, state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, ['lastname', 'firstname', 'cuil', 'file']);

  // Columnas manejadas manualmente (BigInt FK, M:M)
  const MANUALLY_HANDLED = ['province', 'city', 'contractor_employee', 'empleado_aptitudes'];
  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...TEXT_FILTER_COLUMNS,
      ...MANUALLY_HANDLED,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
    ],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS, {
    fullName: 'full_name',
  });

  // fullName necesita búsqueda en múltiples campos.
  // Se agrega como condición AND para no sobrescribir el OR de searchWhere.
  const fullNameFilter = state.filters['fullName']?.[0];
  const fullNameAndCondition: Record<string, unknown>[] = [];
  if (fullNameFilter) {
    fullNameAndCondition.push({
      OR: [
        { lastname: { contains: fullNameFilter, mode: 'insensitive' as const } },
        { firstname: { contains: fullNameFilter, mode: 'insensitive' as const } },
        { full_name: { contains: fullNameFilter, mode: 'insensitive' as const } },
      ],
    });
    // Quitar full_name de textFiltersWhere (ya se maneja arriba)
    delete (textFiltersWhere as Record<string, unknown>)['full_name'];
  }

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // BigInt FK filters (province, city) con soporte para null
  const bigintFilters: Record<string, unknown> = {};
  const extraAndConditions: Record<string, unknown>[] = [];

  for (const field of ['province', 'city'] as const) {
    const values = state.filters[field];
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

  // M:M filters con soporte para null
  const m2mFilters: Record<string, unknown> = {};

  const contractorValues = state.filters['contractor_employee'];
  if (contractorValues?.length) {
    const hasNull = contractorValues.includes(NULL_FILTER_VALUE);
    const realValues = contractorValues.filter((v) => v !== NULL_FILTER_VALUE);

    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [
          { contractor_employee: { some: { contractor_id: { in: realValues } } } },
          { contractor_employee: { none: {} } },
        ],
      });
    } else if (hasNull) {
      m2mFilters.contractor_employee = { none: {} };
    } else {
      m2mFilters.contractor_employee = { some: { contractor_id: { in: realValues } } };
    }
  }

  const aptitudValues = state.filters['empleado_aptitudes'];
  if (aptitudValues?.length) {
    const hasNull = aptitudValues.includes(NULL_FILTER_VALUE);
    const realValues = aptitudValues.filter((v) => v !== NULL_FILTER_VALUE);

    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [
          { empleado_aptitudes: { some: { aptitud_id: { in: realValues } } } },
          { empleado_aptitudes: { none: {} } },
        ],
      });
    } else if (hasNull) {
      m2mFilters.empleado_aptitudes = { none: {} };
    } else {
      m2mFilters.empleado_aptitudes = { some: { aptitud_id: { in: realValues } } };
    }
  }

  // Consolidar TODAS las condiciones AND para evitar que los spreads se sobrescriban entre sí.
  // buildFiltersWhere puede generar AND (para mixed null+real values),
  // fullNameAndCondition puede generar AND (para filtro de nombre),
  // extraAndConditions puede generar AND (para BigInt/M:M con mixed null+real values).
  const filtersWhereAndConditions = (filtersWhere.AND as Record<string, unknown>[] | undefined) ?? [];
  const allAndConditions = [...filtersWhereAndConditions, ...fullNameAndCondition, ...extraAndConditions];
  const { AND: _discarded, ...filtersWhereWithoutAnd } = filtersWhere as Record<string, unknown> & {
    AND?: unknown;
  };

  return {
    company_id: companyId,
    is_active: isActive,
    ...searchWhere,
    ...filtersWhereWithoutAnd,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...bigintFilters,
    ...m2mFilters,
    ...(allAndConditions.length > 0 ? { AND: allAndConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getEmployeesPaginated(searchParams: DataTableSearchParams, isActive: boolean) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(companyId, isActive, state);

    // Safe orderBy: multi-sort, solo campos válidos, con FK_SORT_MAP
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }
    const safeOrderBy = [...resolvedSorts, { lastname: 'asc' as const }];

    const [data, total] = await Promise.all([
      prisma.employees.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: EMPLOYEE_SELECT,
      }),
      prisma.employees.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener empleados paginados', { data: { error } });
    throw new Error(`Error al obtener los empleados: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// EXPORT QUERY (all data, no pagination)
// ============================================================================

export async function getAllEmployeesForExport(searchParams: DataTableSearchParams, isActive: boolean) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const where = buildWhereClause(companyId, isActive, state);

    const data = await prisma.employees.findMany({
      orderBy: [{ lastname: 'asc' }],
      where,
      select: EMPLOYEE_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar empleados', { data: { error } });
    throw new Error('Error al exportar los empleados');
  }
}

// ============================================================================
// FACETS (con cross-filtering)
// ============================================================================

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro,
 * mostrando cuántos registros tendría cada opción si se cambiara solo ese filtro.
 */
export async function getEmployeesFacets(isActive: boolean, searchParams?: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  const baseWhere = { company_id: companyId, is_active: isActive };

  // Parsear filtros activos si los hay
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
    return buildWhereClause(companyId, isActive, modified);
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

  try {
    // Round 1: groupBy con cross-filter WHERE por columna
    const [
      statusCounts,
      genderCounts,
      nationalityCounts,
      documentTypeCounts,
      maritalStatusCounts,
      levelOfEducationCounts,
      costTypeCounts,
      affiliateStatusCounts,
      reasonForTerminationCounts,
      isActiveCounts,
      hierarchyCounts,
      companyPositionCounts,
      typeOfContractCounts,
      workDiagramCounts,
      workshopSectorCounts,
      categoryCounts,
      covenantCounts,
      guildCounts,
      costCenterCounts,
      countryCounts,
      provinceCounts,
      cityCounts,
      // M:M queries (parallelized — previously ran sequentially after Round 2)
      contractorRelations,
      allContractorRels,
      totalInContractorCross,
      withContractor,
      aptitudRelations,
      allAptitudRels,
      totalInAptitudCross,
      withAptitud,
    ] = await Promise.all([
      prisma.employees.groupBy({ by: ['status'], where: crossWhere('status'), _count: true }),
      prisma.employees.groupBy({ by: ['gender'], where: crossWhere('gender'), _count: true }),
      prisma.employees.groupBy({ by: ['nationality'], where: crossWhere('nationality'), _count: true }),
      prisma.employees.groupBy({ by: ['document_type'], where: crossWhere('document_type'), _count: true }),
      prisma.employees.groupBy({ by: ['marital_status'], where: crossWhere('marital_status'), _count: true }),
      prisma.employees.groupBy({
        by: ['level_of_education'],
        where: crossWhere('level_of_education'),
        _count: true,
      }),
      prisma.employees.groupBy({ by: ['cost_type'], where: crossWhere('cost_type'), _count: true }),
      prisma.employees.groupBy({ by: ['affiliate_status'], where: crossWhere('affiliate_status'), _count: true }),
      prisma.employees.groupBy({
        by: ['reason_for_termination'],
        where: crossWhere('reason_for_termination'),
        _count: true,
      }),
      prisma.employees.groupBy({ by: ['is_active'], where: crossWhere('is_active'), _count: true }),
      prisma.employees.groupBy({
        by: ['hierarchical_position'],
        where: crossWhere('hierarchy'),
        _count: true,
      }),
      prisma.employees.groupBy({
        by: ['company_position'],
        where: crossWhere('company_positions'),
        _count: true,
      }),
      prisma.employees.groupBy({
        by: ['type_of_contract'],
        where: crossWhere('types_of_contract'),
        _count: true,
      }),
      prisma.employees.groupBy({ by: ['workflow_diagram'], where: crossWhere('work_diagram'), _count: true }),
      prisma.employees.groupBy({
        by: ['workshop_sector_id'],
        where: crossWhere('workshop_sectors'),
        _count: true,
      }),
      prisma.employees.groupBy({ by: ['category_id'], where: crossWhere('category'), _count: true }),
      prisma.employees.groupBy({ by: ['covenants_id'], where: crossWhere('covenant'), _count: true }),
      prisma.employees.groupBy({ by: ['guild_id'], where: crossWhere('guild'), _count: true }),
      prisma.employees.groupBy({ by: ['cost_center_id'], where: crossWhere('cost_center'), _count: true }),
      prisma.employees.groupBy({ by: ['birthplace'], where: crossWhere('countries'), _count: true }),
      prisma.employees.groupBy({ by: ['province'], where: crossWhere('province'), _count: true }),
      prisma.employees.groupBy({ by: ['city'], where: crossWhere('city'), _count: true }),
      // M:M contractor queries (parallelized with groupBy)
      prisma.contractor_employee.findMany({
        where: { employees: crossWhere('contractor_employee') },
        select: { contractor_id: true, customers: { select: { id: true, name: true } } },
        distinct: ['contractor_id'],
      }),
      prisma.contractor_employee.findMany({
        where: { employees: crossWhere('contractor_employee') },
        select: { contractor_id: true },
      }),
      prisma.employees.count({ where: crossWhere('contractor_employee') }),
      prisma.employees.count({
        where: { ...crossWhere('contractor_employee'), contractor_employee: { some: {} } },
      }),
      // M:M aptitud queries (parallelized with groupBy)
      prisma.empleado_aptitudes.findMany({
        where: { employees: crossWhere('empleado_aptitudes') },
        select: { aptitud_id: true, aptitudes_tecnicas: { select: { id: true, nombre: true } } },
        distinct: ['aptitud_id'],
      }),
      prisma.empleado_aptitudes.findMany({
        where: { employees: crossWhere('empleado_aptitudes') },
        select: { aptitud_id: true },
      }),
      prisma.employees.count({ where: crossWhere('empleado_aptitudes') }),
      prisma.employees.count({
        where: { ...crossWhere('empleado_aptitudes'), empleado_aptitudes: { some: {} } },
      }),
    ]);

    // Round 2: resolver nombres de FK (solo IDs que aparecen en los counts)
    const hierarchyIds = hierarchyCounts.map((r) => r.hierarchical_position).filter(Boolean) as string[];
    const companyPositionIds = companyPositionCounts.map((r) => r.company_position).filter(Boolean) as string[];
    const typeOfContractIds = typeOfContractCounts.map((r) => r.type_of_contract).filter(Boolean) as string[];
    const workDiagramIds = workDiagramCounts.map((r) => r.workflow_diagram).filter(Boolean) as string[];
    const workshopSectorIds = workshopSectorCounts.map((r) => r.workshop_sector_id).filter(Boolean) as string[];
    const categoryIds = categoryCounts.map((r) => r.category_id).filter(Boolean) as string[];
    const covenantIds = covenantCounts.map((r) => r.covenants_id).filter(Boolean) as string[];
    const guildIds = guildCounts.map((r) => r.guild_id).filter(Boolean) as string[];
    const costCenterIds = costCenterCounts.map((r) => r.cost_center_id).filter(Boolean) as string[];
    const countryIds = countryCounts.map((r) => r.birthplace).filter(Boolean) as string[];
    const provinceIds = provinceCounts.map((r) => r.province).filter(Boolean) as bigint[];
    const cityIds = cityCounts.map((r) => r.city).filter(Boolean) as bigint[];

    const [
      hierarchyOptions,
      companyPositionOptions,
      typeOfContractOptions,
      workDiagramOptions,
      workshopSectorOptions,
      categoryOptions,
      covenantOptions,
      guildOptions,
      costCenterOptions,
      countryOptions,
      provinceOptions,
      cityOptions,
    ] = await Promise.all([
      hierarchyIds.length > 0
        ? prisma.hierarchy.findMany({ where: { id: { in: hierarchyIds } }, select: { id: true, name: true } })
        : [],
      companyPositionIds.length > 0
        ? prisma.company_positions.findMany({
            where: { id: { in: companyPositionIds } },
            select: { id: true, name: true },
          })
        : [],
      typeOfContractIds.length > 0
        ? prisma.types_of_contract.findMany({
            where: { id: { in: typeOfContractIds } },
            select: { id: true, name: true },
          })
        : [],
      workDiagramIds.length > 0
        ? prisma.work_diagram.findMany({
            where: { id: { in: workDiagramIds } },
            select: { id: true, name: true },
          })
        : [],
      workshopSectorIds.length > 0
        ? prisma.workshop_sectors.findMany({
            where: { id: { in: workshopSectorIds } },
            select: { id: true, name: true },
          })
        : [],
      categoryIds.length > 0
        ? prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
        : [],
      covenantIds.length > 0
        ? prisma.covenant.findMany({ where: { id: { in: covenantIds } }, select: { id: true, name: true } })
        : [],
      guildIds.length > 0
        ? prisma.guild.findMany({ where: { id: { in: guildIds } }, select: { id: true, name: true } })
        : [],
      costCenterIds.length > 0
        ? prisma.cost_center.findMany({
            where: { id: { in: costCenterIds } },
            select: { id: true, name: true },
          })
        : [],
      countryIds.length > 0
        ? prisma.countries.findMany({ where: { id: { in: countryIds } }, select: { id: true, name: true } })
        : [],
      provinceIds.length > 0
        ? prisma.provinces.findMany({ where: { id: { in: provinceIds } }, select: { id: true, name: true } })
        : [],
      cityIds.length > 0
        ? prisma.cities.findMany({ where: { id: { in: cityIds } }, select: { id: true, name: true } })
        : [],
    ]);

    // M:M facets processing (queries already ran in parallel in Round 1)
    const contractorIds = contractorRelations.map((r) => r.contractor_id).filter(Boolean) as string[];
    const contractorCountMap = new Map<string, number>();
    for (const rel of allContractorRels) {
      if (rel.contractor_id) {
        contractorCountMap.set(rel.contractor_id, (contractorCountMap.get(rel.contractor_id) ?? 0) + 1);
      }
    }
    const unassignedContractorCount = totalInContractorCross - withContractor;
    if (unassignedContractorCount > 0) {
      contractorCountMap.set(NULL_FILTER_VALUE, unassignedContractorCount);
    }

    const aptitudCountMap = new Map<string, number>();
    for (const rel of allAptitudRels) {
      if (rel.aptitud_id) {
        aptitudCountMap.set(rel.aptitud_id, (aptitudCountMap.get(rel.aptitud_id) ?? 0) + 1);
      }
    }
    const unassignedAptitudCount = totalInAptitudCross - withAptitud;
    if (unassignedAptitudCount > 0) {
      aptitudCountMap.set(NULL_FILTER_VALUE, unassignedAptitudCount);
    }

    return {
      // Enum facets (Map<string, number>)
      status: toFacetMap(statusCounts.map((r) => ({ key: r.status, count: r._count }))),
      gender: toFacetMap(genderCounts.map((r) => ({ key: r.gender, count: r._count }))),
      nationality: toFacetMap(nationalityCounts.map((r) => ({ key: r.nationality, count: r._count }))),
      document_type: toFacetMap(documentTypeCounts.map((r) => ({ key: r.document_type, count: r._count }))),
      marital_status: toFacetMap(maritalStatusCounts.map((r) => ({ key: r.marital_status, count: r._count }))),
      level_of_education: toFacetMap(
        levelOfEducationCounts.map((r) => ({ key: r.level_of_education, count: r._count }))
      ),
      cost_type: toFacetMap(costTypeCounts.map((r) => ({ key: r.cost_type, count: r._count }))),
      affiliate_status: toFacetMap(affiliateStatusCounts.map((r) => ({ key: r.affiliate_status, count: r._count }))),
      reason_for_termination: toFacetMap(
        reasonForTerminationCounts.map((r) => ({ key: r.reason_for_termination, count: r._count }))
      ),
      is_active: toFacetMap(isActiveCounts.map((r) => ({ key: String(r.is_active), count: r._count }))),
      // FK facets (UUID)
      hierarchy: toFacetMap(hierarchyCounts.map((r) => ({ key: r.hierarchical_position, count: r._count }))),
      hierarchyOptions,
      company_positions: toFacetMap(companyPositionCounts.map((r) => ({ key: r.company_position, count: r._count }))),
      companyPositionOptions,
      types_of_contract: toFacetMap(typeOfContractCounts.map((r) => ({ key: r.type_of_contract, count: r._count }))),
      typeOfContractOptions,
      work_diagram: toFacetMap(workDiagramCounts.map((r) => ({ key: r.workflow_diagram, count: r._count }))),
      workDiagramOptions,
      workshop_sectors: toFacetMap(workshopSectorCounts.map((r) => ({ key: r.workshop_sector_id, count: r._count }))),
      workshopSectorOptions,
      category: toFacetMap(categoryCounts.map((r) => ({ key: r.category_id, count: r._count }))),
      categoryOptions,
      covenant: toFacetMap(covenantCounts.map((r) => ({ key: r.covenants_id, count: r._count }))),
      covenantOptions,
      guild: toFacetMap(guildCounts.map((r) => ({ key: r.guild_id, count: r._count }))),
      guildOptions,
      cost_center: toFacetMap(costCenterCounts.map((r) => ({ key: r.cost_center_id, count: r._count }))),
      costCenterOptions,
      countries: toFacetMap(countryCounts.map((r) => ({ key: r.birthplace, count: r._count }))),
      countryOptions,
      // FK facets (BigInt)
      province: toFacetMap(provinceCounts.map((r) => ({ key: r.province, count: r._count }))),
      provinceOptions,
      city: toFacetMap(cityCounts.map((r) => ({ key: r.city, count: r._count }))),
      cityOptions,
      // M:M facets
      contractor_employee: contractorCountMap,
      contractorOptions: contractorRelations
        .filter((r) => r.contractor_id && contractorIds.includes(r.contractor_id) && r.customers)
        .map((r) => ({ id: r.customers!.id, name: r.customers!.name })),
      empleado_aptitudes: aptitudCountMap,
      aptitudOptions: aptitudRelations
        .filter((r) => r.aptitud_id && r.aptitudes_tecnicas)
        .map((r) => ({ id: r.aptitudes_tecnicas!.id, name: r.aptitudes_tecnicas!.nombre })),
    };
  } catch (error) {
    logger.error('Error al obtener facets de empleados', { data: { error } });
    return null;
  }
}

// ============================================================================
// EXPORTED TYPES
// ============================================================================

// ============================================================================
// SINGLE FACET (lazy-load individual)
// ============================================================================

/**
 * Obtiene opciones y counts para UN SOLO filtro facetado, con cross-filtering.
 * Diseñado para lazy-load: cada filtro llama a esta función al abrirse.
 */
export async function getEmployeeSingleFacet(
  columnId: string,
  isActive: boolean,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  const companyId = await getServerCompanyId();
  const baseWhere = { company_id: companyId, is_active: isActive };

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete parsedState.filters[key];
    }
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) return baseWhere;
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildWhereClause(companyId, isActive, modified);
  }

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

  try {
    const where = crossWhere(columnId);

    // ── Enum columns (direct field on employees) ──
    const ENUM_COLUMN_TO_FIELD: Record<string, string> = {
      status: 'status',
      gender: 'gender',
      nationality: 'nationality',
      document_type: 'document_type',
      marital_status: 'marital_status',
      level_of_education: 'level_of_education',
      cost_type: 'cost_type',
      affiliate_status: 'affiliate_status',
      reason_for_termination: 'reason_for_termination',
    };

    if (columnId in ENUM_COLUMN_TO_FIELD) {
      const field = ENUM_COLUMN_TO_FIELD[columnId]!;
      const rows = await prisma.employees.groupBy({
        by: [field as 'status'],
        where,
        _count: true,
      });
      return {
        counts: toFacetMap(
          rows.map((r) => ({ key: (r as Record<string, unknown>)[field] as string | null, count: r._count }))
        ),
      };
    }

    // ── Boolean ──
    if (columnId === 'is_active') {
      const rows = await prisma.employees.groupBy({ by: ['is_active'], where, _count: true });
      return {
        counts: toFacetMap(rows.map((r) => ({ key: String(r.is_active), count: r._count }))),
      };
    }

    // ── FK UUID columns ──
    const FK_UUID_CONFIG: Record<
      string,
      {
        prismaField: string;
        resolver: (ids: string[]) => Promise<Array<{ id: string; name: string | null }>>;
      }
    > = {
      hierarchy: {
        prismaField: 'hierarchical_position',
        resolver: (ids) => prisma.hierarchy.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      },
      company_positions: {
        prismaField: 'company_position',
        resolver: (ids) =>
          prisma.company_positions.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      },
      types_of_contract: {
        prismaField: 'type_of_contract',
        resolver: (ids) =>
          prisma.types_of_contract.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      },
      work_diagram: {
        prismaField: 'workflow_diagram',
        resolver: (ids) =>
          prisma.work_diagram.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      },
      workshop_sectors: {
        prismaField: 'workshop_sector_id',
        resolver: (ids) =>
          prisma.workshop_sectors.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      },
      category: {
        prismaField: 'category_id',
        resolver: (ids) => prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      },
      covenant: {
        prismaField: 'covenants_id',
        resolver: (ids) => prisma.covenant.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      },
      guild: {
        prismaField: 'guild_id',
        resolver: (ids) => prisma.guild.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      },
      cost_center: {
        prismaField: 'cost_center_id',
        resolver: (ids) =>
          prisma.cost_center.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      },
      countries: {
        prismaField: 'birthplace',
        resolver: (ids) => prisma.countries.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      },
    };

    if (columnId in FK_UUID_CONFIG) {
      const config = FK_UUID_CONFIG[columnId]!;
      const rows = await prisma.employees.groupBy({
        by: [config.prismaField as 'hierarchical_position'],
        where,
        _count: true,
      });
      const counts = toFacetMap(
        rows.map((r) => ({
          key: (r as Record<string, unknown>)[config.prismaField] as string | null,
          count: r._count,
        }))
      );
      const ids = rows.map((r) => (r as Record<string, unknown>)[config.prismaField]).filter(Boolean) as string[];
      const resolvedOptions = ids.length > 0 ? await config.resolver(ids) : [];
      return { counts, resolvedOptions };
    }

    // ── FK BigInt columns ──
    if (columnId === 'province') {
      const rows = await prisma.employees.groupBy({ by: ['province'], where, _count: true });
      const counts = toFacetMap(rows.map((r) => ({ key: r.province, count: r._count })));
      const ids = rows.map((r) => r.province).filter(Boolean) as bigint[];
      const resolvedOptions =
        ids.length > 0
          ? (await prisma.provinces.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map(
              (p) => ({ id: String(p.id), name: p.name })
            )
          : [];
      return { counts, resolvedOptions };
    }

    if (columnId === 'city') {
      const rows = await prisma.employees.groupBy({ by: ['city'], where, _count: true });
      const counts = toFacetMap(rows.map((r) => ({ key: r.city, count: r._count })));
      const ids = rows.map((r) => r.city).filter(Boolean) as bigint[];
      const resolvedOptions =
        ids.length > 0
          ? (await prisma.cities.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map(
              (c) => ({ id: String(c.id), name: c.name })
            )
          : [];
      return { counts, resolvedOptions };
    }

    // ── M:M: contractor_employee ──
    if (columnId === 'contractor_employee') {
      const [relations, allRels, totalInCross, withSome] = await Promise.all([
        prisma.contractor_employee.findMany({
          where: { employees: where },
          select: { contractor_id: true, customers: { select: { id: true, name: true } } },
          distinct: ['contractor_id'],
        }),
        prisma.contractor_employee.findMany({
          where: { employees: where },
          select: { contractor_id: true },
        }),
        prisma.employees.count({ where }),
        prisma.employees.count({ where: { ...where, contractor_employee: { some: {} } } }),
      ]);

      const countMap = new Map<string, number>();
      for (const rel of allRels) {
        if (rel.contractor_id) {
          countMap.set(rel.contractor_id, (countMap.get(rel.contractor_id) ?? 0) + 1);
        }
      }
      const unassigned = totalInCross - withSome;
      if (unassigned > 0) countMap.set(NULL_FILTER_VALUE, unassigned);

      const resolvedOptions = relations
        .filter((r) => r.contractor_id && r.customers)
        .map((r) => ({ id: r.customers!.id, name: r.customers!.name }));

      return { counts: countMap, resolvedOptions };
    }

    // ── M:M: empleado_aptitudes ──
    if (columnId === 'empleado_aptitudes') {
      const [relations, allRels, totalInCross, withSome] = await Promise.all([
        prisma.empleado_aptitudes.findMany({
          where: { employees: where },
          select: { aptitud_id: true, aptitudes_tecnicas: { select: { id: true, nombre: true } } },
          distinct: ['aptitud_id'],
        }),
        prisma.empleado_aptitudes.findMany({
          where: { employees: where },
          select: { aptitud_id: true },
        }),
        prisma.employees.count({ where }),
        prisma.employees.count({ where: { ...where, empleado_aptitudes: { some: {} } } }),
      ]);

      const countMap = new Map<string, number>();
      for (const rel of allRels) {
        if (rel.aptitud_id) {
          countMap.set(rel.aptitud_id, (countMap.get(rel.aptitud_id) ?? 0) + 1);
        }
      }
      const unassigned = totalInCross - withSome;
      if (unassigned > 0) countMap.set(NULL_FILTER_VALUE, unassigned);

      const resolvedOptions = relations
        .filter((r) => r.aptitud_id && r.aptitudes_tecnicas)
        .map((r) => ({ id: r.aptitudes_tecnicas!.id, name: r.aptitudes_tecnicas!.nombre }));

      return { counts: countMap, resolvedOptions };
    }

    logger.warn('Facet column not recognized', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error al obtener facet individual', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type EmployeeListItem = Awaited<ReturnType<typeof getEmployeesPaginated>>['data'][number];
export type EmployeeFacets = Awaited<ReturnType<typeof getEmployeesFacets>>;
