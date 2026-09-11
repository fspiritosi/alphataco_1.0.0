'use server';

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
import { resourceCompanyCondition, visibleEquipmentTypeCondition } from '../shared/maintenance-resource';
import { getHiddenEquipmentTypeIds } from '../utils/equipmentTypeVisibility';
import { getSupervisorFilterInfo } from '../utils/supervisorFilter';
import { DEFAULT_TRACKING_STATUSES, WORKSHOP_TRACKING_STATUSES } from './statuses';

const logger = new Logger('WorkshopTracking/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos reales de maintenance_orders ordenables server-side */
const VALID_SORT_FIELDS = new Set([
  'order_number',
  'created_at',
  'workshop_entry_date',
  'scheduled_date',
  'status',
  // FK columns via FK_SORT_MAP
  'vehicle',
]);

/** Mapeo de columnId → orderBy de Prisma para columnas FK */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
};

/** Params de URL que NO son filtros de la tabla */
const IGNORED_PARAMS = new Set(['tab', 'subtab', 'operations_subtab', 'taller_subtab', 'config_subtab']);

/** Columnas de texto libre de maintenance_orders (filtradas con buildTextFiltersWhere) */
const TEXT_COLUMNS = ['order_number'];

/** Columnas con filtro de texto libre en vehicles */
const VEHICLE_TEXT_FILTER_COLUMNS = ['domain', 'serie', 'intern_number', 'kilometer'];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['workshop_entry_date', 'created_at', 'scheduled_date'];

/** Mapping de columnId (URL) → campo real en Prisma */
const COLUMN_MAP: Record<string, string> = {
  vehicle: 'equipment_id',
  status: 'status',
};

/**
 * Select común con todas las relaciones resueltas para el tracking.
 *
 * `maintenance_order_items` viaja podado a solo lo que consumen las columnas
 * "Recorrido Sectores" y "Progreso" (y sus equivalentes de export): sin
 * `is_diagnostico`, sin `order_number`/`status` de `work_orders`, sin
 * `id`/`status` de `work_order_items` y sin `repair_type_id` de las reparaciones
 * — ninguno se lee en `workshopTrackingColumns.tsx`. La auditoría del ticket 673
 * marcó este select como el más profundo (4 niveles) de la tabla.
 */
