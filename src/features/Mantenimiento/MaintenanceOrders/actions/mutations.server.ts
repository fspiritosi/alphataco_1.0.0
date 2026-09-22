'use server';

import { areAllWorkOrdersClosed } from '@/features/Mantenimiento/lib/order-status';
import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { logWorkOrderCompletedOnMaintenanceOrder } from '@/features/Mantenimiento/shared/activity-log/log-work-order-completed';
import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { INVALIDATION_MAP } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import { revalidatePath } from 'next/cache';
import { assertOrderInActiveCompany, assertWorkOrderInActiveCompany } from './order-perimeter';

const logger = new Logger('MaintenanceOrders/mutations');

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

  // Perímetro: el pedido tiene que ser de la empresa activa.
  await assertOrderInActiveCompany(orderId);

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
  // Perímetro: la OT tiene que ser de la empresa activa.
  await assertWorkOrderInActiveCompany(workOrderId);
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
        // El historial del pedido filtra por maintenance_order_id, asi que sin este
        // registro el cierre de una OT de taller EXTERNO no aparecia en el historial
        // (solo quedaba anotado contra la OT).
        await logWorkOrderCompletedOnMaintenanceOrder(tx, {
          workOrderId,
          finalStatus: 'completed',
          performedBy: profileId,
          maintenanceOrderId,
        });

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

        const allClosed = areAllWorkOrdersClosed(allWOs.map((wo) => wo.status));

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
