'use server';

import { checkPermissionServer } from '@/features/Permissions/actionsServer';
import type { Prisma } from '@/generated/prisma/client';
import { document_applies } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';

// NOTE: document_applies is NOT re-exported from 'use server' files.
// Callers must import it directly from '@/generated/prisma/enums'.

const logger = new Logger('features/TiposDocumentos');

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_SORT_FIELDS = new Set([
  'name',
  'mandatory',
  'explired',
  'special',
  'multiresource',
  'is_it_montlhy',
  'private',
  'down_document',
  'created_at',
  'equipment_type',
  'applies',
  'is_active',
]);

/** Params de URL que NO son filtros de la tabla */
const IGNORED_PARAMS = new Set(['tab', 'subtab']);

/** Columnas de texto libre */
const TEXT_FILTER_COLUMNS = ['name', 'description'];

/** Columnas de rango de fecha */
const DATE_RANGE_COLUMNS = ['created_at'];

/** Columnas booleanas (llegan como string 'true'/'false' desde los filtros facetados) */
const BOOLEAN_FILTER_COLUMNS = [
  'mandatory',
  'explired',
  'special',
  'multiresource',
  'is_it_montlhy',
  'private',
  'down_document',
  'is_active',
] as const;

type BooleanFilterColumn = (typeof BOOLEAN_FILTER_COLUMNS)[number];

// ============================================================================
// SELECT — excluye 'conditions' (JSON pesado, se carga solo en edición)
// ============================================================================

const DOC_TYPE_SELECT = {
  id: true,
  name: true,
  applies: true,
  multiresource: true,
  mandatory: true,
  explired: true,
  special: true,
  is_active: true,
  description: true,
  company_id: true,
  is_it_montlhy: true,
  private: true,
  down_document: true,
  equipment_type: true,
  created_at: true,
} as const;

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

const PRIVATE_PERMISSION_TAB: Record<string, string> = {
  Persona: 'tipos-docs-personas',
  Equipos: 'tipos-docs-equipos',
  Empresa: 'tipos-docs-empresa',
};

/**
 * Construye el WHERE clause compartido entre paginated, export y facets.
 * El parámetro `applies` se aplica como filtro fijo (scope de tab).
 * Filtra tipos de documento privados si el usuario no tiene permiso `view_private`.
 */
async function buildWhereClause(applies: document_applies, state: ReturnType<typeof parseSearchParams>) {
  const tabSlug = PRIVATE_PERMISSION_TAB[applies];
  const canViewPrivate = tabSlug ? await checkPermissionServer('documentacion', tabSlug, 'view_private') : true;
  const searchWhere = buildSearchWhere(state.search, ['name', 'description']);

  const filtersWhere = buildFiltersWhere(
    state.filters,
    {},
    {
      exclude: [
        ...TEXT_FILTER_COLUMNS,
        ...(BOOLEAN_FILTER_COLUMNS as readonly string[]),
        ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      ],
    }
  );

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // Boolean filters: convert string 'true'/'false' → actual boolean
  const boolFilters: Record<string, boolean | { in: boolean[] }> = {};
  for (const col of BOOLEAN_FILTER_COLUMNS) {
    const values = state.filters[col];
    if (!values?.length) continue;
    const boolValues = values.filter((v) => v === 'true' || v === 'false').map((v) => v === 'true');
    if (boolValues.length === 0) continue;
    boolFilters[col] = boolValues.length === 1 ? boolValues[0] : { in: boolValues };
  }

  return {
    applies,
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...boolFilters,
    ...(!canViewPrivate && { private: { not: true } }),
  };
}

// ============================================================================
// PAGINATED QUERY (PRIVATE BASE)
// ============================================================================