const WORKSHOP_TRACKING_SELECT = {
  id: true,
  order_number: true,
  status: true,
  workshop_entry_date: true,
  scheduled_date: true,
  created_at: true,
  kilometer_at_entry: true,
  engine_hours_at_entry: true,
  description: true,
  // FK: vehiculo o equipamiento (ticket 596) — uno de los dos viene en null
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
      kilometer: true,
      condition: true,
    },
  },
  other_equipment: {
    select: {
      id: true,
      serial_number: true,
      intern_number: true,
      condition: true,
    },
  },
  // Solicitud vinculada (fallback de descripción, origen y tipo preventivo)
  maintenance_requests: {
    select: {
      id: true,
      description: true,
      source: true,
      preventive_type: true,
    },
  },
  // Items con sectores y reparaciones (para "Recorrido Sectores" y "Progreso") — podado
  maintenance_order_items: {
    select: {
      id: true,
      assigned_sector_id: true,
      sector_sequence_order: true,
      workshop_sectors: {
        select: {
          name: true,
        },
      },
      work_orders: {
        select: {
          work_order_items: {
            select: {
              maintenance_order_item_id: true,
              work_order_item_repairs: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  },
};

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Construye el WHERE compartido por el paginado, el export y las facets de
 * workshop tracking. Aplica filtro de supervisor: si el usuario no tiene
 * view_all_requests, solo ve órdenes donde él es supervisor de la solicitud.
 *
 * @param includeCompleted incluye las órdenes completadas en el universo base.
 *   Solo se usa al calcular la faceta de la columna "Estado", para que
 *   "Completada" aparezca con su count y el usuario pueda tildarla.
 *   Si el usuario filtra por estado, `filtersWhere` sobrescribe este default.
 */
async function buildWhereClause(
  companyId: string,
  state: ReturnType<typeof parseSearchParams>,
  includeCompleted = false
) {
  const [supervisorFilter, hiddenTypeIds] = await Promise.all([getSupervisorFilterInfo(), getHiddenEquipmentTypeIds()]);
  const searchWhere = buildSearchWhere(state.search, ['order_number']);

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...TEXT_COLUMNS,
      ...VEHICLE_TEXT_FILTER_COLUMNS,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      'vehicle', // manejado manualmente (FK)
      'description', // manejado manualmente (OR order/solicitud)
      'condition', // manejado manualmente (enum en vehicles, relacion anidada)
    ],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // ─── Filtro vehicle (FK UUID → equipment_id) ────────────────────────────
  const vehicleFilter: Record<string, unknown> = {};
  const vehicleValues = state.filters['vehicle'];
  if (vehicleValues?.length) {
    const hasNull = vehicleValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // caso mixto: se agrega en AND abajo
    } else if (hasNull) {
      vehicleFilter.equipment_id = null;
    } else {
      vehicleFilter.equipment_id = { in: realValues };
    }
  }

  // ─── Filtros de texto en campos de vehicles ──────────────────────────────
  const vehicleTextConditions: Record<string, unknown>[] = [];
  const domainValues = state.filters['domain'];
  const serieValues = state.filters['serie'];
  const internNumberValues = state.filters['intern_number'];
  const kilometerValues = state.filters['kilometer'];

  if (domainValues?.length && typeof domainValues[0] === 'string') {
    vehicleTextConditions.push({ vehicles: { domain: { contains: domainValues[0], mode: 'insensitive' } } });
  }
  if (serieValues?.length && typeof serieValues[0] === 'string') {
    vehicleTextConditions.push({ vehicles: { serie: { contains: serieValues[0], mode: 'insensitive' } } });
  }
  if (internNumberValues?.length && typeof internNumberValues[0] === 'string') {
    vehicleTextConditions.push({
      vehicles: { intern_number: { contains: internNumberValues[0], mode: 'insensitive' } },
    });
  }
  if (kilometerValues?.length && typeof kilometerValues[0] === 'string') {
    vehicleTextConditions.push({ vehicles: { kilometer: { contains: kilometerValues[0], mode: 'insensitive' } } });
  }

  // ─── Filtro condition (enum de vehicles, relacion anidada) ───────────────
  const conditionValues = state.filters['condition'];
  if (conditionValues?.length) {
    const hasNull = conditionValues.includes(NULL_FILTER_VALUE);
    const realValues = conditionValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      vehicleTextConditions.push({
        OR: [{ vehicles: { condition: { in: realValues } } }, { vehicles: { condition: null } }],
      });
    } else if (hasNull) {
      vehicleTextConditions.push({ vehicles: { condition: null } });
    } else {
      vehicleTextConditions.push({ vehicles: { condition: { in: realValues } } });
    }
  }

  // ─── Filtro de texto de descripción del pedido (order o solicitud) ───────
  const descriptionValues = state.filters['description'];
  if (descriptionValues?.length && typeof descriptionValues[0] === 'string') {
    const term = descriptionValues[0];
    vehicleTextConditions.push({
      OR: [
        { description: { contains: term, mode: 'insensitive' } },
        { maintenance_requests: { description: { contains: term, mode: 'insensitive' } } },
      ],
    });
  }

  // ─── Condiciones AND para casos mixtos ───────────────────────────────────
  const extraAndConditions: Record<string, unknown>[] = [...vehicleTextConditions];

  if (vehicleValues?.length) {
    const hasNull = vehicleValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [{ equipment_id: { in: realValues } }, { equipment_id: null }],
      });
    }
  }

  // ─── Filtro supervisor: si no tiene view_all_requests, solo ve las suyas ──
  const supervisorCondition: Record<string, unknown> = {};
  if (supervisorFilter?.shouldFilterBySupervisor) {
    supervisorCondition.maintenance_requests = {
      supervisor_id: supervisorFilter.userId,
    };
  }

  // Tipos de equipamiento ocultos para el usuario actual (ticket 690)
  const equipmentCondition = visibleEquipmentTypeCondition(hiddenTypeIds);

  return {
    status: { in: includeCompleted ? WORKSHOP_TRACKING_STATUSES : DEFAULT_TRACKING_STATUSES },

    ...searchWhere,
    // Si el usuario filtra por estado, su seleccion sobrescribe el default de arriba
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...vehicleFilter,
    ...supervisorCondition,
    // El filtro de empresa (vehiculo o equipamiento, ticket 596) va dentro del AND:
    // produce un OR y al nivel raiz chocaria con el OR de la busqueda global.
    AND: [
      resourceCompanyCondition(companyId),
      ...extraAndConditions,
      ...(equipmentCondition ? [equipmentCondition] : []),
    ],
  };
}

