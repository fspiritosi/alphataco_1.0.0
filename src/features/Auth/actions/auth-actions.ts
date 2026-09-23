'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server'; // P4: auth

/**
 * Recuperación y cambio de contraseña por el flujo nativo del proveedor de auth.
 * Son llamadas `auth.*`: se conservan tal cual y las reemplaza P4 (Better Auth).
 *
 * `verifyOtpAction` se eliminó: era una Server Action exportada (o sea, un endpoint público) sin
 * ningún llamador — las rutas de confirmación llaman a `auth.verifyOtp` directamente.
 */
const logger = new Logger('features/Auth/auth-actions');

export async function resetPasswordAction(email: string) {
  try {
    const supabase = await supabaseServer(); // P4: auth

    const { error } = await supabase.auth.resetPasswordForEmail(email, { // P4: auth
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm`,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: 'Email de recuperación enviado exitosamente' };
  } catch (error) {
    logger.error('Error en resetPasswordAction', { data: { error } });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al enviar email de recuperación',
    };
  }
}

export async function updatePasswordAction(password: string) {
  try {
    const supabase = await supabaseServer(); // P4: auth

    const { error } = await supabase.auth.updateUser({ password }); // P4: auth

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: 'Contraseña actualizada exitosamente' };
  } catch (error) {
    logger.error('Error en updatePasswordAction', { data: { error } });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar la contraseña',
    };
  }
}
