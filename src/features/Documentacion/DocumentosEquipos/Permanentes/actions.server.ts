'use server';

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

const logger = new Logger('DocumentosEquiposPermanentes/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos de documents_equipment que se pueden ordenar server-side */
const VALID_SORT_FIELDS = new Set([
  'created_at',
  'validity',
  'state',
  // FK columns (sorted via relation)
  'vehicle',
  'document_type',
]);

/** Mapeo de columnId → orderBy de Prisma para columnas FK */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
  document_type: (dir) => ({ document_types: { name: dir } }),
};

/** Columnas con filtro de texto libre (campos directos) */
const TEXT_FILTER_COLUMNS: string[] = [];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['created_at', 'validity'];

/** Mapping de columnId (URL) → campo real en Prisma */
const COLUMN_MAP: Record<string, string> = {
  state: 'state',
  vehicle: 'applies',
  document_type: 'id_document_types',
};

/** Select común con todas las relaciones resueltas */
const DOCS_EQUIPMENT_PERMANENTES_SELECT = {
  id: true,
  created_at: true,
  validity: true,
  state: true,
  is_active: true,
  deny_reason: true,
  document_path: true,
  applies: true,
  id_document_types: true,
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
      is_active: true,
      contractor_equipment: {
        select: {
          id: true,
          customers: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
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
  documents_equipment_logs: {
    select: {
      updated_at: true,
    },
    orderBy: { updated_at: 'desc' as const },
    take: 1,
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
      'contractor',
    ],
  });

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // Filtros de document_types (mandatory y multiresource son campos de document_types)
  const documentTypesConditions: Record<string, unknown> = {
    is_it_montlhy: false,
    is_active: true,
  };

  const mandatoryValues = state.filters['mandatory'];
  if (mandatoryValues?.length) {
    const hasNullM = mandatoryValues.includes(NULL_FILTER_VALUE);
    const realM = mandatoryValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (!hasNullM) {
      documentTypesConditions.mandatory = { in: realM.map((v) => v === 'true') };
    }
    // hasNull o mixto → manejado en andConditions extra
  }

  const multiresourceValues = state.filters['multiresource'];
  if (multiresourceValues?.length) {
    const hasNullMr = multiresourceValues.includes(NULL_FILTER_VALUE);
    const realMr = multiresourceValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (!hasNullMr) {
      documentTypesConditions.multiresource = { in: realMr.map((v) => v === 'true') };
    }
    // hasNull o mixto → manejado en andConditions extra
  }

  // ─── Filtro contractor (afectación M:M a través de vehicles) ──────────────
  const contractorValues = state.filters['contractor'];
  let contractorCondition: Record<string, unknown> | null = null;
  if (contractorValues?.length) {
    const hasNull = contractorValues.includes(NULL_FILTER_VALUE);
    const realValues = contractorValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      contractorCondition = {
        OR: [
          { vehicles: { contractor_equipment: { some: { customers: { id: { in: realValues } } } } } },
          { vehicles: { contractor_equipment: { none: {} } } },
        ],
      };
    } else if (hasNull) {
      contractorCondition = { vehicles: { contractor_equipment: { none: {} } } };
    } else {
      contractorCondition = {
        vehicles: { contractor_equipment: { some: { customers: { id: { in: realValues } } } } },
      };
    }
  }

  // Búsqueda global: busca en dominio y serie del vehículo
  const searchConditions: Record<string, unknown>[] = [];
  if (state.search) {
    searchConditions.push({
      OR: [
        { vehicles: { domain: { contains: state.search, mode: 'insensitive' } } },
        { vehicles: { serie: { contains: state.search, mode: 'insensitive' } } },
        { vehicles: { intern_number: { contains: state.search, mode: 'insensitive' } } },
      ],
    });
  }

  const andConditions: Record<string, unknown>[] = [
    ...(searchConditions.length > 0 ? searchConditions : []),
    ...(contractorCondition ? [contractorCondition] : []),
  ];

  // ─── Condiciones para NULL en mandatory/multiresource ─────────────────────
  if (mandatoryValues?.length) {
    const hasNullM = mandatoryValues.includes(NULL_FILTER_VALUE);
    const realM = mandatoryValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNullM && realM.length > 0) {
      // Mixto: null + valores reales → usar OR
      andConditions.push({
        OR: [
          { document_types: { mandatory: { in: realM.map((v) => v === 'true') } } },
          { document_types: { mandatory: null } },
        ],
      });
    } else if (hasNullM) {
      andConditions.push({ document_types: { mandatory: null } });
    }
  }

  if (multiresourceValues?.length) {
    const hasNullMr = multiresourceValues.includes(NULL_FILTER_VALUE);
    const realMr = multiresourceValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNullMr && realMr.length > 0) {
      andConditions.push({
        OR: [
          { document_types: { multiresource: { in: realMr.map((v) => v === 'true') } } },
          { document_types: { multiresource: null } },
        ],
      });
    } else if (hasNullMr) {
      andConditions.push({ document_types: { multiresource: null } });
    }
  }

  return {
    // Solo documentos de equipos activos de la compañía
    vehicles: {
      company_id: companyId,
      is_active: true,
    },
    document_types: documentTypesConditions,
    ...filtersWhere,
    ...dateFiltersWhere,
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getEquipmentPermanentDocumentsPaginated(searchParams: DataTableSearchParams) {
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
      prisma.documents_equipment.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: DOCS_EQUIPMENT_PERMANENTES_SELECT,
      }),
      prisma.documents_equipment.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener documentos permanentes de equipos paginados', { data: { error } });
    throw new Error('Error al obtener los documentos permanentes de equipos');
  }
}

