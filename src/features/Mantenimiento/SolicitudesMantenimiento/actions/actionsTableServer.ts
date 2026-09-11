'use server';

import { Logger } from '@/lib/logger';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildTextFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { prisma } from '@/shared/lib/prisma';
import { cache } from 'react';
import { visibleEquipmentTypeCondition } from '../../shared/maintenance-resource';
import { getHiddenEquipmentTypeIds } from '../../utils/equipmentTypeVisibility';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const logger = new Logger('SolicitudesMantenimiento/actionsTableServer');

/**
 * Memoiza getSupervisorFilterInfo dentro del mismo request del servidor.
 * NO se exporta — solo se usa internamente en este módulo. Evita que
 * getMaintenanceRequestsPaginated / getAllMaintenanceRequestsForExport /
 * getMaintenanceRequestSingleFacet repitan las 2 queries de permisos cada una
 * cuando se resuelven en el mismo request (ej: SSR inicial de la página).
 */
const getCachedSupervisorFilterInfo = cache(getSupervisorFilterInfo);

// Columnas de texto filtrable (usan "contains" insensitive)
const TEXT_COLUMNS = ['kilometer', 'engine_hours'];

// Columnas de fecha
const DATE_COLUMNS = ['created_at'];

// Mapa de columnas a campos de Prisma para filtros
// La clave es el columnId del DataTable, el valor es el campo real en Prisma
const COLUMN_MAP: Record<string, string> = {
  status: 'status',
  vehicle: 'equipment_id', // columnId 'vehicle' → campo DB 'equipment_id'
  source: 'source',
  supervisor: 'supervisor_id', // columnId 'supervisor' → campo DB 'supervisor_id'
};

// Campos válidos para ordenamiento (deben existir en el modelo Prisma)
const VALID_SORT_FIELDS = new Set(['created_at', 'status', 'source', 'updated_at', 'kilometer', 'engine_hours']);

// Mapeo de columnas FK/derivadas a orderBy de Prisma con relación
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
  // Cascada de 3 fuentes (driver_employee FK → JSON legacy → employees FK vieja): no hay un
  // orderBy de Prisma que la cubra entera. Se ordena por la fuente canónica hacia adelante
  // (driver_employee, ya que los registros nuevos siempre la traen poblada), igual que ya
  // se hace con `vehicle` sobre `vehicles.domain`. Los registros legacy (sin driver_employee_id)
  // quedan agrupados por el null, comportamiento documentado en la auditoría del ticket 673.
  driver: (dir) => ({ driver_employee: { lastname: dir } }),
  fileNumber: (dir) => ({ driver_employee: { file: dir } }),
  supervisor: (dir) => ({ profile_maintenance_requests_supervisor_idToprofile: { fullname: dir } }),
  items_count: (dir) => ({ maintenance_request_items: { _count: dir } }),
};

// Select del vehículo/equipamiento asociado a la solicitud (excluyentes: equipment_id XOR other_equipment_id)
const VEHICLE_SELECT = {
  id: true,
  domain: true,
  serie: true,
  intern_number: true,
} as const;

const OTHER_EQUIPMENT_SELECT = {
  id: true,
  intern_number: true,
  serial_number: true,
  type: { select: { name: true } },
} as const;

/**
 * Construye el where base para consultas, aplicando filtros de supervisor si corresponde.
 * Recibe filterInfo pre-cargado para evitar múltiples llamadas a getSupervisorFilterInfo.
 */
