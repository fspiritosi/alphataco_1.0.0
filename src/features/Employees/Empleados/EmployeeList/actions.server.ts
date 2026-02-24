'use server';

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
]);

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
// PAGINATED QUERY
// ============================================================================

export async function getEmployeesPaginated(searchParams: DataTableSearchParams, isActive: boolean) {
  const companyId = await getServerCompanyId();
  const state = parseSearchParams(searchParams);
  // Remove navigation params that are not table filters
  for (const key of IGNORED_PARAMS) {
    delete state.filters[key];
  }
  const { skip, take } = stateToPrismaParams(state);

  // Build where clauses
  const searchWhere = buildSearchWhere(state.search, ['lastname', 'firstname', 'cuil', 'file']);

  // Columns handled separately (BigInt FK, M:M) must be excluded from generic filter builder
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

  // Handle fullName text filter separately (search on both lastname and firstname)
  const fullNameFilter = state.filters['fullName']?.[0];
  let fullNameWhere = {};
  if (fullNameFilter) {
    fullNameWhere = {
      OR: [
        { lastname: { contains: fullNameFilter, mode: 'insensitive' as const } },
        { firstname: { contains: fullNameFilter, mode: 'insensitive' as const } },
        { full_name: { contains: fullNameFilter, mode: 'insensitive' as const } },
      ],
    };
    // Remove fullName from textFiltersWhere since we handle it custom
    delete (textFiltersWhere as Record<string, unknown>)['full_name'];
  }

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // Handle BigInt FK filters (province, city) with null support
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

  // Handle M:M filters with null support
  const m2mFilters: Record<string, unknown> = {};

  // contractor_employee
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

  // empleado_aptitudes
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

  const where = {
    company_id: companyId,
    is_active: isActive,
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...fullNameWhere,
    ...dateFiltersWhere,
    ...bigintFilters,
    ...m2mFilters,
    ...(extraAndConditions.length > 0 ? { AND: extraAndConditions } : {}),
  };

  // Safe orderBy: multi-sort, solo campos válidos
  const resolvedSorts: Record<string, unknown>[] = [];
  for (const s of state.sorting) {
    if (VALID_SORT_FIELDS.has(s.id)) {
      resolvedSorts.push({ [s.id]: s.desc ? 'desc' : 'asc' });
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
}

// ============================================================================
// EXPORT QUERY (all data, no pagination)
// ============================================================================

export async function getAllEmployeesForExport(searchParams: DataTableSearchParams, isActive: boolean) {
  const companyId = await getServerCompanyId();
  const state = parseSearchParams(searchParams);
  // Remove navigation params that are not table filters
  for (const key of IGNORED_PARAMS) {
    delete state.filters[key];
  }

  // Same filter logic as getEmployeesPaginated
  const searchWhere = buildSearchWhere(state.search, ['lastname', 'firstname', 'cuil', 'file']);

  // Columns handled separately (BigInt FK, M:M) must be excluded from generic filter builder
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

  const fullNameFilter = state.filters['fullName']?.[0];
  let fullNameWhere = {};
  if (fullNameFilter) {
    fullNameWhere = {
      OR: [
        { lastname: { contains: fullNameFilter, mode: 'insensitive' as const } },
        { firstname: { contains: fullNameFilter, mode: 'insensitive' as const } },
        { full_name: { contains: fullNameFilter, mode: 'insensitive' as const } },
      ],
    };
    delete (textFiltersWhere as Record<string, unknown>)['full_name'];
  }

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // Handle BigInt FK filters with null support
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

  // Handle M:M filters with null support
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

  const cleanedFiltersWhere = { ...filtersWhere };
  delete (cleanedFiltersWhere as Record<string, unknown>)['province'];
  delete (cleanedFiltersWhere as Record<string, unknown>)['city'];
  delete (cleanedFiltersWhere as Record<string, unknown>)['contractor_employee'];
  delete (cleanedFiltersWhere as Record<string, unknown>)['empleado_aptitudes'];

  const where = {
    company_id: companyId,
    is_active: isActive,
    ...searchWhere,
    ...cleanedFiltersWhere,
    ...textFiltersWhere,
    ...fullNameWhere,
    ...dateFiltersWhere,
    ...bigintFilters,
    ...m2mFilters,
    ...(extraAndConditions.length > 0 ? { AND: extraAndConditions } : {}),
  };

  const data = await prisma.employees.findMany({
    orderBy: [{ lastname: 'asc' }],
    where,
    select: EMPLOYEE_SELECT,
  });

  return data;
}

// ============================================================================
// FACETS
// ============================================================================

export async function getEmployeesFacets(isActive: boolean) {
  const companyId = await getServerCompanyId();
  const baseWhere = { company_id: companyId, is_active: isActive };

  // Round 1: groupBy for enums + FK UUIDs + BigInt FKs
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
  ] = await Promise.all([
    prisma.employees.groupBy({ by: ['status'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['gender'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['nationality'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['document_type'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['marital_status'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['level_of_education'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['cost_type'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['affiliate_status'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['reason_for_termination'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['hierarchical_position'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['company_position'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['type_of_contract'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['workflow_diagram'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['workshop_sector_id'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['category_id'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['covenants_id'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['guild_id'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['cost_center_id'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['birthplace'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['province'], where: baseWhere, _count: true }),
    prisma.employees.groupBy({ by: ['city'], where: baseWhere, _count: true }),
  ]);

  // Round 2: resolve FK names (only for IDs with data)
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
    contractorOptions,
    aptitudOptions,
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
      ? prisma.work_diagram.findMany({ where: { id: { in: workDiagramIds } }, select: { id: true, name: true } })
      : [],
    workshopSectorIds.length > 0
      ? prisma.workshop_sectors.findMany({ where: { id: { in: workshopSectorIds } }, select: { id: true, name: true } })
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
      ? prisma.cost_center.findMany({ where: { id: { in: costCenterIds } }, select: { id: true, name: true } })
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
    // M:M: contractors via contractor_employee
    prisma.contractor_employee.findMany({
      where: { employees: { company_id: companyId, is_active: isActive } },
      distinct: ['contractor_id'],
      select: {
        contractor_id: true,
        customers: { select: { id: true, name: true } },
      },
    }),
    // M:M: aptitudes via empleado_aptitudes
    prisma.empleado_aptitudes.findMany({
      where: { employees: { company_id: companyId, is_active: isActive } },
      distinct: ['aptitud_id'],
      select: {
        aptitud_id: true,
        aptitudes_tecnicas: { select: { id: true, nombre: true } },
      },
    }),
  ]);

  // Build enum counts (value → count), including null bucket
  // IMPORTANT: Returns Record (plain object) instead of Map to ensure proper
  // serialization when returned from server actions via React Flight protocol.
  const buildEnumCounts = <T extends Record<string, unknown>>(rows: T[], key: keyof T): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const val = row[key];
      if (val == null) {
        counts[NULL_FILTER_VALUE] =
          (counts[NULL_FILTER_VALUE] ?? 0) + ((row as Record<string, unknown>)._count as number);
      } else {
        counts[String(val)] = (row as Record<string, unknown>)._count as number;
      }
    }
    return counts;
  };

  // Build FK counts (fkId → count), including null bucket
  const buildFkCounts = <T extends Record<string, unknown>>(rows: T[], key: keyof T): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const val = row[key];
      if (val == null) {
        counts[NULL_FILTER_VALUE] =
          (counts[NULL_FILTER_VALUE] ?? 0) + ((row as Record<string, unknown>)._count as number);
      } else {
        counts[String(val)] = (row as Record<string, unknown>)._count as number;
      }
    }
    return counts;
  };

  // Build FK options (id + name)
  const buildFkOptions = (items: Array<{ id: string; name: string | null }>) =>
    items.map((i) => ({ value: i.id, label: i.name ?? '-' }));

  const buildBigIntFkOptions = (items: Array<{ id: bigint; name: string }>) =>
    items.map((i) => ({ value: String(i.id), label: i.name }));

  // Get contractor counts (need separate query since it's M:M)
  const [contractorCountsRaw, noContractorCount] = await Promise.all([
    prisma.contractor_employee.groupBy({
      by: ['contractor_id'],
      where: { employees: { company_id: companyId, is_active: isActive } },
      _count: true,
    }),
    prisma.employees.count({
      where: { ...baseWhere, contractor_employee: { none: {} } },
    }),
  ]);
  const contractorCounts: Record<string, number> = {};
  for (const r of contractorCountsRaw) {
    if (r.contractor_id) contractorCounts[r.contractor_id] = r._count;
  }
  if (noContractorCount > 0) {
    contractorCounts[NULL_FILTER_VALUE] = noContractorCount;
  }

  // Get aptitud counts
  const [aptitudCountsRaw, noAptitudCount] = await Promise.all([
    prisma.empleado_aptitudes.groupBy({
      by: ['aptitud_id'],
      where: { employees: { company_id: companyId, is_active: isActive } },
      _count: true,
    }),
    prisma.employees.count({
      where: { ...baseWhere, empleado_aptitudes: { none: {} } },
    }),
  ]);
  const aptitudCounts: Record<string, number> = {};
  for (const r of aptitudCountsRaw) {
    if (r.aptitud_id) aptitudCounts[r.aptitud_id] = r._count;
  }
  if (noAptitudCount > 0) {
    aptitudCounts[NULL_FILTER_VALUE] = noAptitudCount;
  }

  return {
    // Enum facets
    status: {
      counts: buildEnumCounts(statusCounts, 'status'),
    },
    gender: {
      counts: buildEnumCounts(genderCounts, 'gender'),
    },
    nationality: {
      counts: buildEnumCounts(nationalityCounts, 'nationality'),
    },
    document_type: {
      counts: buildEnumCounts(documentTypeCounts, 'document_type'),
    },
    marital_status: {
      counts: buildEnumCounts(maritalStatusCounts, 'marital_status'),
    },
    level_of_education: {
      counts: buildEnumCounts(levelOfEducationCounts, 'level_of_education'),
    },
    cost_type: {
      counts: buildEnumCounts(costTypeCounts, 'cost_type'),
    },
    affiliate_status: {
      counts: buildEnumCounts(affiliateStatusCounts, 'affiliate_status'),
    },
    reason_for_termination: {
      counts: buildEnumCounts(reasonForTerminationCounts, 'reason_for_termination'),
    },
    // FK facets (UUID)
    hierarchy: {
      counts: buildFkCounts(hierarchyCounts, 'hierarchical_position'),
      options: buildFkOptions(hierarchyOptions),
    },
    company_positions: {
      counts: buildFkCounts(companyPositionCounts, 'company_position'),
      options: buildFkOptions(companyPositionOptions),
    },
    types_of_contract: {
      counts: buildFkCounts(typeOfContractCounts, 'type_of_contract'),
      options: buildFkOptions(typeOfContractOptions),
    },
    work_diagram: {
      counts: buildFkCounts(workDiagramCounts, 'workflow_diagram'),
      options: buildFkOptions(workDiagramOptions),
    },
    workshop_sectors: {
      counts: buildFkCounts(workshopSectorCounts, 'workshop_sector_id'),
      options: buildFkOptions(workshopSectorOptions),
    },
    category: {
      counts: buildFkCounts(categoryCounts, 'category_id'),
      options: buildFkOptions(categoryOptions),
    },
    covenant: {
      counts: buildFkCounts(covenantCounts, 'covenants_id'),
      options: buildFkOptions(covenantOptions),
    },
    guild: {
      counts: buildFkCounts(guildCounts, 'guild_id'),
      options: buildFkOptions(guildOptions),
    },
    cost_center: {
      counts: buildFkCounts(costCenterCounts, 'cost_center_id'),
      options: buildFkOptions(costCenterOptions),
    },
    countries: {
      counts: buildFkCounts(countryCounts, 'birthplace'),
      options: buildFkOptions(countryOptions),
    },
    // FK facets (BigInt)
    province: {
      counts: buildFkCounts(provinceCounts, 'province'),
      options: buildBigIntFkOptions(provinceOptions),
    },
    city: {
      counts: buildFkCounts(cityCounts, 'city'),
      options: buildBigIntFkOptions(cityOptions),
    },
    // M:M facets
    contractor_employee: {
      counts: contractorCounts,
      options: contractorOptions
        .filter((c) => c.customers)
        .map((c) => ({ value: c.customers!.id, label: c.customers!.name })),
    },
    empleado_aptitudes: {
      counts: aptitudCounts,
      options: aptitudOptions
        .filter((a) => a.aptitudes_tecnicas)
        .map((a) => ({ value: a.aptitudes_tecnicas!.id, label: a.aptitudes_tecnicas!.nombre })),
    },
  };
}

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type EmployeeListItem = Awaited<ReturnType<typeof getEmployeesPaginated>>['data'][number];
export type EmployeeFacets = Awaited<ReturnType<typeof getEmployeesFacets>>;