export type EquipmentPermanentDocumentListItem = Awaited<
  ReturnType<typeof getEquipmentPermanentDocumentsPaginated>
>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllEquipmentPermanentDocumentsForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(companyId, state);

    const data = await prisma.documents_equipment.findMany({
      orderBy: [{ created_at: 'desc' }],
      where,
      select: DOCS_EQUIPMENT_PERMANENTES_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar documentos permanentes de equipos', { data: { error } });
    throw new Error('Error al exportar los documentos permanentes de equipos');
  }
}

// ============================================================================
// FACETS
// ============================================================================

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro.
 */
export async function getEquipmentPermanentDocumentsFacets(searchParams?: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) {
      return {
        vehicles: { company_id: companyId, is_active: true },
        document_types: { is_it_montlhy: false, is_active: true },
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
    const [stateCounts, vehicleCounts, documentTypeCounts, mandatoryCounts, multiresourceCounts, contractorGroups] =
      await Promise.all([
        prisma.documents_equipment.groupBy({
          by: ['state'],
          where: crossWhere('state'),
          _count: { state: true },
        }),
        prisma.documents_equipment.groupBy({
          by: ['applies'],
          where: crossWhere('vehicle'),
          _count: { applies: true },
        }),
        prisma.documents_equipment.groupBy({
          by: ['id_document_types'],
          where: crossWhere('document_type'),
          _count: { id_document_types: true },
        }),
        // Mandatory — agrupamos por id_document_types para cruzar con document_types
        prisma.documents_equipment.groupBy({
          by: ['id_document_types'],
          where: crossWhere('mandatory'),
          _count: { id_document_types: true },
        }),
        // Multiresource — agrupamos por id_document_types para cruzar con document_types
        prisma.documents_equipment.groupBy({
          by: ['id_document_types'],
          where: crossWhere('multiresource'),
          _count: { id_document_types: true },
        }),
        // Contractor / Afectación (M:M a través de vehicles)
        prisma.documents_equipment.findMany({
          where: crossWhere('contractor'),
          select: {
            vehicles: {
              select: {
                contractor_equipment: {
                  select: {
                    customers: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        }),
      ]);

    // ─── state map ────────────────────────────────────────────────────────
    const stateMap = toFacetMap(stateCounts.map((r) => ({ key: r.state as string | null, count: r._count.state })));

    // ─── vehicle map + options ─────────────────────────────────────────────
    const vehicleIds = vehicleCounts.map((r) => r.applies).filter((id): id is string => id != null);
    const vehicleOptions =
      vehicleIds.length > 0
        ? await prisma.vehicles.findMany({
            where: { id: { in: vehicleIds } },
            select: { id: true, domain: true, serie: true, intern_number: true },
          })
        : [];

    const vehicleMap = toFacetMap(vehicleCounts.map((r) => ({ key: r.applies, count: r._count.applies })));

    // ─── documentType map + options ────────────────────────────────────────
    const docTypeIds = documentTypeCounts.map((r) => r.id_document_types).filter((id): id is string => id != null);
    const documentTypeOptions =
      docTypeIds.length > 0
        ? await prisma.document_types.findMany({
            where: { id: { in: docTypeIds } },
            select: { id: true, name: true },
          })
        : [];

    const docTypeMap = toFacetMap(
      documentTypeCounts.map((r) => ({ key: r.id_document_types, count: r._count.id_document_types }))
    );

    // ─── Lookup de document_types para mandatory y multiresource ─────────────
    const mandatoryDtIds = mandatoryCounts.map((r) => r.id_document_types).filter((id): id is string => id != null);
    const multiresourceDtIds = multiresourceCounts
      .map((r) => r.id_document_types)
      .filter((id): id is string => id != null);
    const allBoolDtIds = [...new Set([...mandatoryDtIds, ...multiresourceDtIds])];

    const boolDocTypeRecords = allBoolDtIds.length
      ? await prisma.document_types.findMany({
          where: { id: { in: allBoolDtIds } },
          select: { id: true, mandatory: true, multiresource: true },
        })
      : [];

    const boolDtMap = new Map(boolDocTypeRecords.map((dt) => [dt.id, dt]));

    // ─── mandatory map ────────────────────────────────────────────────────
    const mandatoryCountMap = new Map<string, number>();
    for (const row of mandatoryCounts) {
      const count = row._count.id_document_types;
      if (row.id_document_types == null) {
        mandatoryCountMap.set(NULL_FILTER_VALUE, (mandatoryCountMap.get(NULL_FILTER_VALUE) ?? 0) + count);
      } else {
        const dt = boolDtMap.get(row.id_document_types);
        const val = dt?.mandatory;
        const key = val == null ? NULL_FILTER_VALUE : String(val);
        mandatoryCountMap.set(key, (mandatoryCountMap.get(key) ?? 0) + count);
      }
    }

    // ─── multiresource map ────────────────────────────────────────────────
    const multiresourceCountMap = new Map<string, number>();
    for (const row of multiresourceCounts) {
      const count = row._count.id_document_types;
      if (row.id_document_types == null) {
        multiresourceCountMap.set(NULL_FILTER_VALUE, (multiresourceCountMap.get(NULL_FILTER_VALUE) ?? 0) + count);
      } else {
        const dt = boolDtMap.get(row.id_document_types);
        const val = dt?.multiresource;
        const key = val == null ? NULL_FILTER_VALUE : String(val);
        multiresourceCountMap.set(key, (multiresourceCountMap.get(key) ?? 0) + count);
      }
    }

    // ─── contractor map + options ─────────────────────────────────────────
    const contractorCountMap = new Map<string, number>();
    const contractorOptionsMap = new Map<string, string>();

    for (const row of contractorGroups) {
      const contractors = row.vehicles?.contractor_equipment ?? [];
      if (contractors.length === 0) {
        contractorCountMap.set(NULL_FILTER_VALUE, (contractorCountMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
      } else {
        for (const ce of contractors) {
          if (ce.customers?.id) {
            contractorCountMap.set(ce.customers.id, (contractorCountMap.get(ce.customers.id) ?? 0) + 1);
            contractorOptionsMap.set(ce.customers.id, ce.customers.name);
          }
        }
      }
    }

    const contractorOptions = Array.from(contractorOptionsMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));

    return {
      state: stateMap,
      vehicle: vehicleMap,
      vehicleOptions,
      document_type: docTypeMap,
      documentTypeOptions,
      mandatory: mandatoryCountMap,
      multiresource: multiresourceCountMap,
      contractor: contractorCountMap,
      contractorOptions,
    };
  } catch (error) {
    logger.error('Error al obtener facets de documentos permanentes de equipos', { data: { error } });
    return null;
  }
}

export type EquipmentPermanentDocumentsFacets = Awaited<ReturnType<typeof getEquipmentPermanentDocumentsFacets>>;
