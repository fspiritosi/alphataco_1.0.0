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

const logger = new Logger('Clothing/ClothingSizes/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_SORT_FIELDS = new Set(['name', 'is_active', 'created_at', 'updated_at']);

const TEXT_FILTER_COLUMNS = ['name'];

const DATE_RANGE_COLUMNS = ['created_at'];

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function buildWhereClause(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, ['name']);

  const filtersWhere = buildFiltersWhere(
    state.filters,
    {},
    {
      exclude: [...TEXT_FILTER_COLUMNS, ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`])],
    }
  );

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  return {
    company_id: companyId,
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getClothingSizesPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    // Build safe orderBy
    const sortField = state.sorting[0]?.id;
    const sortDir = state.sorting[0]?.desc ? ('desc' as const) : ('asc' as const);
    const orderBy =
      sortField && VALID_SORT_FIELDS.has(sortField) ? [{ [sortField]: sortDir }] : [{ name: 'asc' as const }];

    const where = buildWhereClause(companyId, state);

    const [data, total] = await Promise.all([
      prisma.clothing_sizes.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          name: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.clothing_sizes.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener talles paginados', { data: { error } });
    throw new Error('Error al obtener los talles');
  }
}

export type ClothingSizeListItem = Awaited<ReturnType<typeof getClothingSizesPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY
// ============================================================================

export async function getAllClothingSizesForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(companyId, state);

    const data = await prisma.clothing_sizes.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar talles', { data: { error } });
    throw new Error('Error al exportar los talles');
  }
}

// ============================================================================
// SINGLE FACET (lazy-load individual)
// ============================================================================

/**
 * Obtiene opciones y counts para UN SOLO filtro facetado, con cross-filtering.
 * Diseñado para lazy-load: cada filtro llama a esta función al abrirse.
 */
export async function getClothingSizesSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  const companyId = await getServerCompanyId();

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) return { company_id: companyId };
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildWhereClause(companyId, modified);
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
    // Boolean: is_active
    if (columnId === 'is_active') {
      const where = crossWhere('is_active');
      const rows = await prisma.clothing_sizes.groupBy({ by: ['is_active'], where, _count: true });
      return {
        counts: toFacetMap(rows.map((r) => ({ key: String(r.is_active), count: r._count }))),
      };
    }

    logger.warn('getClothingSizesSingleFacet: columnId no reconocido', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error al obtener faceta de talles', { data: { error, columnId } });
    return null;
  }
}
