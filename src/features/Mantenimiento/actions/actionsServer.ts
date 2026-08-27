'use server';

import type { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { INVALIDATION_MAP } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import { getSupervisorFilterInfo } from '../utils/supervisorFilter';

const serverLogger = new Logger('Mantenimiento/actions');

// ─── Include reutilizable para items de órdenes de mantenimiento ───────────────

const MAINTENANCE_ORDER_ITEMS_INCLUDE = {
  maintenance_request_items: {
    include: {
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
    include: {
      types_of_repairs: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

// ─── Selects de vehículo ───────────────────────────────────────────────────────

const VEHICLE_SELECT_WITH_TYPE = {
  id: true,
  domain: true,
  serie: true,
  intern_number: true,
  condition: true,
  // Relación FK: campo "type" → tabla "type" con alias de relación "vehicles_typeTotype"
  type_vehicles_typeTotype: {
    select: { id: true, name: true },
  },
} as const;

// ─── Select de maintenance_request para filtros de supervisor ──────────────────

const MAINTENANCE_REQUEST_SELECT = {
  id: true,
  kilometer: true,
  engine_hours: true,
  created_at: true,
  supervisor_id: true,
  source: true,
  profile_maintenance_requests_supervisor_idToprofile: {
    select: { id: true, fullname: true },
  },
} as const;

// ─── Construcción de where con filtro de supervisor ───────────────────────────

function buildSupervisorWhere(
  filterInfo: Awaited<ReturnType<typeof getSupervisorFilterInfo>>,
  extraWhere: Prisma.maintenance_ordersWhereInput = {}
): Prisma.maintenance_ordersWhereInput {
  const where: Prisma.maintenance_ordersWhereInput = { ...extraWhere };

  if (filterInfo?.shouldFilterBySupervisor) {
    // Equivalente a !inner + eq supervisor_id en Supabase:
    // Filtrar órdenes donde la maintenance_request tenga supervisor_id = userId del perfil
    // (Prisma excluye implícitamente las órdenes sin maintenance_request al filtrar por campo del relacionado)
    where.maintenance_requests = {
      supervisor_id: filterInfo.userId,
    };
  }

  return where;
}

// ─── READs ────────────────────────────────────────────────────────────────────

/**
 * Obtiene los pedidos de mantenimiento que están en el taller (in_workshop)
 * Para la vista de Planificación
 * Incluye información de órdenes de trabajo asociadas
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con permiso view_all_requests: ven TODOS los pedidos
 * - Usuarios sin el permiso: solo ven pedidos cuya solicitud tiene supervisor_id = su user_id
 */
export async function getMaintenanceOrdersInWorkshop() {
  const filterInfo = await getSupervisorFilterInfo();
  const where = buildSupervisorWhere(filterInfo, { status: 'in_workshop' });

  try {
    const orders = await prisma.maintenance_orders.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        vehicles: {
          select: {
            ...VEHICLE_SELECT_WITH_TYPE,
            // work_orders también usa workshops/workshop_sectors vía items
          },
        },
        maintenance_requests: {
          select: MAINTENANCE_REQUEST_SELECT,
        },
        maintenance_order_items: {
          include: {
            ...MAINTENANCE_ORDER_ITEMS_INCLUDE,
            work_orders: {
              select: {
                id: true,
                order_number: true,
                status: true,
                priority: true,
                workshop_id: true,
                sector_id: true,
                workshops: { select: { id: true, name: true } },
                workshop_sectors: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return orders;
  } catch (error) {
    serverLogger.error('Error al obtener pedidos en taller', { data: { error } });
    throw error;
  }
}

export type MaintenanceOrdersInWorkshopData = Awaited<ReturnType<typeof getMaintenanceOrdersInWorkshop>>;
export type MaintenanceOrderInWorkshopData = MaintenanceOrdersInWorkshopData[number];

/**
 * Obtiene los pedidos de mantenimiento pendientes de aprobación de fecha
 * y los ya confirmados para la vista de Pendientes de Ejecutar
 *
 * Estados incluidos:
 * - 'scheduled': Pendientes de aprobación (pueden aprobar/rechazar)
 * - 'date_confirmed': Ya confirmados (solo visualización)
 *
 * Ordenamiento: scheduled primero, luego date_confirmed, ambos por fecha ascendente
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con permiso view_all_requests: ven TODOS los pedidos
 * - Usuarios sin el permiso: solo ven pedidos cuya solicitud tiene supervisor_id = su user_id
 */
export async function getMaintenanceOrdersPendingApproval() {
  const filterInfo = await getSupervisorFilterInfo();
  const where = buildSupervisorWhere(filterInfo, {
    status: { in: ['scheduled', 'date_confirmed'] },
  });

  try {
    const orders = await prisma.maintenance_orders.findMany({
      where,
      orderBy: [
        { status: 'desc' }, // 'scheduled' (s) antes que 'date_confirmed' (d) — desc alfabéticamente
        { scheduled_date: 'asc' },
      ],
      include: {
        vehicles: {
          select: VEHICLE_SELECT_WITH_TYPE,
        },
        maintenance_requests: {
          select: MAINTENANCE_REQUEST_SELECT,
        },
        maintenance_order_items: {
          include: MAINTENANCE_ORDER_ITEMS_INCLUDE,
        },
      },
    });

    return orders;
  } catch (error) {
    serverLogger.error('Error al obtener pedidos pendientes de aprobación', { data: { error } });
    throw error;
  }
}

export type MaintenanceOrdersPendingApprovalData = Awaited<ReturnType<typeof getMaintenanceOrdersPendingApproval>>;
export type MaintenanceOrderPendingApprovalData = MaintenanceOrdersPendingApprovalData[number];

/**
 * Obtiene los pedidos de mantenimiento con fecha confirmada
 * Listos para aprobar entrada al taller (vista "Para Taller" de Operaciones)
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con permiso view_all_requests: ven TODOS los pedidos
 * - Usuarios sin el permiso: solo ven pedidos cuya solicitud tiene supervisor_id = su user_id
 */
export async function getMaintenanceOrdersDateConfirmed() {
  const filterInfo = await getSupervisorFilterInfo();
  const where = buildSupervisorWhere(filterInfo, { status: 'date_confirmed' });

  try {
    const orders = await prisma.maintenance_orders.findMany({
      where,
      orderBy: { scheduled_date: 'asc' },
      include: {
        vehicles: {
          select: {
            ...VEHICLE_SELECT_WITH_TYPE,
            type: true,
            kilometer: true,
          },
        },
        maintenance_requests: {
          select: MAINTENANCE_REQUEST_SELECT,
        },
        maintenance_order_items: {
          include: MAINTENANCE_ORDER_ITEMS_INCLUDE,
        },
      },
    });

    return orders;
  } catch (error) {
    serverLogger.error('Error al obtener pedidos con fecha confirmada', { data: { error } });
    throw error;
  }
}

export type MaintenanceOrdersDateConfirmedData = Awaited<ReturnType<typeof getMaintenanceOrdersDateConfirmed>>;
export type MaintenanceOrderDateConfirmedItem = MaintenanceOrdersDateConfirmedData[number];

// ─── WRITEs ───────────────────────────────────────────────────────────────────
//
// Las acciones approveMaintenanceOrderDate y rejectMaintenanceOrderDate fueron
// eliminadas: la fecha que programa el taller es directamente la fecha de
// reparacion y ya no requiere aprobacion de Operaciones.
