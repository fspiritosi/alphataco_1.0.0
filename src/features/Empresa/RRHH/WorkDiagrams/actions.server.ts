'use server';

import { Logger } from '@/lib/logger';
import type { DataTableSearchParams, FacetResult } from '@/shared/components/common/DataTable';
import {
  NULL_FILTER_VALUE,
  buildDateRangeFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';

// ============================================================================
// LOGGER
// ============================================================================

const logger = new Logger('features/Empresa/RRHH/WorkDiagrams');

// ============================================================================
// VALID SORT FIELDS — solo campos reales de BD
// ============================================================================

const VALID_SORT_FIELDS = new Set(['name', 'is_active', 'created_at', 'active_working_days', 'inactive_working_days']);

// ============================================================================
// WHERE BUILDER — DRY helper compartido por paginated, export y facets
// ============================================================================

function buildWhereClause(state: ReturnType<typeof parseSearchParams>) {
  // Búsqueda global sobre nombre
  const searchWhere = buildSearchWhere(state.search, ['name']);

  // is_active es Boolean? (nullable) — viene como string 'true'/'false'/NULL_FILTER_VALUE desde URL
  // Manejado manualmente porque buildFiltersWhere es para enums/FK string, no booleanos
  const isActiveValues = state.filters['is_active'];
  const isActiveFilter: Record<string, unknown> = {};
  if (isActiveValues?.length === 1) {
    if (isActiveValues[0] === NULL_FILTER_VALUE) {
      isActiveFilter.is_active = null;
    } else {
      isActiveFilter.is_active = isActiveValues[0] === 'true';
    }
  } else if (isActiveValues && isActiveValues.length > 1) {
    const conditions: Array<{ is_active: boolean | null }> = [];
    for (const v of isActiveValues) {
      if (v === NULL_FILTER_VALUE) conditions.push({ is_active: null });
      else conditions.push({ is_active: v === 'true' });
    }
    isActiveFilter.OR = conditions;
  }

  // Filtro FK UUID: inactive_novelty (diagram_type)
  const inactiveNoveltyValues = state.filters['inactive_novelty'];
  const inactiveNoveltyFilter: Record<string, unknown> = {};
  if (inactiveNoveltyValues?.length) {
    const realIds = inactiveNoveltyValues.filter((v) => v !== NULL_FILTER_VALUE);
    const hasNull = inactiveNoveltyValues.includes(NULL_FILTER_VALUE);
    if (hasNull && realIds.length > 0) {
      inactiveNoveltyFilter.OR = [
        { inactive_novelty: null },
        { inactive_novelty: realIds.length === 1 ? realIds[0] : { in: realIds } },
      ];
    } else if (hasNull) {
      inactiveNoveltyFilter.inactive_novelty = null;
    } else {
      inactiveNoveltyFilter.inactive_novelty = realIds.length === 1 ? realIds[0] : { in: realIds };
    }
  }

  // Filtro M:M: active_novelties (work_diagram_active_novelties → diagram_type)
  const activeNoveltiesValues = state.filters['active_novelties'];
  const activeNoveltiesFilter: Record<string, unknown> = {};
  if (activeNoveltiesValues?.length) {
    activeNoveltiesFilter.work_diagram_active_novelties = {
      some: {
        diagram_type_id: { in: activeNoveltiesValues },
      },
    };
  }

  // Filtros de texto libre por columna individual
  const textFiltersWhere = buildTextFiltersWhere(state.filters, [
    'name',
    'active_working_days',
    'inactive_working_days',
  ]);

  // Filtros de rango de fecha
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, ['created_at']);

  return {
    ...searchWhere,
    ...isActiveFilter,
    ...inactiveNoveltyFilter,
    ...activeNoveltiesFilter,
    ...textFiltersWhere,
    ...dateFiltersWhere,
  };
}

// ============================================================================
// QUERY PAGINADA
// ============================================================================

