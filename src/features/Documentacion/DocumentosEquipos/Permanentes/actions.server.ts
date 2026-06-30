'use server';

import { checkPermissionServer } from '@/features/Permissions/actionsServer';
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
  'policy_number',
  // FK columns (sorted via relation)
  'vehicle',
  'document_type',
  // Nuevos campos del equipo
  'vehicle_type',
  'vehicle_subtype',
  'vehicle_brand',
  'vehicle_year',
  'vehicle_owner',
  'vehicle_sector',
  'vehicle_chassis',
  'vehicle_engine',
  'vehicle_contract_type',
  'vehicle_contract_expiration',
]);

/** Mapeo de columnId → orderBy de Prisma para columnas FK */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
  document_type: (dir) => ({ document_types: { name: dir } }),
  vehicle_type: (dir) => ({ vehicles: { type_vehicles_typeTotype: { name: dir } } }),
  vehicle_subtype: (dir) => ({ vehicles: { sub_type: { name: dir } } }),
  vehicle_brand: (dir) => ({ vehicles: { brand_vehicles: { name: dir } } }),
  vehicle_year: (dir) => ({ vehicles: { year: dir } }),
  vehicle_owner: (dir) => ({ vehicles: { equipment_owners: { name: dir } } }),
  vehicle_sector: (dir) => ({ vehicles: { hierarchy: { name: dir } } }),
  vehicle_chassis: (dir) => ({ vehicles: { chassis: dir } }),
  vehicle_engine: (dir) => ({ vehicles: { engine: dir } }),
  vehicle_contract_type: (dir) => ({ vehicles: { type_of_contract: dir } }),
  vehicle_contract_expiration: (dir) => ({ vehicles: { contract_expiration_date: dir } }),
};

/** Columnas con filtro de texto libre */
const TEXT_FILTER_COLUMNS: string[] = ['vehicle', 'deny_reason', 'serie', 'policy_number', 'vehicle_year', 'vehicle_chassis', 'vehicle_engine'];

/** Columnas con filtro de rango de fechas (solo campos directos de documents_equipment) */
const DATE_RANGE_COLUMNS = ['created_at', 'validity'];

/** Mapping de columnId (URL) → campo real en Prisma */
const COLUMN_MAP: Record<string, string> = {
  state: 'state',
  document_type: 'id_document_types',
};

