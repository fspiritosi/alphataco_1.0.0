'use server';

import { Logger } from '@/lib/logger';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import {
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('Employees/Diagrams/Reports/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos directos de employees_diagram que se pueden ordenar server-side */
const VALID_SORT_FIELDS = new Set([
  'day',
  'month',
  'year',
  'created_at',
  'comments',
  // FK columns (sorted via FK_SORT_MAP)
  'employee',
  'diagramType',
  'companyPosition',
]);

/**
 * Mapeo de columnId → orderBy de Prisma para columnas FK.
 */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  employee: (dir) => ({ employees: { lastname: dir } }),
  diagramType: (dir) => ({ diagram_type_employees_diagram_diagram_typeTodiagram_type: { name: dir } }),
  companyPosition: (dir) => ({ employees: { company_positions: { name: dir } } }),
};

/** Select común con todas las relaciones resueltas */
const DIAGRAM_REPORT_SELECT = {
  id: true,
  created_at: true,
  day: true,
  month: true,
  year: true,
  is_active: true,
  employee_id: true,
  diagram_type: true,
  comments: true,
  employees: {
    select: {
      id: true,
      lastname: true,
      firstname: true,
      cuil: true,
      file: true,
      company_position: true,
      company_positions: {
        select: { id: true, name: true },
      },
    },
  },
  diagram_type_employees_diagram_diagram_typeTodiagram_type: {
    select: {
      id: true,
      name: true,
      color: true,
      short_description: true,
    },
  },
} as const;

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/**
 * Construye el WHERE clause compartido entre paginated, export y facets.
 * Maneja todos los filtros manualmente ya que los campos son en relaciones anidadas.
 */
function buildWhereClause(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const andConditions: Record<string, unknown>[] = [];

  // ── Siempre: empleados activos + diagrama de la empresa ─────────────────
  const baseWhere = {
    employees: { is_active: true },
    diagram_type_employees_diagram_diagram_typeTodiagram_type: { company_id: companyId },
  };

  // ── Búsqueda global (OR entre múltiples campos de empleado) ─────────────
  if (state.search) {
    andConditions.push({
      OR: [
        { employees: { lastname: { contains: state.search, mode: 'insensitive' as const } } },
        { employees: { firstname: { contains: state.search, mode: 'insensitive' as const } } },
        { employees: { cuil: { contains: state.search, mode: 'insensitive' as const } } },
        { employees: { file: { contains: state.search, mode: 'insensitive' as const } } },
      ],
    });
  }

  // ── Filtro por empleado (FK: employee_id) ────────────────────────────────
  const employeeFilter = state.filters['employee'];
  if (employeeFilter?.length) {
    andConditions.push({ employee_id: { in: employeeFilter } });
  }

  // ── Filtro por tipo de novedad (FK: diagram_type) ────────────────────────
  const diagramTypeFilter = state.filters['diagramType'];
  if (diagramTypeFilter?.length) {
    andConditions.push({ diagram_type: { in: diagramTypeFilter } });
  }

  // ── Filtro por puesto (FK: company_position vía employees) ───────────────
  const companyPositionFilter = state.filters['companyPosition'];
  if (companyPositionFilter?.length) {
    const hasNull = companyPositionFilter.includes(NULL_FILTER_VALUE);
    const realValues = companyPositionFilter.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      andConditions.push({
        OR: [{ employees: { company_position: { in: realValues } } }, { employees: { company_position: null } }],
      });
    } else if (hasNull) {
      andConditions.push({ employees: { company_position: null } });
    } else {
      andConditions.push({ employees: { company_position: { in: realValues } } });
    }
  }

  // ── Filtros de texto en campos del empleado (cada uno por separado) ──────
  const lastnameFilter = state.filters['lastname']?.[0];
  if (lastnameFilter) {
    andConditions.push({
      employees: { lastname: { contains: lastnameFilter, mode: 'insensitive' as const } },
    });
  }

  const firstnameFilter = state.filters['firstname']?.[0];
  if (firstnameFilter) {
    andConditions.push({
      employees: { firstname: { contains: firstnameFilter, mode: 'insensitive' as const } },
    });
  }

  const cuilFilter = state.filters['cuil']?.[0];
  if (cuilFilter) {
    andConditions.push({
      employees: { cuil: { contains: cuilFilter, mode: 'insensitive' as const } },
    });
  }

  // Legajo: exact match (not contains) — legajos are short numbers
  const fileNumberFilter = state.filters['fileNumber']?.[0];
  if (fileNumberFilter) {
    andConditions.push({
      employees: { file: { equals: fileNumberFilter, mode: 'insensitive' as const } },
    });
  }

  // ── Filtro de texto en comentario (campo directo) ────────────────────────
  const commentsFilter = state.filters['comments']?.[0];
  if (commentsFilter) {
    andConditions.push({
      comments: { contains: commentsFilter, mode: 'insensitive' as const },
    });
  }

  // ── Filtros numéricos en day/month/year (Decimal) ────────────────────────
  const dayFilter = state.filters['day']?.[0];
  if (dayFilter) {
    const dayNum = Number(dayFilter);
    if (!isNaN(dayNum)) {
      andConditions.push({ day: { equals: dayNum } });
    }
  }

  const monthFilter = state.filters['month']?.[0];
  if (monthFilter) {
    const monthNum = Number(monthFilter);
    if (!isNaN(monthNum)) {
      andConditions.push({ month: { equals: monthNum } });
    }
  }

  const yearFilter = state.filters['year']?.[0];
  if (yearFilter) {
    const yearNum = Number(yearFilter);
    if (!isNaN(yearNum)) {
      andConditions.push({ year: { equals: yearNum } });
    }
  }

  // ── Filtros de fecha (dateRange: created_at) ──────────────────────────────
  const createdAtFrom = state.filters['created_at_from']?.[0];
  const createdAtTo = state.filters['created_at_to']?.[0];
  if (createdAtFrom || createdAtTo) {
    const dateFilter: Record<string, unknown> = {};
    if (createdAtFrom) dateFilter['gte'] = new Date(createdAtFrom);
    if (createdAtTo) dateFilter['lte'] = new Date(createdAtTo);
    andConditions.push({ created_at: dateFilter });
  }

  return {
    ...baseWhere,
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getDiagramReportsPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(companyId, state);

    // Safe orderBy: multi-sort, only valid fields, with FK_SORT_MAP
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }
    // Default sort: employee lastname ASC, then year/month/day DESC
    const safeOrderBy = [
      ...resolvedSorts,
      { employees: { lastname: 'asc' as const } },
      { year: 'desc' as const },
      { month: 'desc' as const },
      { day: 'desc' as const },
    ];

    const [data, total] = await Promise.all([
      prisma.employees_diagram.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: DIAGRAM_REPORT_SELECT,
      }),
      prisma.employees_diagram.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener reportes de diagramas paginados', { data: { error } });
    throw new Error(`Error al obtener los reportes: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// EXPORT QUERY (all data, no pagination)
// ============================================================================

export async function getDiagramReportsForExport(searchParams: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(companyId, state);

    const data = await prisma.employees_diagram.findMany({
      orderBy: [{ employees: { lastname: 'asc' } }, { year: 'desc' }, { month: 'desc' }, { day: 'desc' }],
      where,
      select: DIAGRAM_REPORT_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar reportes de diagramas', { data: { error } });
    throw new Error('Error al exportar los reportes de diagramas');
  }
}

// ============================================================================
// SINGLE FACET (lazy-load individual)
// ============================================================================

/**
 * Obtiene opciones y counts para UN SOLO filtro facetado, con cross-filtering.
 * Diseñado para lazy-load: cada filtro llama a esta función al abrirse.
 */
export async function getDiagramReportSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  const companyId = await getActiveCompanyId();

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  /** Returns the WHERE clause excluding the given column's filter (for cross-filtering). */
  function crossWhere(excludeColumn: string) {
    const emptyState: ReturnType<typeof parseSearchParams> = {
      filters: {},
      search: '',
      sorting: [],
      page: 0,
      pageSize: 10,
    };
    if (!parsedState || !hasActiveFilters) {
      return buildWhereClause(companyId, emptyState);
    }
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
    const where = crossWhere(columnId);

    // ── employee FK (group by employee_id, resolve names) ──────────────────
    if (columnId === 'employee') {
      const rows = await prisma.employees_diagram.groupBy({
        by: ['employee_id'],
        where,
        _count: true,
      });
      const counts = toFacetMap(rows.map((r) => ({ key: r.employee_id, count: r._count })));
      const ids = rows.map((r) => r.employee_id).filter(Boolean) as string[];
      const resolvedOptions =
        ids.length > 0
          ? (
              await prisma.employees.findMany({
                where: { id: { in: ids } },
                select: { id: true, lastname: true, firstname: true, file: true },
                orderBy: { lastname: 'asc' },
              })
            ).map((e) => ({
              id: e.id,
              name: `[${e.file ?? '-'}] ${e.lastname ?? ''} ${e.firstname ?? ''}`.trim(),
            }))
          : [];
      return { counts, resolvedOptions };
    }

    // ── diagramType FK (group by diagram_type, resolve names) ──────────────
    if (columnId === 'diagramType') {
      const rows = await prisma.employees_diagram.groupBy({
        by: ['diagram_type'],
        where,
        _count: true,
      });
      const counts = toFacetMap(rows.map((r) => ({ key: r.diagram_type, count: r._count })));
      const ids = rows.map((r) => r.diagram_type).filter(Boolean) as string[];
      const resolvedOptions =
        ids.length > 0
          ? await prisma.diagram_type.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : [];
      return { counts, resolvedOptions };
    }

    // ── companyPosition FK (group by employees.company_position) ───────────
    if (columnId === 'companyPosition') {
      // groupBy on employees_diagram cannot group by nested relation field,
      // so we fetch all diagram records and aggregate company_position manually
      const records = await prisma.employees_diagram.findMany({
        where,
        select: { employees: { select: { company_position: true } } },
      });

      const countsMap = new Map<string, number>();
      for (const r of records) {
        const posId = r.employees.company_position;
        if (posId != null) {
          countsMap.set(posId, (countsMap.get(posId) ?? 0) + 1);
        } else {
          countsMap.set(NULL_FILTER_VALUE, (countsMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
        }
      }

      const ids = [...countsMap.keys()].filter((id) => id !== NULL_FILTER_VALUE);
      const resolvedOptions =
        ids.length > 0
          ? await prisma.company_positions.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : [];

      return { counts: countsMap, resolvedOptions };
    }

    logger.warn('Facet column not recognized', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error al obtener facet individual de diagrama', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type DiagramReportListItem = Awaited<ReturnType<typeof getDiagramReportsPaginated>>['data'][number];
