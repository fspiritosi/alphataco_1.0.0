'use server';

import { Logger } from '@/lib/logger';
import type { DataTableSearchParams, FacetResult } from '@/shared/components/common/DataTable';
import {
  NULL_FILTER_VALUE,
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

const logger = new Logger('features/Empresa/RRHH/AptitudesTecnicas');

// ============================================================================
// VALID SORT FIELDS — solo campos reales de BD en aptitudes_tecnicas
// ============================================================================

const VALID_SORT_FIELDS = new Set(['nombre', 'is_active']);

// ============================================================================
// SELECT reutilizable — 1 sola query con include (no 3 roundtrips)
// ============================================================================

const aptitudSelect = {
  id: true,
  nombre: true,
  is_active: true,
  aptitudes_tecnicas_puestos: {
    select: {
      puesto_id: true,
      created_at: true,
      company_positions: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

// ============================================================================
// WHERE BUILDER — DRY helper compartido por paginated, export y facets
// ============================================================================

function buildWhereClause(state: ReturnType<typeof parseSearchParams>) {
  // Búsqueda global por nombre
  const searchWhere = buildSearchWhere(state.search, ['nombre']);

  // is_active es Boolean? (nullable) — manejar manualmente (booleanos no van por buildFiltersWhere)
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

  // Filtro de texto libre por columna "nombre"
  const textFiltersWhere = buildTextFiltersWhere(state.filters, ['nombre']);

  return {
    ...searchWhere,
    ...isActiveFilter,
    ...textFiltersWhere,
  };
}

// ============================================================================
// QUERY PAGINADA
// ============================================================================

export async function getAptitudesTecnicasPaginated(searchParams: DataTableSearchParams) {
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
    const safeOrderBy = [{ is_active: 'desc' as const }, ...resolvedSorts, { nombre: 'asc' as const }];

    const [data, total] = await Promise.all([
      prisma.aptitudes_tecnicas.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: aptitudSelect,
      }),
      prisma.aptitudes_tecnicas.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener aptitudes técnicas', { data: { error } });
    throw new Error('No se pudo obtener la lista. Intente nuevamente.');
  }
}

// ============================================================================
// EXPORT COMPLETO — sin skip/take, mismos filtros
// ============================================================================

export async function getAllAptitudesTecnicasForExport(searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    const where = withCompany(buildWhereClause(state), await getActiveCompanyId());

    const resolvedSorts: Array<Record<string, unknown>> = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: s.desc ? 'desc' : 'asc' });
      }
    }
    const safeOrderBy = [{ is_active: 'desc' as const }, ...resolvedSorts, { nombre: 'asc' as const }];

    return await prisma.aptitudes_tecnicas.findMany({
      where,
      orderBy: safeOrderBy,
      select: aptitudSelect,
    });
  } catch (error) {
    logger.error('Error al exportar aptitudes técnicas', { data: { error } });
    throw new Error('No se pudo exportar la lista. Intente nuevamente.');
  }
}

// ============================================================================
// SINGLE FACET — lazy-load on-demand por columna con cross-filtering
// ============================================================================

export async function getAptitudesTecnicasSingleFacet(
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
        const rows = await prisma.aptitudes_tecnicas.groupBy({
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

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener faceta de aptitud técnica', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// OBTENER PUESTOS ACTIVOS — para el formulario (selector)
// ============================================================================

export async function getActiveCompanyPositions() {
  try {
    const companyId = await getActiveCompanyId();
    return await prisma.company_positions.findMany({
      where: withCompany({ is_active: true }, companyId),
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener puestos de trabajo', { data: { error } });
    return [];
  }
}

// ============================================================================
// MUTACIONES — crear y actualizar con Prisma
// ============================================================================

export async function createAptitudTecnicaPrisma(data: { nombre: string; puestos: string[]; is_active: boolean }) {
  try {
    const result = await prisma.aptitudes_tecnicas.create({
      data: {
        nombre: data.nombre,
        is_active: data.is_active,
        company_id: await getActiveCompanyId(),
        aptitudes_tecnicas_puestos: {
          create: data.puestos.map((puestoId) => ({ puesto_id: puestoId })),
        },
      },
      select: aptitudSelect,
    });
    return result;
  } catch (error) {
    logger.error('Error al crear aptitud técnica', { data: { error } });
    throw new Error('No se pudo crear la aptitud técnica. Intente nuevamente.');
  }
}

export async function updateAptitudTecnicaPrisma(data: {
  id: string;
  nombre: string;
  puestos: string[];
  is_active: boolean;
}) {
  try {
    // Perímetro sin RLS: la aptitud tiene que ser de la empresa activa antes de escribirla.
    const companyId = await getActiveCompanyId();
    const owned = await prisma.aptitudes_tecnicas.findFirst({
      where: withCompany({ id: data.id }, companyId),
      select: { id: true },
    });
    if (!owned) throw new Error('Aptitud técnica no encontrada');

    // deleteMany + createMany en transacción para reemplazar las relaciones M:M
    const result = await prisma.$transaction(async (tx) => {
      // 1. Borrar relaciones existentes
      await tx.aptitudes_tecnicas_puestos.deleteMany({
        where: { aptitud_id: data.id },
      });

      // 2. Actualizar aptitud y crear nuevas relaciones
      return tx.aptitudes_tecnicas.update({
        where: { id: data.id },
        data: {
          nombre: data.nombre,
          is_active: data.is_active,
          aptitudes_tecnicas_puestos: {
            create: data.puestos.map((puestoId) => ({ puesto_id: puestoId })),
          },
        },
        select: aptitudSelect,
      });
    });

    return result;
  } catch (error) {
    logger.error('Error al actualizar aptitud técnica', { data: { error } });
    throw new Error('No se pudo actualizar la aptitud técnica. Intente nuevamente.');
  }
}

// ============================================================================
// TIPOS EXPORTADOS
// ============================================================================

export type AptitudTecnicaListItem = Awaited<ReturnType<typeof getAptitudesTecnicasPaginated>>['data'][number];

export type CompanyPositionOption = Awaited<ReturnType<typeof getActiveCompanyPositions>>[number];
