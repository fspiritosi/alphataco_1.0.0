'use server';

import { Logger } from '@/lib/logger';
import { getActiveCompanyId } from '@/shared/lib/tenant';
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
import { resourceCompanyCondition, visibleEquipmentTypeCondition } from '../../shared/maintenance-resource';
import { getHiddenEquipmentTypeIds } from '../../utils/equipmentTypeVisibility';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const logger = new Logger('PedidosMantenimiento/Confirmados/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos reales de maintenance_orders ordenables server-side */
const VALID_SORT_FIELDS = new Set([
  'created_at',
  'scheduled_date',
  'date_approved_at',
  'order_number',
  // FK columns resueltas via FK_SORT_MAP
  'vehicle',
]);

/** Mapeo de columnId → orderBy de Prisma para columnas FK */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
};

/** Params de URL que NO son filtros de la tabla (tabs, subtabs, etc.) */
const IGNORED_PARAMS = new Set(['tab', 'subtab', 'operations_subtab', 'taller_subtab', 'config_subtab']);

/** Columnas con filtro de texto libre en vehicles */
const VEHICLE_TEXT_FILTER_COLUMNS = ['domain', 'serie', 'intern_number'];

/** Columnas con filtro de texto libre en maintenance_orders */
const TEXT_COLUMNS = ['order_number', 'description'];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['created_at', 'scheduled_date', 'date_approved_at'];

/** Mapping de columnId (URL) → campo real en Prisma */
const COLUMN_MAP: Record<string, string> = {
  vehicle: 'equipment_id',
  condition: 'condition', // condición del recurso (vehicles u other_equipment), manejado manualmente
  source: 'source', // campo en maintenance_requests, manejado manualmente
};

/** Select común con todas las relaciones resueltas */
const CONFIRMED_ORDERS_SELECT = {
  id: true,
  status: true,
  scheduled_date: true,
  created_at: true,
  date_approved_at: true,
  order_number: true,
  description: true,
  source: true,
  preventive_type: true,
  // FK relations
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
      kilometer: true,
      condition: true,
      engine_hours: true,
    },
  },
  // Ticket 596: el pedido puede ser de un equipamiento en vez de un vehiculo
  other_equipment: {
    select: {
      id: true,
      serial_number: true,
      intern_number: true,
      condition: true,
      horometer: true,
    },
  },
  maintenance_requests: {
    select: {
      id: true,
      // Autor por defecto de los comentarios del pedido
      profile_maintenance_requests_supervisor_idToprofile: { select: { id: true, fullname: true } },
      kilometer: true,
      created_at: true,
      source: true,
      preventive_type: true,
      supervisor_id: true,
      description: true,
    },
  },
  maintenance_order_items: {
    select: {
      id: true,
      description: true,
      // Ticket 592: fotos del item; alimentan el visor de los dialogos de detalle
      // y de entrada a taller. Sin esto las miniaturas nunca se renderizan.
      images: true,
      maintenance_request_items: {
        select: {
          id: true,
          description: true,
          // Ticket 592: en la carga manual el item no tiene desvio de checklist,
          // su titulo es el texto libre que escribio el supervisor.
          free_text: true,
          // Fotos cargadas al crear la solicitud (la orden puede no tenerlas propias)
          images: true,
          // Comentarios del circuito: sin estos campos el bloque <ItemComments>
          // del dialogo se renderiza vacio aunque el item tenga observaciones.
          driver_comment: true,
          supervisor_comment: true,
          validator_comment: true,
          checklist_deviations: {
            select: {
              id: true,
              item_code: true,
              item_label: true,
              section_code: true,
              driver_comment: true,
            },
          },
        },
      },
      types_of_repairs: {
        select: { id: true, name: true },
      },
      maintenance_order_item_repair_types: {
        select: {
          repair_type_id: true,
          types_of_repairs: {
            select: { id: true, name: true },
          },
        },
      },
    },
  },
} as const;

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Construye el WHERE base de mantenimiento confirmado.
 * Solo muestra órdenes con status = 'date_confirmed'.
 */
