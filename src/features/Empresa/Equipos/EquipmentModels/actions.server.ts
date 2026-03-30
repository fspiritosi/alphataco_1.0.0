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

// ============================================================================
// LOGGER
// ============================================================================

const logger = new Logger('features/Empresa/Equipos/EquipmentModels');

// ============================================================================
// VALID SORT FIELDS — solo campos reales de BD
// ============================================================================

const VALID_SORT_FIELDS = new Set(['name', 'is_active', 'created_at']);

// ============================================================================
// FK_SORT_MAP — para columnas FK que se ordenan por campo de la relación
// ============================================================================

const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  brand: (dir) => ({ brand_vehicles: { name: dir } }),
};

// ============================================================================
// WHERE BUILDER — DRY helper compartido por paginated, export y facets
// ============================================================================

function buildWhereClause(state: ReturnType<typeof parseSearchParams>) {
  // Búsqueda global sobre texto
  const searchWhere = buildSearchWhere(state.search, ['name']);

  // is_active — booleano nullable, se maneja manualmente
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

  // brand — FK BigInt, viene como string[] con IDs; se convierte a Number
  const brandValues = state.filters['brand'];
  const brandFilter: Record<string, unknown> = {};
  if (brandValues?.length) {
    const hasNull = brandValues.includes(NULL_FILTER_VALUE);
    const realIds = brandValues
      .filter((v) => v !== NULL_FILTER_VALUE)
      .map(Number)
      .filter((n) => !isNaN(n));

    if (hasNull && realIds.length > 0) {
      brandFilter.OR = [{ brand: { in: realIds } }, { brand: null }];
    } else if (hasNull) {
      brandFilter.brand = null;
    } else if (realIds.length > 0) {
      brandFilter.brand = { in: realIds };
    }
  }

  // Filtros de texto libre por columna
  const textFiltersWhere = buildTextFiltersWhere(state.filters, ['name']);

  // Filtros de rango de fecha
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, ['created_at']);

  return {
    ...searchWhere,
    ...isActiveFilter,
    ...brandFilter,
    ...textFiltersWhere,
    ...dateFiltersWhere,
  };
}

// ============================================================================
// QUERY PAGINADA
// ============================================================================

