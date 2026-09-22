'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('Equipos/vehicle-operations-actions');

/**
 * Historial de ordenes de mantenimiento de un equipo, con el detalle completo de items,
 * sectores, OTs y su progreso. Acotado a la empresa activa (`maintenance_orders.company_id`).
 */
export async function getMaintenanceOrdersForEquipment(equipmentId: string) {
  const companyId = await getActiveCompanyId();
  try {
    return await prisma.maintenance_orders.findMany({
      where: withCompany({ equipment_id: equipmentId }, companyId),
      select: {
        id: true,
        order_number: true,
        status: true,
        created_at: true,
        workshop_entry_date: true,
        updated_at: true,
        workshop_validated_at: true,
        operations_validated_at: true,
        workshop_validation_notes: true,
        operations_validation_notes: true,
        maintenance_requests: { select: { id: true, source: true, created_at: true } },
        maintenance_order_items: {
          select: {
            id: true,
            description: true,
            is_diagnostico: true,
            sector_sequence_order: true,
            assigned_sector_id: true,
            assigned_workshop_id: true,
            types_of_repairs: { select: { id: true, name: true, autorizable: true } },
            workshop_sectors: { select: { id: true, name: true } },
            workshops: { select: { id: true, name: true, type: true } },
            maintenance_request_items: {
              select: { driver_comment: true, validator_comment: true, description: true },
            },
            work_orders: {
              select: {
                id: true,
                order_number: true,
                status: true,
                started_at: true,
                completed_at: true,
                work_order_items: {
                  select: {
                    id: true,
                    status: true,
                    maintenance_order_item_id: true,
                    work_order_item_repairs: {
                      select: {
                        id: true,
                        status: true,
                        is_diagnostico: true,
                        is_operator_added: true,
                        types_of_repairs: { select: { id: true, name: true, autorizable: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  } catch (error) {
    logger.error('Error al obtener historial de OM del equipo', { data: { error, equipmentId } });
    throw error;
  }
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
  const companyId = await getActiveCompanyId();

  try {
    const requests = await prisma.maintenance_requests.findMany({
      where: withCompany(
        {
          equipment_id: equipmentId,
          OR: [{ status: 'rejected' }, { maintenance_request_items: { some: { status: 'rejected' } } }],
        },
        companyId
      ),
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
