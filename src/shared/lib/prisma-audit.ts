import { getServerAuthProfile } from '@/shared/actions/auth.actions';
import { prisma } from '@/shared/lib/prisma';

type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Ejecuta un callback dentro de una transacción Prisma con `request.jwt.claims`
 * seteado al usuario logueado. Es OBLIGATORIO usar este wrapper para mutaciones
 * a tablas con triggers de auditoría que leen el JWT (ej: `dailyreportrows_history`,
 * sus tablas de relations).
 *
 * Cuando se mutaba con Supabase HTTP, PostgREST seteaba `request.jwt.claims`
 * automáticamente y el trigger podía leer el `sub` del usuario. Con Prisma directo
 * el JWT no se propaga y el trigger guarda `changed_by = NULL`. Este helper resuelve
 * eso ejecutando `set_config('request.jwt.claims', ..., true)` (SET LOCAL) al inicio
 * de la transacción, así el trigger ve los claims correctos.
 *
 * Uso:
 *   const row = await withAuditUser(async (tx) => {
 *     return tx.dailyreportrows.update({ where: { id }, data: ... });
 *   });
 *
 * Si no hay sesión activa (caso muy raro en server actions), el helper igualmente
 * abre la transacción pero sin setear claims — los triggers caerán a NULL como antes.
 */
export async function withAuditUser<T>(fn: (tx: PrismaTransactionClient) => Promise<T>): Promise<T> {
  const profile = await getServerAuthProfile();
  const claims = profile?.credentialId ? JSON.stringify({ sub: profile.credentialId }) : null;

  return prisma.$transaction(async (tx) => {
    if (claims) {
      await tx.$executeRaw`SELECT set_config('request.jwt.claims', ${claims}, true)`;
    }
    return fn(tx);
  });
}
