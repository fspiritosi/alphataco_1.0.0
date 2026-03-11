'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import {
  NULL_FILTER_VALUE,
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('Documentacion/DocumentosEmpresa/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos directos de documents_company ordenables server-side */
const VALID_SORT_FIELDS = new Set([
  'created_at',
  'state',
  'validity',
  'period',
  // FK columns (via FK_SORT_MAP)
  'documentType',
  'uploadedBy',
]);

/**
 * Mapeo de columnId → orderBy de Prisma para columnas FK.
 */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  documentType: (dir) => ({ document_types: { name: dir } }),
  uploadedBy: (dir) => ({ profile: { fullname: dir } }),
};

/** Columnas de rango de fecha */
const DATE_RANGE_COLUMNS = ['created_at'];

/**
 * Mapping de columnId → campo real en Prisma para buildFiltersWhere.
 * Solo para columnas cuyo ID en la URL difiere del campo en la BD.
 */
const COLUMN_MAP: Record<string, string> = {
  state: 'state',
  documentType: 'id_document_types',
  uploadedBy: 'user_id',
  mandatory: 'mandatory', // this is on document_types, handled separately
};

/** Select con todas las relaciones resueltas */
const COMPANY_DOC_SELECT = {
  id: true,
  created_at: true,
  state: true,
  validity: true,
  period: true,
  document_path: true,
  user_id: true,
  id_document_types: true,
  document_types: {
    select: {
      id: true,
      name: true,
      mandatory: true,
      explired: true,
      is_it_montlhy: true,
    },
  },
  profile: {
    select: {
      id: true,
      fullname: true,
      avatar: true,
    },
  },
} as const;

// ============================================================================
// INTERNAL HELPER
// ============================================================================

/**
 * Construye el WHERE clause compartido entre paginated, export y facets.
 * El parámetro `excludeColumn` permite el cross-filtering en facets.
 */
