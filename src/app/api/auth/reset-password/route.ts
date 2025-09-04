// app/api/auth/reset-password/route.ts
import { adminSupabaseServer, supabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json({ error: 'Token, email y contraseña son requeridos' }, { status: 400 });
    }

    const supabase = supabaseServer();
    const adminSupabase = adminSupabaseServer();

    // Verificar el token
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens' as any)
      .select(
        `
        *,
        profile:profile_id (id, email)
      `
      )
      .eq('token', token)
      .eq('used', false)
      .gt('expires', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 400 });
    }

    // Verificar que el email coincide
    if (tokenData.profile.email !== email) {
      return NextResponse.json({ error: 'Token no coincide con el email' }, { status: 400 });
    }

    // Actualizar la contraseña
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(tokenData.profile_id, { password });

    if (updateError) {
      console.error('Error actualizando contraseña:', updateError);
      return NextResponse.json({ error: 'Error al actualizar la contraseña' }, { status: 500 });
    }

    // Marcar el token como usado
    const { error: markError } = await supabase
      .from('password_reset_tokens' as any)
      .update({ used: true })
      .eq('token', token);

    if (markError) {
      console.warn('No se pudo marcar el token como usado:', markError);
    }

    return NextResponse.json({ message: 'Contraseña actualizada exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error en reset-password API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
