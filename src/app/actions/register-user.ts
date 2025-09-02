'use server';

import { sendEmail } from '@/app/actions/sendEmail';
import { adminSupabaseServer, supabaseServer } from '@/lib/supabase/server';

export async function registerUserWithRole(values: any, company: string) {
  const supabase = supabaseServer();
  const adminSupabase = adminSupabaseServer();

  try {
    // 1. Verificar si el usuario ya existe
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('*')
      .eq('email', values.email)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(profileError.message);
    }

    // 2. Si el perfil existe, verificar acceso a la empresa
    if (profile) {
      const { data: existingAccess, error: accessError } = await supabase
        .from('share_company_users')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('company_id', company);

      if (accessError) throw new Error(accessError.message);
      if (existingAccess && existingAccess.length > 0) {
        throw new Error('El usuario ya tiene acceso a esta empresa');
      }

      // Compartir la empresa con el usuario existente
      const { error: shareError } = await supabase.from('share_company_users').insert([
        {
          company_id: company,
          profile_id: profile.id,
          role: values.role,
          customer_id: values.customer || null,
        },
      ]);

      if (shareError) {
        console.error('Error insertando en share_company_users:', shareError);
        throw new Error(shareError.message);
      }

      return { success: true, message: 'Usuario agregado a la empresa exitosamente' };
    }

    // 3. Si no existe el perfil, crear nuevo usuario
    if (!values.password) {
      throw new Error('Se requiere contraseña para crear nuevo usuario');
    }

    // Crear usuario en Auth
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: values.email,
      password: values.password,
      email_confirm: true,
      user_metadata: {
        fullname: `${values.firstname} ${values.lastname}`.trim(),
      },
    });

    if (authError) throw new Error(authError.message);

    const userId = authData.user?.id;
    if (!userId) throw new Error('No se pudo obtener el ID del usuario');

    // 4. Crear perfil
    const { error: profileCreateError } = await adminSupabase.from('profile').insert([
      {
        id: userId,
        email: values.email,
        fullname: `${values.firstname} ${values.lastname}`.trim(),
        role: 'CodeControlClient',
        credential_id: userId,
      },
    ]);

    if (profileCreateError) {
      console.error('Error creando perfil:', profileCreateError);
      throw new Error(profileCreateError.message);
    }

    // 5. Compartir empresa
    const { error: shareError } = await supabase.from('share_company_users').insert([
      {
        company_id: company,
        profile_id: userId,
        role: values.role,
        customer_id: values.customer || null,
      },
    ]);

    if (shareError) {
      console.error('Error compartiendo empresa:', shareError);
      throw new Error(shareError.message);
    }

    // 6. Enviar email (DEBUG)
    // console.log('📧 Intentando enviar email a:', values.email);

    try {
      const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset_password/confirm`;
      const emailResult = await sendEmail({
        to: values.email,
        subject: 'Bienvenido a Nuestra Plataforma',
        userEmail: values.email,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

            <img src="${process.env.NEXT_PUBLIC_BASE_URL}/gh_logo.png" alt="Grupo H" style="width: 100px; margin-bottom: 16px;" />

            <h2>Bienvenido ${values.firstname} ${values.lastname}</h2>
            <p>Tu cuenta ha sido creada exitosamente.</p>
            <p><strong>Usuario:</strong> ${values.email}</p>
            <p><strong>Contraseña:</strong> ${values.password}</p>
            <p>La contraseña actual es genérica. Por favor, ingresa a la plataforma para crear tu contraseña personalizada.</p>
            <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
              Iniciar sesión
            </a>
          </div>
        `,
      });

      // console.log('✅ Resultado del envío de email:', emailResult);

      if (!emailResult.success) {
        console.warn('⚠️ Email no enviado, pero usuario creado:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Error enviando email:', emailError);
      // No fallar el proceso principal
    }

    return {
      success: true,
      message: 'Usuario creado exitosamente',
    };
  } catch (error) {
    console.error('❌ Error en registerUserWithRole:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al procesar la solicitud',
    };
  }
}
