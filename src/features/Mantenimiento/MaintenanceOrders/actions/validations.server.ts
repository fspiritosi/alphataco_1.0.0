'use server';

import { areAllWorkOrdersClosed, resolveResourceConditionAfterClose } from '@/features/Mantenimiento/lib/order-status';
import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { INVALIDATION_MAP } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import { revalidatePath } from 'next/cache';
import { assertOrderInActiveCompany } from './order-perimeter';

const logger = new Logger('MaintenanceOrders/validations');

/**
 * Workshop chief validates order and sends to operations.
 * Also updates the supervisor assigned to the maintenance_request
 * so the correct operations supervisor receives the order for validation.
 */
export async function workshopChiefValidateOrder(orderId: string, notes?: string, operationsSupervisorId?: string) {
  // Perímetro: el pedido tiene que ser de la empresa activa.
  await assertOrderInActiveCompany(orderId);
  const profile = await requireServerAuthProfile();

  logger.debug('Validando orden por jefe de taller', { data: { orderId, notes, operationsSupervisorId } });

  try {
    await prisma.$transaction(async (tx) => {
      // El taller cierra el circuito: Operaciones ya no valida.
      // El cliente lo pidio explicitamente ("operaciones ya no tiene que dar mas el
      // ok de esto... ese paso se va, porque ellos mismos no lo hacen"): la orden
      // pasa de la validacion del taller directo a completada.
      const order = await tx.maintenance_orders.findUnique({
        where: { id: orderId },
        select: { equipment_id: true, other_equipment_id: true, maintenance_request_id: true },
      });

      if (!order) {
        throw new Error('Orden no encontrada');
      }

      await tx.maintenance_orders.update({
        where: { id: orderId },
        data: {
          status: 'completed',
          workshop_approved_by: profile.id,
          workshop_validated_at: new Date(),
          workshop_validation_notes: notes ?? null,
          // El cierre pasa a ser del taller, pero se siguen sellando estos campos
          // para no perder la trazabilidad de quien y cuando cerro.
          operations_validated_by: profile.id,
          operations_validated_at: new Date(),
          updated_at: new Date(),
        },
      });

      // El recurso vuelve a operativo salvo que le queden OTRAS ordenes en taller.
      // Contempla vehiculos y equipamientos (ticket 596).
      const resourceId = order.equipment_id ?? order.other_equipment_id;
      if (resourceId) {
        const isOtherEquipment = order.other_equipment_id != null;
        const remainingInWorkshop = await tx.maintenance_orders.count({
          where: {
            ...(isOtherEquipment ? { other_equipment_id: resourceId } : { equipment_id: resourceId }),
            status: 'in_workshop',
            id: { not: orderId },
          },
        });
        const nextCondition = resolveResourceConditionAfterClose(remainingInWorkshop);

        if (isOtherEquipment) {
          await tx.other_equipment.update({ where: { id: resourceId }, data: { condition: nextCondition } });
        } else {
          await tx.vehicles.update({ where: { id: resourceId }, data: { condition: nextCondition } });
        }

        logger.info('Condición del recurso actualizada tras el cierre del taller', {
          data: { resourceId, isOtherEquipment, nextCondition, remainingInWorkshop },
        });
      }

      // Actualizar supervisor de operaciones en la maintenance_request asociada
      if (operationsSupervisorId) {
        if (order.maintenance_request_id) {
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
        newStatus: 'completed',
        notes: notes ?? 'Cerrado por jefe de taller',
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
  // Perímetro: el pedido tiene que ser de la empresa activa.
  await assertOrderInActiveCompany(orderId);
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
  // Perímetro: el pedido tiene que ser de la empresa activa.
  await assertOrderInActiveCompany(orderId);
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
        const nextCondition = resolveResourceConditionAfterClose(remainingInWorkshop);
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
  // Perímetro: el pedido tiene que ser de la empresa activa.
  await assertOrderInActiveCompany(orderId);
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
  // Perímetro: el pedido tiene que ser de la empresa activa.
  await assertOrderInActiveCompany(orderId);
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
  // Perímetro: el pedido tiene que ser de la empresa activa.
  await assertOrderInActiveCompany(orderId);
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
  // Perímetro: el pedido tiene que ser de la empresa activa.
  await assertOrderInActiveCompany(orderId);
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
