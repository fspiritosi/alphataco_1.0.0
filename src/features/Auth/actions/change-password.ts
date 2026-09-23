'use server';

import { Logger } from '@/lib/logger';
import { setCredentialPassword } from '@/shared/lib/auth-credentials';
import { getSessionToken, getSessionUserId } from '@/shared/lib/session';

/**
 * Cambio de contraseña del usuario de sesión (cartel "tenés que cambiar la contraseña", que
 * aparece cuando el alta se hizo con una contraseña temporal).
 *
 * El perímetro es la propia sesión: se escribe sobre el usuario de `getSessionUserId()` y
 * nunca sobre un id que venga del cliente. `setCredentialPassword()` usa el mismo hasher que
 * Better Auth y, de paso, cierra las demás sesiones abiertas del usuario.
 *
 * No se usa `auth.api.changePassword()` porque exige la contraseña actual y este cartel
 * históricamente sólo pide la nueva; cambiar eso sería cambiar el flujo de la UI.
 */
const logger = new Logger('features/Auth/change-password');

export async function changePassword(newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' };
  }

  const [userId, sessionToken] = await Promise.all([getSessionUserId(), getSessionToken()]);
  if (!userId) return { success: false, error: 'Sesión requerida' };

  try {
    await setCredentialPassword(userId, newPassword, sessionToken ?? undefined);
    return { success: true, message: 'Contraseña actualizada exitosamente' };
  } catch (error) {
    logger.error('Error al cambiar la contraseña', { data: { error } });
    return { success: false, error: 'Error al cambiar la contraseña' };
  }
}
