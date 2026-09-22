import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/shared/lib/prisma';

/**
 * Actor de la transacción para los triggers de auditoría.
 *
 * Las funciones SQL portadas leen `public.app_current_user_id()` =
 * `nullif(current_setting('app.user_id', true), '')::uuid` (antes `auth.uid()`). Este helper
 * setea esa variable con `set_config(..., true)` — equivale a `SET LOCAL`, vive sólo dentro de
 * la transacción y, a diferencia de `SET LOCAL`, admite parámetros bindeados.
 *
 * `userId` = `profile.credential_id` del usuario de sesión (hasta P4, el `user.id` de Supabase
 * Auth): ver `getSessionUserId()` en `@/shared/lib/session`.
 */
export type ActorTx = Pick<Prisma.TransactionClient, '$executeRaw'>;
export type ActorClient = { $transaction: typeof prisma.$transaction };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(userId: string): void {
  if (!UUID_RE.test(userId)) {
    throw new Error('userId debe ser un uuid');
  }
}

/** Setea el actor dentro de una transacción ya abierta. */
export async function setActor(tx: ActorTx, userId: string): Promise<void> {
  assertUuid(userId);
  await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
}

/**
 * Ejecuta `fn` dentro de una transacción con `app.user_id = <userId>` ya seteado.
 * Valida el uuid ANTES de abrir la transacción.
 */
export async function withActor<T>(
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  client: ActorClient = prisma
): Promise<T> {
  assertUuid(userId);
  return client.$transaction(async (tx) => {
    await setActor(tx, userId);
    return fn(tx);
  });
}
