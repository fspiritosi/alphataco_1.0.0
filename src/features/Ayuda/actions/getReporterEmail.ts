'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUser } from '@/shared/lib/session';
import type { ReporterIdentity } from '../types';

const logger = new Logger('features/Ayuda/reporter');

/**
 * Identidad del usuario que reporta, para los tickets de soporte.
 *
 * El id y el email salen de la sesión (`getSessionUser()`, único punto de contacto con
 * Auth hasta P4); el nombre visible sale de `profile.fullname` por Prisma en vez del
 * `user_metadata` de Supabase, que es el mismo dato duplicado en el lado de Auth.
 */
export async function getReporterEmail(): Promise<ReporterIdentity | null> {
  const user = await getSessionUser();
  if (!user?.email) return null;

  try {
    const profile = await prisma.profile.findUnique({
      where: { credential_id: user.id },
      select: { fullname: true },
    });

    const fullname = profile?.fullname?.trim();

    return { email: user.email, name: fullname ? fullname : null, userId: user.id };
  } catch (error) {
    logger.error('Error al obtener el perfil del usuario que reporta', { data: { error } });
    return { email: user.email, name: null, userId: user.id };
  }
}
