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
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const logger = new Logger('SolicitudesMantenimiento/actionsTableServer');

// Columnas de texto filtrable
const TEXT_COLUMNS: string[] = [];

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
const VALID_SORT_FIELDS = new Set(['created_at', 'status', 'source', 'updated_at']);

// Mapeo de columnas FK a orderBy de Prisma con relación
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
};

/**
 * Construye el where base para consultas, aplicando filtros de supervisor si corresponde.
 * Recibe filterInfo pre-cargado para evitar múltiples llamadas a getSupervisorFilterInfo.
 */
function buildWhereClauseSync(
  state: ReturnType<typeof parseSearchParams>,
  filterInfo: Awaited<ReturnType<typeof getSupervisorFilterInfo>>
) {
  // Filtros facetados
  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [...TEXT_COLUMNS, ...DATE_COLUMNS],
  });

  // Filtros de texto
  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);

  // Filtros de rango de fechas
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_COLUMNS, {
    created_at: 'created_at',
  });

  const baseWhere = {
    // Solo solicitudes pendientes de aprobación (paso "Validar Solicitud").
    // Las rechazadas se limpian de este listado: quedan como registro histórico
    // en el legajo del equipo, tab "Historial de Mantenimiento".
    status: 'pending_approval',
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
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

    const filterInfo = await getSupervisorFilterInfo();
    const where = buildWhereClauseSync(state, filterInfo);

    // Resolver ordenamiento con validación y soporte de FK
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      } else if (FK_SORT_MAP[s.id]) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        resolvedSorts.push(FK_SORT_MAP[s.id](dir));
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
          vehicles: {
            select: {
              id: true,
              domain: true,
              serie: true,
              intern_number: true,
            },
          },
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
    const filterInfo = await getSupervisorFilterInfo();
    const where = buildWhereClauseSync(state, filterInfo);

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
        vehicles: {
          select: {
            id: true,
            domain: true,
            serie: true,
            intern_number: true,
          },
        },
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
 * Construye el where para cross-filtering de facets.
 * Excluye la columna propia para mostrar counts correctos con filtros activos.
 */
function buildCrossWhere(
  state: ReturnType<typeof parseSearchParams>,
  excludeColumn: string,
  filterInfo: Awaited<ReturnType<typeof getSupervisorFilterInfo>>
) {
  const filteredFilters = { ...state.filters };
  delete filteredFilters[excludeColumn];

  const crossState = { ...state, filters: filteredFilters };
  return buildWhereClauseSync(crossState, filterInfo);
}

/**
 * Obtiene los facets (counts por valor) para los filtros del DataTable.
 * Implementa cross-filtering: cada groupBy excluye su propio filtro.
 */
export async function getMaintenanceRequestFacets(searchParams?: DataTableSearchParams) {
  logger.debug('Obteniendo facets de solicitudes de mantenimiento');

  try {
    const state = parseSearchParams(searchParams || {});

    // Cargar filterInfo una sola vez y reutilizarlo
    const filterInfo = await getSupervisorFilterInfo();

    // Construir cross-where para cada facet (excluye su propia columna)
    // El excludeColumn debe coincidir con el columnId de la URL (no el campo de BD)
    const crossWhereForStatus = buildCrossWhere(state, 'status', filterInfo);
    const crossWhereForVehicle = buildCrossWhere(state, 'vehicle', filterInfo);
    const crossWhereForSource = buildCrossWhere(state, 'source', filterInfo);
    const crossWhereForSupervisor = buildCrossWhere(state, 'supervisor', filterInfo);

    const [statusGroups, vehicleGroups, sourceGroups, supervisorGroups] = await Promise.all([
      // Status facet
      prisma.maintenance_requests.groupBy({
        by: ['status'],
        where: crossWhereForStatus,
        _count: { status: true },
      }),
      // Vehicle facet
      prisma.maintenance_requests.groupBy({
        by: ['equipment_id'],
        where: crossWhereForVehicle,
        _count: { equipment_id: true },
      }),
      // Source facet
      prisma.maintenance_requests.groupBy({
        by: ['source'],
        where: crossWhereForSource,
        _count: { source: true },
      }),
      // Supervisor facet
      prisma.maintenance_requests.groupBy({
        by: ['supervisor_id'],
        where: crossWhereForSupervisor,
        _count: { supervisor_id: true },
      }),
    ]);

    // Resolver nombres de vehículos
    const vehicleIds = vehicleGroups.map((g) => g.equipment_id).filter(Boolean) as string[];

    const vehicles =
      vehicleIds.length > 0
        ? await prisma.vehicles.findMany({
            where: { id: { in: vehicleIds } },
            select: { id: true, domain: true, serie: true, intern_number: true },
          })
        : [];

    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

    // Resolver nombres de supervisores
    const supervisorIds = supervisorGroups.map((g) => g.supervisor_id).filter(Boolean) as string[];

    const supervisorProfiles =
      supervisorIds.length > 0
        ? await prisma.profile.findMany({
            where: { id: { in: supervisorIds } },
            select: { id: true, fullname: true },
          })
        : [];

    const supervisorDetailsMap = new Map(supervisorProfiles.map((p) => [p.id, p]));

    // Construir Maps de counts
    const statusMap = new Map<string, number>();
    for (const g of statusGroups) {
      const key = g.status ?? NULL_FILTER_VALUE;
      statusMap.set(key, g._count.status);
    }

    const vehicleCountMap = new Map<string, number>();
    for (const g of vehicleGroups) {
      const key = g.equipment_id ?? NULL_FILTER_VALUE;
      vehicleCountMap.set(key, g._count.equipment_id);
    }

    const sourceMap = new Map<string, number>();
    for (const g of sourceGroups) {
      const key = g.source ?? NULL_FILTER_VALUE;
      sourceMap.set(key, g._count.source);
    }

    const supervisorMap = new Map<string, number>();
    for (const g of supervisorGroups) {
      const key = g.supervisor_id ?? NULL_FILTER_VALUE;
      supervisorMap.set(key, g._count.supervisor_id);
    }

    return {
      status: statusMap,
      vehicles: vehicleCountMap,
      vehicleDetails: vehicleMap,
      source: sourceMap,
      supervisors: supervisorMap,
      supervisorDetails: supervisorDetailsMap,
    };
  } catch (error) {
    logger.error('Error al obtener facets de solicitudes de mantenimiento', { data: { error } });
    throw error;
  }
}

export type MaintenanceRequestFacets = Awaited<ReturnType<typeof getMaintenanceRequestFacets>>;