/** Select común con todas las relaciones resueltas */
const DOCS_EQUIPMENT_PERMANENTES_SELECT = {
  id: true,
  created_at: true,
  validity: true,
  state: true,
  is_active: true,
  archived_at: true,
  deny_reason: true,
  policy_number: true,
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
      // Nuevos campos escalares del equipo
      year: true,
      chassis: true,
      engine: true,
      type_of_contract: true,
      contract_expiration_date: true,
      // FKs del equipo (para filterFn client-side)
      type: true,
      subType: true,
      brand: true,
      owner_id: true,
      sector: true,
      // Relaciones del equipo resueltas para las columnas
      type_vehicles_typeTotype: {
        select: { id: true, name: true },
      },
      sub_type: {
        select: { id: true, name: true },
      },
      brand_vehicles: {
        select: { id: true, name: true },
      },
      equipment_owners: {
        select: { id: true, name: true },
      },
      hierarchy: {
        select: { id: true, name: true },
      },
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
      private: true,
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

async function buildWhereClause(
  companyId: string,
  state: ReturnType<typeof parseSearchParams>,
  equipmentId?: string,
  includeArchived = false
) {
  // En la vista de detalle de un equipo (equipmentId presente) se incluyen los
  // documentos archivados como historial; en la tabla general del módulo se ocultan.
  const showArchived = includeArchived || !!equipmentId;
  const canViewPrivate = await checkPermissionServer('documentacion', 'documentos-de-equipos', 'view_private');
  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...TEXT_FILTER_COLUMNS,  // includes 'policy_number', 'serie', 'vehicle', 'deny_reason', etc.
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      'mandatory',
      'multiresource',
      'contractor',
      // Nuevos filtros de vehicles (manejados explícitamente abajo)
      'vehicle_type',
      'vehicle_subtype',
      'vehicle_brand',
      'vehicle_owner',
      'vehicle_sector',
      'vehicle_contract_type',
      'vehicle_contract_expiration_from',
      'vehicle_contract_expiration_to',
    ],
  });

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // Filtros de document_types (mandatory y multiresource son campos de document_types)
  const documentTypesConditions: Record<string, unknown> = {
    is_it_montlhy: false,
    is_active: true,
    ...(!canViewPrivate && { private: { not: true } }),
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

  // Búsqueda global: busca en dominio, serie y N° interno del vehículo
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

  // Filtro texto de equipo (busca por dominio, serie o N° interno)
  const vehicleTextVal = state.filters['vehicle']?.[0];
  if (vehicleTextVal) {
    searchConditions.push({
      OR: [
        { vehicles: { domain: { contains: vehicleTextVal, mode: 'insensitive' } } },
        { vehicles: { serie: { contains: vehicleTextVal, mode: 'insensitive' } } },
        { vehicles: { intern_number: { contains: vehicleTextVal, mode: 'insensitive' } } },
      ],
    });
  }

  // Filtro texto de serie / N° de póliza (campo directo del vehículo)
  const serieTextVal = state.filters['serie']?.[0];
  if (serieTextVal) {
    searchConditions.push({
      vehicles: { serie: { contains: serieTextVal, mode: 'insensitive' } },
    });
  }

  // Filtro texto de motivo de rechazo (campo directo en documents_equipment)
  const denyReasonTextVal = state.filters['deny_reason']?.[0];
  if (denyReasonTextVal) {
    searchConditions.push({
      deny_reason: { contains: denyReasonTextVal, mode: 'insensitive' },
    });
  }

  // Filtro texto de N° de póliza (campo directo en documents_equipment)
  const policyNumberTextVal = state.filters['policy_number']?.[0];
  if (policyNumberTextVal) {
    searchConditions.push({
      policy_number: { contains: policyNumberTextVal, mode: 'insensitive' },
    });
  }

  // Filtro texto de año del equipo (campo directo en vehicles)
  const yearTextVal = state.filters['vehicle_year']?.[0];
  if (yearTextVal) {
    searchConditions.push({
      vehicles: { year: { contains: yearTextVal, mode: 'insensitive' } },
    });
  }

  // Filtro texto de chasis del equipo
  const chassisTextVal = state.filters['vehicle_chassis']?.[0];
  if (chassisTextVal) {
    searchConditions.push({
      vehicles: { chassis: { contains: chassisTextVal, mode: 'insensitive' } },
    });
  }

  // Filtro texto de motor del equipo
  const engineTextVal = state.filters['vehicle_engine']?.[0];
  if (engineTextVal) {
    searchConditions.push({
      vehicles: { engine: { contains: engineTextVal, mode: 'insensitive' } },
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

  // ─── Filtros facetados de vehicles (FK/enum que apuntan a la relación) ─────

  // Tipo (vehicles.type → UUID NOT NULL, vehicles tiene type como campo obligatorio)
  const vehicleTypeValues = state.filters['vehicle_type'];
  if (vehicleTypeValues?.length) {
    const hasNull = vehicleTypeValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleTypeValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      andConditions.push({ OR: [{ vehicles: { type: { in: realValues } } }] });
    } else if (!hasNull) {
      andConditions.push({ vehicles: { type: { in: realValues } } });
    }
    // solo NULL: no aplica (type es NOT NULL en vehicles)
  }

  // Subtipo (vehicles.subType → UUID nullable)
  const vehicleSubtypeValues = state.filters['vehicle_subtype'];
  if (vehicleSubtypeValues?.length) {
    const hasNull = vehicleSubtypeValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleSubtypeValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      andConditions.push({ OR: [{ vehicles: { subType: { in: realValues } } }, { vehicles: { subType: null } }] });
    } else if (hasNull) {
      andConditions.push({ vehicles: { subType: null } });
    } else {
      andConditions.push({ vehicles: { subType: { in: realValues } } });
    }
  }

  // Marca (vehicles.brand → Int nullable, los valores en el filtro son strings del id)
  const vehicleBrandValues = state.filters['vehicle_brand'];
  if (vehicleBrandValues?.length) {
    const hasNull = vehicleBrandValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleBrandValues
      .filter((v) => v !== NULL_FILTER_VALUE)
      .map(Number)
      .filter((n) => !isNaN(n));
    if (hasNull && realValues.length > 0) {
      andConditions.push({ OR: [{ vehicles: { brand: { in: realValues } } }, { vehicles: { brand: null } }] });
    } else if (hasNull) {
      andConditions.push({ vehicles: { brand: null } });
    } else if (realValues.length > 0) {
      andConditions.push({ vehicles: { brand: { in: realValues } } });
    }
  }

  // Propietario (vehicles.owner_id → UUID nullable)
  const vehicleOwnerValues = state.filters['vehicle_owner'];
  if (vehicleOwnerValues?.length) {
    const hasNull = vehicleOwnerValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleOwnerValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      andConditions.push({ OR: [{ vehicles: { owner_id: { in: realValues } } }, { vehicles: { owner_id: null } }] });
    } else if (hasNull) {
      andConditions.push({ vehicles: { owner_id: null } });
    } else {
      andConditions.push({ vehicles: { owner_id: { in: realValues } } });
    }
  }

  // Sector (vehicles.sector → UUID nullable)
  const vehicleSectorValues = state.filters['vehicle_sector'];
  if (vehicleSectorValues?.length) {
    const hasNull = vehicleSectorValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleSectorValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      andConditions.push({ OR: [{ vehicles: { sector: { in: realValues } } }, { vehicles: { sector: null } }] });
    } else if (hasNull) {
      andConditions.push({ vehicles: { sector: null } });
    } else {
      andConditions.push({ vehicles: { sector: { in: realValues } } });
    }
  }

  // Tipo de contrato (vehicles.type_of_contract → enum nullable)
  const vehicleContractTypeValues = state.filters['vehicle_contract_type'];
  if (vehicleContractTypeValues?.length) {
    const hasNull = vehicleContractTypeValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleContractTypeValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      andConditions.push({
        OR: [
          { vehicles: { type_of_contract: { in: realValues as import('@/generated/prisma/enums').contract_type_vehicles_enum[] } } },
          { vehicles: { type_of_contract: null } },
        ],
      });
    } else if (hasNull) {
      andConditions.push({ vehicles: { type_of_contract: null } });
    } else {
      andConditions.push({
        vehicles: { type_of_contract: { in: realValues as import('@/generated/prisma/enums').contract_type_vehicles_enum[] } },
      });
    }
  }

  // Vencimiento de contrato (vehicles.contract_expiration_date → Date nullable, rango manual)
  const contractExpirationFrom = state.filters['vehicle_contract_expiration_from']?.[0];
  const contractExpirationTo = state.filters['vehicle_contract_expiration_to']?.[0];
  if (contractExpirationFrom || contractExpirationTo) {
    const dateCondition: Record<string, unknown> = {};
    if (contractExpirationFrom) dateCondition.gte = new Date(contractExpirationFrom);
    if (contractExpirationTo) dateCondition.lte = new Date(contractExpirationTo);
    andConditions.push({ vehicles: { contract_expiration_date: dateCondition } });
  }

  return {
    // Solo documentos de equipos activos de la compañía
    ...(equipmentId ? { applies: equipmentId } : {}),
    // Excluir documentos archivados (historial / no vigente) salvo en la vista de detalle
    ...(showArchived ? {} : { archived_at: null }),
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

export async function getEquipmentPermanentDocumentsPaginated(
  searchParams: DataTableSearchParams,
  equipmentId?: string
) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    const where = await buildWhereClause(companyId, state, equipmentId);

    // Safe orderBy: multi-sort, solo campos válidos
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }

    const safeOrderBy = [...resolvedSorts, { vehicles: { domain: 'asc' as const } }];

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

