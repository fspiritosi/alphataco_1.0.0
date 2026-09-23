'use server';

import { Logger } from '@/lib/logger';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildTextFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { prisma } from '@/shared/lib/prisma';
import { resourceCompanyCondition, visibleEquipmentTypeCondition } from '../../shared/maintenance-resource';
import { getHiddenEquipmentTypeIds } from '../../utils/equipmentTypeVisibility';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const logger = new Logger('PedidosMantenimiento/Pendientes');

// ── Campos válidos para ordenamiento ──────────────────────────────────────────
// Solo campos REALES de la tabla maintenance_orders
const VALID_SORT_FIELDS = new Set(['status', 'created_at', 'scheduled_date', 'order_number', 'source']);

// ── Columnas de texto con filtro individual ────────────────────────────────────
const TEXT_COLUMNS = ['order_number', 'description'];

// ── Select de campos compartido ───────────────────────────────────────────────
const PENDING_ORDER_SELECT = {
  id: true,
  status: true,
  created_at: true,
  scheduled_date: true,
  source: true,
  preventive_type: true,
  order_number: true,
  description: true,
  equipment_id: true,
  other_equipment_id: true,
  maintenance_request_id: true,
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
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
      supervisor_id: true,
      description: true,
    },
  },
  _count: {
    select: {
      maintenance_order_items: true,
    },
  },
} as const;

