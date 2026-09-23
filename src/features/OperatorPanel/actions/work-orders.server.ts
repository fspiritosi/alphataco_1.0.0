'use server';

import type { Prisma } from '@/generated/prisma/client';
import { areAllWorkOrdersClosed } from '@/features/Mantenimiento/lib/order-status';
import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { logWorkOrderCompletedOnMaintenanceOrder } from '@/features/Mantenimiento/shared/activity-log/log-work-order-completed';
import { withMaintenanceActor } from '@/features/Mantenimiento/shared/maintenance-actor';
import { assertOrderTransition } from '@/features/Mantenimiento/shared/order-transition';
import { getWorkOrderBlockingStatus } from '@/features/OperatorPanel/actions/blocking';
import { assertWorkOrderInScope } from '@/features/OperatorPanel/actions/perimeter';
import { assertOperatorAction, resolveWorkOrderCloseStatus } from '@/features/OperatorPanel/lib/work-order-status';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';

const logger = new Logger('OperatorPanel/work-orders');

/**
 * Ciclo de vida de la OT desde el taller: iniciar, pausar, reanudar y cerrar.
 *
 * Todas siguen el mismo esqueleto:
 *   1. `assertWorkOrderInScope` — la OT tiene que ser de un sector asignado al operario.
 *   2. `assertOperatorAction` — la acción tiene que ser válida para el estado actual.
 *   3. Una sola transacción con `withMaintenanceActor`, que revalida el estado adentro,
 *      escribe y registra el historial.
 *
 * El actor es obligatorio: los triggers de `work_orders` resuelven `performed_by` con
 * `app_current_user_id()`, así que sin él el historial queda sin autor. Antes se pasaba el id
 * de sesión (`credential_id`) a `performed_by` y a `started_by`/`completed_by`, que son FKs a
 * `profile.id`; ahora va el `profile.id` del operario.
 */

/**
 * "Uno a la vez": ninguna OTRA OT del mismo pedido puede estar en progreso.
 *
 * Corre dentro de la transacción de la escritura, así el chequeo y el `update` no pueden
 * cruzarse con otro sector arrancando al mismo tiempo.
 */
async function assertNoSiblingInProgress(
  tx: Prisma.TransactionClient,
  workOrderId: string,
  verb: 'iniciar' | 'reanudar'
): Promise<void> {
  const orderItem = await tx.maintenance_order_items.findFirst({
    where: { work_order_id: workOrderId },
    select: { maintenance_order_id: true },
  });

  if (!orderItem) return;

  const active = await tx.work_orders.findFirst({
    where: {
      id: { not: workOrderId },
      status: 'in_progress',
      maintenance_order_items: { some: { maintenance_order_id: orderItem.maintenance_order_id } },
    },
    select: { workshop_sectors: { select: { name: true } } },
  });

  if (active) {
    throw new Error(`No se puede ${verb}: ${active.workshop_sectors?.name ?? 'otro sector'} tiene una OT en progreso`);
  }
}

/** Arranca la OT, si la secuencia de sectores la habilita y no hay otra OT del pedido activa. */
export async function startWorkOrder(workOrderId: string) {
  const { operator, workOrder } = await assertWorkOrderInScope(workOrderId);
  assertOperatorAction(workOrder.status, 'start');

  await withMaintenanceActor(operator.profileId, async (tx) => {
    const blocking = await getWorkOrderBlockingStatus(tx, [workOrderId]);
    if (blocking[workOrderId]?.isBlocked) {
      const blockedBy = blocking[workOrderId]!.blockedBySector;
      throw new Error(`No se puede iniciar: el sector ${blockedBy ?? 'anterior'} no ha completado sus tareas`);
    }

    await assertNoSiblingInProgress(tx, workOrderId, 'iniciar');

    const current = await tx.work_orders.findUniqueOrThrow({ where: { id: workOrderId }, select: { status: true } });
    assertOperatorAction(current.status, 'start');

    await tx.work_orders.update({
      where: { id: workOrderId },
      data: { status: 'in_progress', started_at: new Date(), started_by: operator.profileId },
    });

    await logActivity(tx, {
      workOrderId,
      actionType: ACTIVITY_LOG.WO_STARTED,
      performedBy: operator.profileId,
      previousStatus: current.status,
      newStatus: 'in_progress',
      metadata: {},
    });
  });

  revalidatePath('/operator');
}

/**
 * Pausa una OT en progreso.
 *
 * Al pausar, las OTs de los sectores siguientes quedan desbloqueadas: es lo que habilita el
 * "uno a la vez" (ver `lib/sector-blocking.ts`).
 */
export async function pauseWorkOrder(workOrderId: string) {
  const { operator, workOrder } = await assertWorkOrderInScope(workOrderId);
  assertOperatorAction(workOrder.status, 'pause');

  await withMaintenanceActor(operator.profileId, async (tx) => {
    const current = await tx.work_orders.findUniqueOrThrow({ where: { id: workOrderId }, select: { status: true } });
    assertOperatorAction(current.status, 'pause');

    // `paused_by`/`paused_at` quedaban en NULL: el trigger de auditoría los lee para
    // resolver el autor de la pausa, y el historial de la OT los muestra.
    await tx.work_orders.update({
      where: { id: workOrderId },
      data: { status: 'paused', paused_at: new Date(), paused_by: operator.profileId },
    });

    await logActivity(tx, {
      workOrderId,
      actionType: ACTIVITY_LOG.WO_PAUSED,
      performedBy: operator.profileId,
      previousStatus: current.status,
      newStatus: 'paused',
      metadata: {},
    });
  });

  revalidatePath('/operator');
}

