'use server';

import { supabaseServer } from '@/lib/supabase/server';

export async function changePassword(newPassword: string) {
  const supabase = supabaseServer();

  try {
    // Actualizar la contraseña del usuario
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('❌ [CHANGE_PASSWORD] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Actualizar la metadata para indicar que ya no necesita cambiar contraseña
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        needs_password_change: false,
      },
    });

    if (metadataError) {
      console.error('❌ [CHANGE_PASSWORD] Error actualizando metadata:', metadataError);
    }

    console.log('✅ [CHANGE_PASSWORD] Contraseña actualizada exitosamente');

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente',
    };
  } catch (error) {
    console.error('❌ [CHANGE_PASSWORD] Error inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cambiar la contraseña',
    };
  }
}
