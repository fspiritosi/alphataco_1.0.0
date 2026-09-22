'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';

const logger = new Logger('shared/auth');

/**
 * Obtiene el usuario de sesión y su profile interno (Prisma).
 * Retorna null si no hay sesion activa.
 *
 * - `id`: profile.id (UUID interno, usado en FKs como performed_by, approved_by, etc.)
 * - `credentialId`: id del usuario de sesión (= credential_id en profile)
 * - `fullname` y `email`: datos del profile
 */
export async function getServerAuthProfile() {
  const credentialId = await getSessionUserId();
  if (!credentialId) return null;

  const profile = await prisma.profile.findFirst({
    where: { credential_id: credentialId },
    select: { id: true, fullname: true, email: true },
  });

  if (!profile) {
    logger.warn('Profile no encontrado para credential_id', { data: { credentialId } });
    return null;
  }

  return { ...profile, credentialId };
}

export type ServerAuthProfile = NonNullable<Awaited<ReturnType<typeof getServerAuthProfile>>>;

/**
 * Igual que getServerAuthProfile() pero lanza error si no hay sesion.
 * Usar en mutations que REQUIEREN autenticacion.
 */
export async function requireServerAuthProfile(): Promise<ServerAuthProfile> {
  const profile = await getServerAuthProfile();
  if (!profile) throw new Error('Usuario no autenticado');
  return profile;
}
