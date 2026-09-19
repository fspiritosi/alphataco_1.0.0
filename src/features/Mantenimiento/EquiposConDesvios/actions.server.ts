'use server';

import type { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import {
  buildFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { CACHE_TAGS, CACHE_TTL } from '@/shared/constants/cache';
import { prisma } from '@/shared/lib/prisma';
import { cacheLife, cacheTag } from 'next/cache';

const logger = new Logger('EquiposConDesvios/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Columnas "ordenables" — combina campos reales de vehicles con las dos
 * columnas calculadas (deviation_count, last_deviation_date). Como el dataset
 * final no sale de un solo findMany de Prisma (ver `buildDataset`), el
 * ordenamiento se resuelve en memoria con `SORT_ACCESSORS`, no con `orderBy`.
 */
const VALID_SORT_FIELDS = new Set([
  'domain',
  'serie',
  'intern_number',
  'type_of_vehicle',
  'type',
  'sub_type',
  'sector',
  'deviation_count',
  'last_deviation_date',
]);

/** Params de URL de navegación que NO son filtros de la tabla */
const IGNORED_PARAMS = new Set(['tab', 'subtab']);

/** Columnas con filtro de texto libre (contains insensitive) sobre vehicles */
const TEXT_FILTER_COLUMNS = ['domain', 'serie', 'intern_number'];

/**
 * Mapping de columnId (URL) → campo real en Prisma.
 * `type_of_vehicle` se maneja manualmente (BigInt requiere conversión explícita).
 */
const COLUMN_MAP: Record<string, string> = {
  type: 'type',
  sub_type: 'subType',
  sector: 'sector',
};

/** Select de vehicles con las relaciones necesarias para las columnas de la tabla */
const EQUIPMENT_SELECT = {
  id: true,
  domain: true,
  serie: true,
  intern_number: true,
  type_of_vehicle: true,
  types_of_vehicles: { select: { id: true, name: true } },
  type_vehicles_typeTotype: { select: { id: true, name: true } },
  sub_type: { select: { id: true, name: true } },
  hierarchy: { select: { id: true, name: true } },
} as const;

type EquipmentRow = Prisma.vehiclesGetPayload<{ select: typeof EQUIPMENT_SELECT }>;

/** Item final combinado: datos del vehículo + agregados de desvíos pendientes */
export type EquipmentWithDeviationsListItem = EquipmentRow & {
  deviation_count: number;
  last_deviation_date: Date | null;
};

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/** Entrada serializable de la agregación cacheada (ver `getPendingDeviationsAggregateCached`) */
type PendingDeviationAggEntry = { equipmentId: string; count: number; lastDeviationDateMs: number };

/**
 * Reproduce en Prisma la lógica de la vista SQL `equipments_with_pending_deviations`:
 * un desvío está pendiente si NO pertenece a ningún item de solicitud de
 * mantenimiento (`maintenance_request_items`).
 *
 * Se resuelve con un anti-join manual en memoria sobre TODOS los desvíos de la
 * empresa (~1600+ filas) — es el cómputo caro de esta tabla.
 *
 * Cacheada con `'use cache'`: solo puede recibir argumentos serializables (por eso
 * `companyId` como string, sin leer cookies/sesión acá) y solo puede devolver datos
 * serializables (array de objetos planos, sin `Map`/`Date`). El caller reconstruye
 * el `Map` con `Date` reales — ver `getPendingDeviationsAggregateByVehicle`.
 */
async function getPendingDeviationsAggregateCached(companyId: string): Promise<PendingDeviationAggEntry[]> {
  'use cache';
  cacheTag(CACHE_TAGS.TAB_EQUIPMENTS_DEVIATIONS);
  cacheLife({
    expire: CACHE_TTL.EQUIPMENTS_DEVIATIONS_AGGREGATE,
    revalidate: CACHE_TTL.EQUIPMENTS_DEVIATIONS_AGGREGATE,
    stale: 30,
  });

  logger.debug('Calculando agregación de desvíos pendientes por vehículo (cacheable)', { data: { companyId } });

  const deviations = await prisma.checklist_deviations.findMany({
    where: { vehicles: { company_id: companyId } },
    select: {
      id: true,
      equipment_id: true,
      created_at: true,
    },
  });

  if (deviations.length === 0) return [];

  const deviationIds = deviations.map((d) => d.id);

  const requestItems = await prisma.maintenance_request_items.findMany({
    where: { checklist_deviation_id: { in: deviationIds } },
    select: { checklist_deviation_id: true },
  });

  const inRequestSet = new Set(requestItems.map((r) => r.checklist_deviation_id).filter(Boolean));

  const aggregate = new Map<string, { count: number; lastDeviationDate: Date }>();

  for (const d of deviations) {
    if (inRequestSet.has(d.id)) continue;

    const createdAt = d.created_at ?? new Date(0);
    const entry = aggregate.get(d.equipment_id);
    if (!entry) {
      aggregate.set(d.equipment_id, { count: 1, lastDeviationDate: createdAt });
    } else {
      entry.count += 1;
      if (createdAt > entry.lastDeviationDate) entry.lastDeviationDate = createdAt;
    }
  }

  return [...aggregate.entries()].map(([equipmentId, agg]) => ({
    equipmentId,
    count: agg.count,
    lastDeviationDateMs: agg.lastDeviationDate.getTime(),
  }));
}

/**
 * Wrapper NO cacheado: llama a `getPendingDeviationsAggregateCached` (que sí lo está)
 * y reconstruye el `Map<string, { count, lastDeviationDate: Date }>` que consume el
 * resto del módulo (paginado, export y facets).
 */
async function getPendingDeviationsAggregateByVehicle(
  companyId: string
): Promise<Map<string, { count: number; lastDeviationDate: Date }>> {
  const rows = await getPendingDeviationsAggregateCached(companyId);
  const result = new Map<string, { count: number; lastDeviationDate: Date }>();
  for (const row of rows) {
    result.set(row.equipmentId, { count: row.count, lastDeviationDate: new Date(row.lastDeviationDateMs) });
  }
  return result;
}

/** WHERE sobre `vehicles` — filtros de texto y facetados aplicados a la tabla */
function buildVehicleWhereClause(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, TEXT_FILTER_COLUMNS);

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [...TEXT_FILTER_COLUMNS, 'type_of_vehicle'],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);

  // type_of_vehicle: FK BigInt NOT NULL — conversión manual (buildFiltersWhere no castea a BigInt)
  const typeOfVehicleFilter: Record<string, unknown> = {};
  const typeOfVehicleValues = state.filters['type_of_vehicle'];
  if (typeOfVehicleValues?.length) {
    const ids = typeOfVehicleValues
      .map((v) => {
        try {
          return BigInt(v);
        } catch {
          return null;
        }
      })
      .filter((v): v is bigint => v !== null);
    if (ids.length === 1) typeOfVehicleFilter.type_of_vehicle = ids[0];
    else if (ids.length > 1) typeOfVehicleFilter.type_of_vehicle = { in: ids };
  }

  return {
    company_id: companyId,
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...typeOfVehicleFilter,
  };
}

function toFacetMap(rows: { key: string | number | bigint | null | undefined; count: number }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const { key, count } of rows) {
    map.set(key == null ? NULL_FILTER_VALUE : String(key), count);
  }
  return map;
}