async function buildBaseWhere(
  companyId: string,
  state: ReturnType<typeof parseSearchParams>,
  hiddenTypeIds: readonly string[]
) {
  const supervisorFilter = await getSupervisorFilterInfo();

  const searchWhere = buildSearchWhere(state.search, ['order_number']);

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...VEHICLE_TEXT_FILTER_COLUMNS,
      ...TEXT_COLUMNS,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      'condition', // manejado manualmente (condición del recurso: vehicles u other_equipment)
      'vehicle', // manejado manualmente (FK)
      'source', // manejado manualmente (en maintenance_requests)
    ],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // ─── Filtro vehicle (FK UUID → equipment_id) ─────────────────────────────
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

  // ─── Filtros de texto en campos de vehicles ────────────────────────────────
  const vehicleTextConditions: Record<string, unknown>[] = [];
  const domainValues = state.filters['domain'];
  const serieValues = state.filters['serie'];
  const internNumberValues = state.filters['intern_number'];

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

  // ─── Filtro condition (condición del recurso: vehículo o equipamiento) ────
  // La lógica completa vive más abajo junto a los demás casos "mixtos": se arma
  // siempre como OR (vehicles/other_equipment) y se agrega a extraAndConditions,
  // nunca se spreadea en la raíz del where.
  const conditionValues = state.filters['condition'];

  // ─── Filtro source (campo en maintenance_requests) ────────────────────────
  const sourceFilter: Record<string, unknown> = {};
  const sourceValues = state.filters['source'];
  if (sourceValues?.length) {
    const hasNull = sourceValues.includes(NULL_FILTER_VALUE);
    const realValues = sourceValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // caso mixto: se agrega en AND abajo
    } else if (hasNull) {
      sourceFilter.maintenance_requests = { source: null };
    } else {
      sourceFilter.maintenance_requests = { source: { in: realValues } };
    }
  }

  // ─── Condiciones AND para casos mixtos ────────────────────────────────────
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

  if (conditionValues?.length) {
    const hasNull = conditionValues.includes(NULL_FILTER_VALUE);
    const realValues = conditionValues.filter((v) => v !== NULL_FILTER_VALUE);

    // Ticket 596: el pedido es de un vehículo O de un equipamiento (nunca los dos,
    // lo garantiza el CHECK de la BD) y ambos comparten el enum condition_enum
    // (ver maintenance-resource.ts). Se arma un OR que cubre los dos recursos para
    // cada caso (valores reales, "Sin asignar", o ambos combinados).
    const conditionOrBranches: Record<string, unknown>[] = [];
    if (realValues.length > 0) {
      conditionOrBranches.push({ vehicles: { condition: { in: realValues } } });
      conditionOrBranches.push({ other_equipment: { condition: { in: realValues } } });
    }
    if (hasNull) {
      conditionOrBranches.push({ vehicles: { condition: null } });
      conditionOrBranches.push({ other_equipment: { condition: null } });
    }
    extraAndConditions.push({ OR: conditionOrBranches });
  }

  if (sourceValues?.length) {
    const hasNull = sourceValues.includes(NULL_FILTER_VALUE);
    const realValues = sourceValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [{ maintenance_requests: { source: { in: realValues } } }, { maintenance_requests: { source: null } }],
      });
    }
  }

  // ─── Filtro supervisor ─────────────────────────────────────────────────────
  const supervisorCondition: Record<string, unknown> = {};
  if (supervisorFilter?.shouldFilterBySupervisor) {
    supervisorCondition.maintenance_requests = {
      supervisor_id: supervisorFilter.userId,
    };
  }

  // Tipos de equipamiento ocultos para el usuario actual (ticket 690)
  const equipmentCondition = visibleEquipmentTypeCondition(hiddenTypeIds);

  // Vehiculo o equipamiento (ticket 596) + casos "mixtos" (vehicle/condition/source),
  // todo dentro del MISMO array AND — nunca reemplazando la key AND con un spread
  // posterior, o se pierde el scoping por empresa (resourceCompanyCondition).
  const andConditions: Record<string, unknown>[] = [
    resourceCompanyCondition(companyId),
    ...extraAndConditions,
    ...(equipmentCondition ? [equipmentCondition] : []),
  ];

  return {
    status: 'date_confirmed' as const,
    AND: andConditions,
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...vehicleFilter,
    ...sourceFilter,
    ...supervisorCondition,
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getConfirmedOrdersPaginated(searchParams: DataTableSearchParams) {
  const [companyId, hiddenTypeIds] = await Promise.all([getActiveCompanyId(), getHiddenEquipmentTypeIds()]);

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const { skip, take } = stateToPrismaParams(state);
    const where = await buildBaseWhere(companyId, state, hiddenTypeIds);

    // Safe multi-sort: solo campos válidos
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }

    // Lo ultimo cargado primero: es lo que el usuario espera ver al entrar a la tabla.
    const safeOrderBy = [...resolvedSorts, { created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.maintenance_orders.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: CONFIRMED_ORDERS_SELECT,
      }),
      prisma.maintenance_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener pedidos confirmados paginados', { data: { error } });
    throw new Error('Error al obtener los pedidos confirmados');
  }
}

