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

const logger = new Logger('features/Empresa/RRHH/DiagramTypes');

// ============================================================================
// VALID SORT FIELDS — solo campos reales de BD
// ============================================================================

const VALID_SORT_FIELDS = new Set([
  'name',
  'short_description',
  'work_active',
  'is_active',
  'computes_absenteeism',
  'created_at',
]);

// ============================================================================
// WHERE BUILDER — DRY helper compartido por paginated, export y facets
// ============================================================================

function buildWhereClause(state: ReturnType<typeof parseSearchParams>) {
  // Búsqueda global en name y short_description
  const searchWhere = buildSearchWhere(state.search, ['name', 'short_description']);

  // work_active es booleano nullable — manejo manual
  const workActiveValues = state.filters['work_active'];
  const workActiveFilter: Record<string, unknown> = {};
  if (workActiveValues?.length === 1) {
    if (workActiveValues[0] === NULL_FILTER_VALUE) {
      workActiveFilter.work_active = null;
    } else {
      workActiveFilter.work_active = workActiveValues[0] === 'true';
    }
  } else if (workActiveValues && workActiveValues.length > 1) {
    const conditions: Array<{ work_active: boolean | null }> = [];
    for (const v of workActiveValues) {
      if (v === NULL_FILTER_VALUE) conditions.push({ work_active: null });
      else conditions.push({ work_active: v === 'true' });
    }
    workActiveFilter.OR = conditions;
  }

  // is_active es booleano NOT NULL — manejo manual
  const isActiveValues = state.filters['is_active'];
  const isActiveFilter: Record<string, unknown> = {};
  if (isActiveValues?.length === 1) {
    isActiveFilter.is_active = isActiveValues[0] === 'true';
  } else if (isActiveValues && isActiveValues.length > 1) {
    const conditions: Array<{ is_active: boolean }> = [];
    for (const v of isActiveValues) {
      conditions.push({ is_active: v === 'true' });
    }
    isActiveFilter.OR = conditions;
  }

  // computes_absenteeism es booleano NOT NULL — manejo manual
  const computesValues = state.filters['computes_absenteeism'];
  const computesFilter: Record<string, unknown> = {};
  if (computesValues?.length === 1) {
    computesFilter.computes_absenteeism = computesValues[0] === 'true';
  } else if (computesValues && computesValues.length > 1) {
    const conditions: Array<{ computes_absenteeism: boolean }> = [];
    for (const v of computesValues) {
      conditions.push({ computes_absenteeism: v === 'true' });
    }
    computesFilter.OR = conditions;
  }

  // Filtros de texto libre por columna
  const textFiltersWhere = buildTextFiltersWhere(state.filters, ['name', 'short_description']);

  // Filtros de rango de fecha
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, ['created_at']);

  return {
    ...searchWhere,
    ...workActiveFilter,
    ...isActiveFilter,
    ...computesFilter,
    ...textFiltersWhere,
    ...dateFiltersWhere,
  };
}

// ============================================================================
// QUERY PAGINADA
// ============================================================================

export async function getDiagramTypesPaginated(searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    const companyId = await getActiveCompanyId();
    const where = withCompany(buildWhereClause(state), companyId);

    // Resolución de multi-sort
    const resolvedSorts: Array<Record<string, unknown>> = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: s.desc ? 'desc' : 'asc' });
      }
    }
    // Inactivos siempre al final, luego orden del usuario, luego nombre como fallback
    const safeOrderBy = [{ is_active: 'desc' as const }, ...resolvedSorts, { name: 'asc' as const }];

    const [data, total] = await Promise.all([
      prisma.diagram_type.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: {
          id: true,
          name: true,
          color: true,
          short_description: true,
          work_active: true,
          is_active: true,
          computes_absenteeism: true,
          created_at: true,
        },
      }),
      prisma.diagram_type.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener tipos de novedades', { data: { error } });
    throw new Error('No se pudo obtener la lista. Intente nuevamente.');
  }
}

// ============================================================================
// EXPORT COMPLETO — sin skip/take, mismos filtros
// ============================================================================

