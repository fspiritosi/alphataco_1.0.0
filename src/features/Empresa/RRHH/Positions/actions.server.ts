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
import { assertAptitudesOwned, assertHierarchiesOwned } from '../lib/catalog-guards';
import { getActiveCompanyId } from '@/shared/lib/tenant';

// ============================================================================
// LOGGER
// ============================================================================

const logger = new Logger('features/Empresa/RRHH/Positions');

// ============================================================================
// VALID SORT FIELDS — solo campos reales de BD (no virtuales)
// ============================================================================

const VALID_SORT_FIELDS = new Set(['name', 'is_active', 'created_at']);

// ============================================================================
// WHERE BUILDER — DRY helper compartido por paginated, export y facets
// ============================================================================

function buildWhereClause(state: ReturnType<typeof parseSearchParams>) {
  // Búsqueda global: name
  const searchWhere = buildSearchWhere(state.search, ['name']);

  // is_active — booleano nullable, manejo manual
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

  // aptitudes — filtro M:M: si se seleccionan aptitudes, filtrar puestos que las tengan
  const aptitudValues = state.filters['aptitudes'];
  const aptitudesFilter: Record<string, unknown> = {};
  if (aptitudValues && aptitudValues.length > 0) {
    const realIds = aptitudValues.filter((v) => v !== NULL_FILTER_VALUE);
    const hasNull = aptitudValues.includes(NULL_FILTER_VALUE);

    if (hasNull && realIds.length > 0) {
      aptitudesFilter.OR = [
        { aptitudes_tecnicas_puestos: { some: { aptitud_id: { in: realIds } } } },
        { aptitudes_tecnicas_puestos: { none: {} } },
      ];
    } else if (hasNull) {
      aptitudesFilter.aptitudes_tecnicas_puestos = { none: {} };
    } else {
      aptitudesFilter.aptitudes_tecnicas_puestos = { some: { aptitud_id: { in: realIds } } };
    }
  }

  // Filtros de texto libre por columna
  const textFiltersWhere = buildTextFiltersWhere(state.filters, ['name']);

  // Filtros de rango de fecha
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, ['created_at']);

  return {
    ...searchWhere,
    ...isActiveFilter,
    ...aptitudesFilter,
    ...textFiltersWhere,
    ...dateFiltersWhere,
  };
}

// ============================================================================
// QUERY PAGINADA
// ============================================================================

export async function getPositionsPaginated(searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    const where = withCompany(buildWhereClause(state), await getActiveCompanyId());

    // Multi-sort
    const resolvedSorts: Array<Record<string, unknown>> = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: s.desc ? 'desc' : 'asc' });
      }
    }
    // Inactivos siempre al final
    const safeOrderBy = [{ is_active: 'desc' as const }, ...resolvedSorts, { name: 'asc' as const }];

    const [data, total] = await Promise.all([
      prisma.company_positions.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: {
          id: true,
          name: true,
          is_active: true,
          created_at: true,
          hierarchical_position_id: true, // array de UUIDs de hierarchy
          aptitudes_tecnicas_puestos: {
            include: {
              aptitudes_tecnicas: {
                select: { id: true, nombre: true },
              },
            },
          },
        },
      }),
      prisma.company_positions.count({ where }),
    ]);

    // Resolver nombres de hierarchy en batch (evitar N+1)
    const allHierarchyIds = [...new Set(data.flatMap((p) => p.hierarchical_position_id))];
    const hierarchyMap = new Map<string, string>();

    if (allHierarchyIds.length > 0) {
      const hierarchies = await prisma.hierarchy.findMany({
        where: { id: { in: allHierarchyIds } },
        select: { id: true, name: true },
      });
      for (const h of hierarchies) {
        hierarchyMap.set(h.id, h.name);
      }
    }

    // Enriquecer data con nombres de hierarchy
    const enrichedData = data.map((pos) => ({
      ...pos,
      hierarchyNames: pos.hierarchical_position_id.map((id) => hierarchyMap.get(id) ?? id),
    }));

    return { data: enrichedData, total };
  } catch (error) {
    logger.error('Error al obtener puestos', { data: { error } });
    throw new Error('No se pudo obtener la lista de puestos. Intente nuevamente.');
  }
}

