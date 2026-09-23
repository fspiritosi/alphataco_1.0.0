'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';

const logger = new Logger('features/Layout/navbar');

const profileSelect = {
  id: true,
  credential_id: true,
  email: true,
  avatar: true,
  fullname: true,
  role: true,
  employee_id: true,
  created_at: true,
} as const;

/**
 * Perfil del usuario de la sesión para el menú del navbar.
 *
 * Perímetro: el perfil se busca por `credential_id` de la sesión; no hay parámetro que
 * pueda apuntar a otro usuario.
 */
export async function getCurrentUserProfile() {
  const credentialId = await getSessionUserId();
  if (!credentialId) return null;

  try {
    return await prisma.profile.findUnique({ where: { credential_id: credentialId }, select: profileSelect });
  } catch (error) {
    logger.error('Error al obtener el perfil del usuario', { data: { error } });
    return null;
  }
}

export type CurrentUserProfile = Awaited<ReturnType<typeof getCurrentUserProfile>>;

/**
 * Cambia el avatar del perfil de la SESIÓN.
 *
 * Perímetro: antes la action recibía el `userId` a modificar y escribía por ese id, así que
 * cualquiera podía pisarle el avatar a otro usuario. Ahora el perfil sale de la sesión y el
 * único dato del cliente es la URL de la imagen.
 */
export async function updateProfileAvatar(imageUrl: string): Promise<{ success: boolean }> {
  const credentialId = await getSessionUserId();
  if (!credentialId) {
    logger.warn('Intento de actualizar avatar sin sesión');
    return { success: false };
  }

  try {
    await prisma.profile.update({ where: { credential_id: credentialId }, data: { avatar: imageUrl } });
    return { success: true };
  } catch (error) {
    logger.error('Error al actualizar avatar', { data: { error } });
    return { success: false };
  }
}