/** Reanuda una OT pausada, si ningún otro sector del pedido está trabajando. */
export async function resumeWorkOrder(workOrderId: string) {
  const { operator, workOrder } = await assertWorkOrderInScope(workOrderId);
  assertOperatorAction(workOrder.status, 'resume');

  await withMaintenanceActor(operator.profileId, async (tx) => {
    await assertNoSiblingInProgress(tx, workOrderId, 'reanudar');

    const current = await tx.work_orders.findUniqueOrThrow({ where: { id: workOrderId }, select: { status: true } });
    assertOperatorAction(current.status, 'resume');

    await tx.work_orders.update({
      where: { id: workOrderId },
      data: { status: 'in_progress' },
    });

    await logActivity(tx, {
      workOrderId,
      actionType: ACTIVITY_LOG.WO_RESUMED,
      performedBy: operator.profileId,
      previousStatus: current.status,
      newStatus: 'in_progress',
      metadata: {},
    });
  });

  revalidatePath('/operator');
}

/**
 * Cierra la OT y, si era la última del pedido, manda el pedido a validación del taller.
 *
 * En UNA transacción va lo que define el cierre: el estado de la OT, el del pedido y la
 * entrada de historial del evento. Antes eran cinco viajes sueltos y un cierre a medias
 * dejaba el pedido colgado en `in_workshop` con todas las OTs cerradas.
 *
 * El registro SECUNDARIO contra el pedido queda FUERA, ver abajo.
 */
export async function closeWorkOrder(workOrderId: string, notes?: string) {
  const { operator, workOrder } = await assertWorkOrderInScope(workOrderId);
  assertOperatorAction(workOrder.status, 'close');

  const closed = await withMaintenanceActor(operator.profileId, async (tx) => {
    const current = await tx.work_orders.findUniqueOrThrow({ where: { id: workOrderId }, select: { status: true } });
    assertOperatorAction(current.status, 'close');

    const repairs = await tx.work_order_item_repairs.findMany({
      where: { work_order_items: { work_order_id: workOrderId } },
      select: { status: true },
    });

    const closeStatus = resolveWorkOrderCloseStatus(repairs.map((repair) => repair.status));

    await tx.work_orders.update({
      where: { id: workOrderId },
      data: {
        status: closeStatus,
        completed_at: new Date(),
        completed_by: operator.profileId,
        notes: notes || null,
      },
    });

    // El pedido se alcanza por work_order_items → maintenance_order_items.
    const workOrderItem = await tx.work_order_items.findFirst({
      where: { work_order_id: workOrderId },
      select: { maintenance_order_items: { select: { maintenance_order_id: true } } },
    });
    const maintenanceOrderId = workOrderItem?.maintenance_order_items?.maintenance_order_id ?? null;

    if (maintenanceOrderId) {
      const siblings = await tx.work_orders.findMany({
        where: { maintenance_order_items: { some: { maintenance_order_id: maintenanceOrderId } } },
        select: { status: true },
      });

      if (areAllWorkOrdersClosed(siblings.map((sibling) => sibling.status))) {
        // La guarda de transición del pedido, en la misma transacción que la escritura:
        // el estado se escribía a mano y se podía saltar el circuito.
        await assertOrderTransition(tx, maintenanceOrderId, 'pending_workshop_validation');
        await tx.maintenance_orders.update({
          where: { id: maintenanceOrderId },
          data: { status: 'pending_workshop_validation' },
        });

        logger.info('Pedido listo para validación del taller', { data: { maintenanceOrderId } });
      }
    } else {
      logger.warn('OT sin pedido asociado', { data: { workOrderId } });
    }

    await logActivity(tx, {
      workOrderId,
      actionType: ACTIVITY_LOG.WO_CLOSED,
      performedBy: operator.profileId,
      previousStatus: current.status,
      newStatus: closeStatus,
      notes: notes ?? null,
      metadata: { status: closeStatus },
    });

    return { closeStatus, maintenanceOrderId };
  });

  // El cierre también se registra contra el PEDIDO: el historial del pedido filtra por
  // maintenance_order_id, así que sin esto el evento sólo se veía dentro de la OT.
  //
  // Va FUERA de la transacción a propósito. El helper promete "nunca lanza" con un
  // try/catch, y eso sólo vale afuera: adentro, un INSERT fallido aborta la transacción
  // entera, así que el catch se tragaba el error, la callback volvía normal y el COMMIT
  // reventaba igual — el operario perdía el cierre y encima sin el log que lo explicaba.
  // Este registro es secundario: perderlo es cosmético, perder el cierre le traba el turno.
  await logWorkOrderCompletedOnMaintenanceOrder(prisma, {
    workOrderId,
    finalStatus: closed.closeStatus,
    performedBy: operator.profileId,
    notes: notes ?? null,
    maintenanceOrderId: closed.maintenanceOrderId,
  });

  logger.info('OT cerrada', { data: { workOrderId, finalStatus: closed.closeStatus } });

  revalidatePath('/operator');
}
