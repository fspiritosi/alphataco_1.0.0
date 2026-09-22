import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { withActor, type ActorTransactionOptions } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';

/**
 * Transacción con el actor seteado para los triggers de auditoría de mantenimiento.
 *
 * `trigger_log_maintenance_order_activity` (sobre `maintenance_orders`) y
 * `trigger_log_work_order_activity` (sobre `work_orders`) insertan en
 * `maintenance_activity_log` y resuelven `performed_by` con `public.app_current_user_id()`.
 * Sin `SET LOCAL app.user_id` ese campo queda NULL y el historial pierde el autor, así que
 * TODA escritura sobre esas dos tablas tiene que pasar por acá.
 *
 * El actor es el `profile.id` (y no el `credential_id`) porque es el destino de la FK
 * `maintenance_activity_log.performed_by → profile.id`: con cualquier otro valor el
 * INSERT del trigger abortaría la transacción entera.
 *
 * Sin actor (procesos automáticos, flujo QR anónimo sin profile) corre la transacción
 * normal: el log queda con `performed_by` NULL, igual que antes.
 */
export async function withMaintenanceActor<T>(
  actorProfileId: string | null | undefined,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: ActorTransactionOptions
): Promise<T> {
  if (!actorProfileId) return prisma.$transaction(fn, options);
  return withActor(actorProfileId, fn, prisma, options);
}
