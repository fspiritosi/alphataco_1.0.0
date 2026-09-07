'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('Equipos/vehicle-operations-actions');

/**
 * Obtiene el historial de ordenes de mantenimiento de un equipo,
 * incluyendo el detalle completo de items, sectores, OTs y su progreso.
 */
export async function getMaintenanceOrdersForEquipment(equipmentId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('maintenance_orders')
    .select(
      `
      id, order_number, status, created_at, workshop_entry_date, updated_at,
      workshop_validated_at, operations_validated_at,
      workshop_validation_notes, operations_validation_notes,
      maintenance_requests(id, source, created_at),
      maintenance_order_items(
        id, description, is_diagnostico, sector_sequence_order, assigned_sector_id,
        assigned_workshop_id,
        types_of_repairs(id, name, autorizable),
        workshop_sectors(id, name),
        workshops(id, name, type),
        maintenance_request_items:maintenance_request_item_id(
          driver_comment, validator_comment, description
        ),
        work_orders(
          id, order_number, status, started_at, completed_at,
          work_order_items(
            id, status, maintenance_order_item_id,
            work_order_item_repairs(id, status, is_diagnostico, is_operator_added,
              types_of_repairs(id, name, autorizable)
            )
          )
        )
      )
    `
    )
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error al obtener historial de OM del equipo', { data: { error, equipmentId } });
    throw error;
  }

  return data || [];
}

export type EquipmentMaintenanceOrders = Awaited<ReturnType<typeof getMaintenanceOrdersForEquipment>>;
export type EquipmentMaintenanceOrder = EquipmentMaintenanceOrders[number];

/**
 * Obtiene las solicitudes de mantenimiento RECHAZADAS de un equipo.
 *
 * Incluye dos casos, porque el rechazo puede ser total o parcial:
 * 1. Solicitudes rechazadas por completo (maintenance_requests.status = 'rejected')
 * 2. Solicitudes aprobadas que tienen al menos un item rechazado
 *    (maintenance_request_items.status = 'rejected') — el caso mas frecuente
 *
 * Estas solicitudes no generan orden de mantenimiento, por eso no aparecen en el
 * historial de ordenes: este es el unico lugar del sistema donde quedan registradas.
 */
export async function getRejectedRequestsForEquipment(equipmentId: string) {
  logger.debug('Obteniendo solicitudes rechazadas del equipo', { data: { equipmentId } });

  try {
    const requests = await prisma.maintenance_requests.findMany({
      where: {
        equipment_id: equipmentId,
        OR: [{ status: 'rejected' }, { maintenance_request_items: { some: { status: 'rejected' } } }],
      },
      select: {
        id: true,
        status: true,
        created_at: true,
        rejected_at: true,
        rejection_reason: true,
        source: true,
        description: true,
        preventive_type: true,
        profile_maintenance_requests_rejected_byToprofile: {
          select: { id: true, fullname: true },
        },
        profile_maintenance_requests_supervisor_idToprofile: {
          select: { id: true, fullname: true },
        },
        // Solo los items rechazados: son los que interesan en esta vista
        maintenance_request_items: {
          where: { status: 'rejected' },
          select: {
            id: true,
            rejection_reason: true,
            validator_comment: true,
            description: true,
            types_of_repairs: { select: { id: true, name: true } },
            checklist_deviations: { select: { id: true, item_label: true, item_code: true } },
          },
        },
      },
      orderBy: [{ rejected_at: 'desc' }, { created_at: 'desc' }],
    });

    return requests;
  } catch (error) {
    logger.error('Error al obtener solicitudes rechazadas del equipo', { data: { error, equipmentId } });
    throw error;
  }
}

export type EquipmentRejectedRequests = Awaited<ReturnType<typeof getRejectedRequestsForEquipment>>;
export type EquipmentRejectedRequest = EquipmentRejectedRequests[number];