export async function getAllEquipmentPermanentDocumentsForExport(
  searchParams: DataTableSearchParams,
  equipmentId?: string
) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const where = await buildWhereClause(companyId, state, equipmentId);

    const data = await prisma.documents_equipment.findMany({
      orderBy: [{ vehicles: { domain: 'asc' } }],
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
// FACETS — Single facet (lazy-load on-demand)
// ============================================================================

/**
 * Retorna counts + opciones resueltas para UNA sola columna (lazy-load).
 * Implementa crossWhere: aplica todos los filtros EXCEPTO el de la columna solicitada.
 */
export async function getEquipmentPermanentDocumentsSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams,
  equipmentId?: string
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  const companyId = await getServerCompanyId();

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
  }

  async function crossWhere(excludeColumn: string) {
    if (!parsedState) {
      const canViewPrivate = await checkPermissionServer('documentacion', 'documentos-de-equipos', 'view_private');
      return {
        ...(equipmentId ? { applies: equipmentId } : {}),
        ...(equipmentId ? {} : { archived_at: null }),
        vehicles: { company_id: companyId, is_active: true },
        document_types: { is_it_montlhy: false, is_active: true, ...(!canViewPrivate && { private: { not: true } }) },
      };
    }
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildWhereClause(companyId, modified, equipmentId);
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
    switch (columnId) {
      case 'state': {
        const where = await crossWhere('state');
        const rows = await prisma.documents_equipment.groupBy({
          by: ['state'],
          where,
          _count: { state: true },
        });
        return {
          counts: toFacetMap(rows.map((r) => ({ key: r.state as string | null, count: r._count.state }))),
        };
      }

      case 'document_type': {
        const where = await crossWhere('document_type');
        const rows = await prisma.documents_equipment.groupBy({
          by: ['id_document_types'],
          where,
          _count: { id_document_types: true },
        });
        const counts = toFacetMap(rows.map((r) => ({ key: r.id_document_types, count: r._count.id_document_types })));
        const ids = rows.map((r) => r.id_document_types).filter((id): id is string => id != null);
        const options =
          ids.length > 0
            ? await prisma.document_types.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
            : [];
        return { counts, resolvedOptions: options };
      }

      case 'mandatory': {
        const where = await crossWhere('mandatory');
        const rows = await prisma.documents_equipment.groupBy({
          by: ['id_document_types'],
          where,
          _count: { id_document_types: true },
        });
        const dtIds = rows.map((r) => r.id_document_types).filter((id): id is string => id != null);
        const dtRecords =
          dtIds.length > 0
            ? await prisma.document_types.findMany({
                where: { id: { in: dtIds } },
                select: { id: true, mandatory: true },
              })
            : [];
        const boolDtMap = new Map(dtRecords.map((dt) => [dt.id, dt]));
        const countMap = new Map<string, number>();
        for (const row of rows) {
          const count = row._count.id_document_types;
          if (row.id_document_types == null) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + count);
          } else {
            const dt = boolDtMap.get(row.id_document_types);
            const val = dt?.mandatory;
            const key = val == null ? NULL_FILTER_VALUE : String(val);
            countMap.set(key, (countMap.get(key) ?? 0) + count);
          }
        }
        return { counts: countMap };
      }

      case 'multiresource': {
        const where = await crossWhere('multiresource');
        const rows = await prisma.documents_equipment.groupBy({
          by: ['id_document_types'],
          where,
          _count: { id_document_types: true },
        });
        const dtIds = rows.map((r) => r.id_document_types).filter((id): id is string => id != null);
        const dtRecords =
          dtIds.length > 0
            ? await prisma.document_types.findMany({
                where: { id: { in: dtIds } },
                select: { id: true, multiresource: true },
              })
            : [];
        const boolDtMap = new Map(dtRecords.map((dt) => [dt.id, dt]));
        const countMap = new Map<string, number>();
        for (const row of rows) {
          const count = row._count.id_document_types;
          if (row.id_document_types == null) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + count);
          } else {
            const dt = boolDtMap.get(row.id_document_types);
            const val = dt?.multiresource;
            const key = val == null ? NULL_FILTER_VALUE : String(val);
            countMap.set(key, (countMap.get(key) ?? 0) + count);
          }
        }
        return { counts: countMap };
      }

      case 'contractor': {
        const where = await crossWhere('contractor');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: {
                contractor_equipment: {
                  select: { customers: { select: { id: true, name: true } } },
                },
              },
            },
          },
        });
        const countMap = new Map<string, number>();
        const optionsMap = new Map<string, string>();
        for (const row of rowsData) {
          const contractors = row.vehicles?.contractor_equipment ?? [];
          if (contractors.length === 0) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            for (const ce of contractors) {
              if (ce.customers?.id) {
                countMap.set(ce.customers.id, (countMap.get(ce.customers.id) ?? 0) + 1);
                optionsMap.set(ce.customers.id, ce.customers.name);
              }
            }
          }
        }
        const resolvedOptions = Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name }));
        return { counts: countMap, resolvedOptions };
      }

      case 'vehicle_type': {
        const where = await crossWhere('vehicle_type');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: {
                type: true,
                type_vehicles_typeTotype: { select: { id: true, name: true } },
              },
            },
          },
        });
        const countMap = new Map<string, number>();
        const optionsMap = new Map<string, string>();
        for (const row of rowsData) {
          const typeId = row.vehicles?.type;
          const typeName = row.vehicles?.type_vehicles_typeTotype?.name ?? null;
          if (!typeId) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            countMap.set(typeId, (countMap.get(typeId) ?? 0) + 1);
            if (typeName) optionsMap.set(typeId, typeName);
          }
        }
        return {
          counts: countMap,
          resolvedOptions: Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name })),
        };
      }

      case 'vehicle_subtype': {
        const where = await crossWhere('vehicle_subtype');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: {
                subType: true,
                sub_type: { select: { id: true, name: true } },
              },
            },
          },
        });
        const countMap = new Map<string, number>();
        const optionsMap = new Map<string, string>();
        for (const row of rowsData) {
          const subTypeId = row.vehicles?.subType;
          const subTypeName = row.vehicles?.sub_type?.name ?? null;
          if (!subTypeId) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            countMap.set(subTypeId, (countMap.get(subTypeId) ?? 0) + 1);
            if (subTypeName) optionsMap.set(subTypeId, subTypeName);
          }
        }
        return {
          counts: countMap,
          resolvedOptions: Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name })),
        };
      }

      case 'vehicle_brand': {
        const where = await crossWhere('vehicle_brand');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: {
                brand: true,
                brand_vehicles: { select: { id: true, name: true } },
              },
            },
          },
        });
        const countMap = new Map<string, number>();
        const optionsMap = new Map<string, string>();
        for (const row of rowsData) {
          const brandId = row.vehicles?.brand;
          const brandName = row.vehicles?.brand_vehicles?.name ?? null;
          if (brandId == null) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            // brand es Int, usar String para la key del Map
            const key = String(brandId);
            countMap.set(key, (countMap.get(key) ?? 0) + 1);
            if (brandName) optionsMap.set(key, brandName);
          }
        }
        return {
          counts: countMap,
          resolvedOptions: Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name })),
        };
      }

      case 'vehicle_owner': {
        const where = await crossWhere('vehicle_owner');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: {
                owner_id: true,
                equipment_owners: { select: { id: true, name: true } },
              },
            },
          },
        });
        const countMap = new Map<string, number>();
        const optionsMap = new Map<string, string>();
        for (const row of rowsData) {
          const ownerId = row.vehicles?.owner_id;
          const ownerName = row.vehicles?.equipment_owners?.name ?? null;
          if (!ownerId) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            countMap.set(ownerId, (countMap.get(ownerId) ?? 0) + 1);
            if (ownerName) optionsMap.set(ownerId, ownerName);
          }
        }
        return {
          counts: countMap,
          resolvedOptions: Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name })),
        };
      }

      case 'vehicle_sector': {
        const where = await crossWhere('vehicle_sector');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: {
                sector: true,
                hierarchy: { select: { id: true, name: true } },
              },
            },
          },
        });
        const countMap = new Map<string, number>();
        const optionsMap = new Map<string, string>();
        for (const row of rowsData) {
          const sectorId = row.vehicles?.sector;
          const sectorName = row.vehicles?.hierarchy?.name ?? null;
          if (!sectorId) {
            countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            countMap.set(sectorId, (countMap.get(sectorId) ?? 0) + 1);
            if (sectorName) optionsMap.set(sectorId, sectorName);
          }
        }
        return {
          counts: countMap,
          resolvedOptions: Array.from(optionsMap.entries()).map(([id, name]) => ({ id, name })),
        };
      }

      case 'vehicle_contract_type': {
        const where = await crossWhere('vehicle_contract_type');
        const rowsData = await prisma.documents_equipment.findMany({
          where,
          select: {
            vehicles: {
              select: { type_of_contract: true },
            },
          },
        });
        const countMap = new Map<string, number>();
        for (const row of rowsData) {
          const val = row.vehicles?.type_of_contract;
          const key = val == null ? NULL_FILTER_VALUE : String(val);
          countMap.set(key, (countMap.get(key) ?? 0) + 1);
        }
        return { counts: countMap };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facet individual de documentos permanentes de equipos', {
      data: { error, columnId },
    });
    return null;
  }
}