/** Suma con el estado parseado de un searchParams, descartando los params que no son filtros de la tabla */
function parseTableState(searchParams?: DataTableSearchParams) {
  const state = parseSearchParams(searchParams || {});
  for (const key of IGNORED_PARAMS) {
    delete state.filters[key];
  }
  return state;
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getWorkshopTrackingPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseTableState(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = await buildWhereClause(companyId, state);

    // Safe multi-sort: solo campos válidos
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }

    // Más reciente primero por defecto
    const safeOrderBy = [...resolvedSorts, { created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.maintenance_orders.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: WORKSHOP_TRACKING_SELECT,
      }),
      prisma.maintenance_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener seguimiento de taller paginado', { data: { error } });
    throw new Error('Error al obtener el seguimiento de taller');
  }
}

export type WorkshopTrackingListItem = Awaited<ReturnType<typeof getWorkshopTrackingPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllWorkshopTrackingForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseTableState(searchParams);
    const where = await buildWhereClause(companyId, state);

    const data = await prisma.maintenance_orders.findMany({
      orderBy: [{ created_at: 'desc' }],
      where,
      select: WORKSHOP_TRACKING_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar seguimiento de taller', { data: { error } });
    throw new Error('Error al exportar el seguimiento de taller');
  }
}

// ============================================================================
// FACETS — lazy-load individual por columna (con cross-filtering)
// ============================================================================

/**
 * Obtiene el facet (opciones + counts) de UNA sola columna, bajo demanda
 * (lazy-load). Cada filtro facetado de la tabla llama esto al abrir su
 * popover, en vez de cargar las 3 facetas juntas en un `useQuery` bulk.
 *
 * Implementa cross-filtering: excluye el filtro propio de la columna
 * consultada (reutilizando `buildWhereClause` con ese filtro borrado del
 * estado), igual que hacía el `crossWhere` del patrón bulk anterior.
 */
export async function getWorkshopTrackingSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  const companyId = await getServerCompanyId();

  try {
    const state = parseTableState(searchParams);

    function toFacetMap(rows: { key: string | null | undefined; count: number }[]): Map<string, number> {
      const map = new Map<string, number>();
      for (const { key, count } of rows) {
        const mapKey = key ?? NULL_FILTER_VALUE;
        map.set(mapKey, (map.get(mapKey) ?? 0) + count);
      }
      return map;
    }

    async function crossWhere(excludeColumn: string, includeCompleted = false) {
      const filteredFilters = { ...state.filters };
      delete filteredFilters[excludeColumn];
      delete filteredFilters[`${excludeColumn}_from`];
      delete filteredFilters[`${excludeColumn}_to`];
      const crossState = { ...state, filters: filteredFilters };
      return buildWhereClause(companyId, crossState, includeCompleted);
    }

    switch (columnId) {
      case 'status': {
        // La faceta de "Estado" necesita ver también las completadas para poder ofrecerlas
        const where = await crossWhere('status', true);
        const rows = await prisma.maintenance_orders.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        });
        return { counts: toFacetMap(rows.map((r) => ({ key: r.status, count: r._count._all }))) };
      }

      case 'vehicle': {
        const where = await crossWhere('vehicle');
        const rows = await prisma.maintenance_orders.groupBy({
          by: ['equipment_id'],
          where,
          _count: { _all: true },
        });
        const counts = toFacetMap(rows.map((r) => ({ key: r.equipment_id, count: r._count._all })));

        // Resolver nombres de vehículos para el filtro
        const ids = rows.map((r) => r.equipment_id).filter((id): id is string => Boolean(id));
        const vehicles =
          ids.length > 0
            ? await prisma.vehicles.findMany({
                where: { id: { in: ids } },
                select: { id: true, domain: true, serie: true, intern_number: true },
                orderBy: { domain: 'asc' },
              })
            : [];
        const resolvedOptions = vehicles.map((v) => ({
          id: v.id,
          name: [v.domain || v.serie || 'Sin dominio', v.intern_number ? `(${v.intern_number})` : '']
            .filter(Boolean)
            .join(' '),
        }));
        return { counts, resolvedOptions };
      }

      case 'condition': {
        const where = await crossWhere('condition');
        // condition vive en vehicles (relación anidada) — groupBy no soporta campos anidados
        const rows = await prisma.maintenance_orders.findMany({
          where,
          select: { vehicles: { select: { condition: true } } },
        });
        const counts = new Map<string, number>();
        for (const row of rows) {
          const key = row.vehicles?.condition ?? NULL_FILTER_VALUE;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return { counts };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facet individual de seguimiento de taller', { data: { error, columnId } });
    throw error;
  }
}