export async function getWorkDiagramsPaginated(searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    const where = buildWhereClause(state);

    // Multi-sort: iterar state.sorting (array), NO state.sortBy (patrón viejo)
    const resolvedSorts: Array<Record<string, unknown>> = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: s.desc ? 'desc' : 'asc' });
      }
    }
    // Inactivos siempre al final, luego orden del usuario, luego nombre como fallback
    const safeOrderBy = [{ is_active: 'desc' as const }, ...resolvedSorts, { name: 'asc' as const }];

    const [data, total] = await Promise.all([
      prisma.work_diagram.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: {
          id: true,
          name: true,
          is_active: true,
          active_working_days: true,
          inactive_working_days: true,
          inactive_novelty: true,
          created_at: true,
          diagram_type: {
            select: { id: true, name: true },
          },
          work_diagram_active_novelties: {
            select: {
              id: true,
              diagram_type: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      prisma.work_diagram.count({ where }),
    ]);

    // Serializar Decimal → number para que sea compatible con Server→Client props
    const serializedData = data.map((item) => ({
      ...item,
      active_working_days: item.active_working_days !== null ? Number(item.active_working_days) : null,
      inactive_working_days: item.inactive_working_days !== null ? Number(item.inactive_working_days) : null,
    }));

    return { data: serializedData, total };
  } catch (error) {
    logger.error('Error al obtener diagramas de trabajo', { data: { error } });
    throw new Error('No se pudo obtener la lista. Intente nuevamente.');
  }
}

// ============================================================================
// EXPORT COMPLETO — sin skip/take, mismos filtros
// ============================================================================

export async function getAllWorkDiagramsForExport(searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(state);

    const resolvedSorts: Array<Record<string, unknown>> = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: s.desc ? 'desc' : 'asc' });
      }
    }
    const safeOrderBy = [{ is_active: 'desc' as const }, ...resolvedSorts, { name: 'asc' as const }];

    const rawData = await prisma.work_diagram.findMany({
      where,
      orderBy: safeOrderBy,
      select: {
        id: true,
        name: true,
        is_active: true,
        active_working_days: true,
        inactive_working_days: true,
        inactive_novelty: true,
        created_at: true,
        diagram_type: {
          select: { id: true, name: true },
        },
        work_diagram_active_novelties: {
          select: {
            id: true,
            diagram_type: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return rawData.map((item) => ({
      ...item,
      active_working_days: item.active_working_days !== null ? Number(item.active_working_days) : null,
      inactive_working_days: item.inactive_working_days !== null ? Number(item.inactive_working_days) : null,
    }));
  } catch (error) {
    logger.error('Error al exportar diagramas de trabajo', { data: { error } });
    throw new Error('No se pudo exportar la lista. Intente nuevamente.');
  }
}

// ============================================================================
// SINGLE FACET — lazy-load on-demand por columna con cross-filtering
// ============================================================================

/**
 * Retorna counts + opciones para UNA sola columna.
 * Aplica TODOS los filtros activos EXCEPTO el de la propia columna (cross-filter).
 */
export async function getWorkDiagramSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<FacetResult | null> {
  try {
    const state = searchParams ? parseSearchParams(searchParams) : parseSearchParams({});

    // crossWhere: aplica todos los filtros EXCEPTO el de la columna propia
    const crossState = {
      ...state,
      filters: { ...state.filters },
    };
    delete crossState.filters[columnId];

    const crossWhere = buildWhereClause(crossState);

    switch (columnId) {
      case 'is_active': {
        const rows = await prisma.work_diagram.groupBy({
          by: ['is_active'],
          where: crossWhere,
          _count: true,
        });

        const counts = new Map<string, number>();
        for (const r of rows) {
          const key = r.is_active === null ? NULL_FILTER_VALUE : String(r.is_active);
          counts.set(key, r._count);
        }

        return {
          options: [
            { value: 'true', label: 'Activo' },
            { value: 'false', label: 'Inactivo' },
            ...(counts.has(NULL_FILTER_VALUE) ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar' }] : []),
          ],
          counts,
        };
      }

      case 'inactive_novelty': {
        // Ronda 1: groupBy para IDs con counts
        const rows = await prisma.work_diagram.groupBy({
          by: ['inactive_novelty'],
          where: crossWhere,
          _count: true,
        });

        const counts = new Map<string, number>();
        const ids: string[] = [];
        for (const r of rows) {
          if (r.inactive_novelty === null) {
            counts.set(NULL_FILTER_VALUE, r._count);
          } else {
            counts.set(r.inactive_novelty, r._count);
            ids.push(r.inactive_novelty);
          }
        }

        // Ronda 2: resolver nombres solo para IDs con datos
        const diagramTypes =
          ids.length > 0
            ? await prisma.diagram_type.findMany({
                where: { id: { in: ids } },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
              })
            : [];

        const options = diagramTypes.map((dt) => ({
          value: dt.id,
          label: dt.name ?? '—',
        }));

        if (counts.has(NULL_FILTER_VALUE)) {
          options.push({ value: NULL_FILTER_VALUE, label: 'Sin asignar' });
        }

        return { options, counts };
      }

      case 'active_novelties': {
        // M:M facet: contar cuántos work_diagrams tienen cada diagram_type como novedad activa
        const rows = await prisma.work_diagram_active_novelties.groupBy({
          by: ['diagram_type_id'],
          where: {
            work_diagram: crossWhere,
          },
          _count: true,
        });

        const counts = new Map<string, number>();
        const ids: string[] = [];
        for (const r of rows) {
          counts.set(r.diagram_type_id, r._count);
          ids.push(r.diagram_type_id);
        }

        const diagramTypes =
          ids.length > 0
            ? await prisma.diagram_type.findMany({
                where: { id: { in: ids } },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
              })
            : [];

        const options = diagramTypes.map((dt) => ({
          value: dt.id,
          label: dt.name ?? '—',
        }));

        return { options, counts };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener faceta de diagrama de trabajo', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// DIAGRAM TYPES — catálogo para el formulario
// ============================================================================

/**
 * Obtiene todos los tipos de diagrama para poblar los selects del formulario.
 */
export async function getAllDiagramTypes() {
  try {
    const companyId = await getActiveCompanyId();
    return await prisma.diagram_type.findMany({
      where: withCompany({}, companyId),
      select: { id: true, name: true, work_active: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener tipos de diagrama', { data: { error } });
    throw new Error('No se pudo obtener los tipos de diagrama.');
  }
}

// ============================================================================
// TIPOS EXPORTADOS
// ============================================================================

export type WorkDiagramListItem = Awaited<ReturnType<typeof getWorkDiagramsPaginated>>['data'][number];
export type DiagramTypeItem = Awaited<ReturnType<typeof getAllDiagramTypes>>[number];
