'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server'; // P4: auth

/**
 * Cambio de contraseña del usuario de sesión (cartel "tenés que cambiar la contraseña").
 * Sólo `auth.*`: sin acceso a datos. P4 lo reemplaza.
 */
const logger = new Logger('features/Auth/change-password');

export async function changePassword(newPassword: string) {
  const supabase = await supabaseServer(); // P4: auth

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword }); // P4: auth

    if (error) {
      logger.error('Error al cambiar la contraseña', { data: { error } });
      return { success: false, error: error.message };
    }

    // La metadata deja de pedir el cambio de contraseña en el próximo login.
    const { error: metadataError } = await supabase.auth.updateUser({ // P4: auth
      data: { needs_password_change: false },
    });

    if (metadataError) {
      logger.error('Error actualizando la metadata del usuario', { data: { metadataError } });
    }

    return { success: true, message: 'Contraseña actualizada exitosamente' };
  } catch (error) {
    logger.error('Error inesperado al cambiar la contraseña', { data: { error } });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cambiar la contraseña',
    };
  }
}
