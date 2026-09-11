'use server';

import { Logger } from '@/lib/logger';
import {
  NULL_FILTER_VALUE,
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { CACHE_TAGS, CACHE_TTL } from '@/shared/constants/cache';
import { prisma } from '@/shared/lib/prisma';
import { cacheLife, cacheTag } from 'next/cache';
import {
  getResourceInternNumber,
  getResourceLabel,
  visibleEquipmentTypeCondition,
} from '../../shared/maintenance-resource';
import { getHiddenEquipmentTypeIds } from '../../utils/equipmentTypeVisibility';
import { computeCurrentSector, type CurrentSectorItemLike } from '../utils/currentSector';

const logger = new Logger('MaintenanceOrders/table/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos reales de maintenance_orders ordenables server-side */
const VALID_SORT_FIELDS = new Set([
  'order_number',
  'workshop_entry_date',
  'created_at',
  'status',
  // FK columns resueltas via FK_SORT_MAP
  'vehicle',
]);

/** Mapeo de columnId → orderBy de Prisma para columnas FK */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
};

/** Columnas con filtro de texto libre en vehicles */
const VEHICLE_TEXT_FILTER_COLUMNS = ['domain', 'serie', 'intern_number'];

/** Columnas con filtro de texto libre en la tabla principal */
const TEXT_FILTER_COLUMNS = ['order_number', 'description'];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['workshop_entry_date', 'created_at'];

/** Params de URL que NO son filtros de la tabla */
const IGNORED_PARAMS = new Set(['tab', 'subtab', 'operations_subtab', 'taller_subtab', 'config_subtab']);

/** Select común con todas las relaciones resueltas */
const MAINTENANCE_ORDERS_SELECT = {
  id: true,
  order_number: true,
  status: true,
  description: true,
  workshop_entry_date: true,
  created_at: true,
  equipment_id: true,
  // FK relations
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
  // Ticket 596: el pedido puede ser de un equipamiento en vez de un vehiculo
  other_equipment: {
    select: {
      id: true,
      serial_number: true,
      intern_number: true,
    },
  },
  maintenance_requests: {
    select: {
      id: true,
      kilometer: true,
      created_at: true,
      source: true,
      description: true,
    },
  },
  // Items para calcular progreso y sector actual, y mostrar items solicitados
  maintenance_order_items: {
    select: {
      id: true,
      assigned_sector_id: true,
      sector_sequence_order: true,
      is_diagnostico: true,
      is_critical: true,
      description: true,
      // Ticket 592: fotos que cargo el supervisor al pedir la reparacion
      images: true,
      types_of_repairs: { select: { id: true, name: true } },
      maintenance_order_item_repair_types: {
        select: { types_of_repairs: { select: { id: true, name: true } } },
      },
      maintenance_request_items: {
        select: {
          // Ticket 592: un item cargado a mano no tiene desvio de checklist —
          // su titulo vive en free_text y su aclaracion/fotos en la solicitud
          free_text: true,
          description: true,
          images: true,
          checklist_deviations: { select: { id: true, item_code: true, item_label: true } },
        },
      },
      workshop_sectors: {
        select: { id: true, name: true },
      },
      work_orders: {
        select: {
          id: true,
          order_number: true,
          status: true,
          work_order_items: {
            select: {
              id: true,
              status: true,
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
} as const;

// ============================================================================
// INTERNAL WHERE BUILDER
// ============================================================================

/**
 * Construye el WHERE para maintenance_orders.
 * Solo muestra órdenes con status relevante para el taller.
 * Nota: maintenance_orders no tiene company_id — no se filtra por empresa.
 */
/**
 * Estados que se muestran por defecto en el paso "En Taller".
 *
 * Ticket 595: las órdenes completadas salen del listado — el paso es de trabajo
 * activo. Siguen siendo alcanzables filtrando explícitamente por "Completada",
 * y el filtro conserva su contador gracias a `includeCompleted`.
 */
const ACTIVE_WORKSHOP_STATUSES = [
  'in_workshop',
  // Sin `pending_operations_validation`: Operaciones ya no valida (reunion 31/08/2026)
  'operations_rejected',
  'workshop_rejected',
];

/**
 * Sector actual (ticket 675): NO es un campo de BD, se calcula por orden a
 * partir de sus `maintenance_order_items` (ver `computeCurrentSector`). Como
 * no es filtrable directamente con Prisma, se resuelve en dos pasos:
 * 1. Se buscan las órdenes que cumplen el resto de los filtros (sin el de sector).
 * 2. Se calcula el sector actual de cada una en JS y se filtra por el/los
 *    sector(es) seleccionados, devolviendo los IDs que matchean.
 * El `where` resultante se combina con `id: { in: matchedIds }`.
 */
async function getOrdersWithCurrentSector(
  where: Record<string, unknown>
): Promise<Array<{ id: string; sector: ReturnType<typeof computeCurrentSector> }>> {
  const rows = await prisma.maintenance_orders.findMany({
    where,
    select: {
      id: true,
      maintenance_order_items: {
        select: {
          assigned_sector_id: true,
          sector_sequence_order: true,
          workshop_sectors: { select: { id: true, name: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    sector: computeCurrentSector(row.maintenance_order_items as CurrentSectorItemLike[]),
  }));
}

async function resolveCurrentSectorOrderIds(
  baseWhereWithoutSector: Record<string, unknown>,
  sectorValues: string[]
): Promise<string[]> {
  const hasNull = sectorValues.includes(NULL_FILTER_VALUE);
  const realValues = sectorValues.filter((v) => v !== NULL_FILTER_VALUE);

  const orders = await getOrdersWithCurrentSector(baseWhereWithoutSector);

  return orders
    .filter((o) => {
      if (o.sector == null) return hasNull;
      return realValues.includes(o.sector.id);
    })
    .map((o) => o.id);
}

async function buildWhereClause(
  state: ReturnType<typeof parseSearchParams>,
  hiddenTypeIds: readonly string[],
  options?: { excludeColumn?: string; includeCompleted?: boolean }
): Promise<Record<string, unknown>> {
  const excludeColumn = options?.excludeColumn;

  const cleanFilters = Object.fromEntries(Object.entries(state.filters).filter(([key]) => !IGNORED_PARAMS.has(key)));
  const cleanState = { ...state, filters: cleanFilters };

  const searchWhere = buildSearchWhere(cleanState.search, ['order_number']);

  const filtersState = excludeColumn === 'status' ? { ...cleanState.filters, status: [] } : cleanState.filters;

  const filtersWhere = buildFiltersWhere(
    filtersState,
    {
      status: 'status',
    },
    {
      exclude: [
        ...VEHICLE_TEXT_FILTER_COLUMNS,
        ...TEXT_FILTER_COLUMNS,
        ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
        'vehicle',
        'status',
        'currentSector',
      ],
    }
  );

  const textFiltersWhere = buildTextFiltersWhere(
    excludeColumn === 'order_number' ? { ...cleanState.filters, order_number: [] } : cleanState.filters,
    TEXT_FILTER_COLUMNS
  );

  const dateFiltersWhere = buildDateRangeFiltersWhere(cleanState.filters, DATE_RANGE_COLUMNS);

  // ─── Filtro status (enum directo) ──────────────────────────────────────────
  const statusValues = excludeColumn === 'status' ? undefined : cleanState.filters['status'];
  const statusWhere: Record<string, unknown> = {};
  if (statusValues?.length) {
    const hasNull = statusValues.includes(NULL_FILTER_VALUE);
    const realValues = statusValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // mixto: incluir null y valores reales — ver abajo en OR conditions
    } else if (hasNull) {
      statusWhere.status = null;
    } else {
      statusWhere.status = { in: realValues };
    }
  }

  // ─── Filtro vehicle (FK UUID → equipment_id) ───────────────────────────────
  const vehicleFilter: Record<string, unknown> = {};
  const vehicleValues = excludeColumn === 'vehicle' ? undefined : cleanState.filters['vehicle'];
  if (vehicleValues?.length) {
    const hasNull = vehicleValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (!hasNull) {
      vehicleFilter.equipment_id = { in: realValues };
    } else if (realValues.length === 0) {
      vehicleFilter.equipment_id = null;
    }
    // hasNull + realValues: caso mixto — se ignora (poco común)
  }

  // ─── Filtros de texto en vehicles (domain, serie, intern_number) ───────────
  const vehicleTextConditions: Record<string, unknown>[] = [];
  if (excludeColumn !== 'domain') {
    const domainVals = cleanState.filters['domain'];
    if (domainVals?.length) {
      vehicleTextConditions.push({ vehicles: { domain: { contains: domainVals[0], mode: 'insensitive' } } });
    }
  }
  if (excludeColumn !== 'serie') {
    const serieVals = cleanState.filters['serie'];
    if (serieVals?.length) {
      vehicleTextConditions.push({ vehicles: { serie: { contains: serieVals[0], mode: 'insensitive' } } });
    }
  }
  if (excludeColumn !== 'intern_number') {
    const internVals = cleanState.filters['intern_number'];
    if (internVals?.length) {
      vehicleTextConditions.push({
        vehicles: { intern_number: { contains: internVals[0], mode: 'insensitive' } },
      });
    }
  }

  // ─── Filtro status directo con valores mixtos ──────────────────────────────
  let statusConditions: Record<string, unknown> = {};
  if (statusValues?.length) {
    const hasNull = statusValues.includes(NULL_FILTER_VALUE);
    const realValues = statusValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // Para maintenance_orders el status nunca es null en la práctica,
      // pero soportamos el patrón
      statusConditions = {};
    } else if (hasNull) {
      statusConditions = { status: null };
    } else {
      statusConditions = { status: { in: realValues } };
    }
  }

  const where: Record<string, unknown> = {
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...vehicleFilter,
    ...statusConditions,
  };

  // Tipos de equipamiento ocultos para el usuario actual (ticket 690)
  const equipmentCondition = visibleEquipmentTypeCondition(hiddenTypeIds);
  const equipmentAndConditions = equipmentCondition ? [equipmentCondition] : [];

  // Añadir condiciones de texto en vehicles + equipamiento oculto como AND
  const combinedAndConditions = [...vehicleTextConditions, ...equipmentAndConditions];
  if (combinedAndConditions.length > 0) {
    where.AND = combinedAndConditions;
  }

  // Filtrar para mostrar solo órdenes relevantes de taller (excluir scheduled/pending_scheduling)
  // pending_workshop_validation se mueve al paso 4 (Aprobaciones)
  // Si ya hay un filtro de status aplicado, NO sobreescribir
  if (!statusValues?.length) {
    where.status = {
      in: options?.includeCompleted ? [...ACTIVE_WORKSHOP_STATUSES, 'completed'] : ACTIVE_WORKSHOP_STATUSES,
    };
  }

  // ─── Filtro Sector Actual (calculado — ticket 675) ─────────────────────────
  // Se resuelve al final, con el resto del where ya armado, para que la
  // subquery de sector solo considere órdenes que ya cumplen los demás filtros.
  const currentSectorValues = excludeColumn === 'currentSector' ? undefined : cleanState.filters['currentSector'];
  if (currentSectorValues?.length) {
    const matchedIds = await resolveCurrentSectorOrderIds(where, currentSectorValues);
    where.id = { in: matchedIds };
  }

  return where;
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

/**
 * Cacheada con `'use cache'`: NO puede leer cookies/sesión (por eso recibe
 * `hiddenTypeIds` ya resuelto, en vez de llamar a `getHiddenEquipmentTypeIds`
 * acá adentro). Entra en la key del cache, así un usuario nunca ve el cache
 * de otro con distintos tipos ocultos (ticket 690).
 */
async function getMaintenanceOrdersPaginatedCached(
  searchParams: DataTableSearchParams,
  hiddenTypeIds: readonly string[]
) {
  'use cache';
  cacheTag(CACHE_TAGS.TAB_IN_WORKSHOP, CACHE_TAGS.MAINTENANCE_ORDERS);
  cacheLife({ expire: CACHE_TTL.PAGINATED_LIST, revalidate: CACHE_TTL.PAGINATED_LIST, stale: 30 });

  logger.debug('Obteniendo órdenes de mantenimiento paginadas', { data: { searchParams } });

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    // Multi-sort con validación
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }
    const safeOrderBy = resolvedSorts.length > 0 ? resolvedSorts : [{ created_at: 'desc' as const }];

    const where = await buildWhereClause(state, hiddenTypeIds);

    const [data, total] = await Promise.all([
      prisma.maintenance_orders.findMany({
        where,
        skip,
        take,
        orderBy: safeOrderBy,
        select: MAINTENANCE_ORDERS_SELECT,
      }),
      prisma.maintenance_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener órdenes de mantenimiento paginadas', { data: { error } });
    throw error;
  }
}

export async function getMaintenanceOrdersPaginated(searchParams: DataTableSearchParams) {
  const hiddenTypeIds = await getHiddenEquipmentTypeIds();
  return getMaintenanceOrdersPaginatedCached(searchParams, hiddenTypeIds);
}

export type MaintenanceOrderListItem = Awaited<ReturnType<typeof getMaintenanceOrdersPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY
// ============================================================================

async function getAllMaintenanceOrdersForExportCached(
  searchParams: DataTableSearchParams,
  hiddenTypeIds: readonly string[]
) {
  'use cache';
  cacheTag(CACHE_TAGS.TAB_IN_WORKSHOP, CACHE_TAGS.MAINTENANCE_ORDERS);
  cacheLife({ expire: CACHE_TTL.EXPORT, revalidate: CACHE_TTL.EXPORT, stale: 30 });

  logger.debug('Exportando órdenes de mantenimiento', { data: { searchParams } });

  try {
    const state = parseSearchParams(searchParams);
    const where = await buildWhereClause(state, hiddenTypeIds);

    const data = await prisma.maintenance_orders.findMany({
      where,
      orderBy: [{ created_at: 'desc' }],
      select: MAINTENANCE_ORDERS_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar órdenes de mantenimiento', { data: { error } });
    throw error;
  }
}

export async function getAllMaintenanceOrdersForExport(searchParams: DataTableSearchParams) {
  const hiddenTypeIds = await getHiddenEquipmentTypeIds();
  return getAllMaintenanceOrdersForExportCached(searchParams, hiddenTypeIds);
}

// ============================================================================
// SINGLE FACET (lazy-load individual, con cross-filtering)
// ============================================================================

/**
 * Opciones y counts para UN SOLO filtro facetado, bajo demanda (lazy-load).
 * Cada filtro del cliente llama a esta función al abrir su popover.
 *
 * Implementa cross-filtering: excluye el filtro propio de la columna consultada
 * del WHERE, para que su count no se vea afectado por su propia selección.
 */
async function getMaintenanceOrdersSingleFacetCached(
  columnId: string,
  hiddenTypeIds: readonly string[],
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  'use cache';
  cacheTag(CACHE_TAGS.TAB_IN_WORKSHOP, CACHE_TAGS.MAINTENANCE_ORDERS);
  cacheLife({ expire: CACHE_TTL.FACETS, revalidate: CACHE_TTL.FACETS, stale: 30 });

  logger.debug('Obteniendo facet individual de órdenes de mantenimiento', { data: { columnId, searchParams } });

  try {
    const state = searchParams ? parseSearchParams(searchParams) : parseSearchParams({});

    switch (columnId) {
      // Para la faceta de estado se incluyen las completadas: así "Completada" sigue
      // apareciendo como opción filtrable con su contador (ticket 595).
      case 'status': {
        const where = await buildWhereClause(state, hiddenTypeIds, { excludeColumn: 'status', includeCompleted: true });
        const rows = await prisma.maintenance_orders.groupBy({ by: ['status'], where, _count: true });
        const counts = new Map<string, number>();
        for (const r of rows) {
          const key = r.status == null ? NULL_FILTER_VALUE : r.status;
          counts.set(key, r._count);
        }
        return { counts };
      }

      case 'vehicle': {
        const where = await buildWhereClause(state, hiddenTypeIds, { excludeColumn: 'vehicle' });
        const rows = await prisma.maintenance_orders.groupBy({ by: ['equipment_id'], where, _count: true });
        const counts = new Map<string, number>();
        for (const r of rows) {
          const key = r.equipment_id == null ? NULL_FILTER_VALUE : r.equipment_id;
          counts.set(key, r._count);
        }

        const vehicleIds = rows.filter((r) => r.equipment_id).map((r) => r.equipment_id!);
        const vehicles =
          vehicleIds.length > 0
            ? await prisma.vehicles.findMany({
                where: { id: { in: vehicleIds } },
                select: { id: true, domain: true, serie: true, intern_number: true },
                orderBy: { domain: 'asc' },
              })
            : [];
        const resolvedOptions = vehicles.map((v) => ({
          id: v.id,
          name: [v.domain ?? v.serie ?? 'Sin identificar', v.intern_number ? `#${v.intern_number}` : '']
            .filter(Boolean)
            .join(' '),
        }));

        return { counts, resolvedOptions };
      }

      // Sector actual (ticket 675): no es un campo de BD — se calcula por orden
      // (ver `computeCurrentSector`) sobre las órdenes que cumplen el resto de filtros.
      case 'currentSector': {
        const where = await buildWhereClause(state, hiddenTypeIds, { excludeColumn: 'currentSector' });
        const orders = await getOrdersWithCurrentSector(where);

        const counts = new Map<string, number>();
        const nameById = new Map<string, string>();
        for (const o of orders) {
          if (o.sector == null) {
            counts.set(NULL_FILTER_VALUE, (counts.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            counts.set(o.sector.id, (counts.get(o.sector.id) ?? 0) + 1);
            nameById.set(o.sector.id, o.sector.name);
          }
        }
        const resolvedOptions = Array.from(nameById.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

        return { counts, resolvedOptions };
      }

      default:
        logger.warn('getMaintenanceOrdersSingleFacet: columnId desconocido', { data: { columnId } });
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facet individual de órdenes de mantenimiento', { data: { error, columnId } });
    throw error;
  }
}

export async function getMaintenanceOrdersSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  const hiddenTypeIds = await getHiddenEquipmentTypeIds();
  return getMaintenanceOrdersSingleFacetCached(columnId, hiddenTypeIds, searchParams);
}

// ============================================================================
// TASKS EXPORT (ticket 682) — Excel a nivel de tarea, no de orden
// ============================================================================

/**
 * Datos de la orden (OM) que se repiten en cada fila de tarea del export.
 * Mismos campos que `MAINTENANCE_ORDERS_SELECT` a nivel raíz — sin los items,
 * que acá se recorren desde `work_order_item_repairs` hacia arriba.
 */
const TASK_EXPORT_ORDER_SELECT = {
  order_number: true,
  description: true,
  status: true,
  workshop_entry_date: true,
  created_at: true,
  vehicles: { select: { id: true, domain: true, serie: true, intern_number: true } },
  other_equipment: { select: { id: true, serial_number: true, intern_number: true } },
  maintenance_requests: { select: { description: true } },
} as const;

export interface MaintenanceOrderTaskExportRow {
  om_order_number: string | null;
  ot_order_number: string | null;
  vehicle_label: string;
  task_name: string;
  type_of_maintenance: string | null;
  task_status: string;
  task_sector: string | null;
  is_diagnostico: boolean;
  om_status: string;
  workshop_entry_date: Date | null;
  created_at: Date | null;
  description: string;
}

/**
 * Excel a nivel de tarea (ticket 682): una fila por `work_order_item_repairs`
 * en vez de una fila por orden de mantenimiento. Fabricio pidió poder ver, por
 * cada tarea: la OT a la que pertenece, el tipo de tarea (tipo de
 * mantenimiento), su propio estado (no el de la OM completa), y el sector de
 * taller de ESA tarea (el de su OT — puede diferir del "sector actual" de la
 * orden, que es el de su item pendiente más próximo).
 *
 * Recorre la jerarquía real: work_order_item_repairs → work_order_items →
 * (work_orders [OT] + maintenance_order_items → maintenance_orders [OM]).
 * Reutiliza `buildWhereClause` para respetar exactamente los mismos filtros
 * activos que la grilla (incluido el nuevo filtro de Sector Actual).
 */
export async function getMaintenanceOrderTasksForExport(
  searchParams: DataTableSearchParams
): Promise<MaintenanceOrderTaskExportRow[]> {
  logger.debug('Exportando tareas de órdenes de mantenimiento', { data: { searchParams } });

  try {
    const state = parseSearchParams(searchParams);
    const hiddenTypeIds = await getHiddenEquipmentTypeIds();
    const where = await buildWhereClause(state, hiddenTypeIds);

    const repairs = await prisma.work_order_item_repairs.findMany({
      where: {
        work_order_items: {
          maintenance_order_items: {
            maintenance_orders: where,
          },
        },
      },
      select: {
        id: true,
        status: true,
        is_diagnostico: true,
        types_of_repairs: { select: { name: true, type_of_maintenance: true } },
        work_order_items: {
          select: {
            work_orders: {
              select: { order_number: true, workshop_sectors: { select: { name: true } } },
            },
            maintenance_order_items: {
              select: { maintenance_orders: { select: TASK_EXPORT_ORDER_SELECT } },
            },
          },
        },
      },
    });

    const rows: MaintenanceOrderTaskExportRow[] = repairs.map((repair) => {
      const workOrder = repair.work_order_items.work_orders;
      const order = repair.work_order_items.maintenance_order_items.maintenance_orders;

      return {
        om_order_number: order.order_number,
        ot_order_number: workOrder.order_number,
        vehicle_label:
          getResourceLabel(order) + (getResourceInternNumber(order) ? ` (#${getResourceInternNumber(order)})` : ''),
        task_name: repair.types_of_repairs.name,
        type_of_maintenance: repair.types_of_repairs.type_of_maintenance,
        task_status: repair.status,
        task_sector: workOrder.workshop_sectors?.name ?? null,
        is_diagnostico: repair.is_diagnostico,
        om_status: order.status,
        workshop_entry_date: order.workshop_entry_date,
        created_at: order.created_at,
        description: order.description ?? order.maintenance_requests?.description ?? '',
      };
    });

    // Orden: N° OM, luego N° OT, luego nombre de tarea
    rows.sort((a, b) => {
      const omCompare = (a.om_order_number ?? '').localeCompare(b.om_order_number ?? '');
      if (omCompare !== 0) return omCompare;
      const otCompare = (a.ot_order_number ?? '').localeCompare(b.ot_order_number ?? '');
      if (otCompare !== 0) return otCompare;
      return a.task_name.localeCompare(b.task_name);
    });

    return rows;
  } catch (error) {
    logger.error('Error al exportar tareas de órdenes de mantenimiento', { data: { error } });
    throw error;
  }
}