// ============================================================================
// EXPORT COMPLETO — sin skip/take, mismos filtros
// ============================================================================

export async function getAllPositionsForExport(searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    const where = withCompany(buildWhereClause(state), await getActiveCompanyId());

    const resolvedSorts: Array<Record<string, unknown>> = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: s.desc ? 'desc' : 'asc' });
      }
    }
    const safeOrderBy = [{ is_active: 'desc' as const }, ...resolvedSorts, { name: 'asc' as const }];

    const data = await prisma.company_positions.findMany({
      where,
      orderBy: safeOrderBy,
      select: {
        id: true,
        name: true,
        is_active: true,
        created_at: true,
        hierarchical_position_id: true,
        aptitudes_tecnicas_puestos: {
          include: {
            aptitudes_tecnicas: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    // Resolver nombres de hierarchy en batch
    const allHierarchyIds = [...new Set(data.flatMap((p) => p.hierarchical_position_id))];
    const hierarchyMap = new Map<string, string>();
    if (allHierarchyIds.length > 0) {
      const hierarchies = await prisma.hierarchy.findMany({
        where: { id: { in: allHierarchyIds } },
        select: { id: true, name: true },
      });
      for (const h of hierarchies) {
        hierarchyMap.set(h.id, h.name);
      }
    }

    return data.map((pos) => ({
      ...pos,
      hierarchyNames: pos.hierarchical_position_id.map((id) => hierarchyMap.get(id) ?? id),
    }));
  } catch (error) {
    logger.error('Error al exportar puestos', { data: { error } });
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
export async function getPositionSingleFacet(
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

    const crossWhere = withCompany(buildWhereClause(crossState), await getActiveCompanyId());

    switch (columnId) {
      case 'is_active': {
        const rows = await prisma.company_positions.groupBy({
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

      case 'aptitudes': {
        // Obtener todos los puestos con sus aptitudes (respetando crossWhere)
        const positions = await prisma.company_positions.findMany({
          where: crossWhere,
          select: {
            aptitudes_tecnicas_puestos: {
              select: { aptitud_id: true },
            },
          },
        });

        // Contar puestos sin aptitudes
        let nullCount = 0;
        const aptitudCounts = new Map<string, number>();

        for (const pos of positions) {
          if (pos.aptitudes_tecnicas_puestos.length === 0) {
            nullCount++;
          } else {
            for (const rel of pos.aptitudes_tecnicas_puestos) {
              aptitudCounts.set(rel.aptitud_id, (aptitudCounts.get(rel.aptitud_id) ?? 0) + 1);
            }
          }
        }

        if (nullCount > 0) {
          aptitudCounts.set(NULL_FILTER_VALUE, nullCount);
        }

        // Resolver nombres de aptitudes
        const aptitudIds = [...aptitudCounts.keys()].filter((k) => k !== NULL_FILTER_VALUE);
        const aptitudes = await prisma.aptitudes_tecnicas.findMany({
          where: { id: { in: aptitudIds } },
          select: { id: true, nombre: true },
          orderBy: { nombre: 'asc' },
        });

        const resolvedOptions = aptitudes.map((apt) => ({
          value: apt.id,
          label: apt.nombre,
        }));

        return {
          options: resolvedOptions,
          counts: aptitudCounts,
        };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener faceta de puesto', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// CATÁLOGOS para el formulario
// ============================================================================

export async function getAllHierarchiesForForm() {
  try {
    const companyId = await getActiveCompanyId();
    const data = await prisma.hierarchy.findMany({
      where: withCompany({ is_active: true }, companyId),
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return data;
  } catch (error) {
    logger.error('Error al obtener jerarquías', { data: { error } });
    throw new Error('No se pudo obtener las jerarquías.');
  }
}

export async function getAllAptitudesForForm() {
  try {
    const companyId = await getActiveCompanyId();
    const data = await prisma.aptitudes_tecnicas.findMany({
      where: withCompany({ is_active: true }, companyId),
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
    return data;
  } catch (error) {
    logger.error('Error al obtener aptitudes técnicas', { data: { error } });
    throw new Error('No se pudo obtener las aptitudes técnicas.');
  }
}

// ============================================================================
// MUTACIONES — crear y actualizar con Prisma
// ============================================================================

export async function createPositionPrisma(data: {
  name: string;
  is_active: boolean;
  hierarchical_position_id: string[];
  aptitudes_tecnicas_id: string[];
}) {
  try {
    const companyId = await getActiveCompanyId();
    // Jerarquías y aptitudes llegan del cliente: se validan contra la empresa antes de escribir.
    await Promise.all([
      assertHierarchiesOwned(companyId, data.hierarchical_position_id),
      assertAptitudesOwned(companyId, data.aptitudes_tecnicas_id),
    ]);

    const position = await prisma.company_positions.create({
      data: {
        name: data.name,
        is_active: data.is_active,
        hierarchical_position_id: data.hierarchical_position_id,
        company_id: companyId,
        ...(data.aptitudes_tecnicas_id.length > 0
          ? {
              aptitudes_tecnicas_puestos: {
                create: data.aptitudes_tecnicas_id.map((aptitudId) => ({
                  aptitud_id: aptitudId,
                })),
              },
            }
          : {}),
      },
      select: { id: true, name: true },
    });
    return position;
  } catch (error) {
    logger.error('Error al crear puesto', { data: { error } });
    throw error instanceof Error ? error : new Error('No se pudo crear el puesto. Intente nuevamente.');
  }
}

export async function updatePositionPrisma(data: {
  id: string;
  name: string;
  is_active: boolean;
  hierarchical_position_id: string[];
  aptitudes_tecnicas_id: string[];
}) {
  try {
    // Perímetro sin RLS: el puesto tiene que ser de la empresa activa antes de escribirlo.
    const companyId = await getActiveCompanyId();
    const owned = await prisma.company_positions.findFirst({
      where: withCompany({ id: data.id }, companyId),
      select: { id: true },
    });
    if (!owned) throw new Error('Puesto no encontrado');

    // Jerarquías y aptitudes llegan del cliente: se validan contra la empresa antes de escribir.
    await Promise.all([
      assertHierarchiesOwned(companyId, data.hierarchical_position_id),
      assertAptitudesOwned(companyId, data.aptitudes_tecnicas_id),
    ]);

    // Actualizar en transacción: primero eliminar relaciones M:M, luego recrear
    await prisma.$transaction([
      // Eliminar relaciones M:M existentes
      prisma.aptitudes_tecnicas_puestos.deleteMany({
        where: { puesto_id: data.id },
      }),
      // Actualizar el puesto con nuevas relaciones
      prisma.company_positions.update({
        where: { id: data.id },
        data: {
          name: data.name,
          is_active: data.is_active,
          hierarchical_position_id: data.hierarchical_position_id,
          ...(data.aptitudes_tecnicas_id.length > 0
            ? {
                aptitudes_tecnicas_puestos: {
                  create: data.aptitudes_tecnicas_id.map((aptitudId) => ({
                    aptitud_id: aptitudId,
                  })),
                },
              }
            : {}),
        },
      }),
    ]);
    return { id: data.id };
  } catch (error) {
    logger.error('Error al actualizar puesto', { data: { error } });
    throw error instanceof Error ? error : new Error('No se pudo actualizar el puesto. Intente nuevamente.');
  }
}

// ============================================================================
// TIPOS EXPORTADOS
// ============================================================================

export type PositionListItem = Awaited<ReturnType<typeof getPositionsPaginated>>['data'][number];
