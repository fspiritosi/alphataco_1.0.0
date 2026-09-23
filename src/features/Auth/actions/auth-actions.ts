'use server';

import { Logger } from '@/lib/logger';
import { auth } from '@/shared/lib/auth';
import { normalizeEmail } from '@/shared/lib/auth-credentials';
import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';

/**
 * Recuperación de contraseña por el flujo nativo de Better Auth.
 *
 * `requestPasswordReset` emite un token en `auth_verification` y dispara
 * `emailAndPassword.sendResetPassword` (ver `shared/lib/auth.ts`), que manda el mail por el
 * emisor SMTP de `shared/lib/mail` (P4 lo dejó mínimo; P5 lo generalizó).
 *
 * El enlace del mail apunta directo a `/reset_password/update-user?token=...`: ya no hace falta
 * una ruta intermedia que canjee un OTP, así que `/auth/confirm`, `/login/auth/confirm` y
 * `/reset_password/callback` se eliminaron con P4.
 */
const logger = new Logger('features/Auth/auth-actions');

export type PasswordActionResult = { success: true; message: string } | { success: false; error: string };

export async function resetPasswordAction(email: string): Promise<PasswordActionResult> {
  try {
    await auth.api.requestPasswordReset({
      body: {
        email: normalizeEmail(email),
        redirectTo: '/reset_password/update-user',
      },
      headers: await headers(),
    });

    // Respuesta uniforme a propósito: no se filtra si el mail existe o no.
    return { success: true, message: 'Email de recuperación enviado exitosamente' };
  } catch (error) {
    logger.error('Error en resetPasswordAction', { data: { error } });
    return {
      success: false,
      error: error instanceof APIError ? (error.body?.message ?? 'Error al enviar email de recuperación')
        : 'Error al enviar email de recuperación',
    };
  }
}

/**
 * Cierra el flujo de recuperación: consume el token del mail y deja la contraseña nueva.
 * El token viaja por la URL (`?token=`) y lo valida Better Auth; acá no hay sesión.
 */
export async function updatePasswordAction(password: string, token: string): Promise<PasswordActionResult> {
  if (!token) {
    return { success: false, error: 'El enlace de recuperación es inválido o expiró' };
  }

  try {
    await auth.api.resetPassword({ body: { newPassword: password, token }, headers: await headers() });
    return { success: true, message: 'Contraseña actualizada exitosamente' };
  } catch (error) {
    logger.error('Error en updatePasswordAction', { data: { error } });
    if (error instanceof APIError) {
      const code = error.body?.code ?? '';
      if (code.includes('TOKEN')) return { success: false, error: 'El enlace de recuperación es inválido o expiró' };
      return { success: false, error: error.body?.message ?? 'Error al actualizar la contraseña' };
    }
    return { success: false, error: 'Error al actualizar la contraseña' };
  }
}