async function getDocTypesPaginated(applies: document_applies, searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const { skip, take } = stateToPrismaParams(state);
    const where = await buildWhereClause(applies, state);

    // Safe multi-sort, only whitelisted fields
    const resolvedSorts: Record<string, 'asc' | 'desc'>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: s.desc ? 'desc' : 'asc' });
      }
    }
    // Inactivos siempre al final, luego por nombre
    const safeOrderBy = [{ is_active: 'desc' as const }, ...resolvedSorts, { name: 'asc' as const }];

    const [data, total] = await Promise.all([
      prisma.document_types.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: DOC_TYPE_SELECT,
      }),
      prisma.document_types.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener tipos de documento paginados', {
      data: { error, applies },
    });
    throw new Error(`Error al obtener tipos de documento: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// PUBLIC WRAPPERS — one per tab
// ============================================================================

export async function getPersonasDocTypesPaginated(searchParams: DataTableSearchParams) {
  return getDocTypesPaginated(document_applies.Persona, searchParams);
}

export async function getEquiposDocTypesPaginated(searchParams: DataTableSearchParams) {
  return getDocTypesPaginated(document_applies.Equipos, searchParams);
}

export async function getEmpresaDocTypesPaginated(searchParams: DataTableSearchParams) {
  return getDocTypesPaginated(document_applies.Empresa, searchParams);
}

// ============================================================================
// EXPORT QUERIES (no skip/take)
// ============================================================================

async function getDocTypesForExport(applies: document_applies, searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const where = await buildWhereClause(applies, state);

    return await prisma.document_types.findMany({
      orderBy: [{ name: 'asc' }],
      where,
      select: DOC_TYPE_SELECT,
    });
  } catch (error) {
    logger.error('Error al exportar tipos de documento', { data: { error, applies } });
    throw new Error('Error al exportar tipos de documento');
  }
}

export async function getPersonasDocTypesForExport(searchParams: DataTableSearchParams) {
  return getDocTypesForExport(document_applies.Persona, searchParams);
}

export async function getEquiposDocTypesForExport(searchParams: DataTableSearchParams) {
  return getDocTypesForExport(document_applies.Equipos, searchParams);
}

export async function getEmpresaDocTypesForExport(searchParams: DataTableSearchParams) {
  return getDocTypesForExport(document_applies.Empresa, searchParams);
}

// ============================================================================
// GET FOR EDIT (loads conditions JSON)
// ============================================================================

/**
 * Obtiene un tipo de documento completo (incluyendo conditions) para edición.
 */
export async function getDocumentTypeForEdit(id: string) {
  logger.debug('Obteniendo tipo de documento para editar', { data: { id } });

  try {
    const data = await prisma.document_types.findFirst({
      where: { id },
    });

    if (!data) {
      throw new Error('Tipo de documento no encontrado');
    }

    return data;
  } catch (error) {
    logger.error('Error al obtener tipo de documento para editar', {
      data: { error, id },
    });
    throw error;
  }
}

// ============================================================================
// CRUD MUTATIONS
// ============================================================================

export interface CreateDocumentTypeInput {
  name: string;
  applies: document_applies;
  equipment_type?: string | null;
  mandatory: boolean;
  explired: boolean;
  special: boolean;
  multiresource: boolean;
  is_it_montlhy?: boolean;
  private?: boolean;
  down_document?: boolean;
  description?: string;
  conditions?: Prisma.JsonValue[];
}

/**
 * Crea un nuevo tipo de documento.
 */
export async function createDocumentType(data: CreateDocumentTypeInput) {
  const companyId = await getServerCompanyId();

  logger.debug('Creando tipo de documento', { data: { name: data.name, applies: data.applies } });

  try {
    const created = await prisma.document_types.create({
      data: {
        company_id: companyId,
        name: data.name,
        applies: data.applies,
        equipment_type: data.equipment_type ?? null,
        mandatory: data.mandatory,
        explired: data.explired,
        special: data.special,
        multiresource: data.multiresource,
        is_it_montlhy: data.is_it_montlhy ?? false,
        private: data.private ?? false,
        down_document: data.down_document ?? false,
        description: data.description ?? null,
        conditions: (data.conditions ?? []) as Prisma.InputJsonValue[],
      },
      select: { id: true },
    });

    logger.info('Tipo de documento creado', { data: { id: created.id } });
    return created;
  } catch (error) {
    logger.error('Error al crear tipo de documento', { data: { error } });
    throw error;
  }
}

export interface UpdateDocumentTypeInput {
  name?: string;
  applies?: document_applies;
  equipment_type?: string | null;
  mandatory?: boolean;
  explired?: boolean;
  special?: boolean;
  multiresource?: boolean;
  is_it_montlhy?: boolean;
  private?: boolean;
  down_document?: boolean;
  description?: string | null;
  conditions?: Prisma.JsonValue[];
}

/**
 * Actualiza un tipo de documento existente.
 */
export async function updateDocumentType(id: string, data: UpdateDocumentTypeInput) {
  logger.debug('Actualizando tipo de documento', { data: { id } });

  try {
    const existing = await prisma.document_types.findFirst({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new Error('Tipo de documento no encontrado');
    }

    // Build update payload explicitly so Prisma can type-check it
    const updatePayload: Prisma.document_typesUpdateInput = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.applies !== undefined) updatePayload.applies = data.applies;
    if (data.equipment_type !== undefined) updatePayload.equipment_type = data.equipment_type;
    if (data.mandatory !== undefined) updatePayload.mandatory = data.mandatory;
    if (data.explired !== undefined) updatePayload.explired = data.explired;
    if (data.special !== undefined) updatePayload.special = data.special;
    if (data.multiresource !== undefined) updatePayload.multiresource = data.multiresource;
    if (data.is_it_montlhy !== undefined) updatePayload.is_it_montlhy = data.is_it_montlhy;
    if (data.private !== undefined) updatePayload.private = data.private;
    if (data.down_document !== undefined) updatePayload.down_document = data.down_document;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.conditions !== undefined) updatePayload.conditions = data.conditions as Prisma.InputJsonValue[];

    const updated = await prisma.document_types.update({
      where: { id },
      data: updatePayload,
      select: { id: true },
    });

    logger.info('Tipo de documento actualizado', { data: { id: updated.id } });
    return updated;
  } catch (error) {
    logger.error('Error al actualizar tipo de documento', { data: { error, id } });
    throw error;
  }
}

// ============================================================================
// CATALOG SEARCH — para MultiSelectField (búsqueda de opciones FK)
// ============================================================================

type CatalogEntry = {
  find: (query: string, companyId: string) => Promise<{ id: string; name: string }[]>;
};

const CATALOG_MAP: Record<string, CatalogEntry> = {
  hierarchy: {
    // hierarchy does not have company_id — it's a global catalog
    find: async (query, _companyId) => {
      const rows = await prisma.hierarchy.findMany({
        where: {
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: r.id, name: r.name }));
    },
  },
  types_of_contract: {
    find: async (query, _companyId) => {
      const rows = await prisma.types_of_contract.findMany({
        where: {
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: r.id, name: r.name }));
    },
  },
  provinces: {
    // provinces does not have company_id — it's a global catalog
    find: async (query, _companyId) => {
      const rows = await prisma.provinces.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: String(r.id), name: r.name ?? '' }));
    },
  },
  company_positions: {
    // company_positions does not have company_id in schema
    find: async (query, _companyId) => {
      const rows = await prisma.company_positions.findMany({
        where: {
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: r.id, name: r.name ?? '' }));
    },
  },
  category: {
    find: async (query, _companyId) => {
      const rows = await prisma.category.findMany({
        where: {
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: r.id, name: r.name ?? '' }));
    },
  },
  guild: {
    find: async (query, companyId) => {
      const rows = await prisma.guild.findMany({
        where: {
          company_id: companyId,
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: r.id, name: r.name ?? '' }));
    },
  },
  covenant: {
    find: async (query, companyId) => {
      const rows = await prisma.covenant.findMany({
        where: {
          company_id: companyId,
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: r.id, name: r.name ?? '' }));
    },
  },
  cost_center: {
    // cost_center does not have company_id in schema
    find: async (query, _companyId) => {
      const rows = await prisma.cost_center.findMany({
        where: {
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: r.id, name: r.name }));
    },
  },
  brand_vehicles: {
    find: async (query, companyId) => {
      const rows = await prisma.brand_vehicles.findMany({
        where: {
          company_id: companyId,
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: String(r.id), name: r.name ?? '' }));
    },
  },
  model_vehicles: {
    // model_vehicles does not have company_id
    find: async (query, _companyId) => {
      const rows = await prisma.model_vehicles.findMany({
        where: {
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: String(r.id), name: r.name ?? '' }));
    },
  },
  types_of_vehicles: {
    // types_of_vehicles does not have company_id
    find: async (query, _companyId) => {
      const rows = await prisma.types_of_vehicles.findMany({
        where: {
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: String(r.id), name: r.name ?? '' }));
    },
  },
  customers: {
    find: async (query, companyId) => {
      const rows = await prisma.customers.findMany({
        where: {
          company_id: companyId,
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: r.id, name: r.name ?? '' }));
    },
  },
  aptitudes_tecnicas: {
    // aptitudes_tecnicas uses 'nombre' field, not 'name'
    find: async (query, _companyId) => {
      const rows = await prisma.aptitudes_tecnicas.findMany({
        where: {
          is_active: true,
          nombre: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: r.id, name: r.nombre }));
    },
  },
  work_diagram: {
    find: async (query, _companyId) => {
      const rows = await prisma.work_diagram.findMany({
        where: {
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: r.id, name: r.name }));
    },
  },
  workshop_sectors: {
    // workshop_sectors does not have company_id — it belongs to a workshop via workshop_id
    find: async (query, _companyId) => {
      const rows = await prisma.workshop_sectors.findMany({
        where: {
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: r.id, name: r.name }));
    },
  },
  type: {
    // 'type' = vehicle type
    find: async (query, companyId) => {
      const rows = await prisma.type.findMany({
        where: {
          company_id: companyId,
          is_active: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return rows.map((r) => ({ id: r.id, name: r.name }));
    },
  },
};

export type CatalogKey = keyof typeof CATALOG_MAP;

/**
 * Busca opciones en un catálogo para los MultiSelectField de condiciones.
 * Retorna hasta 20 coincidencias ordenadas por nombre.
 */
export async function searchCatalogForConditions(
  catalogKey: CatalogKey,
  query: string
): Promise<{ id: string; name: string }[]> {
  const companyId = await getServerCompanyId();

  logger.debug('Buscando en catálogo', { data: { catalogKey, query } });

  try {
    const entry = CATALOG_MAP[catalogKey];
    if (!entry) {
      logger.warn('Catálogo no encontrado', { data: { catalogKey } });
      return [];
    }

    return await entry.find(query, companyId);
  } catch (error) {
    logger.error('Error al buscar en catálogo', { data: { error, catalogKey } });
    return [];
  }
}

// ============================================================================
// COUNT MATCHING RESOURCES — contador en tiempo real para condiciones
// ============================================================================

interface ConditionJsonEntry {
  property_key: string;
  ids: string[];
  relation_type: 'direct' | 'one_to_many' | 'many_to_many';
  relation_table: string | null;
  filter_column: string;
  column_on_employees?: string | null;
  column_on_vehicles?: string | null;
  column_on_relation?: string | null;
}

/** BigInt FK columns on employees table */
const BIGINT_COLUMNS_EMPLOYEES = new Set(['province']);
/** BigInt FK columns on vehicles table */
const BIGINT_COLUMNS_VEHICLES = new Set(['brand', 'model', 'type_of_vehicle']);

/**
 * Construye SOLO la parte de condiciones del WHERE de Prisma.
 * NO incluye company_id ni is_active — eso lo agrega el llamador.
 * Retorna {} si no hay condiciones validas (para componer con AND).
 */
function buildConditionsWhereClause(
  applies: 'Persona' | 'Equipos',
  conditionsJson: string | Prisma.JsonValue[] | null
): Record<string, unknown> {
  const conditionsWhere: Record<string, unknown> = {};

  // Parse si es string
  let conditionsArray: unknown[];
  if (typeof conditionsJson === 'string') {
    try {
      conditionsArray = JSON.parse(conditionsJson);
    } catch {
      return {};
    }
  } else if (Array.isArray(conditionsJson)) {
    conditionsArray = conditionsJson;
  } else {
    return {};
  }

  if (!conditionsArray || conditionsArray.length === 0) return {};

  for (const raw of conditionsArray) {
    if (!raw || typeof raw !== 'object') continue;
    const condition = raw as unknown as ConditionJsonEntry;

    const { ids, relation_type, relation_table, filter_column } = condition;
    if (!ids || ids.length === 0) continue;

    if (relation_type === 'many_to_many' && relation_table) {
      conditionsWhere[relation_table] = { some: { [filter_column]: { in: ids } } };
    } else {
      const isBigIntEmployee = applies === 'Persona' && BIGINT_COLUMNS_EMPLOYEES.has(filter_column);
      const isBigIntVehicle = applies === 'Equipos' && BIGINT_COLUMNS_VEHICLES.has(filter_column);

      if (isBigIntEmployee || isBigIntVehicle) {
        const bigintIds = ids.map(Number).filter((n) => !isNaN(n));
        if (bigintIds.length > 0) {
          conditionsWhere[filter_column] = { in: bigintIds };
        }
      } else {
        conditionsWhere[filter_column] = ids.length === 1 ? ids[0] : { in: ids };
      }
    }
  }

  return conditionsWhere;
}

/**
 * Cuenta cuántos recursos (empleados o equipos) cumplen las condiciones dadas.
 * Construye el WHERE directamente desde el JSON de condiciones.
 */
export async function countMatchingResources(applies: string, conditionsJson: Prisma.JsonValue[]): Promise<number> {
  const companyId = await getServerCompanyId();

  logger.debug('Contando recursos para condiciones', { data: { applies } });

  try {
    const baseWhere: Record<string, unknown> = {
      company_id: companyId,
      is_active: true,
    };

    const conditionsWhere = buildConditionsWhereClause(applies as 'Persona' | 'Equipos', conditionsJson);

    const where = { ...baseWhere, ...conditionsWhere };

    if (applies === 'Persona') {
      return await prisma.employees.count({
        where: where as Prisma.employeesWhereInput,
      });
    } else if (applies === 'Equipos') {
      return await prisma.vehicles.count({
        where: where as Prisma.vehiclesWhereInput,
      });
    }

    return 0;
  } catch (error) {
    logger.error('Error al contar recursos para condiciones', { data: { error, applies } });
    return 0;
  }
}

// ============================================================================
// SINGLE FACET (lazy-load con cross-filtering)
// ============================================================================

/**
 * Obtiene opciones y counts para UN SOLO filtro facetado, con cross-filtering.
 * Diseñado para lazy-load: cada filtro llama a esta función al abrirse.
 */
export async function getDocTypeSingleFacet(
  columnId: string,
  applies: document_applies,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  const baseWhere = { applies };

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete parsedState.filters[key];
    }
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  async function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) return baseWhere;
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return await buildWhereClause(applies, modified);
  }

  function toFacetMap(rows: { key: string | boolean | null | undefined; count: number }[]): Map<string, number> {
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
    const where = await crossWhere(columnId);

    // ── Boolean columns ──
    if (BOOLEAN_FILTER_COLUMNS.includes(columnId as BooleanFilterColumn)) {
      const field = columnId as BooleanFilterColumn;
      const rows = await prisma.document_types.groupBy({
        by: [field],
        where,
        _count: true,
      });
      return {
        counts: toFacetMap(
          rows.map((r) => ({
            key: String((r as Record<string, unknown>)[field]),
            count: r._count,
          }))
        ),
      };
    }

    // ── is_active (boolean facet) ──
    if (columnId === 'is_active') {
      const rows = await prisma.document_types.groupBy({
        by: ['is_active'],
        where,
        _count: true,
      });
      return {
        counts: toFacetMap(
          rows.map((r) => ({
            key: String(r.is_active),
            count: r._count,
          }))
        ),
      };
    }

    // ── equipment_type (text facet — treated as enum-like) ──
    if (columnId === 'equipment_type') {
      const rows = await prisma.document_types.groupBy({
        by: ['equipment_type'],
        where,
        _count: true,
      });
      return {
        counts: toFacetMap(rows.map((r) => ({ key: r.equipment_type, count: r._count }))),
      };
    }

    logger.warn('Facet column not recognized for document_types', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error al obtener facet individual de tipos de documento', {
      data: { error, columnId, applies },
    });
    return null;
  }
}

// ============================================================================
// VERIFY DOCUMENT TYPE CONSISTENCY
// ============================================================================

interface VerifyStats {
  totalResources: number;
  totalWithAlert: number;
  totalMissing: number;
  totalOrphan: number;
}

interface EmployeeResource {
  id: string;
  firstname: string;
  lastname: string;
  file_number: string | null;
}

interface EquipmentResource {
  id: string;
  domain: string | null;
  intern_number: string | null;
  brand: string | null;
  type: string | null;
}

interface EmployeeVerifyResult {
  applies: 'Persona';
  missing: EmployeeResource[];
  orphan: (EmployeeResource & { alertId: string })[];
  stats: VerifyStats;
}

interface EquipmentVerifyResult {
  applies: 'Equipos';
  missing: EquipmentResource[];
  orphan: (EquipmentResource & { alertId: string })[];
  stats: VerifyStats;
}

export type VerifyResult = EmployeeVerifyResult | EquipmentVerifyResult;

export async function verifyDocumentTypeConsistency(documentTypeId: string): Promise<VerifyResult> {
  const companyId = await getServerCompanyId();

  logger.debug('Verificando consistencia de tipo de documento', {
    data: { documentTypeId },
  });

  try {
    // 1. Cargar el tipo de documento
    const docType = await prisma.document_types.findFirst({
      where: { id: documentTypeId },
    });

    if (!docType) throw new Error('Tipo de documento no encontrado');

    // Validar precondiciones
    if (!docType.mandatory) {
      throw new Error('Solo se verifican tipos de documento obligatorios');
    }
    if (docType.is_it_montlhy) {
      throw new Error('Los tipos de documento mensuales no se verifican');
    }
    if (docType.applies === 'Empresa') {
      throw new Error('Los tipos de documento de empresa no se verifican');
    }

    // 2. Construir WHERE de condiciones
    const baseWhere: Record<string, unknown> = {
      company_id: companyId,
      is_active: true,
    };

    const conditionsWhere = docType.special
      ? buildConditionsWhereClause(docType.applies as 'Persona' | 'Equipos', docType.conditions as Prisma.JsonValue[])
      : {};

    const resourceWhere = { ...baseWhere, ...conditionsWhere };

    if (docType.applies === 'Persona') {
      return await verifyForEmployees(documentTypeId, resourceWhere);
    } else {
      return await verifyForEquipment(documentTypeId, resourceWhere);
    }
  } catch (error) {
    logger.error('Error al verificar consistencia', {
      data: { error, documentTypeId },
    });
    throw error;
  }
}

async function verifyForEmployees(
  documentTypeId: string,
  resourceWhere: Record<string, unknown>
): Promise<EmployeeVerifyResult> {
  // IDs de empleados que DEBERIAN tener alerta
  const matchingEmployees = await prisma.employees.findMany({
    where: resourceWhere as Prisma.employeesWhereInput,
    select: { id: true },
  });
  const matchingIds = new Set(matchingEmployees.map((e) => e.id));

  // Registros existentes para este tipo
  const existingAlerts = await prisma.documents_employees.findMany({
    where: { id_document_types: documentTypeId },
    select: { id: true, applies: true, document_path: true },
  });

  const existingResourceIds = new Set(existingAlerts.map((a) => a.applies));

  // FALTANTES: matchean condiciones pero no tienen registro
  const missingIds = [...matchingIds].filter((id) => !existingResourceIds.has(id));

  const missingEmployees =
    missingIds.length > 0
      ? await prisma.employees.findMany({
          where: { id: { in: missingIds } },
          select: { id: true, firstname: true, lastname: true, file: true },
        })
      : [];

  const missing: EmployeeResource[] = missingEmployees.map((e) => ({
    id: e.id,
    firstname: e.firstname ?? '',
    lastname: e.lastname ?? '',
    file_number: e.file ?? null,
  }));

  // SOBRANTES: alerta vacia (document_path IS NULL) + NO matchean condiciones
  const emptyAlerts = existingAlerts.filter((a) => a.document_path === null);
  const orphanAlerts = emptyAlerts.filter((a) => a.applies == null || !matchingIds.has(a.applies));
  const orphanResourceIds = orphanAlerts.map((a) => a.applies);

  const orphanEmployees =
    orphanResourceIds.length > 0
      ? await prisma.employees.findMany({
          where: { id: { in: orphanResourceIds.filter((id): id is string => id !== null) } },
          select: { id: true, firstname: true, lastname: true, file: true },
        })
      : [];

  const orphanMap = new Map(orphanEmployees.map((e) => [e.id, e]));

  const orphan = orphanAlerts
    .map((alert) => {
      const emp = orphanMap.get(alert.applies ?? '');
      if (!emp) return null;
      return {
        id: emp.id,
        firstname: emp.firstname ?? '',
        lastname: emp.lastname ?? '',
        file_number: emp.file ?? null,
        alertId: alert.id,
      };
    })
    .filter(Boolean) as (EmployeeResource & { alertId: string })[];

  return {
    applies: 'Persona',
    missing,
    orphan,
    stats: {
      totalResources: matchingIds.size,
      totalWithAlert: existingResourceIds.size,
      totalMissing: missing.length,
      totalOrphan: orphan.length,
    },
  };
}

async function verifyForEquipment(
  documentTypeId: string,
  resourceWhere: Record<string, unknown>
): Promise<EquipmentVerifyResult> {
  // IDs de equipos que DEBERIAN tener alerta
  const matchingVehicles = await prisma.vehicles.findMany({
    where: resourceWhere as Prisma.vehiclesWhereInput,
    select: { id: true },
  });
  const matchingIds = new Set(matchingVehicles.map((v) => v.id));

  // Registros existentes
  const existingAlerts = await prisma.documents_equipment.findMany({
    where: { id_document_types: documentTypeId },
    select: { id: true, applies: true, document_path: true },
  });

  const existingResourceIds = new Set(existingAlerts.map((a) => a.applies));

  // FALTANTES
  const missingIds = [...matchingIds].filter((id) => !existingResourceIds.has(id));

  const missingVehicles =
    missingIds.length > 0
      ? await prisma.vehicles.findMany({
          where: { id: { in: missingIds } },
          select: {
            id: true,
            domain: true,
            intern_number: true,
            brand_vehicles: { select: { name: true } },
            types_of_vehicles: { select: { name: true } },
          },
        })
      : [];

  const missing: EquipmentResource[] = missingVehicles.map((v) => ({
    id: v.id,
    domain: v.domain ?? null,
    intern_number: v.intern_number ?? null,
    brand: v.brand_vehicles?.name ?? null,
    type: v.types_of_vehicles?.name ?? null,
  }));

  // SOBRANTES
  const emptyAlerts = existingAlerts.filter((a) => a.document_path === null);
  const orphanAlerts = emptyAlerts.filter((a) => a.applies == null || !matchingIds.has(a.applies));
  const orphanResourceIds = orphanAlerts.map((a) => a.applies);

  const orphanVehicles =
    orphanResourceIds.length > 0
      ? await prisma.vehicles.findMany({
          where: { id: { in: orphanResourceIds.filter((id): id is string => id !== null) } },
          select: {
            id: true,
            domain: true,
            intern_number: true,
            brand_vehicles: { select: { name: true } },
            types_of_vehicles: { select: { name: true } },
          },
        })
      : [];

  const orphanMap = new Map(orphanVehicles.map((v) => [v.id, v]));

  const orphan = orphanAlerts
    .map((alert) => {
      const veh = orphanMap.get(alert.applies ?? '');
      if (!veh) return null;
      return {
        id: veh.id,
        domain: veh.domain ?? null,
        intern_number: veh.intern_number ?? null,
        brand: veh.brand_vehicles?.name ?? null,
        type: veh.types_of_vehicles?.name ?? null,
        alertId: alert.id,
      };
    })
    .filter(Boolean) as (EquipmentResource & { alertId: string })[];

  return {
    applies: 'Equipos',
    missing,
    orphan,
    stats: {
      totalResources: matchingIds.size,
      totalWithAlert: existingResourceIds.size,
      totalMissing: missing.length,
      totalOrphan: orphan.length,
    },
  };
}

/**
 * Corrige inconsistencias: crea alertas faltantes y elimina alertas vacias sobrantes.
 * Todo dentro de una transaccion Prisma.
 *
 * @param createAlerts — IDs de recursos (employees/vehicles) que necesitan alerta
 * @param removeAlerts — alertId (PKs de documents_employees/equipment), NO IDs de recursos
 */
export async function fixDocumentTypeConsistency(
  documentTypeId: string,
  actions: { createAlerts: string[]; removeAlerts: string[] }
): Promise<{ created: number; removed: number }> {
  const companyId = await getServerCompanyId();

  logger.debug('Corrigiendo inconsistencias de tipo de documento', {
    data: {
      documentTypeId,
      toCreate: actions.createAlerts.length,
      toRemove: actions.removeAlerts.length,
    },
  });

  try {
    // Cargar tipo para saber applies
    const docType = await prisma.document_types.findFirst({
      where: { id: documentTypeId },
      select: { applies: true },
    });

    if (!docType) throw new Error('Tipo de documento no encontrado');

    const isPersona = docType.applies === 'Persona';

    return await prisma.$transaction(async (tx) => {
      let created = 0;
      let removed = 0;

      // === CREAR ALERTAS FALTANTES ===
      if (actions.createAlerts.length > 0) {
        // Re-verificar: filtrar IDs que ya tienen registro
        const existing = isPersona
          ? await tx.documents_employees.findMany({
              where: {
                id_document_types: documentTypeId,
                applies: { in: actions.createAlerts },
              },
              select: { applies: true },
            })
          : await tx.documents_equipment.findMany({
              where: {
                id_document_types: documentTypeId,
                applies: { in: actions.createAlerts },
              },
              select: { applies: true },
            });

        const existingSet = new Set(existing.map((r) => r.applies));
        const toCreate = actions.createAlerts.filter((id) => !existingSet.has(id));

        if (toCreate.length > 0) {
          const payload = toCreate.map((resourceId) => ({
            id_document_types: documentTypeId,
            applies: resourceId,
          }));

          if (isPersona) {
            const result = await tx.documents_employees.createMany({ data: payload });
            created = result.count;
          } else {
            const result = await tx.documents_equipment.createMany({ data: payload });
            created = result.count;
          }
        }
      }

      // === ELIMINAR ALERTAS SOBRANTES ===
      if (actions.removeAlerts.length > 0) {
        if (isPersona) {
          const result = await tx.documents_employees.deleteMany({
            where: {
              id: { in: actions.removeAlerts },
              document_path: null,
              id_document_types: documentTypeId,
            },
          });
          removed = result.count;
        } else {
          const result = await tx.documents_equipment.deleteMany({
            where: {
              id: { in: actions.removeAlerts },
              document_path: null,
              id_document_types: documentTypeId,
            },
          });
          removed = result.count;
        }
      }

      logger.info('Inconsistencias corregidas', {
        data: { documentTypeId, created, removed },
      });

      return { created, removed };
    });
  } catch (error) {
    logger.error('Error al corregir inconsistencias', {
      data: { error, documentTypeId },
    });
    throw error;
  }
}

// ============================================================================
// IS_ACTIVE FLOW — deactivate / hard-delete / reactivate
// ============================================================================

/**
 * Recalcula el status de un conjunto de recursos (empleados o equipos) dentro de una transacción.
 * Helper interno — no exportado.
 */
async function recalculateResourceStatus(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  resourceIds: string[],
  resourceType: 'Persona' | 'Equipos'
) {
  if (resourceIds.length === 0) return;

  if (resourceType === 'Persona') {
    await tx.$executeRawUnsafe(
      `
      UPDATE employees SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM documents_employees de
          WHERE de.applies = employees.id AND de.state = 'vencido'
        ) THEN 'Completo con doc vencida'::status_type
        WHEN EXISTS (
          SELECT 1 FROM document_types dt
          WHERE dt.mandatory = true AND dt.applies = 'Persona' AND dt.is_active = true
            AND NOT EXISTS (
              SELECT 1 FROM documents_employees de2
              WHERE de2.id_document_types = dt.id AND de2.applies = employees.id
            )
        ) THEN 'Incompleto'::status_type
        ELSE 'Completo'::status_type
      END
      WHERE employees.id = ANY($1::uuid[])
    `,
      resourceIds
    );
  } else {
    await tx.$executeRawUnsafe(
      `
      UPDATE vehicles SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM documents_equipment de
          WHERE de.applies = vehicles.id AND de.state = 'vencido'
        ) THEN 'Completo con doc vencida'::status_type
        WHEN EXISTS (
          SELECT 1 FROM document_types dt
          WHERE dt.mandatory = true AND dt.applies = 'Equipos' AND dt.is_active = true
            AND NOT EXISTS (
              SELECT 1 FROM documents_equipment de2
              WHERE de2.id_document_types = dt.id AND de2.applies = vehicles.id
            )
        ) THEN 'Incompleto'::status_type
        ELSE 'Completo'::status_type
      END
      WHERE vehicles.id = ANY($1::uuid[])
    `,
      resourceIds
    );
  }
}

/**
 * Analiza el impacto de activar/desactivar/eliminar un tipo de documento.
 * Retorna conteos de documentos subidos, alertas vacías y recursos sin alerta.
 */
export async function analyzeDocumentTypeImpact(docTypeId: string) {
  const companyId = await getServerCompanyId();

  logger.debug('Analizando impacto de tipo de documento', { data: { docTypeId } });

  try {
    const docType = await prisma.document_types.findFirst({
      where: { id: docTypeId },
      select: {
        id: true,
        name: true,
        applies: true,
        is_active: true,
        mandatory: true,
        special: true,
        company_id: true,
      },
    });

    if (!docType) throw new Error('Tipo de documento no encontrado');

    let uploadedCount = 0;
    let emptyAlertCount = 0;
    let missingAlertCount = 0;

    if (docType.applies === document_applies.Persona) {
      const [uploaded, empty, totalActive] = await Promise.all([
        prisma.documents_employees.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        }),
        prisma.documents_employees.count({
          where: { id_document_types: docTypeId, document_path: null },
        }),
        prisma.employees.count({
          where: { company_id: companyId },
        }),
      ]);
      uploadedCount = uploaded;
      emptyAlertCount = empty;
      const withAlert = await prisma.documents_employees.count({
        where: { id_document_types: docTypeId },
      });
      missingAlertCount = Math.max(0, totalActive - withAlert);
    } else if (docType.applies === document_applies.Equipos) {
      const [uploaded, empty, totalActive] = await Promise.all([
        prisma.documents_equipment.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        }),
        prisma.documents_equipment.count({
          where: { id_document_types: docTypeId, document_path: null },
        }),
        prisma.vehicles.count({
          where: { company_id: companyId },
        }),
      ]);
      uploadedCount = uploaded;
      emptyAlertCount = empty;
      const withAlert = await prisma.documents_equipment.count({
        where: { id_document_types: docTypeId },
      });
      missingAlertCount = Math.max(0, totalActive - withAlert);
    } else {
      // Empresa: max 1 registro
      const doc = await prisma.documents_company.findFirst({
        where: { id_document_types: docTypeId },
        select: { document_path: true },
      });
      if (doc) {
        if (doc.document_path) {
          uploadedCount = 1;
        } else {
          emptyAlertCount = 1;
        }
      } else {
        missingAlertCount = 1;
      }
    }

    return {
      docType: {
        id: docType.id,
        name: docType.name,
        applies: docType.applies,
        is_active: docType.is_active,
        mandatory: docType.mandatory,
        special: docType.special,
      },
      uploadedCount,
      emptyAlertCount,
      totalResources: uploadedCount + emptyAlertCount,
      missingAlertCount,
      canHardDelete: uploadedCount === 0,
    };
  } catch (error) {
    logger.error('Error al analizar impacto de tipo de documento', { data: { error, docTypeId } });
    throw error;
  }
}

export type DocumentTypeImpact = Awaited<ReturnType<typeof analyzeDocumentTypeImpact>>;

/**
 * Desactiva un tipo de documento (soft delete via is_active = false).
 * Opcionalmente elimina las alertas vacías (sin documento subido) del tipo.
 */
export async function deactivateDocumentType(docTypeId: string, options: { deleteEmptyAlerts: boolean }) {
  const companyId = await getServerCompanyId();

  logger.info('Desactivando tipo de documento', { data: { docTypeId, options } });

  try {
    return await prisma.$transaction(async (tx) => {
      const docType = await tx.document_types.findFirst({
        where: { id: docTypeId, is_active: true },
        select: { id: true, applies: true, mandatory: true },
      });

      if (!docType) throw new Error('Tipo de documento no encontrado o ya esta inactivo');

      await tx.document_types.update({
        where: { id: docTypeId },
        data: { is_active: false },
      });

      let affectedResourceIds: string[] = [];

      if (options.deleteEmptyAlerts && docType.mandatory) {
        if (docType.applies === document_applies.Persona) {
          const affected = await tx.documents_employees.findMany({
            where: { id_document_types: docTypeId, document_path: null },
            select: { applies: true },
          });
          affectedResourceIds = affected.map((a) => a.applies).filter(Boolean) as string[];

          await tx.documents_employees.deleteMany({
            where: { id_document_types: docTypeId, document_path: null },
          });
        } else if (docType.applies === document_applies.Equipos) {
          const affected = await tx.documents_equipment.findMany({
            where: { id_document_types: docTypeId, document_path: null },
            select: { applies: true },
          });
          affectedResourceIds = affected.map((a) => a.applies).filter(Boolean) as string[];

          await tx.documents_equipment.deleteMany({
            where: { id_document_types: docTypeId, document_path: null },
          });
        } else {
          await tx.documents_company.deleteMany({
            where: { id_document_types: docTypeId, document_path: null },
          });
        }
      }

      if (docType.applies !== document_applies.Empresa) {
        if (!options.deleteEmptyAlerts || affectedResourceIds.length === 0) {
          const resourceTable =
            docType.applies === document_applies.Persona ? 'documents_employees' : 'documents_equipment';
          const resources = await tx.$queryRawUnsafe<{ applies: string }[]>(
            `SELECT DISTINCT applies FROM ${resourceTable} WHERE id_document_types = $1`,
            docTypeId
          );
          affectedResourceIds = resources.map((r) => r.applies);
        }

        await recalculateResourceStatus(tx, affectedResourceIds, docType.applies as 'Persona' | 'Equipos');
      }

      return { success: true };
    });
  } catch (error) {
    logger.error('Error al desactivar tipo de documento', { data: { error, docTypeId } });
    throw error;
  }
}

/**
 * Elimina permanentemente un tipo de documento.
 * Solo permitido si NO hay documentos subidos (document_path IS NOT NULL) asociados.
 * Elimina todas las alertas vacías y recalcula el status de los recursos afectados.
 */
export async function hardDeleteDocumentType(docTypeId: string) {
  const companyId = await getServerCompanyId();

  logger.info('Eliminando permanentemente tipo de documento', { data: { docTypeId } });

  try {
    return await prisma.$transaction(async (tx) => {
      const docType = await tx.document_types.findFirst({
        where: { id: docTypeId },
        select: { id: true, applies: true, mandatory: true },
      });

      if (!docType) throw new Error('Tipo de documento no encontrado');

      let uploadedCount = 0;
      if (docType.applies === document_applies.Persona) {
        uploadedCount = await tx.documents_employees.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        });
      } else if (docType.applies === document_applies.Equipos) {
        uploadedCount = await tx.documents_equipment.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        });
      } else {
        uploadedCount = await tx.documents_company.count({
          where: { id_document_types: docTypeId, document_path: { not: null } },
        });
      }

      if (uploadedCount > 0) {
        throw new Error(
          `No se puede eliminar: hay ${uploadedCount} documento(s) subido(s). Desactive el tipo en su lugar.`
        );
      }

      let affectedResourceIds: string[] = [];

      if (docType.applies === document_applies.Persona) {
        const affected = await tx.documents_employees.findMany({
          where: { id_document_types: docTypeId },
          select: { applies: true },
        });
        affectedResourceIds = affected.map((a) => a.applies).filter(Boolean) as string[];
        await tx.documents_employees.deleteMany({ where: { id_document_types: docTypeId } });
      } else if (docType.applies === document_applies.Equipos) {
        const affected = await tx.documents_equipment.findMany({
          where: { id_document_types: docTypeId },
          select: { applies: true },
        });
        affectedResourceIds = affected.map((a) => a.applies).filter(Boolean) as string[];
        await tx.documents_equipment.deleteMany({ where: { id_document_types: docTypeId } });
      } else {
        await tx.documents_company.deleteMany({ where: { id_document_types: docTypeId } });
      }

      await tx.document_types.delete({ where: { id: docTypeId } });

      if (docType.applies !== document_applies.Empresa && affectedResourceIds.length > 0) {
        await recalculateResourceStatus(tx, affectedResourceIds, docType.applies as 'Persona' | 'Equipos');
      }

      return { success: true };
    });
  } catch (error) {
    logger.error('Error al eliminar tipo de documento', { data: { error, docTypeId } });
    throw error;
  }
}

/**
 * Reactiva un tipo de documento (is_active = true).
 * Opcionalmente recrea alertas pendientes para los recursos que no las tienen.
 */
export async function reactivateDocumentType(docTypeId: string, options: { recreateAlerts: boolean }) {
  const companyId = await getServerCompanyId();

  logger.info('Reactivando tipo de documento', { data: { docTypeId, options } });

  try {
    return await prisma.$transaction(async (tx) => {
      const docType = await tx.document_types.findFirst({
        where: { id: docTypeId, is_active: false },
        select: {
          id: true,
          applies: true,
          mandatory: true,
          special: true,
          conditions: true,
        },
      });

      if (!docType) throw new Error('Tipo de documento no encontrado o ya esta activo');

      await tx.document_types.update({
        where: { id: docTypeId },
        data: { is_active: true },
      });

      const newAlertResourceIds: string[] = [];

      if (options.recreateAlerts && docType.mandatory) {
        if (docType.applies === document_applies.Persona) {
          const missing = await tx.$queryRawUnsafe<{ id: string }[]>(
            `
            SELECT e.id FROM employees e
            WHERE e.company_id = $1
              AND NOT EXISTS (
                SELECT 1 FROM documents_employees de
                WHERE de.id_document_types = $2 AND de.applies = e.id
              )
          `,
            companyId,
            docTypeId
          );

          for (const emp of missing) {
            await tx.documents_employees.create({
              data: {
                id_document_types: docTypeId,
                applies: emp.id,
                state: 'pendiente',
                is_active: true,
              },
            });
            newAlertResourceIds.push(emp.id);
          }
        } else if (docType.applies === document_applies.Equipos) {
          const missing = await tx.$queryRawUnsafe<{ id: string }[]>(
            `
            SELECT v.id FROM vehicles v
            WHERE v.company_id = $1
              AND NOT EXISTS (
                SELECT 1 FROM documents_equipment de
                WHERE de.id_document_types = $2 AND de.applies = v.id
              )
          `,
            companyId,
            docTypeId
          );

          for (const veh of missing) {
            await tx.documents_equipment.create({
              data: {
                id_document_types: docTypeId,
                applies: veh.id,
                state: 'pendiente',
                is_active: true,
              },
            });
            newAlertResourceIds.push(veh.id);
          }
        } else {
          const existing = await tx.documents_company.findFirst({
            where: { id_document_types: docTypeId },
          });
          if (!existing && companyId) {
            await tx.documents_company.create({
              data: {
                id_document_types: docTypeId,
                applies: companyId,
                state: 'pendiente',
                is_active: true,
              },
            });
          }
        }
      }

      if (docType.applies !== document_applies.Empresa && newAlertResourceIds.length > 0) {
        await recalculateResourceStatus(tx, newAlertResourceIds, docType.applies as 'Persona' | 'Equipos');
      }

      return { success: true };
    });
  } catch (error) {
    logger.error('Error al reactivar tipo de documento', { data: { error, docTypeId } });
    throw error;
  }
}

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type DocumentTypeListItem = Awaited<ReturnType<typeof getDocTypesPaginated>>['data'][number];
export type DocumentTypeExportItem = Awaited<ReturnType<typeof getPersonasDocTypesForExport>>[number];
export type DocumentTypeForEdit = Awaited<ReturnType<typeof getDocumentTypeForEdit>>;
