'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('shared/auth');

/**
 * Obtiene el usuario autenticado (Supabase Auth) y su profile interno (Prisma).
 * Retorna null si no hay sesion activa.
 *
 * - `id`: profile.id (UUID interno, usado en FKs como performed_by, approved_by, etc.)
 * - `credentialId`: user.id de Supabase Auth (= credential_id en profile)
 * - `fullname` y `email`: datos del profile
 */
export async function getServerAuthProfile() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.profile.findFirst({
    where: { credential_id: user.id },
    select: { id: true, fullname: true, email: true },
  });

  if (!profile) {
    logger.warn('Profile no encontrado para credential_id', { data: { credentialId: user.id } });
    return null;
  }

  return { ...profile, credentialId: user.id };
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