function buildWhereClauseSync(
  state: ReturnType<typeof parseSearchParams>,
  filterInfo: Awaited<ReturnType<typeof getSupervisorFilterInfo>>,
  hiddenTypeIds: readonly string[]
) {
  // Filtros facetados
  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [...TEXT_COLUMNS, ...DATE_COLUMNS, 'fileNumber'],
  });

  // Filtros de texto (kilometer, engine_hours — "contains" insensitive)
  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);

  // Filtros de rango de fechas
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_COLUMNS, {
    created_at: 'created_at',
  });

  // Legajo del chofer — coincidencia EXACTA (no "contains"), busca en las dos fuentes de FK
  // posibles (driver_employee nuevo, employees viejo). El chofer legacy vía JSON no tiene
  // legajo asociado y no es filtrable por este campo.
  const fileNumberValue = state.filters.fileNumber?.[0];
  const fileNumberCondition = fileNumberValue
    ? { OR: [{ driver_employee: { file: fileNumberValue } }, { employees: { file: fileNumberValue } }] }
    : null;

  // Tipos de equipamiento ocultos para el usuario actual (ticket 690). Igual que
  // fileNumberCondition, produce un OR: va dentro del AND, nunca spreadeado en la raíz.
  const equipmentCondition = visibleEquipmentTypeCondition(hiddenTypeIds);

  const andConditions: Record<string, unknown>[] = [];
  if (fileNumberCondition) andConditions.push(fileNumberCondition);
  if (equipmentCondition) andConditions.push(equipmentCondition);

  const baseWhere: Record<string, unknown> = {
    // Solo solicitudes pendientes de aprobación (paso "Validar Solicitud").
    // Las rechazadas se limpian de este listado: quedan como registro histórico
    // en el legajo del equipo, tab "Historial de Mantenimiento".
    status: 'pending_approval',
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };

  // Aplicar filtro de supervisor si corresponde
  if (filterInfo?.shouldFilterBySupervisor) {
    return {
      ...baseWhere,
      supervisor_id: filterInfo.userId,
    };
  }

  return baseWhere;
}

/**
 * Obtiene solicitudes de mantenimiento paginadas para el DataTable.
 * Incluye información de maintenance_orders para mostrar el estado del pedido.
 */
export async function getMaintenanceRequestsPaginated(searchParams: DataTableSearchParams) {
  logger.debug('Obteniendo solicitudes de mantenimiento paginadas', { data: { searchParams } });

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    const [filterInfo, hiddenTypeIds] = await Promise.all([
      getCachedSupervisorFilterInfo(),
      getHiddenEquipmentTypeIds(),
    ]);
    const where = buildWhereClauseSync(state, filterInfo, hiddenTypeIds);

    // Resolver ordenamiento con validación y soporte de FK/relaciones derivadas
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
      const fkMapper = FK_SORT_MAP[s.id];
      if (fkMapper) {
        resolvedSorts.push(fkMapper(dir));
      } else if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: dir });
      }
    }
    const orderBy = resolvedSorts.length > 0 ? resolvedSorts : [{ created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.maintenance_requests.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          status: true,
          created_at: true,
          source: true,
          preventive_type: true,
          kilometer: true,
          engine_hours: true,
          supervisor_id: true,
          rejection_reason: true,
          vehicles: { select: VEHICLE_SELECT },
          other_equipment: { select: OTHER_EQUIPMENT_SELECT },
          employees: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              file: true,
            },
          },
          driver_employee: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              file: true,
            },
          },
          profile_maintenance_requests_supervisor_idToprofile: {
            select: {
              id: true,
              fullname: true,
            },
          },
          checklist_answers: {
            select: {
              id: true,
              answer_data: true,
            },
          },
          maintenance_request_items: {
            select: {
              id: true,
              status: true,
            },
          },
          maintenance_orders: {
            select: {
              id: true,
              status: true,
              scheduled_date: true,
            },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.maintenance_requests.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener solicitudes de mantenimiento paginadas', { data: { error } });
    throw error;
  }
}

export type MaintenanceRequestListData = Awaited<ReturnType<typeof getMaintenanceRequestsPaginated>>['data'];
export type MaintenanceRequestListItem = MaintenanceRequestListData[number];

/**
 * Obtiene todas las solicitudes de mantenimiento para exportar a Excel (sin paginación).
 */
