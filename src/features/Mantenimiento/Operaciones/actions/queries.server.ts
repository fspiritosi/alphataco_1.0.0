'use server';

import { Logger } from '@/lib/logger';
import { CACHE_TAGS, CACHE_TTL } from '@/shared/constants/cache';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { cacheLife, cacheTag } from 'next/cache';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';
import { MAINTENANCE_ORDER_ITEMS_INCLUDE, getRequestItemComments } from './operations-select';

const serverLogger = new Logger('Operaciones/queries');

/**
 * Obtiene las operaciones planificadas (pedidos con status 'scheduled')
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con rol de sistema: ven TODAS las operaciones
 * - Usuarios sin rol de sistema: solo ven operaciones cuya solicitud tiene supervisor_id = su user_id
 */
export async function getMaintenanceOperations() {
  // Obtener información del filtro de supervisor
  const filterInfo = await getSupervisorFilterInfo();
  // Perímetro: sin RLS, el listado se acota SIEMPRE a la empresa activa.
  const companyId = await getActiveCompanyId();

  try {
    const data = await prisma.maintenance_orders.findMany({
      where: withCompany({
        status: 'scheduled',
        // !inner en Supabase → maintenance_requests NOT NULL
        maintenance_request_id: { not: null },
        ...(filterInfo?.shouldFilterBySupervisor
          ? {
              maintenance_requests: {
                supervisor_id: filterInfo.userId,
              },
            }
          : {}),
      }, companyId),
      select: {
        id: true,
        maintenance_request_id: true,
        equipment_id: true,
        status: true,
        scheduled_date: true,
        scheduled_by: true,
        scheduled_at: true,
        rejection_reason: true,
        rejected_by: true,
        rejected_at: true,
        workshop_entry_date: true,
        workshop_approved_by: true,
        kilometer_at_entry: true,
        engine_hours_at_entry: true,
        created_at: true,
        updated_at: true,
        date_approved_at: true,
        date_approved_by: true,
        date_rejected_at: true,
        date_rejected_by: true,
        date_rejection_reason: true,
        source: true,
        order_number: true,
        workshop_validated_at: true,
        workshop_validation_notes: true,
        operations_validated_by: true,
        operations_validated_at: true,
        operations_validation_notes: true,
        vehicles: {
          select: {
            id: true,
            domain: true,
            serie: true,
            intern_number: true,
            condition: true,
            kilometer: true,
            engine_hours: true,
          },
        },
        maintenance_requests: {
          select: {
            id: true,
            kilometer: true,
            engine_hours: true,
            created_at: true,
            supervisor_id: true,
            source: true,
            preventive_type: true,
            profile_maintenance_requests_supervisor_idToprofile: {
              select: { id: true, fullname: true },
            },
          },
        },
        maintenance_order_items: {
          include: MAINTENANCE_ORDER_ITEMS_INCLUDE,
        },
      },
      orderBy: { scheduled_date: 'asc' },
    });

    return data;
  } catch (error) {
    serverLogger.error('Error al obtener operaciones', { data: { error } });
    throw error;
  }
}

export type MaintenanceOperationsData = Awaited<ReturnType<typeof getMaintenanceOperations>>;
export type MaintenanceOperationData = MaintenanceOperationsData[number];

/**
 * Obtiene los pedidos con fecha confirmada (date_confirmed) y los que ya están en taller (in_workshop)
 * Para que el usuario tenga visibilidad de todos los equipos en taller
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con rol de sistema: ven TODOS los pedidos
 * - Usuarios sin rol de sistema: solo ven pedidos cuya solicitud tiene supervisor_id = su user_id
 */
export async function getOrdersForWorkshop() {
  // Obtener información del filtro de supervisor
  const filterInfo = await getSupervisorFilterInfo();
  // Perímetro: sin RLS, el listado se acota SIEMPRE a la empresa activa.
  const companyId = await getActiveCompanyId();

  try {
    const data = await prisma.maintenance_orders.findMany({
      where: withCompany({
        status: 'date_confirmed',
        // !inner en Supabase → maintenance_requests NOT NULL
        maintenance_request_id: { not: null },
        ...(filterInfo?.shouldFilterBySupervisor
          ? {
              maintenance_requests: {
                supervisor_id: filterInfo.userId,
              },
            }
          : {}),
      }, companyId),
      select: {
        id: true,
        maintenance_request_id: true,
        equipment_id: true,
        status: true,
        scheduled_date: true,
        scheduled_by: true,
        scheduled_at: true,
        rejection_reason: true,
        rejected_by: true,
        rejected_at: true,
        workshop_entry_date: true,
        workshop_approved_by: true,
        kilometer_at_entry: true,
        engine_hours_at_entry: true,
        created_at: true,
        updated_at: true,
        date_approved_at: true,
        date_approved_by: true,
        date_rejected_at: true,
        date_rejected_by: true,
        date_rejection_reason: true,
        source: true,
        order_number: true,
        workshop_validated_at: true,
        workshop_validation_notes: true,
        operations_validated_by: true,
        operations_validated_at: true,
        operations_validation_notes: true,
        vehicles: {
          select: {
            id: true,
            domain: true,
            serie: true,
            intern_number: true,
            condition: true,
            kilometer: true,
            engine_hours: true,
          },
        },
        maintenance_requests: {
          select: {
            id: true,
            kilometer: true,
            engine_hours: true,
            created_at: true,
            supervisor_id: true,
            source: true,
            preventive_type: true,
            profile_maintenance_requests_supervisor_idToprofile: {
              select: { id: true, fullname: true },
            },
          },
        },
        maintenance_order_items: {
          include: MAINTENANCE_ORDER_ITEMS_INCLUDE,
        },
      },
      orderBy: { scheduled_date: 'asc' },
    });

    return data;
  } catch (error) {
    serverLogger.error('Error al obtener pedidos para taller', { data: { error } });
    throw error;
  }
}

export type OrdersForWorkshopData = Awaited<ReturnType<typeof getOrdersForWorkshop>>;
export type OrderForWorkshopData = OrdersForWorkshopData[number];
