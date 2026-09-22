import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import {
  isMaintenanceOrderStatus,
  isValidMaintenanceOrderTransition,
  nextMaintenanceOrderStatuses,
  type MaintenanceOrderStatus,
} from '@/features/Mantenimiento/lib/order-status';
import { prisma } from '@/shared/lib/prisma';

type PrismaLike = Prisma.TransactionClient | typeof prisma;

/**
 * Guarda de transición de `maintenance_orders.status`.
 *
 * Es el punto por el que pasan TODAS las actions que cambian el estado del pedido: lee el
 * estado actual y lo contrasta contra la máquina de `lib/order-status.ts` antes de escribir.
 * Sin esto, cualquier endpoint podía saltar pasos del circuito (por ejemplo cerrar una orden
 * que nunca entró al taller) porque el estado se escribía a mano.
 *
 * Reescribir el MISMO estado se deja pasar: es el doble click / reintento de siempre, y
 * antes tampoco fallaba. Devuelve el estado previo para el log de actividad.
 */
export async function assertOrderTransition(
  client: PrismaLike,
  orderId: string,
  nextStatus: MaintenanceOrderStatus
): Promise<string | null> {
  const order = await client.maintenance_orders.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!order) throw new Error('Pedido de mantenimiento no encontrado');

  const current = order.status;
  if (current === nextStatus) return current;

  if (!isMaintenanceOrderStatus(current)) {
    throw new Error(`El pedido está en un estado desconocido ("${current}")`);
  }

  if (!isValidMaintenanceOrderTransition(current, nextStatus)) {
    const allowed = nextMaintenanceOrderStatuses(current);
    throw new Error(
      `No se puede pasar el pedido de "${current}" a "${nextStatus}"` +
        (allowed.length > 0 ? ` (estados posibles: ${allowed.join(', ')})` : ' (es un estado final)')
    );
  }

  return current;
}