export async function getEquipmentModelsPaginated(searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    const where = buildWhereClause(state);

    // Resolución de multi-sort
    const resolvedSorts: Array<Record<string, unknown>> = [];
    for (const s of state.sorting) {
      const fkMapper = FK_SORT_MAP[s.id];
      if (fkMapper) {
        resolvedSorts.push(fkMapper(s.desc ? 'desc' : 'asc'));
      } else if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: s.desc ? 'desc' : 'asc' });
      }
    }
    // Inactivos siempre al final, luego orden del usuario, luego nombre como fallback
    const safeOrderBy = [{ is_active: 'desc' as const }, ...resolvedSorts, { name: 'asc' as const }];

    const [data, total] = await Promise.all([
      prisma.model_vehicles.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: {
          id: true,
          name: true,
          brand: true,
          is_active: true,
          created_at: true,
          brand_vehicles: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.model_vehicles.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener modelos de equipos', { data: { error } });
    throw new Error('No se pudo obtener la lista. Intente nuevamente.');
  }
}

// ============================================================================
// EXPORT COMPLETO — sin skip/take, mismos filtros
// ============================================================================

export async function getAllEquipmentModelsForExport(searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(state);

    const resolvedSorts: Array<Record<string, unknown>> = [];
    for (const s of state.sorting) {
      const fkMapper = FK_SORT_MAP[s.id];
      if (fkMapper) {
        resolvedSorts.push(fkMapper(s.desc ? 'desc' : 'asc'));
      } else if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: s.desc ? 'desc' : 'asc' });
      }
    }
    const safeOrderBy = [{ is_active: 'desc' as const }, ...resolvedSorts, { name: 'asc' as const }];

    return await prisma.model_vehicles.findMany({
      where,
      orderBy: safeOrderBy,
      select: {
        id: true,
        name: true,
        brand: true,
        is_active: true,
        created_at: true,
        brand_vehicles: {
          select: { id: true, name: true },
        },
      },
    });
  } catch (error) {
    logger.error('Error al exportar modelos de equipos', { data: { error } });
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
export async function getEquipmentModelSingleFacet(
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
        const rows = await prisma.model_vehicles.groupBy({
          by: ['is_active'],
          where: crossWhere,
          _count: true,
        });

        const counts = new Map<string, number>();
        for (const r of rows) {
          if (r.is_active === null) {
            counts.set(NULL_FILTER_VALUE, r._count);
          } else {
            counts.set(String(r.is_active), r._count);
          }
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

      case 'brand': {
        // Agrupar por brand (BigInt nullable)
        const rows = await prisma.model_vehicles.groupBy({
          by: ['brand'],
          where: crossWhere,
          _count: true,
        });

        const counts = new Map<string, number>();
        for (const r of rows) {
          if (r.brand === null) {
            counts.set(NULL_FILTER_VALUE, r._count);
          } else {
            counts.set(String(r.brand), r._count);
          }
        }

        // Resolver nombres de marcas
        const brandIds = rows.filter((r) => r.brand !== null).map((r) => r.brand as number);
        const brands =
          brandIds.length > 0
            ? await prisma.brand_vehicles.findMany({
                where: { id: { in: brandIds } },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
              })
            : [];

        const resolvedOptions = brands.map((b) => ({
          value: String(b.id),
          label: b.name ?? `Marca ${b.id}`,
        }));

        if (counts.has(NULL_FILTER_VALUE)) {
          resolvedOptions.push({ value: NULL_FILTER_VALUE, label: 'Sin marca' });
        }

        return {
          options: resolvedOptions,
          counts,
        };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener faceta de modelo de equipo', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// MUTACIONES — crear y actualizar con Prisma
// ============================================================================

export async function createEquipmentModelPrisma(data: { name: string; brand: number; is_active: boolean }) {
  try {
    const result = await prisma.model_vehicles.create({
      data: {
        name: data.name,
        brand: data.brand,
        is_active: data.is_active,
      },
      select: {
        id: true,
        name: true,
        brand: true,
        is_active: true,
        created_at: true,
        brand_vehicles: { select: { id: true, name: true } },
      },
    });
    return result;
  } catch (error) {
    logger.error('Error al crear modelo de equipo', { data: { error } });
    throw new Error('No se pudo crear el modelo. Intente nuevamente.');
  }
}

export async function updateEquipmentModelPrisma(data: {
  id: number;
  name: string;
  brand: number;
  is_active: boolean;
}) {
  try {
    const result = await prisma.model_vehicles.update({
      where: { id: data.id },
      data: {
        name: data.name,
        brand: data.brand,
        is_active: data.is_active,
      },
      select: {
        id: true,
        name: true,
        brand: true,
        is_active: true,
        created_at: true,
        brand_vehicles: { select: { id: true, name: true } },
      },
    });
    return result;
  } catch (error) {
    logger.error('Error al actualizar modelo de equipo', { data: { error } });
    throw new Error('No se pudo actualizar el modelo. Intente nuevamente.');
  }
}

// ============================================================================
// CATÁLOGO DE MARCAS ACTIVAS — para el formulario
// ============================================================================

export async function getActiveBrandsForSelect() {
  try {
    return await prisma.brand_vehicles.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener marcas activas', { data: { error } });
    return [];
  }
}

// ============================================================================
// TIPOS EXPORTADOS
// ============================================================================

export type EquipmentModelListItem = Awaited<ReturnType<typeof getEquipmentModelsPaginated>>['data'][number];
export type BrandForSelect = Awaited<ReturnType<typeof getActiveBrandsForSelect>>[number];
