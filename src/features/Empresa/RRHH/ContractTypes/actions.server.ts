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
import { getActiveCompanyId } from '@/shared/lib/tenant';

// ============================================================================
// LOGGER
// ============================================================================

const logger = new Logger('features/Empresa/RRHH/ContractTypes');

// ============================================================================
// VALID SORT FIELDS — solo campos reales de BD
// ============================================================================

const VALID_SORT_FIELDS = new Set(['name', 'description', 'is_active', 'created_at']);

// ============================================================================
// WHERE BUILDER — DRY helper compartido por paginated, export y facets
// ============================================================================

function buildWhereClause(state: ReturnType<typeof parseSearchParams>) {
  // Búsqueda global en name y description
  const searchWhere = buildSearchWhere(state.search, ['name', 'description']);

  // is_active es booleano nullable — viene como string 'true'/'false'/NULL_FILTER_VALUE desde URL
  // Se maneja manualmente: buildFiltersWhere es para enums/FK string, no para booleanos
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

  // Filtros de texto libre por columna
  const textFiltersWhere = buildTextFiltersWhere(state.filters, ['name', 'description']);

  // Filtros de rango de fecha
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, ['created_at']);

  return {
    ...searchWhere,
    ...isActiveFilter,
    ...textFiltersWhere,
    ...dateFiltersWhere,
  };
}

// ============================================================================
// QUERY PAGINADA
// ============================================================================

export async function getContractTypesPaginated(searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    const where = buildWhereClause(state);

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
      prisma.types_of_contract.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: {
          id: true,
          name: true,
          description: true,
          is_active: true,
          created_at: true,
        },
      }),
      prisma.types_of_contract.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener tipos de contrato', { data: { error } });
    throw new Error('No se pudo obtener la lista. Intente nuevamente.');
  }
}

// ============================================================================
// EXPORT COMPLETO — sin skip/take, mismos filtros
// ============================================================================

export async function getAllContractTypesForExport(searchParams: DataTableSearchParams) {
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

    return await prisma.types_of_contract.findMany({
      where,
      orderBy: safeOrderBy,
      select: {
        id: true,
        name: true,
        description: true,
        is_active: true,
        created_at: true,
      },
    });
  } catch (error) {
    logger.error('Error al exportar tipos de contrato', { data: { error } });
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
export async function getContractTypeSingleFacet(
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
        const rows = await prisma.types_of_contract.groupBy({
          by: ['is_active'],
          where: crossWhere,
          _count: true,
        });

        const counts = new Map<string, number>();
        for (const r of rows) {
          counts.set(String(r.is_active), r._count);
        }
        // is_active es Boolean? (nullable), manejar null como NULL_FILTER_VALUE
        const nullRow = rows.find((r) => r.is_active === null);
        if (nullRow) {
          counts.set(NULL_FILTER_VALUE, nullRow._count);
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

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener faceta de tipo de contrato', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// MUTACIONES — crear y actualizar con Prisma
// ============================================================================

export async function createContractTypePrisma(data: { name: string; description: string | null }) {
  try {
    const result = await prisma.types_of_contract.create({
      data: {
        name: data.name,
        description: data.description,
        is_active: true,
        company_id: await getActiveCompanyId(),
      },
      select: { id: true, name: true, description: true, is_active: true, created_at: true },
    });
    return result;
  } catch (error) {
    logger.error('Error al crear tipo de contrato', { data: { error } });
    throw new Error('No se pudo crear el tipo de contrato. Intente nuevamente.');
  }
}

export async function updateContractTypePrisma(data: {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}) {
  try {
    const result = await prisma.types_of_contract.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        is_active: data.is_active,
      },
      select: { id: true, name: true, description: true, is_active: true, created_at: true },
    });
    return result;
  } catch (error) {
    logger.error('Error al actualizar tipo de contrato', { data: { error } });
    throw new Error('No se pudo actualizar el tipo de contrato. Intente nuevamente.');
  }
}

// ============================================================================
// TIPOS EXPORTADOS
// ============================================================================

export type ContractTypeListItem = Awaited<ReturnType<typeof getContractTypesPaginated>>['data'][number];