// ── buildWhereClause — Helper DRY compartido ─────────────────────────────────
// Usado por las 3 funciones: paginated, export y facets
function buildWhereClause(
  companyId: string,
  state: ReturnType<typeof parseSearchParams>,
  supervisorId: string | null | undefined,
  hiddenTypeIds: readonly string[]
) {
  // Filtros facetados — columnas simples (status y source)
  // Excluir 'vehicle' porque se procesa aparte con equipment_id
  const filtersWhere = buildFiltersWhere(
    state.filters,
    {
      status: 'status',
      source: 'source',
    },
    { exclude: [...TEXT_COLUMNS, 'vehicle'] }
  );

  // Filtros de texto por columna individual
  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);

  // Filtros de rango de fecha
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, ['created_at', 'scheduled_date']);

  // Filtro de recurso (FK por ID): el id puede ser de un vehiculo o de un
  // equipamiento (ticket 596), asi que se compara contra las dos columnas.
  const vehicleFilter = state.filters.vehicle?.length
    ? {
        OR: [{ equipment_id: { in: state.filters.vehicle } }, { other_equipment_id: { in: state.filters.vehicle } }],
      }
    : {};

  // Búsqueda global: busca en el recurso (vehiculo o equipamiento) O en nro. pedido
  const searchCondition = state.search
    ? {
        OR: [
          {
            vehicles: {
              OR: [
                { domain: { contains: state.search, mode: 'insensitive' as const } },
                { serie: { contains: state.search, mode: 'insensitive' as const } },
                { intern_number: { contains: state.search, mode: 'insensitive' as const } },
              ],
            },
          },
          {
            other_equipment: {
              OR: [
                { serial_number: { contains: state.search, mode: 'insensitive' as const } },
                { intern_number: { contains: state.search, mode: 'insensitive' as const } },
              ],
            },
          },
          { order_number: { contains: state.search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  // Tipos de equipamiento ocultos para el usuario actual (ticket 690)
  const equipmentCondition = visibleEquipmentTypeCondition(hiddenTypeIds);

  return {
    // Status base de pendientes (puede ser sobrescrito por filtersWhere.status si el usuario filtra).
    // Al programar la fecha el pedido pasa directo a 'date_confirmed', por eso ya no
    // existen pedidos en 'scheduled' esperando aprobacion de Operaciones.
    status: 'pending_scheduling',
    // Empresa: vehiculo o equipamiento (ticket 596). Va dentro de AND porque
    // produce un OR y chocaria con el OR de la busqueda global.
    // Busqueda global y filtro de recurso tambien producen OR: los tres van
    // dentro del AND para que ninguno pise a otro.
    AND: [
      resourceCompanyCondition(companyId),
      ...(state.search ? [searchCondition] : []),
      ...(state.filters.vehicle?.length ? [vehicleFilter] : []),
      ...(equipmentCondition ? [equipmentCondition] : []),
    ],
    // Filtro de supervisor si aplica
    ...(supervisorId ? { maintenance_requests: { supervisor_id: supervisorId } } : {}),
    // Filtros del usuario (status sobrescribe el baseWhere si el usuario lo filtra)
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
  };
}

// ── Query paginada ────────────────────────────────────────────────────────────

export async function getPendingOrdersPaginated(searchParams: DataTableSearchParams) {
  const logger_fn = logger;
  logger_fn.debug('Obteniendo pedidos pendientes paginados');

  try {
    const [companyId, filterInfo, hiddenTypeIds] = await Promise.all([
      getActiveCompanyId(),
      getSupervisorFilterInfo(),
      getHiddenEquipmentTypeIds(),
    ]);

    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    const supervisorId = filterInfo?.shouldFilterBySupervisor ? filterInfo.userId : null;
    const where = buildWhereClause(companyId, state, supervisorId, hiddenTypeIds);

    // Ordenamiento validado: pending_scheduling primero, luego scheduled; por created_at ASC
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        resolvedSorts.push({ [s.id]: dir });
      }
    }
    // Default: pending_scheduling antes que scheduled, de más viejo a más reciente
    const safeOrderBy =
      // El usuario espera ver primero lo ultimo que cargo: dentro de cada status,
      // del mas reciente al mas viejo. El status sigue siendo el criterio primario.
      resolvedSorts.length > 0 ? resolvedSorts : [{ status: 'desc' as const }, { created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.maintenance_orders.findMany({
        where,
        skip,
        take,
        orderBy: safeOrderBy,
        select: PENDING_ORDER_SELECT,
      }),
      prisma.maintenance_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger_fn.error('Error al obtener pedidos pendientes', { data: { error } });
    throw new Error('No se pudo obtener la lista. Intente nuevamente.');
  }
}

// ── Export completo (sin paginación) ─────────────────────────────────────────

export async function getAllPendingOrdersForExport(searchParams: DataTableSearchParams) {
  logger.debug('Exportando pedidos pendientes');

  try {
    const [companyId, filterInfo, hiddenTypeIds] = await Promise.all([
      getActiveCompanyId(),
      getSupervisorFilterInfo(),
      getHiddenEquipmentTypeIds(),
    ]);

    const state = parseSearchParams(searchParams);
    const supervisorId = filterInfo?.shouldFilterBySupervisor ? filterInfo.userId : null;
    const where = buildWhereClause(companyId, state, supervisorId, hiddenTypeIds);

    return await prisma.maintenance_orders.findMany({
      where,
      // Mismo orden que la tabla: status primero, luego lo mas reciente arriba.
      orderBy: [{ status: 'desc' as const }, { created_at: 'desc' as const }],
      select: PENDING_ORDER_SELECT,
    });
  } catch (error) {
    logger.error('Error al exportar pedidos pendientes', { data: { error } });
    throw new Error('No se pudo exportar la lista. Intente nuevamente.');
  }
}

// ── Faceta individual (lazy-load, con cross-filtering) ─────────────────────────
// Reemplaza al viejo getPendingOrdersFacets (bulk): carga counts + opciones de
// UNA sola columna, bajo demanda (al abrir el popover del filtro correspondiente).

export async function getPendingOrdersSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  logger.debug('Obteniendo facet individual de pedidos pendientes', { data: { columnId } });

  try {
    const [companyId, filterInfo, hiddenTypeIds] = await Promise.all([
      getActiveCompanyId(),
      getSupervisorFilterInfo(),
      getHiddenEquipmentTypeIds(),
    ]);
    const supervisorId = filterInfo?.shouldFilterBySupervisor ? filterInfo.userId : null;
    const state = parseSearchParams(searchParams || {});

    // Excluye el filtro de la columna propia para que los counts sean correctos
    function crossWhere(excludeColumn: string) {
      const filteredFilters = { ...state.filters };
      delete filteredFilters[excludeColumn];
      const crossState = { ...state, filters: filteredFilters };
      return buildWhereClause(companyId, crossState, supervisorId, hiddenTypeIds);
    }

    function toFacetMap(rows: { key: string | null | undefined; count: number }[]): Map<string, number> {
      const map = new Map<string, number>();
      for (const { key, count } of rows) {
        // status/source/vehicle no admiten "Sin asignar" en esta tabla (comportamiento
        // preexistente del bulk facet: los null se descartaban de los counts).
        if (key == null) continue;
        map.set(key, (map.get(key) ?? 0) + count);
      }
      return map;
    }

    const where = crossWhere(columnId);

    switch (columnId) {
      case 'status': {
        const rows = await prisma.maintenance_orders.groupBy({
          by: ['status'],
          where,
          _count: true,
        });
        return { counts: toFacetMap(rows.map((r) => ({ key: r.status, count: r._count }))) };
      }

      case 'source': {
        const rows = await prisma.maintenance_orders.groupBy({
          by: ['source'],
          where,
          _count: true,
        });
        return { counts: toFacetMap(rows.map((r) => ({ key: r.source, count: r._count }))) };
      }

      case 'vehicle': {
        const rows = await prisma.maintenance_orders.groupBy({
          by: ['equipment_id', 'other_equipment_id'],
          where,
          _count: true,
        });
        const counts = toFacetMap(rows.map((r) => ({ key: r.equipment_id ?? r.other_equipment_id, count: r._count })));

        // `equipment_id` es nullable desde el ticket 596 (el pedido puede ser de un
        // equipamiento): el filter descarta los null y el guard se lo dice a TypeScript.
        const vehicleIds = rows.map((r) => r.equipment_id).filter((id): id is string => id !== null);
        const otherEquipmentIds = rows.map((r) => r.other_equipment_id).filter((id): id is string => id !== null);

        const [vehicles, otherEquipment] = await Promise.all([
          vehicleIds.length > 0
            ? prisma.vehicles.findMany({
                where: { id: { in: vehicleIds } },
                select: { id: true, domain: true, serie: true, intern_number: true },
                orderBy: { domain: 'asc' },
              })
            : Promise.resolve([]),
          otherEquipmentIds.length > 0
            ? prisma.other_equipment.findMany({
                where: { id: { in: otherEquipmentIds } },
                select: { id: true, serial_number: true, intern_number: true },
                orderBy: { serial_number: 'asc' },
              })
            : Promise.resolve([]),
        ]);

        const resolvedOptions = [
          ...vehicles.map((v) => ({
            id: v.id,
            name: v.intern_number
              ? `${v.domain || v.serie || 'Sin identificar'} (#${v.intern_number})`
              : v.domain || v.serie || 'Sin identificar',
          })),
          ...otherEquipment.map((oe) => ({
            id: oe.id,
            name: oe.intern_number
              ? `${oe.serial_number || 'Sin identificar'} (#${oe.intern_number})`
              : oe.serial_number || 'Sin identificar',
          })),
        ];

        return { counts, resolvedOptions };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facet individual de pedidos pendientes', { data: { error, columnId } });
    return null;
  }
}

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type PendingOrderListItem = Awaited<ReturnType<typeof getPendingOrdersPaginated>>['data'][number];