export async function getAllDiagramTypesForExport(searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    const companyId = await getActiveCompanyId();
    const where = withCompany(buildWhereClause(state), companyId);

    const resolvedSorts: Array<Record<string, unknown>> = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: s.desc ? 'desc' : 'asc' });
      }
    }
    const safeOrderBy = [{ is_active: 'desc' as const }, ...resolvedSorts, { name: 'asc' as const }];

    return await prisma.diagram_type.findMany({
      where,
      orderBy: safeOrderBy,
      select: {
        id: true,
        name: true,
        color: true,
        short_description: true,
        work_active: true,
        is_active: true,
        computes_absenteeism: true,
        created_at: true,
      },
    });
  } catch (error) {
    logger.error('Error al exportar tipos de novedades', { data: { error } });
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
export async function getDiagramTypeSingleFacet(
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

    const companyId = await getActiveCompanyId();
    const crossWhere = withCompany(buildWhereClause(crossState), companyId);

    switch (columnId) {
      case 'work_active': {
        const rows = await prisma.diagram_type.groupBy({
          by: ['work_active'],
          where: crossWhere,
          _count: true,
        });

        const counts = new Map<string, number>();
        for (const r of rows) {
          if (r.work_active === null) {
            counts.set(NULL_FILTER_VALUE, r._count);
          } else {
            counts.set(String(r.work_active), r._count);
          }
        }

        return {
          options: [
            { value: 'true', label: 'Laboralmente activo' },
            { value: 'false', label: 'No laboralmente activo' },
            ...(counts.has(NULL_FILTER_VALUE) ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar' }] : []),
          ],
          counts,
        };
      }

      case 'is_active': {
        const rows = await prisma.diagram_type.groupBy({
          by: ['is_active'],
          where: crossWhere,
          _count: true,
        });

        const counts = new Map<string, number>();
        for (const r of rows) {
          counts.set(String(r.is_active), r._count);
        }

        return {
          options: [
            { value: 'true', label: 'Activo' },
            { value: 'false', label: 'Inactivo' },
          ],
          counts,
        };
      }

      case 'computes_absenteeism': {
        const rows = await prisma.diagram_type.groupBy({
          by: ['computes_absenteeism'],
          where: crossWhere,
          _count: true,
        });

        const counts = new Map<string, number>();
        for (const r of rows) {
          counts.set(String(r.computes_absenteeism), r._count);
        }

        return {
          options: [
            { value: 'true', label: 'Computa ausentismo' },
            { value: 'false', label: 'No computa ausentismo' },
          ],
          counts,
        };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener faceta de tipo de novedad', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// MUTACIONES — crear y actualizar con Prisma
// ============================================================================

export async function createDiagramTypePrisma(data: {
  name: string;
  color: string;
  short_description: string;
  work_active: boolean;
  is_active: boolean;
  computes_absenteeism: boolean;
}) {
  try {
    const company_id = await getActiveCompanyId();

    const result = await prisma.diagram_type.create({
      data: {
        name: data.name,
        color: data.color,
        short_description: data.short_description.toUpperCase(),
        work_active: data.work_active,
        is_active: data.is_active,
        computes_absenteeism: data.computes_absenteeism,
        company_id,
      },
      select: {
        id: true,
        name: true,
        color: true,
        short_description: true,
        work_active: true,
        is_active: true,
        computes_absenteeism: true,
        created_at: true,
      },
    });
    return result;
  } catch (error) {
    logger.error('Error al crear tipo de novedad', { data: { error } });
    throw new Error('No se pudo crear el tipo de novedad. Intente nuevamente.');
  }
}

export async function updateDiagramTypePrisma(data: {
  id: string;
  name: string;
  color: string;
  short_description: string;
  work_active: boolean;
  is_active: boolean;
  computes_absenteeism: boolean;
}) {
  try {
    const result = await prisma.diagram_type.update({
      where: { id: data.id },
      data: {
        name: data.name,
        color: data.color,
        short_description: data.short_description.toUpperCase(),
        work_active: data.work_active,
        is_active: data.is_active,
        computes_absenteeism: data.computes_absenteeism,
      },
      select: {
        id: true,
        name: true,
        color: true,
        short_description: true,
        work_active: true,
        is_active: true,
        computes_absenteeism: true,
        created_at: true,
      },
    });
    return result;
  } catch (error) {
    logger.error('Error al actualizar tipo de novedad', { data: { error } });
    throw new Error('No se pudo actualizar el tipo de novedad. Intente nuevamente.');
  }
}

// ============================================================================
// TIPOS EXPORTADOS
// ============================================================================

export type DiagramTypeListItem = Awaited<ReturnType<typeof getDiagramTypesPaginated>>['data'][number];
