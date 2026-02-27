'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildTextFiltersWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('DocumentosEmpleadosPermanentes/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos directos de documents_employees que se pueden ordenar server-side */
const VALID_SORT_FIELDS = new Set([
  'created_at',
  'validity',
  'state',
  // FK columns (sorted by relation name)
  'employee',
  'document_type',
]);

/** Mapeo de columnId → orderBy de Prisma para columnas FK */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  employee: (dir) => ({ employees: { lastname: dir } }),
  document_type: (dir) => ({ document_types: { name: dir } }),
};

/** Columnas con filtro de texto libre (campos directos o accesibles) */
const TEXT_FILTER_COLUMNS: string[] = [];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['created_at', 'validity'];

/**
 * Mapping de columnId (URL) → campo real en Prisma
 */
const COLUMN_MAP: Record<string, string> = {
  state: 'state',
  employee: 'applies',
  document_type: 'id_document_types',
};

/** Select común con todas las relaciones resueltas */
const DOCS_EMPLOYEES_PERMANENTES_SELECT = {
  id: true,
  created_at: true,
  validity: true,
  state: true,
  is_active: true,
  deny_reason: true,
  document_path: true,
  applies: true,
  id_document_types: true,
  employees: {
    select: {
      id: true,
      firstname: true,
      lastname: true,
      document_number: true,
      file: true,
    },
  },
  document_types: {
    select: {
      id: true,
      name: true,
      mandatory: true,
      multiresource: true,
      explired: true,
      is_it_montlhy: true,
    },
  },
} as const;

// ============================================================================
// WHERE CLAUSE BUILDER
// ============================================================================

function buildWhereClause(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...TEXT_FILTER_COLUMNS,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      'mandatory',
      'multiresource',
    ],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // ─── Filtros de document_types (mandatory y multiresource son campos de document_types) ─
  // Construir el objeto document_types combinando is_it_montlhy + filtros opcionales.
  const documentTypesConditions: Record<string, unknown> = {
    is_it_montlhy: false,
  };

  const mandatoryValues = state.filters['mandatory'];
  if (mandatoryValues?.length) {
    const boolValues = mandatoryValues.map((v) => v === 'true');
    documentTypesConditions.mandatory = { in: boolValues };
  }

  const multiresourceValues = state.filters['multiresource'];
  if (multiresourceValues?.length) {
    const boolValues = multiresourceValues.map((v) => v === 'true');
    documentTypesConditions.multiresource = { in: boolValues };
  }

  // Búsqueda global: busca en nombre de empleado via relación
  const searchConditions: Record<string, unknown>[] = [];
  if (state.search) {
    searchConditions.push({
      OR: [
        { employees: { lastname: { contains: state.search, mode: 'insensitive' } } },
        { employees: { firstname: { contains: state.search, mode: 'insensitive' } } },
      ],
    });
  }

  return {
    // Solo documentos permanentes (no mensuales) con empleados activos de la compañía
    employees: {
      company_id: companyId,
      is_active: true,
    },
    document_types: documentTypesConditions,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...(searchConditions.length > 0 ? { AND: searchConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getEmployeePermanentDocumentsPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    const where = buildWhereClause(companyId, state);

    // Safe orderBy: multi-sort, solo campos válidos
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }

    const safeOrderBy = [...resolvedSorts, { created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.documents_employees.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: DOCS_EMPLOYEES_PERMANENTES_SELECT,
      }),
      prisma.documents_employees.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener documentos permanentes de empleados paginados', { data: { error } });
    throw new Error('Error al obtener los documentos permanentes de empleados');
  }
}

export type EmployeePermanentDocumentListItem = Awaited<
  ReturnType<typeof getEmployeePermanentDocumentsPaginated>
>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllEmployeePermanentDocumentsForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(companyId, state);

    const data = await prisma.documents_employees.findMany({
      orderBy: [{ created_at: 'desc' }],
      where,
      select: DOCS_EMPLOYEES_PERMANENTES_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar documentos permanentes de empleados', { data: { error } });
    throw new Error('Error al exportar los documentos permanentes de empleados');
  }
}

// ============================================================================
// FACETS
// ============================================================================

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro.
 */
export async function getEmployeePermanentDocumentsFacets(searchParams?: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  const baseDocTypesWhere = { is_it_montlhy: false };
  const baseEmployeesWhere = { company_id: companyId, is_active: true };

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) {
      return {
        employees: baseEmployeesWhere,
        document_types: baseDocTypesWhere,
      };
    }
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildWhereClause(companyId, modified);
  }

  // Helper: construir Map<string, count> con soporte para null → NULL_FILTER_VALUE
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
    const [stateCounts, employeeCounts, documentTypeCounts, mandatoryCounts, multiresourceCounts] = await Promise.all([
      prisma.documents_employees.groupBy({
        by: ['state'],
        where: crossWhere('state'),
        _count: true,
      }),
      prisma.documents_employees.groupBy({
        by: ['applies'],
        where: crossWhere('employee'),
        _count: true,
      }),
      prisma.documents_employees.groupBy({
        by: ['id_document_types'],
        where: crossWhere('document_type'),
        _count: true,
      }),
      // mandatory es un campo de document_types, no de documents_employees directamente
      prisma.document_types
        .findMany({
          where: {
            is_it_montlhy: false,
            documents_employees: {
              some: crossWhere('mandatory'),
            },
          },
          select: {
            mandatory: true,
            _count: { select: { documents_employees: true } },
          },
          distinct: ['mandatory'],
        })
        .then((rows) => rows.map((r) => ({ key: String(r.mandatory), count: r._count.documents_employees }))),
      // multiresource es un campo de document_types
      prisma.document_types
        .findMany({
          where: {
            is_it_montlhy: false,
            documents_employees: {
              some: crossWhere('multiresource'),
            },
          },
          select: {
            multiresource: true,
            _count: { select: { documents_employees: true } },
          },
          distinct: ['multiresource'],
        })
        .then((rows) => rows.map((r) => ({ key: String(r.multiresource), count: r._count.documents_employees }))),
    ]);

    // Resolver nombres de empleados para el filtro
    const employeeIds = employeeCounts.map((r) => r.applies).filter(Boolean) as string[];
    const employeeOptions =
      employeeIds.length > 0
        ? await prisma.employees.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, firstname: true, lastname: true, file: true },
          })
        : [];

    // Resolver nombres de tipos de documento para el filtro
    const documentTypeIds = documentTypeCounts.map((r) => r.id_document_types).filter(Boolean) as string[];
    const documentTypeOptions =
      documentTypeIds.length > 0
        ? await prisma.document_types.findMany({
            where: { id: { in: documentTypeIds } },
            select: { id: true, name: true },
          })
        : [];

    return {
      state: toFacetMap(stateCounts.map((r) => ({ key: r.state as string, count: r._count }))),
      employee: toFacetMap(employeeCounts.map((r) => ({ key: r.applies, count: r._count }))),
      employeeOptions,
      document_type: toFacetMap(documentTypeCounts.map((r) => ({ key: r.id_document_types, count: r._count }))),
      documentTypeOptions,
      mandatory: toFacetMap(mandatoryCounts),
      multiresource: toFacetMap(multiresourceCounts),
    };
  } catch (error) {
    logger.error('Error al obtener facets de documentos permanentes de empleados', { data: { error } });
    return null;
  }
}

export type EmployeePermanentDocumentsFacets = Awaited<ReturnType<typeof getEmployeePermanentDocumentsFacets>>;