export type ConfirmedOrderListItem = Awaited<ReturnType<typeof getConfirmedOrdersPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllConfirmedOrdersForExport(searchParams: DataTableSearchParams) {
  const [companyId, hiddenTypeIds] = await Promise.all([getActiveCompanyId(), getHiddenEquipmentTypeIds()]);

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const where = await buildBaseWhere(companyId, state, hiddenTypeIds);

    const data = await prisma.maintenance_orders.findMany({
      // Mismo orden que la tabla: lo mas reciente arriba.
      orderBy: [{ created_at: 'desc' }],
      where,
      select: CONFIRMED_ORDERS_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar pedidos confirmados', { data: { error } });
    throw new Error('Error al exportar los pedidos confirmados');
  }
}

// ============================================================================
// FACET INDIVIDUAL (lazy-load, con cross-filtering)
// ============================================================================

/**
 * Reemplaza al viejo getConfirmedOrdersFacets (bulk): carga counts + opciones
 * de UNA sola columna, bajo demanda (al abrir el popover del filtro correspondiente).
 * Cross-filtering: excluye el filtro propio de la columna consultada.
 */
export async function getConfirmedOrdersSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  const [companyId, supervisorFilter, hiddenTypeIds] = await Promise.all([
    getActiveCompanyId(),
    getSupervisorFilterInfo(),
    getHiddenEquipmentTypeIds(),
  ]);

  const supervisorCondition: Record<string, unknown> = {};
  if (supervisorFilter?.shouldFilterBySupervisor) {
    supervisorCondition.maintenance_requests = {
      supervisor_id: supervisorFilter.userId,
    };
  }

  // Tipos de equipamiento ocultos para el usuario actual (ticket 690)
  const equipmentCondition = visibleEquipmentTypeCondition(hiddenTypeIds);

  const baseWhere = {
    status: 'date_confirmed' as const,
    // Vehiculo o equipamiento (ticket 596), dentro de AND para no chocar con el OR de busqueda
    AND: [resourceCompanyCondition(companyId), ...(equipmentCondition ? [equipmentCondition] : [])],
    ...supervisorCondition,
  };

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
    return buildBaseWhere(companyId, modified, hiddenTypeIds);
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
      case 'vehicle': {
        const where = await crossWhere('vehicle');
        const vehicleCounts = await prisma.maintenance_orders.groupBy({
          by: ['equipment_id'],
          where,
          _count: true,
        });

        const vehicleIds = vehicleCounts.map((r) => r.equipment_id).filter(Boolean) as string[];
        const vehicles =
          vehicleIds.length > 0
            ? await prisma.vehicles.findMany({
                where: { id: { in: vehicleIds } },
                select: { id: true, domain: true, serie: true, intern_number: true },
              })
            : [];

        return {
          counts: toFacetMap(vehicleCounts.map((r) => ({ key: r.equipment_id, count: r._count }))),
          resolvedOptions: vehicles.map((v) => ({
            id: v.id,
            name: v.intern_number
              ? `${v.domain ?? v.serie ?? 'Sin identificar'} (#${v.intern_number})`
              : v.domain ?? v.serie ?? 'Sin identificar',
          })),
        };
      }

      case 'condition': {
        const where = await crossWhere('condition');
        // Ticket 596: el pedido es de un vehículo O de un equipamiento (nunca los
        // dos) y la condición sale del recurso que corresponda (mismo enum
        // condition_enum en ambos, ver maintenance-resource.ts). El filtro
        // server-side ahora matchea contra ambos recursos (OR), así que el facet
        // agrupa en memoria (universo chico: órdenes confirmadas) por la condición
        // del recurso real de cada orden, para que la suma de los counts coincida
        // con el total de filas cuando no hay otros filtros activos.
        const orders = await prisma.maintenance_orders.findMany({
          where,
          select: {
            vehicles: { select: { condition: true } },
            other_equipment: { select: { condition: true } },
          },
        });

        // toFacetMap asigna (no suma) por key: se agrupa antes, una entrada por condición
        const countsByCondition = new Map<string | null, number>();
        for (const order of orders) {
          const condition = order.other_equipment ? order.other_equipment.condition : order.vehicles?.condition ?? null;
          countsByCondition.set(condition, (countsByCondition.get(condition) ?? 0) + 1);
        }

        return {
          counts: toFacetMap([...countsByCondition].map(([key, count]) => ({ key, count }))),
        };
      }

      case 'source': {
        const where = await crossWhere('source');
        // source está en maintenance_requests — agrupamos via la relación
        const sourceCounts = await prisma.maintenance_requests.groupBy({
          by: ['source'],
          where: {
            maintenance_orders: {
              some: where,
            },
          },
          _count: true,
        });

        return { counts: toFacetMap(sourceCounts.map((r) => ({ key: r.source as string | null, count: r._count }))) };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facet individual de pedidos confirmados', { data: { error, columnId } });
    return null;
  }
}