// ============================================================================
// FACETS — Bulk (kept for backward compat, prefer single facet)
// ============================================================================

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro.
 * @deprecated Usar getEquipmentPermanentDocumentsSingleFacet en su lugar (lazy-load).
 */
export async function getEquipmentPermanentDocumentsFacets(searchParams?: DataTableSearchParams, equipmentId?: string) {
  const companyId = await getServerCompanyId();

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  async function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) {
      const canViewPrivate = await checkPermissionServer('documentacion', 'documentos-de-equipos', 'view_private');
      return {
        ...(equipmentId ? { applies: equipmentId } : {}),
        ...(equipmentId ? {} : { archived_at: null }),
        vehicles: { company_id: companyId, is_active: true },
        document_types: { is_it_montlhy: false, is_active: true, ...(!canViewPrivate && { private: { not: true } }) },
      };
    }
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildWhereClause(companyId, modified, equipmentId);
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
    const [
      crossWhereState,
      crossWhereVehicle,
      crossWhereDocType,
      crossWhereMandatory,
      crossWhereMultiresource,
      crossWhereContractor,
    ] = await Promise.all([
      crossWhere('state'),
      crossWhere('vehicle'),
      crossWhere('document_type'),
      crossWhere('mandatory'),
      crossWhere('multiresource'),
      crossWhere('contractor'),
    ]);

    const [stateCounts, vehicleCounts, documentTypeCounts, mandatoryCounts, multiresourceCounts, contractorGroups] =
      await Promise.all([
        prisma.documents_equipment.groupBy({
          by: ['state'],
          where: crossWhereState,
          _count: { state: true },
        }),
        prisma.documents_equipment.groupBy({
          by: ['applies'],
          where: crossWhereVehicle,
          _count: { applies: true },
        }),
        prisma.documents_equipment.groupBy({
          by: ['id_document_types'],
          where: crossWhereDocType,
          _count: { id_document_types: true },
        }),
        // Mandatory — agrupamos por id_document_types para cruzar con document_types
        prisma.documents_equipment.groupBy({
          by: ['id_document_types'],
          where: crossWhereMandatory,
          _count: { id_document_types: true },
        }),
        // Multiresource — agrupamos por id_document_types para cruzar con document_types
        prisma.documents_equipment.groupBy({
          by: ['id_document_types'],
          where: crossWhereMultiresource,
          _count: { id_document_types: true },
        }),
        // Contractor / Afectación (M:M a través de vehicles)
        prisma.documents_equipment.findMany({
          where: crossWhereContractor,
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
