'use server';

import { Logger } from '@/lib/logger';
import { getActiveCompanyId } from '@/shared/lib/tenant';
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

const logger = new Logger('Empresa/Documentacion/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos directos de documents_company que pueden ordenarse server-side */
const VALID_SORT_FIELDS = new Set([
  'state',
  'created_at',
  'validity',
  'period',
  // FK columns (sorted via FK_SORT_MAP)
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

/** Columnas de texto libre */
const TEXT_FILTER_COLUMNS = ['period'];

/** Columnas de rango de fecha */
const DATE_RANGE_COLUMNS = ['created_at'];

/**
 * Mapping de columnId (URL) → campo real en Prisma.
 * Solo para columnas cuyo ID difiere del campo en la BD.
 */
const COLUMN_MAP: Record<string, string> = {
  documentType: 'id_document_types',
  uploadedBy: 'user_id',
  // docType and mandatory are handled manually (relation field)
};

/**
 * Columnas que requieren manejo manual (relaciones o campos derivados).
 * Estas columnas se excluyen de buildFiltersWhere y se manejan con WHERE anidado.
 */
const MANUALLY_HANDLED_COLUMNS = ['docType', 'mandatory'];

/** Select con todas las relaciones resueltas */
const DOCS_SELECT = {
  id: true,
  created_at: true,
  state: true,
  validity: true,
  period: true,
  document_path: true,
  applies: true,
  document_types: {
    select: {
      id: true,
      name: true,
      is_it_montlhy: true,
      explired: true,
      mandatory: true,
    },
  },
  profile: {
    select: {
      id: true,
      fullname: true,
    },
  },
} as const;

// ============================================================================
// HELPER INTERNO (DRY)
// ============================================================================

/** Construye el WHERE clause compartido entre paginated, export y facets. */
function buildWhereClause(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, []);

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...TEXT_FILTER_COLUMNS,
      ...MANUALLY_HANDLED_COLUMNS,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
    ],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // ── Manual: docType filter (same as documentType — FK by ID) ─────────────
  // docType and documentType both filter by id_document_types
  // documentType is handled by COLUMN_MAP, docType we handle here
  const docTypeValues = state.filters['docType'];
  const docTypeWhere = docTypeValues?.length
    ? { id_document_types: docTypeValues.length === 1 ? docTypeValues[0] : { in: docTypeValues } }
    : {};

  // ── Manual: mandatory filter (on related document_types table) ─────────────
  const mandatoryValues = state.filters['mandatory'];
  const mandatoryWhere = mandatoryValues?.length
    ? { document_types: { mandatory: mandatoryValues.includes('true') } }
    : {};

  return {
    applies: companyId,
    is_active: true,
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...docTypeWhere,
    ...mandatoryWhere,
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getCompanyDocsPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();

  try {
    const state = parseSearchParams(searchParams);

    // Remove navigation params
    delete state.filters['tab'];
    delete state.filters['subtab'];

    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(companyId, state);

    // Safe orderBy: multi-sort, only valid fields
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }
    // Fallback sort: document name asc
    const safeOrderBy = [...resolvedSorts, { document_types: { name: 'asc' as const } }];

    const [data, total] = await Promise.all([
      prisma.documents_company.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: DOCS_SELECT,
      }),
      prisma.documents_company.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener documentos de empresa paginados', { data: { error } });
    throw new Error(`Error al obtener los documentos: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllCompanyDocsForExport(searchParams: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    delete state.filters['tab'];
    delete state.filters['subtab'];

    const where = buildWhereClause(companyId, state);

    const data = await prisma.documents_company.findMany({
      orderBy: [{ document_types: { name: 'asc' } }],
      where,
      select: DOCS_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar documentos de empresa', { data: { error } });
    throw new Error('Error al exportar los documentos');
  }
}

// ============================================================================
// FACETS (con cross-filtering)
// ============================================================================

/**
 * Helper: construir Map<string, count> con soporte para null → NULL_FILTER_VALUE
 */
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

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro.
 */
export async function getCompanyDocsFacets(searchParams?: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();
  const baseWhere = { applies: companyId, is_active: true };

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
    delete parsedState.filters['tab'];
    delete parsedState.filters['subtab'];
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  /** WHERE con todos los filtros EXCEPTO el de la columna indicada */
  function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) return baseWhere;
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildWhereClause(companyId, modified);
  }

  try {
    const [stateCounts, documentTypeCounts, uploadedByCounts] = await Promise.all([
      // state enum (directo en la tabla)
      prisma.documents_company.groupBy({
        by: ['state'],
        where: crossWhere('state'),
        _count: true,
      }),
      // id_document_types FK
      prisma.documents_company.groupBy({
        by: ['id_document_types'],
        where: crossWhere('documentType'),
        _count: true,
      }),
      // user_id FK (profile)
      prisma.documents_company.groupBy({
        by: ['user_id'],
        where: crossWhere('uploadedBy'),
        _count: true,
      }),
    ]);

    // Resolve document type names
    const docTypeIds = documentTypeCounts.map((r) => r.id_document_types).filter(Boolean) as string[];

    const docTypeOptions =
      docTypeIds.length > 0
        ? await prisma.document_types.findMany({
            where: { id: { in: docTypeIds } },
            select: { id: true, name: true, is_it_montlhy: true },
          })
        : [];

    // Resolve profile fullnames
    const profileIds = uploadedByCounts.map((r) => r.user_id).filter(Boolean) as string[];

    const profileOptions =
      profileIds.length > 0
        ? await prisma.profile.findMany({
            where: { id: { in: profileIds } },
            select: { id: true, fullname: true },
          })
        : [];

    return {
      state: toFacetMap(stateCounts.map((r) => ({ key: r.state as string, count: r._count }))),
      documentType: toFacetMap(documentTypeCounts.map((r) => ({ key: r.id_document_types, count: r._count }))),
      uploadedBy: toFacetMap(uploadedByCounts.map((r) => ({ key: r.user_id, count: r._count }))),
      // Resolved options for FK filters
      docTypeOptions,
      profileOptions,
    };
  } catch (error) {
    logger.error('Error al obtener facets de documentos de empresa', { data: { error } });
    return null;
  }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CompanyDocListItem = Awaited<ReturnType<typeof getCompanyDocsPaginated>>['data'][number];
