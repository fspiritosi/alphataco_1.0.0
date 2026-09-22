import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { withActor, type ActorTransactionOptions } from '@/shared/lib/actor';
import { getSessionUserId } from '@/shared/lib/session';

/**
 * Transacción con el actor de sesión seteado (`app.user_id`), para las mutaciones de
 * Operaciones cuyas tablas tienen triggers de historial (`dailyreportrows_history`,
 * `preparte_change_logs`): sin el actor, el trigger guarda `changed_by = NULL`.
 *
 * Módulo server-only (NO es una Server Action). Si no hay sesión abre igual la
 * transacción, sin actor — es el comportamiento que ya tenía el historial cuando el
 * cambio lo hace un proceso del sistema.
 */
export async function withSessionActor<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: ActorTransactionOptions
): Promise<T> {
  const userId = await getSessionUserId();
  if (!userId) {
    return prisma.$transaction(fn, options);
  }
  return withActor(userId, fn, prisma, options);
}
