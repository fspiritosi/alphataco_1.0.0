'use server';

import { checkPermissionServer } from '@/features/Permissions/actionsServer';
import type { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';
import moment from 'moment';

const logger = new Logger('features/Dashboard/Documentacion/Empleados');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Documentos que vencen dentro de los próximos 30 días (o ya vencidos) */
const EXPIRY_WINDOW_DAYS = 30;

/** Campos reales de BD que admiten ordenamiento */
const VALID_SORT_FIELDS = new Set(['created_at', 'validity', 'state', 'employee', 'document_type']);

/** Columnas FK con resolución de orderBy en Prisma */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Prisma.documents_employeesOrderByWithRelationInput> = {
  employee: (dir) => ({ employees: { lastname: dir } }),
  document_type: (dir) => ({ document_types: { name: dir } }),
};

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['created_at', 'validity'];

/** Mapping columnId (URL) → campo Prisma */
const COLUMN_MAP: Record<string, string> = {
  state: 'state',
  document_type: 'id_document_types',
};

// ============================================================================
// WHERE CLAUSE BUILDER
// ============================================================================

/**
 * Construye la cláusula WHERE compartida entre paginated, export y facets.
 * Incluye el filtro permanente de documentos por vencer (validity <= nextMonth).
 */
async function buildWhereClause(
  companyId: string,
  state: ReturnType<typeof parseSearchParams>
): Promise<Prisma.documents_employeesWhereInput> {
  const canViewPrivate = await checkPermissionServer('documentacion', 'documentos-de-empleados', 'view_private');
  const nextMonth = moment().add(EXPIRY_WINDOW_DAYS, 'days').endOf('day').toDate();

  // Filtros facetados
  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
  });

  // Filtros de rango de fechas
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  const validityFilter: Prisma.DateTimeNullableFilter = {
    not: null,
    lte: nextMonth,
  };

  // Si el usuario filtró por rango de validity, sobreescribir solo el campo validity
  const userValidityFilter = (dateFiltersWhere as Record<string, unknown>).validity;
  const userCreatedAtFilter = (dateFiltersWhere as Record<string, unknown>).created_at;

  return {
    employees: {
      is_active: true,
      company_id: companyId,
    },
    document_types: {
      is_it_montlhy: false,
      ...(!canViewPrivate && { private: { not: true } }),
    },
    validity: userValidityFilter !== undefined ? (userValidityFilter as Prisma.DateTimeNullableFilter) : validityFilter,
    ...(userCreatedAtFilter !== undefined ? { created_at: userCreatedAtFilter as Prisma.DateTimeFilter } : {}),
    ...(filtersWhere as Prisma.documents_employeesWhereInput),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getEmployeeExpiringDocsPaginated(searchParams: DataTableSearchParams) {
  logger.debug('Obteniendo documentos de empleados por vencer');

  try {
    const companyId = await getServerCompanyId();
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    // Resolver sorting con validación y FK_SORT_MAP
    const resolvedSorts: Prisma.documents_employeesOrderByWithRelationInput[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }
    const safeOrderBy: Prisma.documents_employeesOrderByWithRelationInput[] =
      resolvedSorts.length > 0 ? resolvedSorts : [{ validity: 'asc' }];

    const where = await buildWhereClause(companyId, state);

    const [data, total] = await Promise.all([
      prisma.documents_employees.findMany({
        where,
        skip,
        take,
        orderBy: safeOrderBy,
        select: {
          id: true,
          created_at: true,
          validity: true,
          state: true,
          is_active: true,
          document_path: true,
          id_document_types: true,
          applies: true,
          employees: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              file: true,
            },
          },
          document_types: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.documents_employees.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener documentos de empleados por vencer', { data: { error } });
    throw new Error('No se pudieron obtener los documentos. Intente nuevamente.');
  }
}

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllEmployeeExpiringDocsForExport(searchParams: DataTableSearchParams) {
  logger.debug('Exportando documentos de empleados por vencer');

  try {
    const companyId = await getServerCompanyId();
    const state = parseSearchParams(searchParams);
    const where = await buildWhereClause(companyId, state);

    return await prisma.documents_employees.findMany({
      where,
      orderBy: [{ validity: 'asc' }],
      select: {
        id: true,
        created_at: true,
        validity: true,
        state: true,
        is_active: true,
        document_path: true,
        id_document_types: true,
        applies: true,
        employees: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            file: true,
          },
        },
        document_types: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Error al exportar documentos de empleados por vencer', { data: { error } });
    throw new Error('No se pudo exportar la lista. Intente nuevamente.');
  }
}

// ============================================================================
// FACETS — Single column (lazy-load)
// ============================================================================

/**
 * Obtiene counts (y opciones resueltas para FK) de UNA sola columna.
 * Implementa cross-filter: aplica todos los filtros activos EXCEPTO la columna propia.
 */
export async function getEmployeeExpiringDocsSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  logger.debug('Obteniendo facet de documentos de empleados por vencer', { data: { columnId } });

  try {
    const companyId = await getServerCompanyId();
    const nextMonth = moment().add(EXPIRY_WINDOW_DAYS, 'days').endOf('day').toDate();

    const baseWhere: Prisma.documents_employeesWhereInput = {
      employees: {
        is_active: true,
        company_id: companyId,
      },
      document_types: {
        is_it_montlhy: false,
      },
      validity: {
        not: null,
        lte: nextMonth,
      },
    };

    /** Construye un WHERE con todos los filtros activos EXCEPTO la columna indicada */
    function crossWhere(excludeColumn: string): Prisma.documents_employeesWhereInput {
      if (!searchParams || Object.keys(searchParams).length === 0) return baseWhere;
      const state = parseSearchParams(searchParams);

      const filtersWithoutExcluded = { ...state.filters };
      delete filtersWithoutExcluded[excludeColumn];
      delete filtersWithoutExcluded[`${excludeColumn}_from`];
      delete filtersWithoutExcluded[`${excludeColumn}_to`];

      const crossState = { ...state, filters: filtersWithoutExcluded };
      const filtersWhere = buildFiltersWhere(crossState.filters, COLUMN_MAP, {
        exclude: DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      });
      const dateFiltersWhere = buildDateRangeFiltersWhere(crossState.filters, DATE_RANGE_COLUMNS);

      const userValidityFilter = (dateFiltersWhere as Record<string, unknown>).validity;
      const userCreatedAtFilter = (dateFiltersWhere as Record<string, unknown>).created_at;

      return {
        ...baseWhere,
        ...(userValidityFilter !== undefined ? { validity: userValidityFilter as Prisma.DateTimeNullableFilter } : {}),
        ...(userCreatedAtFilter !== undefined ? { created_at: userCreatedAtFilter as Prisma.DateTimeFilter } : {}),
        ...(filtersWhere as Prisma.documents_employeesWhereInput),
      };
    }

    function toFacetMap(rows: { key: string | null; count: number }[]): Map<string, number> {
      const map = new Map<string, number>();
      for (const { key, count } of rows) {
        map.set(key == null ? NULL_FILTER_VALUE : key, (map.get(key == null ? NULL_FILTER_VALUE : key) ?? 0) + count);
      }
      return map;
    }

    const where = crossWhere(columnId);

    if (columnId === 'state') {
      const rows = await prisma.documents_employees.groupBy({
        by: ['state'],
        where,
        _count: true,
      });
      return {
        counts: toFacetMap(rows.map((r) => ({ key: r.state, count: r._count }))),
      };
    }

    if (columnId === 'document_type') {
      const rows = await prisma.documents_employees.groupBy({
        by: ['id_document_types'],
        where,
        _count: true,
      });

      const docTypeIds = rows.filter((r) => r.id_document_types != null).map((r) => r.id_document_types!);
      const resolvedOptions =
        docTypeIds.length > 0
          ? await prisma.document_types.findMany({
              where: { id: { in: docTypeIds } },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : [];

      const counts = new Map<string, number>();
      for (const r of rows) {
        const key = r.id_document_types == null ? NULL_FILTER_VALUE : r.id_document_types;
        counts.set(key, (counts.get(key) ?? 0) + r._count);
      }

      return { counts, resolvedOptions };
    }

    logger.warn('columnId no reconocido en getEmployeeExpiringDocsSingleFacet', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error al obtener facet de documentos de empleados por vencer', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// TIPOS EXPORTADOS
// ============================================================================

export type EmployeeExpiringDocListItem = Awaited<ReturnType<typeof getEmployeeExpiringDocsPaginated>>['data'][number];
