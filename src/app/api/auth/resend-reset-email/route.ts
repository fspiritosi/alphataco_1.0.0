// app/api/auth/resend-reset-email/route.ts
import { sendEmail } from '@/features/Auth/actions/sendEmail';
import { supabaseServer } from '@/lib/supabase/server';
import { generateExpirationDate, generateSecureToken } from '@/lib/utils/tokens';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
    }

    const supabase = await supabaseServer();

    // Buscar el usuario por email
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('id, email, fullname')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Limpiar tokens existentes
    await supabase
      .from('password_reset_tokens' as any)
      .update({ used: true })
      .eq('profile_id', profile.id)
      .eq('used', false);

    // Generar nuevo token
    const resetToken = generateSecureToken();
    const tokenExpires = generateExpirationDate(24 * 60); // 24 horas

    // Guardar nuevo token
    const { error: tokenError } = await supabase.from('password_reset_tokens' as any).insert([
      {
        profile_id: profile.id,
        token: resetToken,
        expires: tokenExpires.toISOString(),
      },
    ]);

    if (tokenError) {
      console.error('Error guardando token:', tokenError);
      return NextResponse.json({ error: 'Error al generar token de seguridad' }, { status: 500 });
    }

    // Enviar email
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset_password/update-user?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await sendEmail({
      to: email,
      subject: 'Solicitud de cambio de contraseña',
      userEmail: email,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Solicitud de cambio de contraseña</h2>
          <p>Hola ${profile.fullname},</p>
          <p>Has solicitado cambiar tu contraseña. Usa el siguiente enlace para establecer una nueva contraseña:</p>
          <a href="${resetUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
            Cambiar Contraseña
          </a>
          <p>Este enlace es válido por 24 horas.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: 'Email de recuperación enviado' }, { status: 200 });
  } catch (error) {
    console.error('Error en resend-reset-email API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