function buildWhereClause(
  companyId: string,
  isMonthly: boolean,
  state: ReturnType<typeof parseSearchParams>,
  excludeColumn?: string
) {
  // Filtros activos, sin la columna excluida (para cross-filtering)
  const activeFilters = excludeColumn
    ? (() => {
        const f = { ...state.filters };
        delete f[excludeColumn];
        delete f[`${excludeColumn}_from`];
        delete f[`${excludeColumn}_to`];
        return f;
      })()
    : state.filters;

  const stateForFilter = { ...state, filters: activeFilters };

  // Búsqueda global: busca en document_types.name (relación) — se agrega via searchOrCondition
  const searchTerm = stateForFilter.search;
  const searchOrCondition: Record<string, unknown>[] = searchTerm
    ? [
        {
          document_types: {
            name: { contains: searchTerm, mode: 'insensitive' as const },
          },
        },
      ]
    : [];

  // Filtros facetados directos
  const facetedWhere = buildFiltersWhere(activeFilters, COLUMN_MAP, {
    exclude: [
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      'mandatory',
      'documentType',
      'uploadedBy',
    ],
  });

  // Date range
  const dateFiltersWhere = buildDateRangeFiltersWhere(activeFilters, DATE_RANGE_COLUMNS);

  // FK filters (documentType, uploadedBy) — map to real Prisma field
  const fkFilters: Record<string, unknown> = {};
  const docTypeValues = activeFilters['documentType'];
  if (docTypeValues?.length) {
    const hasNull = docTypeValues.includes(NULL_FILTER_VALUE);
    const realValues = docTypeValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // Mixed null + real → handled via AND below
    } else if (hasNull) {
      fkFilters['id_document_types'] = null;
    } else {
      fkFilters['id_document_types'] = realValues.length === 1 ? realValues[0] : { in: realValues };
    }
  }

  const uploadedByValues = activeFilters['uploadedBy'];
  if (uploadedByValues?.length) {
    const hasNull = uploadedByValues.includes(NULL_FILTER_VALUE);
    const realValues = uploadedByValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // Mixed null + real → handled via AND below
    } else if (hasNull) {
      fkFilters['user_id'] = null;
    } else {
      fkFilters['user_id'] = realValues.length === 1 ? realValues[0] : { in: realValues };
    }
  }

  // Mandatory filter — on nested document_types
  const mandatoryValues = activeFilters['mandatory'];
  let mandatoryFilter: Record<string, unknown> = {};
  if (mandatoryValues?.length) {
    const mandatoryBool = mandatoryValues[0] === 'true';
    mandatoryFilter = { document_types: { mandatory: mandatoryBool } };
  }

  // Extra AND conditions for mixed null+real FK values
  const extraAndConditions: Record<string, unknown>[] = [];
  if (docTypeValues?.includes(NULL_FILTER_VALUE) && docTypeValues.filter((v) => v !== NULL_FILTER_VALUE).length > 0) {
    const realValues = docTypeValues.filter((v) => v !== NULL_FILTER_VALUE);
    extraAndConditions.push({
      OR: [
        { id_document_types: realValues.length === 1 ? realValues[0] : { in: realValues } },
        { id_document_types: null },
      ],
    });
  }
  if (
    uploadedByValues?.includes(NULL_FILTER_VALUE) &&
    uploadedByValues.filter((v) => v !== NULL_FILTER_VALUE).length > 0
  ) {
    const realValues = uploadedByValues.filter((v) => v !== NULL_FILTER_VALUE);
    extraAndConditions.push({
      OR: [{ user_id: realValues.length === 1 ? realValues[0] : { in: realValues } }, { user_id: null }],
    });
  }
  if (searchOrCondition.length > 0) {
    extraAndConditions.push({ OR: searchOrCondition });
  }

  const filtersWhereAndConditions = (facetedWhere.AND as Record<string, unknown>[] | undefined) ?? [];
  const allAndConditions = [...filtersWhereAndConditions, ...extraAndConditions];
  const { AND: _discarded, ...facetedWhereWithoutAnd } = facetedWhere as Record<string, unknown> & {
    AND?: unknown;
  };

  return {
    applies: companyId,
    document_types: {
      is_it_montlhy: isMonthly,
      private: false,
      ...(mandatoryValues?.length ? { mandatory: mandatoryValues[0] === 'true' } : {}),
    },
    ...facetedWhereWithoutAnd,
    ...dateFiltersWhere,
    ...fkFilters,
    ...(allAndConditions.length > 0 ? { AND: allAndConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getCompanyDocsPaginated(searchParams: DataTableSearchParams, isMonthly: boolean) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    // Remove navigation params
    delete state.filters['tab'];
    delete state.filters['subtab'];

    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(companyId, isMonthly, state);

    // Safe multi-sort: only valid fields, FK via FK_SORT_MAP
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }
    const safeOrderBy = [...resolvedSorts, { document_types: { name: 'asc' as const } }];

    const [data, total] = await Promise.all([
      prisma.documents_company.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: COMPANY_DOC_SELECT,
      }),
      prisma.documents_company.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener documentos de empresa paginados', { data: { error, isMonthly } });
    throw new Error(`Error al obtener los documentos: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// EXPORT QUERY (all data, no pagination)
// ============================================================================

export async function getAllCompanyDocsForExport(searchParams: DataTableSearchParams, isMonthly: boolean) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    delete state.filters['tab'];
    delete state.filters['subtab'];

    const where = buildWhereClause(companyId, isMonthly, state);

    const data = await prisma.documents_company.findMany({
      orderBy: [{ document_types: { name: 'asc' } }],
      where,
      select: COMPANY_DOC_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar documentos de empresa', { data: { error, isMonthly } });
    throw new Error('Error al exportar los documentos');
  }
}

// ============================================================================
// FACETS (con cross-filtering)
// ============================================================================

/**
 * Helper: convierte groupBy results a Map<string, number> con soporte para null.
 */
function toFacetMap(rows: { key: string | null | undefined; count: number }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const { key, count } of rows) {
    if (key == null) {
      map.set(NULL_FILTER_VALUE, (map.get(NULL_FILTER_VALUE) ?? 0) + count);
    } else {
      map.set(key, count);
    }
  }
  return map;
}

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro.
 */
export async function getCompanyDocsFacets(isMonthly: boolean, searchParams?: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
    delete parsedState.filters['tab'];
    delete parsedState.filters['subtab'];
  }

  // Helper: WHERE con todos los filtros excepto el de la columna indicada
  function crossWhere(excludeColumn: string) {
    if (!parsedState) return buildWhereClause(companyId, isMonthly, parseSearchParams({}));
    return buildWhereClause(companyId, isMonthly, parsedState, excludeColumn);
  }

  try {
    // State counts
    const stateCounts = await prisma.documents_company.groupBy({
      by: ['state'],
      where: crossWhere('state'),
      _count: true,
    });

    // User_id counts (uploadedBy)
    const uploadedByCounts = await prisma.documents_company.groupBy({
      by: ['user_id'],
      where: crossWhere('uploadedBy'),
      _count: true,
    });

    // document_type counts — need to count by id_document_types
    const docTypeCounts = await prisma.documents_company.groupBy({
      by: ['id_document_types'],
      where: crossWhere('documentType'),
      _count: true,
    });

    // Mandatory — count per boolean value (from document_types)
    const mandatoryTrueCount = await prisma.documents_company.count({
      where: {
        ...crossWhere('mandatory'),
        document_types: {
          ...(crossWhere('mandatory') as { document_types?: Record<string, unknown> }).document_types,
          mandatory: true,
        },
      },
    });
    const mandatoryFalseCount = await prisma.documents_company.count({
      where: {
        ...crossWhere('mandatory'),
        document_types: {
          ...(crossWhere('mandatory') as { document_types?: Record<string, unknown> }).document_types,
          mandatory: false,
        },
      },
    });

    // Resolve document_types names for facet options
    const docTypeIds = docTypeCounts.map((r) => r.id_document_types).filter(Boolean) as string[];
    const docTypeOptions =
      docTypeIds.length > 0
        ? await prisma.document_types.findMany({
            where: { id: { in: docTypeIds } },
            select: { id: true, name: true },
          })
        : [];

    // Resolve profile names for uploadedBy facet
    const userIds = uploadedByCounts.map((r) => r.user_id).filter(Boolean) as string[];
    const profileOptions =
      userIds.length > 0
        ? await prisma.profile.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullname: true },
          })
        : [];

    // Build mandatory counts map
    const mandatoryCounts = new Map<string, number>();
    if (mandatoryTrueCount > 0) mandatoryCounts.set('true', mandatoryTrueCount);
    if (mandatoryFalseCount > 0) mandatoryCounts.set('false', mandatoryFalseCount);

    return {
      state: toFacetMap(stateCounts.map((r) => ({ key: r.state as string, count: r._count }))),
      documentType: toFacetMap(docTypeCounts.map((r) => ({ key: r.id_document_types, count: r._count }))),
      docTypeOptions,
      uploadedBy: toFacetMap(uploadedByCounts.map((r) => ({ key: r.user_id, count: r._count }))),
      profileOptions,
      mandatory: mandatoryCounts,
    };
  } catch (error) {
    logger.error('Error al obtener facets de documentos de empresa', { data: { error, isMonthly } });
    return null;
  }
}

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type CompanyDocListItem = Awaited<ReturnType<typeof getCompanyDocsPaginated>>['data'][number];
export type CompanyDocFacets = Awaited<ReturnType<typeof getCompanyDocsFacets>>;
