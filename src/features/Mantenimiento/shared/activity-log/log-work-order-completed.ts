import type { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { ACTIVITY_LOG } from './action-types';
import { logActivity } from './log-activity';

const logger = new Logger('Mantenimiento/activity-log');

type PrismaLike = Prisma.TransactionClient | typeof prisma;

interface LogWorkOrderCompletedInput {
  workOrderId: string;
  /** Estado final real de la OT: 'completed' o 'completed_partial' */
  finalStatus: string;
  performedBy: string | null;
  notes?: string | null;
  /** Si el caller ya lo resolvio, se evita la consulta extra */
  maintenanceOrderId?: string | null;
}

/**
 * Registra en el historial del PEDIDO que una de sus ordenes de trabajo se finalizo.
 *
 * El historial del pedido (getMaintenanceOrderFullActivityLog) arma la linea de tiempo
 * con los registros que tienen maintenance_order_id; los eventos de la OT quedan en el
 * acordeon aparte. Por eso el cierre de OT necesita un registro propio contra el pedido:
 * sin el, el usuario no ve en el historial en que momento se finalizo la OT.
 *
 * Nunca lanza: un fallo al registrar la actividad no debe abortar el cierre de la OT.
 */
export async function logWorkOrderCompletedOnMaintenanceOrder(
  client: PrismaLike,
  input: LogWorkOrderCompletedInput
): Promise<void> {
  try {
    const workOrder = await client.work_orders.findUnique({
      where: { id: input.workOrderId },
      select: {
        order_number: true,
        workshop_sectors: { select: { name: true } },
      },
    });

    let maintenanceOrderId = input.maintenanceOrderId ?? null;

    if (!maintenanceOrderId) {
      // El pedido se alcanza por work_order_items -> maintenance_order_items
      const woItem = await client.work_order_items.findFirst({
        where: { work_order_id: input.workOrderId },
        select: {
          maintenance_order_items: { select: { maintenance_order_id: true } },
        },
      });
      maintenanceOrderId = woItem?.maintenance_order_items?.maintenance_order_id ?? null;
    }

    if (!maintenanceOrderId) {
      logger.warn('OT finalizada sin pedido asociado: no se registra en el historial del pedido', {
        data: { workOrderId: input.workOrderId },
      });
      return;
    }

    await logActivity(client, {
      maintenanceOrderId,
      actionType: ACTIVITY_LOG.WORK_ORDER_COMPLETED,
      performedBy: input.performedBy,
      newStatus: input.finalStatus,
      notes: input.notes ?? null,
      metadata: {
        work_order_id: input.workOrderId,
        work_order_number: workOrder?.order_number ?? null,
        sector_name: workOrder?.workshop_sectors?.name ?? null,
        final_status: input.finalStatus,
        completed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error al registrar la finalizacion de OT en el historial del pedido', {
      data: { error, workOrderId: input.workOrderId },
    });
  }
}