export async function getAllMaintenanceRequestsForExport(searchParams: DataTableSearchParams) {
  logger.debug('Exportando solicitudes de mantenimiento');

  try {
    const state = parseSearchParams(searchParams);
    const [filterInfo, hiddenTypeIds] = await Promise.all([
      getCachedSupervisorFilterInfo(),
      getHiddenEquipmentTypeIds(),
    ]);
    const where = buildWhereClauseSync(state, filterInfo, hiddenTypeIds);

    const data = await prisma.maintenance_requests.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        status: true,
        created_at: true,
        source: true,
        preventive_type: true,
        kilometer: true,
        engine_hours: true,
        rejection_reason: true,
        supervisor_id: true,
        vehicles: { select: VEHICLE_SELECT },
        other_equipment: { select: OTHER_EQUIPMENT_SELECT },
        employees: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            file: true,
          },
        },
        driver_employee: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            file: true,
          },
        },
        profile_maintenance_requests_supervisor_idToprofile: {
          select: {
            id: true,
            fullname: true,
          },
        },
        checklist_answers: {
          select: {
            id: true,
            answer_data: true,
          },
        },
        maintenance_request_items: {
          select: {
            id: true,
            status: true,
          },
        },
        maintenance_orders: {
          select: {
            id: true,
            status: true,
            scheduled_date: true,
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar solicitudes de mantenimiento', { data: { error } });
    throw error;
  }
}

/**
 * Obtiene el facet (opciones + counts) de UNA sola columna, bajo demanda (lazy-load).
 * Implementa cross-filtering: excluye el filtro propio de la columna consultada.
 */
export async function getMaintenanceRequestSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  logger.debug('Obteniendo facet individual de solicitudes de mantenimiento', { data: { columnId } });

  try {
    const state = parseSearchParams(searchParams || {});
    const [filterInfo, hiddenTypeIds] = await Promise.all([
      getCachedSupervisorFilterInfo(),
      getHiddenEquipmentTypeIds(),
    ]);

    function crossWhere(excludeColumn: string) {
      const filteredFilters = { ...state.filters };
      delete filteredFilters[excludeColumn];
      const crossState = { ...state, filters: filteredFilters };
      return buildWhereClauseSync(crossState, filterInfo, hiddenTypeIds);
    }

    function toFacetMap(rows: { key: string | null | undefined; count: number }[]): Map<string, number> {
      const map = new Map<string, number>();
      for (const { key, count } of rows) {
        const mapKey = key ?? NULL_FILTER_VALUE;
        map.set(mapKey, (map.get(mapKey) ?? 0) + count);
      }
      return map;
    }

    const where = crossWhere(columnId);

    switch (columnId) {
      case 'status': {
        const rows = await prisma.maintenance_requests.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        });
        return { counts: toFacetMap(rows.map((r) => ({ key: r.status, count: r._count.status }))) };
      }

      case 'source': {
        const rows = await prisma.maintenance_requests.groupBy({
          by: ['source'],
          where,
          _count: { source: true },
        });
        return { counts: toFacetMap(rows.map((r) => ({ key: r.source, count: r._count.source }))) };
      }

      case 'vehicle': {
        const rows = await prisma.maintenance_requests.groupBy({
          by: ['equipment_id'],
          where,
          _count: { equipment_id: true },
        });
        const counts = toFacetMap(rows.map((r) => ({ key: r.equipment_id, count: r._count.equipment_id })));
        const ids = rows.map((r) => r.equipment_id).filter((id): id is string => Boolean(id));
        const vehicles =
          ids.length > 0
            ? await prisma.vehicles.findMany({
                where: { id: { in: ids } },
                select: VEHICLE_SELECT,
              })
            : [];
        const resolvedOptions = vehicles.map((v) => ({
          id: v.id,
          name: v.intern_number
            ? `${v.domain || v.serie || 'Sin identificar'} (#${v.intern_number})`
            : v.domain || v.serie || 'Sin identificar',
        }));
        return { counts, resolvedOptions };
      }

      case 'supervisor': {
        const rows = await prisma.maintenance_requests.groupBy({
          by: ['supervisor_id'],
          where,
          _count: { supervisor_id: true },
        });
        const counts = toFacetMap(rows.map((r) => ({ key: r.supervisor_id, count: r._count.supervisor_id })));
        const ids = rows.map((r) => r.supervisor_id).filter((id): id is string => Boolean(id));
        const profiles =
          ids.length > 0
            ? await prisma.profile.findMany({
                where: { id: { in: ids } },
                select: { id: true, fullname: true },
              })
            : [];
        return { counts, resolvedOptions: profiles.map((p) => ({ id: p.id, name: p.fullname })) };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facet individual de solicitudes de mantenimiento', {
      data: { error, columnId },
    });
    throw error;
  }
}
