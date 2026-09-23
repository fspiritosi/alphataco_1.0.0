'use server';

import { Logger } from '@/lib/logger';
import { getActiveCompanyId } from '@/shared/lib/tenant';
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

const logger = new Logger('PartesDiarios/list/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos directos de dailyreport que se pueden ordenar server-side */
const VALID_SORT_FIELDS = new Set(['date', 'creation_date', 'status', 'is_active', 'created_at']);

/** Params de URL de navegación que NO son filtros de la tabla */
const IGNORED_PARAMS = new Set(['tab', 'subtab', 'inactive_subtab']);

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['date', 'creation_date'];

/**
 * Mapping de columnId (URL) → campo real en Prisma.
 * Las columnas de tipo enum y booleano se mapean directamente.
 */
const COLUMN_MAP: Record<string, string> = {
  status: 'status',
  is_active: 'is_active',
};

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/**
 * Construye el WHERE clause compartido entre paginated, export y facets.
 * Centraliza la lógica para que no se duplique.
 */
function buildWhereClause(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, []);

  const MANUALLY_HANDLED = ['is_active'];

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [...MANUALLY_HANDLED, ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`])],
  });

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // Manejo manual de is_active (booleano nullable)
  const manualFilters: Record<string, unknown> = {};
  const isActiveValues = state.filters['is_active'];
  if (isActiveValues?.length) {
    // Si el usuario selecciona, filtrar por ese valor
    const boolVal = isActiveValues[0] === 'true';
    manualFilters.is_active = boolVal;
  }

  return {
    company_id: companyId,
    ...searchWhere,
    ...filtersWhere,
    ...dateFiltersWhere,
    ...manualFilters,
  };
}

// ============================================================================
// SELECT COMÚN
// ============================================================================

const DAILY_REPORT_SELECT = {
  id: true,
  date: true,
  creation_date: true,
  status: true,
  is_active: true,
  created_at: true,
  // Conteos de rows por status (columnas virtuales)
  dailyreportrows: {
    select: {
      status: true,
    },
  },
} as const;

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getDailyReportsPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(companyId, state);

    // Multi-sort — solo campos válidos, inactivos siempre al final
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        resolvedSorts.push({ [s.id]: dir });
      }
    }

    // Inactivos al final (is_active: true antes que false), fallback a date desc
    const safeOrderBy = [
      { is_active: 'desc' as const },
      ...(resolvedSorts.length > 0 ? resolvedSorts : [{ date: 'desc' as const }]),
    ];

    const [data, total] = await Promise.all([
      prisma.dailyreport.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: DAILY_REPORT_SELECT,
      }),
      prisma.dailyreport.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener partes diarios paginados', { data: { error } });
    throw new Error('No se pudo obtener la lista de partes diarios. Intente nuevamente.');
  }
}

export type DailyReportListItem = Awaited<ReturnType<typeof getDailyReportsPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllDailyReportsForExport(searchParams: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const where = buildWhereClause(companyId, state);

    return await prisma.dailyreport.findMany({
      where,
      orderBy: [{ is_active: 'desc' as const }, { date: 'desc' as const }],
      select: DAILY_REPORT_SELECT,
    });
  } catch (error) {
    logger.error('Error al exportar partes diarios', { data: { error } });
    throw new Error('No se pudo exportar la lista de partes diarios. Intente nuevamente.');
  }
}

// ============================================================================
// FACETS (con cross-filtering)
// ============================================================================

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro,
 * mostrando cuántos registros tendría cada opción si se cambiara solo ese filtro.
 */
export async function getDailyReportFacets(searchParams?: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();
  const baseWhere = { company_id: companyId };

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

  // Helper: construye Map<string, number> con soporte para null → NULL_FILTER_VALUE
  function toFacetMap(rows: { key: string | boolean | null | undefined; count: number }[]): Map<string, number> {
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
    const [statusCounts, isActiveCounts] = await Promise.all([
      prisma.dailyreport.groupBy({
        by: ['status'],
        where: crossWhere('status'),
        _count: true,
      }),
      prisma.dailyreport.groupBy({
        by: ['is_active'],
        where: crossWhere('is_active'),
        _count: true,
      }),
    ]);

    return {
      status: toFacetMap(statusCounts.map((r) => ({ key: r.status as string, count: r._count }))),
      is_active: toFacetMap(isActiveCounts.map((r) => ({ key: r.is_active, count: r._count }))),
    };
  } catch (error) {
    logger.error('Error al obtener facets de partes diarios', { data: { error } });
    return null;
  }
}

export type DailyReportFacets = Awaited<ReturnType<typeof getDailyReportFacets>>;