const SORT_ACCESSORS: Record<string, (item: EquipmentWithDeviationsListItem) => string | number> = {
  domain: (i) => i.domain ?? '',
  serie: (i) => i.serie ?? '',
  intern_number: (i) => i.intern_number ?? '',
  type_of_vehicle: (i) => i.types_of_vehicles?.name ?? '',
  type: (i) => i.type_vehicles_typeTotype?.name ?? '',
  sub_type: (i) => i.sub_type?.name ?? '',
  sector: (i) => i.hierarchy?.name ?? '',
  deviation_count: (i) => i.deviation_count,
  last_deviation_date: (i) => i.last_deviation_date?.getTime() ?? 0,
};

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'es');
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Ordena en memoria según `state.sorting` (multi-sort). Default: más desvíos primero. */
function sortDataset(
  items: EquipmentWithDeviationsListItem[],
  sorting: ReturnType<typeof parseSearchParams>['sorting']
): EquipmentWithDeviationsListItem[] {
  const activeSorts = sorting.filter((s) => VALID_SORT_FIELDS.has(s.id) && SORT_ACCESSORS[s.id]);

  if (activeSorts.length === 0) {
    return [...items].sort((a, b) => compareValues(b.deviation_count, a.deviation_count));
  }

  return [...items].sort((a, b) => {
    for (const s of activeSorts) {
      const accessor = SORT_ACCESSORS[s.id];
      const cmp = compareValues(accessor(a), accessor(b));
      if (cmp !== 0) return s.desc ? -cmp : cmp;
    }
    return 0;
  });
}

/**
 * Construye el dataset completo (sin paginar) de equipos con desvíos pendientes,
 * aplicando filtros de vehicles y ordenamiento. Compartido entre la query paginada
 * y la de exportación.
 */
