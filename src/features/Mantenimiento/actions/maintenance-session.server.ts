'use server';

import { auth } from '@/shared/lib/auth';
import { normalizeEmail } from '@/shared/lib/auth-credentials';
import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';

/**
 * Login del INVITADO del QR de mantenimiento (email + contraseña).
 *
 * Vive en una Server Action, y no en el cliente, por el mismo motivo que los demás logins: la
 * cookie de sesión la escribe el plugin `nextCookies()` del servidor. Acá no se resuelve
 * ninguna empresa: la fija después `setActiveCompanyForEquipment()` a partir del equipo
 * escaneado, y esa cookie es una PROPUESTA que `getActiveCompanyId()` revalida.
 */
export async function maintenanceGuestLogin(email: string, password: string): Promise<{ error: string } | { ok: true }> {
  try {
    await auth.api.signInEmail({ body: { email: normalizeEmail(email), password }, headers: await headers() });
    return { ok: true };
  } catch (error) {
    if (error instanceof APIError) {
      return { error: error.body?.message ?? 'Correo o contraseña inválidos' };
    }
    return { error: 'No se pudo iniciar sesión' };
  }
}
