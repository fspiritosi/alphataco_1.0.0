'use server';

import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { INVALIDATION_MAP } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import { revalidatePath } from 'next/cache';

const logger = new Logger('MaintenanceOrders/actions');

/**
 * Obtiene ordenes de mantenimiento con items agrupables por sector y secuencia.
 * Cada orden incluye items, sus sectores, tareas de reparacion y progreso.
 */
export async function getMaintenanceOrders(statusFilter?: string | string[]) {
  logger.debug('Obteniendo ordenes de mantenimiento', { data: { statusFilter } });

  // Estados del trabajo en curso. Las completadas quedan fuera del listado por
  // defecto (son la mayoria de los registros y ya se consultan desde el legajo
  // del equipo); siguen accesibles eligiendo "Completada" en el filtro de estado,
  // que llega por statusFilter y no pasa por este default.
  const defaultStatuses = [
    'in_workshop',
    'pending_workshop_validation',
    'pending_operations_validation',
    'operations_rejected',
    'workshop_rejected',
  ];

  const statusWhere = Array.isArray(statusFilter)
    ? { status: { in: statusFilter } }
    : statusFilter
      ? { status: statusFilter }
      : { status: { in: defaultStatuses } };

  try {
    const orders = await prisma.maintenance_orders.findMany({
      where: statusWhere,
      orderBy: { created_at: 'desc' },
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
        engine_hours_at_entry: true,
        description: true,
        vehicles: {
          select: {
            id: true,
            domain: true,
            serie: true,
            intern_number: true,
            kilometer: true,
            condition: true,
            type_vehicles_typeTotype: { select: { id: true, name: true } },
          },
        },
        // Ticket 596: la orden puede ser de un equipamiento en vez de un vehículo
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
            kilometer: true,
            created_at: true,
            source: true,
            preventive_type: true,
            supervisor_id: true,
            description: true,
            profile_maintenance_requests_supervisor_idToprofile: {
              select: { id: true, fullname: true },
            },
          },
        },
        maintenance_order_items: {
          select: {
            id: true,
            maintenance_order_id: true,
            maintenance_request_item_id: true,
            repair_type_id: true,
            description: true,
            images: true,
            created_at: true,
            assigned_at: true,
            assigned_by: true,
            assigned_sector_id: true,
            assigned_workshop_id: true,
            planned_end_date: true,
            planned_start_date: true,
            work_order_id: true,
            is_critical: true,
            sector_sequence_order: true,
            is_diagnostico: true,
            workshop_chief_comment: true,
            is_rejected: true,
            rejection_reason: true,
            rejected_by: true,
            rejected_at: true,
            workshop_chief_comment_by: true,
            types_of_repairs: { select: { id: true, name: true, autorizable: true } },
            maintenance_order_item_repair_types: {
              select: { types_of_repairs: { select: { id: true, name: true } } },
            },
            workshop_sectors: { select: { id: true, name: true } },
            workshops: { select: { id: true, name: true, type: true } },
            work_orders: { select: { id: true, order_number: true, status: true, priority: true } },
            profile_maintenance_order_items_rejected_byToprofile: { select: { id: true, fullname: true } },
            profile_maintenance_order_items_workshop_chief_comment_byToprofile: {
              select: { id: true, fullname: true },
            },
            maintenance_request_items: {
              select: {
                driver_comment: true,
                validator_comment: true,
                description: true,
                // Ticket 592: título y fotos de un ítem cargado a mano (sin desvío de checklist)
                free_text: true,
                images: true,
                supervisor_comment: true,
                supervisor_comment_by: true,
                driver_comment_by: true,
                validator_comment_by: true,
                profile_maintenance_request_items_driver_comment_byToprofile: { select: { id: true, fullname: true } },
                profile_maintenance_request_items_validator_comment_byToprofile: {
                  select: { id: true, fullname: true },
                },
                profile_maintenance_request_items_supervisor_comment_byToprofile: {
                  select: { id: true, fullname: true },
                },
                checklist_deviations: { select: { id: true, item_code: true, item_label: true } },
              },
            },
            work_order_items: {
              select: {
                id: true,
                status: true,
                maintenance_order_item_id: true,
                work_order_item_repairs: {
                  select: {
                    id: true,
                    status: true,
                    repair_type_id: true,
                    is_diagnostico: true,
                    is_operator_added: true,
                    technician_notes: true,
                    profile_work_order_item_repairs_technician_notes_byToprofile: {
                      select: { id: true, fullname: true },
                    },
                    types_of_repairs: { select: { id: true, name: true, autorizable: true, criticity: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Mapear alias de relaciones para compatibilidad con componentes
    return orders.map((order) => ({
      ...order,
      vehicles: order.vehicles
        ? {
            id: order.vehicles.id,
            domain: order.vehicles.domain,
            serie: order.vehicles.serie,
            intern_number: order.vehicles.intern_number,
            kilometer: order.vehicles.kilometer,
            condition: order.vehicles.condition,
            vehicle_type: order.vehicles.type_vehicles_typeTotype,
          }
        : null,
      maintenance_order_items: order.maintenance_order_items.map((item) => ({
        ...item,
        rejected_by_profile: item.profile_maintenance_order_items_rejected_byToprofile,
        workshop_chief_comment_profile: item.profile_maintenance_order_items_workshop_chief_comment_byToprofile,
        maintenance_request_items: item.maintenance_request_items
          ? {
              ...item.maintenance_request_items,
              driver_comment_profile:
                item.maintenance_request_items.profile_maintenance_request_items_driver_comment_byToprofile,
              validator_comment_profile:
                item.maintenance_request_items.profile_maintenance_request_items_validator_comment_byToprofile,
              supervisor_comment_profile:
                item.maintenance_request_items.profile_maintenance_request_items_supervisor_comment_byToprofile,
            }
          : null,
        work_orders:
          item.work_order_items.length > 0
            ? {
                id: item.work_order_id,
                order_number: item.work_orders?.order_number ?? null,
                status: item.work_orders?.status ?? null,
                priority: item.work_orders?.priority ?? null,
                work_order_items: item.work_order_items.map((woi) => ({
                  ...woi,
                  work_order_item_repairs: woi.work_order_item_repairs.map((repair) => ({
                    ...repair,
                    technician_notes_profile: repair.profile_work_order_item_repairs_technician_notes_byToprofile,
                  })),
                })),
              }
            : null,
      })),
    }));
  } catch (error) {
    logger.error('Error al obtener ordenes de mantenimiento', { data: { error } });
    throw error;
  }
}

export type MaintenanceOrdersData = Awaited<ReturnType<typeof getMaintenanceOrders>>;
export type MaintenanceOrderData = MaintenanceOrdersData[number];

/**
 * Obtiene el detalle completo de una orden, con items agrupados por sector.
 */
export async function getMaintenanceOrderDetail(orderId: string) {
  logger.debug('Obteniendo detalle de orden de mantenimiento', { data: { orderId } });

  try {
    const order = await prisma.maintenance_orders.findUnique({
      where: { id: orderId },
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
        engine_hours_at_entry: true,
        description: true,
        vehicles: {
          select: {
            id: true,
            domain: true,
            serie: true,
            intern_number: true,
            kilometer: true,
            condition: true,
            type_vehicles_typeTotype: { select: { id: true, name: true } },
          },
        },
        // Ticket 596: la orden puede ser de un equipamiento en vez de un vehículo
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
            kilometer: true,
            created_at: true,
            source: true,
            preventive_type: true,
            supervisor_id: true,
            description: true,
            profile_maintenance_requests_supervisor_idToprofile: {
              select: { id: true, fullname: true },
            },
          },
        },
        maintenance_order_items: {
          select: {
            id: true,
            maintenance_order_id: true,
            maintenance_request_item_id: true,
            repair_type_id: true,
            description: true,
            images: true,
            created_at: true,
            assigned_at: true,
            assigned_by: true,
            assigned_sector_id: true,
            assigned_workshop_id: true,
            planned_end_date: true,
            planned_start_date: true,
            work_order_id: true,
            is_critical: true,
            sector_sequence_order: true,
            is_diagnostico: true,
            workshop_chief_comment: true,
            is_rejected: true,
            rejection_reason: true,
            rejected_by: true,
            rejected_at: true,
            workshop_chief_comment_by: true,
            types_of_repairs: { select: { id: true, name: true, autorizable: true } },
            maintenance_order_item_repair_types: {
              select: { types_of_repairs: { select: { id: true, name: true } } },
            },
            workshop_sectors: { select: { id: true, name: true } },
            workshops: { select: { id: true, name: true, type: true } },
            work_orders: { select: { id: true, order_number: true, status: true, priority: true } },
            profile_maintenance_order_items_rejected_byToprofile: { select: { id: true, fullname: true } },
            profile_maintenance_order_items_workshop_chief_comment_byToprofile: {
              select: { id: true, fullname: true },
            },
            maintenance_request_items: {
              select: {
                driver_comment: true,
                validator_comment: true,
                description: true,
                // Ticket 592: título y fotos de un ítem cargado a mano (sin desvío de checklist)
                free_text: true,
                images: true,
                supervisor_comment: true,
                supervisor_comment_by: true,
                driver_comment_by: true,
                validator_comment_by: true,
                profile_maintenance_request_items_driver_comment_byToprofile: { select: { id: true, fullname: true } },
                profile_maintenance_request_items_validator_comment_byToprofile: {
                  select: { id: true, fullname: true },
                },
                profile_maintenance_request_items_supervisor_comment_byToprofile: {
                  select: { id: true, fullname: true },
                },
                checklist_deviations: { select: { id: true, item_code: true, item_label: true } },
              },
            },
            work_order_items: {
              select: {
                id: true,
                status: true,
                maintenance_order_item_id: true,
                work_order_item_repairs: {
                  select: {
                    id: true,
                    status: true,
                    repair_type_id: true,
                    is_diagnostico: true,
                    is_operator_added: true,
                    rejection_reason: true,
                    technician_notes: true,
                    profile_work_order_item_repairs_technician_notes_byToprofile: {
                      select: { id: true, fullname: true },
                    },
                    types_of_repairs: { select: { id: true, name: true, autorizable: true, criticity: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) return null;

    // Mapear alias de relaciones para compatibilidad con componentes
    return {
      ...order,
      vehicles: order.vehicles
        ? {
            id: order.vehicles.id,
            domain: order.vehicles.domain,
            serie: order.vehicles.serie,
            intern_number: order.vehicles.intern_number,
            kilometer: order.vehicles.kilometer,
            condition: order.vehicles.condition,
            vehicle_type: order.vehicles.type_vehicles_typeTotype,
          }
        : null,
      maintenance_order_items: order.maintenance_order_items.map((item) => ({
        ...item,
        rejected_by_profile: item.profile_maintenance_order_items_rejected_byToprofile,
        workshop_chief_comment_profile: item.profile_maintenance_order_items_workshop_chief_comment_byToprofile,
        maintenance_request_items: item.maintenance_request_items
          ? {
              ...item.maintenance_request_items,
              driver_comment_profile:
                item.maintenance_request_items.profile_maintenance_request_items_driver_comment_byToprofile,
              validator_comment_profile:
                item.maintenance_request_items.profile_maintenance_request_items_validator_comment_byToprofile,
              supervisor_comment_profile:
                item.maintenance_request_items.profile_maintenance_request_items_supervisor_comment_byToprofile,
            }
          : null,
        work_orders:
          item.work_order_items.length > 0
            ? {
                id: item.work_order_id,
                order_number: item.work_orders?.order_number ?? null,
                status: item.work_orders?.status ?? null,
                priority: item.work_orders?.priority ?? null,
                work_order_items: item.work_order_items.map((woi) => ({
                  ...woi,
                  work_order_item_repairs: woi.work_order_item_repairs.map((repair) => ({
                    ...repair,
                    technician_notes_profile: repair.profile_work_order_item_repairs_technician_notes_byToprofile,
                  })),
                })),
              }
            : null,
      })),
    };
  } catch (error) {
    logger.error('Error al obtener detalle de orden', { data: { error, orderId } });
    throw error;
  }
}

export type MaintenanceOrderDetailData = Awaited<ReturnType<typeof getMaintenanceOrderDetail>>;

/**
 * Workshop chief validates order and sends to operations.
 * Also updates the supervisor assigned to the maintenance_request
 * so the correct operations supervisor receives the order for validation.
 */
export async function workshopChiefValidateOrder(orderId: string, notes?: string, operationsSupervisorId?: string) {
  const profile = await requireServerAuthProfile();

  logger.debug('Validando orden por jefe de taller', { data: { orderId, notes, operationsSupervisorId } });

  try {
    await prisma.$transaction(async (tx) => {
      // Actualizar estado de la orden
      await tx.maintenance_orders.update({
        where: { id: orderId },
        data: {
          status: 'pending_operations_validation',
          workshop_approved_by: profile.id,
          workshop_validated_at: new Date(),
          workshop_validation_notes: notes ?? null,
          updated_at: new Date(),
        },
      });

      // Actualizar supervisor de operaciones en la maintenance_request asociada
      if (operationsSupervisorId) {
        const order = await tx.maintenance_orders.findUnique({
          where: { id: orderId },
          select: { maintenance_request_id: true },
        });

        if (order?.maintenance_request_id) {
          await tx.maintenance_requests.update({
            where: { id: order.maintenance_request_id },
            data: { supervisor_id: operationsSupervisorId },
          });
          logger.info('Supervisor de operaciones actualizado en maintenance_request', {
            data: { requestId: order.maintenance_request_id, operationsSupervisorId },
          });
        } else {
          logger.warn('No se pudo obtener maintenance_request_id para actualizar supervisor', {
            data: { orderId },
          });
        }
      }

      // Audit log
      await logActivity(tx, {
        maintenanceOrderId: orderId,
        actionType: ACTIVITY_LOG.WORKSHOP_APPROVED,
        performedBy: profile.id,
        previousStatus: 'pending_workshop_validation',
        newStatus: 'pending_operations_validation',
        notes: notes ?? 'Aprobado por jefe de taller',
      });
    });

    logger.info('Orden validada por jefe de taller', { data: { orderId, notes, operationsSupervisorId } });
    await invalidateCacheTags(INVALIDATION_MAP.workshopChiefValidateOrder);
    revalidatePath('/dashboard/maintenance');
  } catch (error) {
    logger.error('Error al validar orden (workshop chief)', { data: { error, orderId } });
    throw error;
  }
}

/**
 * Workshop chief returns order to workshop (reopens work orders)
 */
export async function workshopChiefReturnOrder(orderId: string, reason: string) {
  const profile = await requireServerAuthProfile();
  logger.debug('Devolviendo orden al taller', { data: { orderId, reason } });

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar estado de la orden a in_workshop
      await tx.maintenance_orders.update({
        where: { id: orderId },
        data: {
          status: 'in_workshop',
          rejection_reason: reason,
          updated_at: new Date(),
        },
      });

      // 2. Buscar y reabrir OTs completadas/completadas parcial asociadas a la OM
      const workOrders = await tx.work_orders.findMany({
        where: {
          maintenance_order_items: {
            some: { maintenance_order_id: orderId },
          },
          status: { in: ['completed', 'completed_partial'] },
        },
        select: { id: true },
      });

      if (workOrders.length > 0) {
        await tx.work_orders.updateMany({
          where: { id: { in: workOrders.map((wo) => wo.id) } },
          data: { status: 'in_progress', updated_at: new Date() },
        });
      }

      await logActivity(tx, {
        maintenanceOrderId: orderId,
        actionType: ACTIVITY_LOG.WORKSHOP_RETURNED_ORDER,
        performedBy: profile.id,
        previousStatus: 'pending_workshop_validation',
        newStatus: 'in_workshop',
        rejectionReason: reason,
        metadata: { reopenedWorkOrderIds: workOrders.map((wo) => wo.id) },
      });
    });

    logger.info('Orden devuelta al taller', { data: { orderId, reason } });
    await invalidateCacheTags(INVALIDATION_MAP.workshopChiefReturnOrder);
    revalidatePath('/dashboard/maintenance');
  } catch (error) {
    logger.error('Error al devolver orden al taller', { data: { error, orderId } });
    throw error;
  }
}

/**
 * Operations validates order and marks as completed
 */
export async function operationsValidateOrder(orderId: string, notes?: string) {
  const profile = await requireServerAuthProfile();

  logger.debug('Validando orden por operaciones', { data: { orderId, notes } });

  try {
    await prisma.$transaction(async (tx) => {
      // Obtener equipment_id antes de actualizar
      const order = await tx.maintenance_orders.findUnique({
        where: { id: orderId },
        select: { equipment_id: true },
      });

      if (!order) {
        throw new Error('Orden no encontrada');
      }

      // Marcar la orden como completada
      await tx.maintenance_orders.update({
        where: { id: orderId },
        data: {
          status: 'completed',
          operations_validated_by: profile.id,
          operations_validated_at: new Date(),
          operations_validation_notes: notes ?? null,
          updated_at: new Date(),
        },
      });

      // Condición del vehículo tras validación final: si el equipo todavía tiene
      // OTRA orden de mantenimiento dentro del taller (status in_workshop), sigue
      // no_operativo; solo vuelve a operativo cuando no le quedan órdenes en taller.
      if (order.equipment_id) {
        const remainingInWorkshop = await tx.maintenance_orders.count({
          where: {
            equipment_id: order.equipment_id,
            status: 'in_workshop',
            id: { not: orderId },
          },
        });
        const nextCondition = remainingInWorkshop > 0 ? 'no_operativo' : 'operativo';
        await tx.vehicles.update({
          where: { id: order.equipment_id },
          data: { condition: nextCondition },
        });
        logger.info('Condición del vehículo actualizada tras validación', {
          data: { equipmentId: order.equipment_id, nextCondition, remainingInWorkshop },
        });
      }

      // Audit log
      await logActivity(tx, {
        maintenanceOrderId: orderId,
        actionType: ACTIVITY_LOG.OPERATIONS_APPROVED,
        performedBy: profile.id,
        previousStatus: 'pending_operations_validation',
        newStatus: 'completed',
        notes: notes ?? 'Aprobado por operaciones - cierre final',
      });
    });

    logger.info('Orden validada por operaciones - cierre final', { data: { orderId, notes } });
    await invalidateCacheTags(INVALIDATION_MAP.operationsValidateOrder);
    revalidatePath('/dashboard/maintenance');
  } catch (error) {
    logger.error('Error al validar orden (operaciones)', { data: { error, orderId } });
    throw error;
  }
}

/**
 * Operations rejects order and sends back to workshop chief (bulk - legacy)
 */
export async function operationsRejectOrder(orderId: string, reason: string) {
  logger.debug('Rechazando orden por operaciones (bulk)', { data: { orderId, reason } });

  try {
    await prisma.maintenance_orders.update({
      where: { id: orderId },
      data: {
        status: 'pending_workshop_validation',
        rejection_reason: reason,
        updated_at: new Date(),
      },
    });

    logger.info('Orden rechazada por operaciones', { data: { orderId, reason } });
    await invalidateCacheTags(INVALIDATION_MAP.operationsRejectOrder);
    revalidatePath('/dashboard/maintenance');
  } catch (error) {
    logger.error('Error al rechazar orden (operaciones)', { data: { error, orderId } });
    throw error;
  }
}

// ============================================================================
// GRANULAR ITEM-LEVEL REJECTION ACTIONS
// ============================================================================

interface RejectionItem {
  repairId: string;
  comment: string;
}

/**
 * Workshop chief rejects specific repair items and sends back to operator.
 * - Sets selected repairs to status='rejected' with rejection_reason
 * - Reopens affected work orders to 'in_progress'
 * - Sets maintenance order back to 'in_workshop'
 * - Logs to maintenance_activity_log with metadata
 */
export async function workshopChiefRejectItems(orderId: string, rejections: RejectionItem[]) {
  const profile = await requireServerAuthProfile();

  if (!rejections.length) throw new Error('Debe seleccionar al menos un item');

  logger.debug('Rechazando items por jefe de taller', { data: { orderId, count: rejections.length } });

  try {
    const repairIds = rejections.map((r) => r.repairId);

    // 1. Obtener detalles de repairs para metadata (nombre, sector)
    const repairDetails = await prisma.work_order_item_repairs.findMany({
      where: { id: { in: repairIds } },
      select: {
        id: true,
        types_of_repairs: { select: { id: true, name: true } },
        work_order_items: {
          select: {
            id: true,
            work_order_id: true,
            maintenance_order_items: {
              select: {
                id: true,
                assigned_sector_id: true,
                workshop_sectors: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    await prisma.$transaction(async (tx) => {
      // 2. Marcar cada repair como rechazado con comentario individual
      for (const rejection of rejections) {
        await tx.work_order_item_repairs.update({
          where: { id: rejection.repairId },
          data: {
            status: 'rejected',
            rejection_reason: rejection.comment,
            updated_at: new Date(),
          },
        });
      }

      // 3. Reabrir OTs afectadas
      const affectedWoIds = new Set<string>();
      repairDetails.forEach((repair) => {
        affectedWoIds.add(repair.work_order_items.work_order_id);
      });

      if (affectedWoIds.size > 0) {
        await tx.work_orders.updateMany({
          where: { id: { in: Array.from(affectedWoIds) } },
          data: { status: 'in_progress', updated_at: new Date() },
        });
      }

      // 4. Volver la OM a in_workshop
      await tx.maintenance_orders.update({
        where: { id: orderId },
        data: { status: 'in_workshop', updated_at: new Date() },
      });

      // 5. Construir metadata e insertar audit log
      const rejectedItems = rejections.map((rejection) => {
        const detail = repairDetails.find((r) => r.id === rejection.repairId);
        return {
          repair_id: rejection.repairId,
          repair_name: detail?.types_of_repairs?.name ?? 'Sin nombre',
          sector_name: detail?.work_order_items?.maintenance_order_items?.workshop_sectors?.name ?? 'Sin sector',
          comment: rejection.comment,
        };
      });

      await logActivity(tx, {
        maintenanceOrderId: orderId,
        actionType: ACTIVITY_LOG.WORKSHOP_ITEM_REJECTED,
        performedBy: profile.id,
        previousStatus: 'pending_workshop_validation',
        newStatus: 'in_workshop',
        notes: `${rejections.length} item(s) rechazado(s) por jefe de taller`,
        metadata: { rejected_items: rejectedItems },
      });
    });

    logger.info('Items rechazados por jefe de taller', { data: { orderId, count: rejections.length } });
    await invalidateCacheTags(INVALIDATION_MAP.workshopChiefRejectItems);
    revalidatePath('/dashboard/maintenance');
  } catch (error) {
    logger.error('Error al rechazar items (workshop chief)', { data: { error, orderId } });
    throw error;
  }
}

/**
 * Operations rejects specific items (granular).
 * - Sets order to 'operations_rejected'
 * - Does NOT change repair statuses (workshop chief decides)
 * - Logs to maintenance_activity_log with metadata
 */
export async function operationsRejectItems(orderId: string, rejections: RejectionItem[]) {
  const profile = await requireServerAuthProfile();

  if (!rejections.length) throw new Error('Debe seleccionar al menos un item');

  logger.debug('Rechazando items por operaciones', { data: { orderId, count: rejections.length } });

  try {
    const repairIds = rejections.map((r) => r.repairId);

    // 1. Obtener detalles de repairs para metadata
    const repairDetails = await prisma.work_order_item_repairs.findMany({
      where: { id: { in: repairIds } },
      select: {
        id: true,
        types_of_repairs: { select: { id: true, name: true } },
        work_order_items: {
          select: {
            id: true,
            maintenance_order_items: {
              select: {
                id: true,
                assigned_sector_id: true,
                workshop_sectors: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    await prisma.$transaction(async (tx) => {
      // 2. Cambiar estado de la orden a operations_rejected
      await tx.maintenance_orders.update({
        where: { id: orderId },
        data: { status: 'operations_rejected', updated_at: new Date() },
      });

      // 3. Construir metadata e insertar audit log
      const rejectedItems = rejections.map((rejection) => {
        const detail = repairDetails.find((r) => r.id === rejection.repairId);
        return {
          repair_id: rejection.repairId,
          repair_name: detail?.types_of_repairs?.name ?? 'Sin nombre',
          sector_name: detail?.work_order_items?.maintenance_order_items?.workshop_sectors?.name ?? 'Sin sector',
          comment: rejection.comment,
        };
      });

      await logActivity(tx, {
        maintenanceOrderId: orderId,
        actionType: ACTIVITY_LOG.OPERATIONS_ITEM_REJECTED,
        performedBy: profile.id,
        previousStatus: 'pending_operations_validation',
        newStatus: 'operations_rejected',
        notes: `${rejections.length} item(s) rechazado(s) por operaciones`,
        metadata: { rejected_items: rejectedItems },
      });
    });

    logger.info('Items rechazados por operaciones', { data: { orderId, count: rejections.length } });
    await invalidateCacheTags(INVALIDATION_MAP.operationsRejectItems);
    revalidatePath('/dashboard/maintenance');
  } catch (error) {
    logger.error('Error al rechazar items (operaciones)', { data: { error, orderId } });
    throw error;
  }
}

/**
 * Workshop chief handles operations rejection.
 * - If agree: marks repairs as rejected, reopens WOs, sets order to in_workshop
 * - If disagree: sends back to pending_operations_validation
 */
export async function workshopChiefHandleOperationsRejection(orderId: string, agree: boolean, comment?: string) {
  const profile = await requireServerAuthProfile();

  logger.debug('Jefe de taller manejando rechazo de operaciones', { data: { orderId, agree, comment } });

  try {
    if (agree) {
      // Leer el último log de operations_item_rejected para obtener los IDs de repairs
      const lastLog = await prisma.maintenance_activity_log.findFirst({
        where: {
          maintenance_order_id: orderId,
          action_type: 'operations_item_rejected',
        },
        orderBy: { performed_at: 'desc' },
        select: { metadata: true },
      });

      const metadata = lastLog?.metadata as { rejected_items?: Array<{ repair_id: string; comment: string }> } | null;
      const rejectedItems = metadata?.rejected_items ?? [];

      if (rejectedItems.length === 0) {
        throw new Error('No se encontraron items rechazados por operaciones');
      }

      const repairIds = rejectedItems.map((item) => item.repair_id);

      await prisma.$transaction(async (tx) => {
        // Marcar repairs como rechazados
        for (const item of rejectedItems) {
          await tx.work_order_item_repairs.update({
            where: { id: item.repair_id },
            data: {
              status: 'rejected',
              rejection_reason: item.comment,
              updated_at: new Date(),
            },
          });
        }

        // Obtener WOs afectadas y reabrirlas
        const affectedRepairs = await tx.work_order_item_repairs.findMany({
          where: { id: { in: repairIds } },
          select: { work_order_items: { select: { work_order_id: true } } },
        });

        const affectedWoIds = new Set<string>();
        affectedRepairs.forEach((repair) => {
          affectedWoIds.add(repair.work_order_items.work_order_id);
        });

        if (affectedWoIds.size > 0) {
          await tx.work_orders.updateMany({
            where: { id: { in: Array.from(affectedWoIds) } },
            data: { status: 'in_progress', updated_at: new Date() },
          });
        }

        // Volver la orden a in_workshop
        await tx.maintenance_orders.update({
          where: { id: orderId },
          data: { status: 'in_workshop', updated_at: new Date() },
        });

        // Audit log
        await logActivity(tx, {
          maintenanceOrderId: orderId,
          actionType: ACTIVITY_LOG.WORKSHOP_AGREED_OPS_REJECTION,
          performedBy: profile.id,
          previousStatus: 'operations_rejected',
          newStatus: 'in_workshop',
          notes: comment ?? 'Jefe de taller de acuerdo con rechazo de operaciones',
          metadata: { original_rejected_items: rejectedItems },
        });
      });

      logger.info('Jefe de taller de acuerdo con rechazo de operaciones', { data: { orderId } });
    } else {
      // Desacuerdo — enviar de vuelta a operaciones
      if (!comment?.trim()) throw new Error('Debe indicar el motivo de desacuerdo');

      await prisma.$transaction(async (tx) => {
        await tx.maintenance_orders.update({
          where: { id: orderId },
          data: { status: 'pending_operations_validation', updated_at: new Date() },
        });

        await logActivity(tx, {
          maintenanceOrderId: orderId,
          actionType: ACTIVITY_LOG.WORKSHOP_DISAGREED_OPS_REJECTION,
          performedBy: profile.id,
          previousStatus: 'operations_rejected',
          newStatus: 'pending_operations_validation',
          notes: comment,
        });
      });

      logger.info('Jefe de taller en desacuerdo con rechazo de operaciones', { data: { orderId, comment } });
    }

    await invalidateCacheTags(INVALIDATION_MAP.workshopChiefHandleOperationsRejection);
    revalidatePath('/dashboard/maintenance');
  } catch (error) {
    logger.error('Error al manejar rechazo de operaciones (workshop chief)', { data: { error, orderId } });
    throw error;
  }
}

/**
 * Get validation history for an order from maintenance_activity_log
 */
export async function getValidationHistory(orderId: string) {
  logger.debug('Obteniendo historial de validaciones', { data: { orderId } });

  try {
    const logs = await prisma.maintenance_activity_log.findMany({
      where: {
        maintenance_order_id: orderId,
        action_type: {
          in: [
            'workshop_item_rejected',
            'operations_item_rejected',
            'workshop_agreed_ops_rejection',
            'workshop_disagreed_ops_rejection',
            'workshop_approved',
            'operations_approved',
            'workshop_rejected_all_items',
            'workshop_restored_from_rejected',
            'status_change',
          ],
        },
      },
      orderBy: { performed_at: 'desc' },
      select: {
        id: true,
        action_type: true,
        performed_at: true,
        previous_status: true,
        new_status: true,
        notes: true,
        rejection_reason: true,
        metadata: true,
        profile: { select: { id: true, fullname: true } },
      },
    });

    // Mapear alias para compatibilidad con componentes
    return logs.map((log) => ({
      ...log,
      performed_by_profile: log.profile,
    }));
  } catch (error) {
    logger.error('Error al obtener historial de validaciones', { data: { error, orderId } });
    throw error;
  }
}

export type ValidationHistoryData = Awaited<ReturnType<typeof getValidationHistory>>;
export type ValidationHistoryEntry = ValidationHistoryData[number];

/**
 * Actualiza el orden de ejecucion de los sectores (OTs) dentro de una OM.
 * Solo se puede modificar cuando la OM esta en estado in_workshop.
 * Recibe un array de { sectorId, sequenceOrder } y actualiza todos los
 * maintenance_order_items de cada sector con el nuevo orden.
 */
export async function updateSectorExecutionOrder(
  orderId: string,
  sectorOrders: Array<{ sectorId: string; sequenceOrder: number }>
) {
  const profile = await requireServerAuthProfile();
  logger.debug('Actualizando orden de ejecucion de sectores', { data: { orderId, sectorOrders } });

  try {
    // Validar que la orden esté en in_workshop
    const order = await prisma.maintenance_orders.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    if (!order) {
      throw new Error('No se encontró la orden de mantenimiento');
    }

    if (order.status !== 'in_workshop') {
      throw new Error('Solo se puede cambiar el orden cuando la OM está en taller');
    }

    await prisma.$transaction(async (tx) => {
      for (const { sectorId, sequenceOrder } of sectorOrders) {
        await tx.maintenance_order_items.updateMany({
          where: {
            maintenance_order_id: orderId,
            assigned_sector_id: sectorId,
          },
          data: { sector_sequence_order: sequenceOrder },
        });
      }

      await logActivity(tx, {
        maintenanceOrderId: orderId,
        actionType: ACTIVITY_LOG.SECTOR_EXECUTION_ORDER_UPDATED,
        performedBy: profile.id,
        metadata: { sectorOrders },
      });
    });

    logger.info('Orden de ejecucion de sectores actualizado', { data: { orderId, sectorOrders } });
    await invalidateCacheTags(INVALIDATION_MAP.updateSectorExecutionOrder);
    revalidatePath('/dashboard/maintenance');
  } catch (error) {
    logger.error('Error al actualizar orden de sector', { data: { error, orderId } });
    throw error;
  }
}

/**
 * Completa manualmente una OT de taller externo
 */
export async function completeExternalWorkOrder(workOrderId: string) {
  logger.debug('Completando OT externa', { data: { workOrderId } });

  // Intentar obtener el profile (puede ser nulo si es proceso automático)
  let profileId: string | null = null;
  try {
    const profile = await requireServerAuthProfile();
    profileId = profile.id;
  } catch {
    logger.warn('No se pudo obtener profile para completeExternalWorkOrder, usando null', {
      data: { workOrderId },
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Completar la OT
      await tx.work_orders.update({
        where: { id: workOrderId },
        data: {
          status: 'completed',
          completed_at: new Date(),
          completed_by: profileId,
        },
      });

      await logActivity(tx, {
        workOrderId: workOrderId,
        actionType: ACTIVITY_LOG.EXTERNAL_WO_COMPLETED,
        performedBy: profileId,
        newStatus: 'completed',
        metadata: { closedAt: new Date().toISOString() },
      });

      // Obtener el maintenance_order_id a través de work_order_items → maintenance_order_items
      const woItem = await tx.work_order_items.findFirst({
        where: { work_order_id: workOrderId },
        select: {
          maintenance_order_items: { select: { maintenance_order_id: true } },
        },
      });

      const maintenanceOrderId = woItem?.maintenance_order_items?.maintenance_order_id;

      if (maintenanceOrderId) {
        // Verificar si todas las OTs de la OM están cerradas
        const allItems = await tx.maintenance_order_items.findMany({
          where: { maintenance_order_id: maintenanceOrderId },
          select: {
            work_orders: { select: { id: true, status: true } },
          },
        });

        const allWOs = allItems
          .map((item) => item.work_orders)
          .filter((wo): wo is NonNullable<typeof wo> => wo !== null);

        const allClosed =
          allWOs.length > 0 && allWOs.every((wo) => wo.status === 'completed' || wo.status === 'completed_partial');

        if (allClosed) {
          await tx.maintenance_orders.update({
            where: { id: maintenanceOrderId },
            data: { status: 'pending_workshop_validation' },
          });

          logger.info('Maintenance order ready for workshop validation (external WO completed)', {
            data: { maintenanceOrderId, workOrderId },
          });

          await logActivity(tx, {
            maintenanceOrderId: maintenanceOrderId,
            actionType: ACTIVITY_LOG.EXTERNAL_WO_COMPLETED,
            performedBy: profileId,
            previousStatus: 'in_workshop',
            newStatus: 'pending_workshop_validation',
            metadata: { triggeredByWorkOrderId: workOrderId },
          });
        }
      }
    });

    logger.info('OT externa completada', { data: { workOrderId } });
    await invalidateCacheTags(INVALIDATION_MAP.completeExternalWorkOrder);
    revalidatePath('/dashboard/maintenance');
  } catch (error) {
    logger.error('Error al completar OT externa', { data: { error, workOrderId } });
    throw error;
  }
}