async function buildDataset(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const perVehicle = await getPendingDeviationsAggregateByVehicle(companyId);
  if (perVehicle.size === 0) return [];

  const where = buildVehicleWhereClause(companyId, state);

  const vehicles = await prisma.vehicles.findMany({
    where: { ...where, id: { in: [...perVehicle.keys()] } },
    select: EQUIPMENT_SELECT,
  });

  const combined: EquipmentWithDeviationsListItem[] = vehicles.map((v) => {
    const agg = perVehicle.get(v.id)!;
    return { ...v, deviation_count: agg.count, last_deviation_date: agg.lastDeviationDate };
  });

  return sortDataset(combined, state.sorting);
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getEquipmentsWithDeviationsPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) delete state.filters[key];

    const { skip, take } = stateToPrismaParams(state);
    const dataset = await buildDataset(companyId, state);

    return { data: dataset.slice(skip, skip + take), total: dataset.length };
  } catch (error) {
    logger.error('Error al obtener equipos con desvíos pendientes', { data: { error } });
    throw new Error('No se pudieron obtener los equipos con desvíos pendientes. Intente nuevamente.');
  }
}

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllEquipmentsWithDeviationsForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) delete state.filters[key];

    return await buildDataset(companyId, state);
  } catch (error) {
    logger.error('Error al exportar equipos con desvíos pendientes', { data: { error } });
    throw new Error('No se pudo exportar el listado. Intente nuevamente.');
  }
}

// ============================================================================
// FACETS — SINGLE COLUMN (lazy-load, on-demand)
// ============================================================================

/**
 * Retorna facets (counts + opciones resueltas) para UNA sola columna FK, con
 * cross-filtering contra los demás filtros activos. Se invoca desde el cliente
 * al abrir el popover de cada filtro.
 */
export async function getEquipmentsWithDeviationsSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: { value: string; label: string }[];
} | null> {
  const companyId = await getServerCompanyId();

  try {
    const perVehicle = await getPendingDeviationsAggregateByVehicle(companyId);
    const vehicleIds = [...perVehicle.keys()];
    if (vehicleIds.length === 0) return { counts: new Map() };

    let parsedState: ReturnType<typeof parseSearchParams> | null = null;
    if (searchParams && Object.keys(searchParams).length > 0) {
      parsedState = parseSearchParams(searchParams);
      for (const key of IGNORED_PARAMS) delete parsedState.filters[key];
    }
    const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

    function crossWhere() {
      const base = { company_id: companyId, id: { in: vehicleIds } };
      if (!parsedState || !hasActiveFilters) return base;
      const modified = { ...parsedState, filters: { ...parsedState.filters } };
      delete modified.filters[columnId];
      delete modified.filters[`${columnId}_from`];
      delete modified.filters[`${columnId}_to`];
      return { ...buildVehicleWhereClause(companyId, modified), id: { in: vehicleIds } };
    }

    const where = crossWhere();

    switch (columnId) {
      case 'type_of_vehicle': {
        const rows = await prisma.vehicles.groupBy({ by: ['type_of_vehicle'], where, _count: true });
        const counts = toFacetMap(rows.map((r) => ({ key: r.type_of_vehicle, count: r._count })));
        const ids = rows.map((r) => r.type_of_vehicle).filter((v): v is bigint => v != null);
        const options =
          ids.length > 0
            ? await prisma.types_of_vehicles.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
            : [];
        return { counts, resolvedOptions: options.map((o) => ({ value: String(o.id), label: o.name ?? '' })) };
      }
      case 'type': {
        const rows = await prisma.vehicles.groupBy({ by: ['type'], where, _count: true });
        const counts = toFacetMap(rows.map((r) => ({ key: r.type, count: r._count })));
        const ids = rows.map((r) => r.type).filter(Boolean);
        const options =
          ids.length > 0
            ? await prisma.type.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
            : [];
        return { counts, resolvedOptions: options.map((o) => ({ value: o.id, label: o.name ?? '' })) };
      }
      case 'sub_type': {
        const rows = await prisma.vehicles.groupBy({ by: ['subType'], where, _count: true });
        const counts = toFacetMap(rows.map((r) => ({ key: r.subType, count: r._count })));
        const ids = rows.map((r) => r.subType).filter((v): v is string => !!v);
        const options =
          ids.length > 0
            ? await prisma.sub_type.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
            : [];
        return { counts, resolvedOptions: options.map((o) => ({ value: o.id, label: o.name ?? '' })) };
      }
      case 'sector': {
        const rows = await prisma.vehicles.groupBy({ by: ['sector'], where, _count: true });
        const counts = toFacetMap(rows.map((r) => ({ key: r.sector, count: r._count })));
        const ids = rows.map((r) => r.sector).filter((v): v is string => !!v);
        const options =
          ids.length > 0
            ? await prisma.hierarchy.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
            : [];
        return { counts, resolvedOptions: options.map((o) => ({ value: o.id, label: o.name ?? '' })) };
      }
      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facet de equipos con desvíos', { data: { error, columnId } });
    return null;
  }
}
