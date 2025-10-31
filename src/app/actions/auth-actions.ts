'use server';

import { supabaseServer } from '@/lib/supabase/server';

export async function resetPasswordAction(email: string) {
  try {
    const supabase = supabaseServer();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm`,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: 'Email de recuperación enviado exitosamente' };
  } catch (error) {
    console.error('Error en resetPasswordAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al enviar email de recuperación',
    };
  }
}

export async function updatePasswordAction(password: string) {
  try {
    const supabase = supabaseServer();

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: 'Contraseña actualizada exitosamente' };
  } catch (error) {
    console.error('Error en updatePasswordAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar la contraseña',
    };
  }
}

export async function verifyOtpAction(token_hash: string, type: string) {
  try {
    const supabase = supabaseServer();

    const { error } = await supabase.auth.verifyOtp({
      token_hash: token_hash,
      type: type as any,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Error en verifyOtpAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token inválido o expirado',
    };
  }
}
