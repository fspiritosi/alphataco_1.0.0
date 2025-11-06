'use server';

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

    let userId: string;

    // 2. Si el perfil existe, verificar acceso a la empresa
    if (profile) {
      userId = profile.id;

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
    } else {
      // 3. Si no existe el perfil, invitar nuevo usuario usando Supabase Auth
      const fullname = values.firstname && values.lastname ? `${values.firstname} ${values.lastname}`.trim() : '';

      // Invitar usuario usando el método nativo de Supabase
      const { data: authData, error: authError } = await adminSupabase.auth.admin.inviteUserByEmail(values.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm`,
        data: {
          fullname: fullname,
          company_id: company,
          role: values.role,
          customer_id: values.customer || null,
          needs_password_change: true, // Flag para indicar que necesita cambiar contraseña
        },
      });

      if (authError) {
        console.error('❌ [INVITE] Error invitando usuario:', authError);
        throw new Error(`Error al invitar usuario: ${authError.message}`);
      }

      userId = authData.user?.id;
      if (!userId) {
        console.error('❌ [INVITE] No se pudo obtener el ID del usuario');
        throw new Error('No se pudo obtener el ID del usuario');
      }

      // Crear perfil
      const { error: profileCreateError } = await adminSupabase.from('profile').insert([
        {
          id: userId,
          email: values.email,
          fullname: fullname,
          role: 'CodeControlClient',
          credential_id: userId,
        },
      ]);

      if (profileCreateError) {
        console.error('❌ [INVITE] Error creando perfil:', profileCreateError);
        // ROLLBACK: Eliminar usuario si falla la creación del perfil
        await adminSupabase.auth.admin.deleteUser(userId);

        throw new Error(`Error al crear perfil: ${profileCreateError.message}`);
      }

      // Compartir empresa
      const { error: shareError } = await adminSupabase.from('share_company_users').insert([
        {
          company_id: company,
          profile_id: userId,
          role: values.role,
          customer_id: values.customer || null,
        },
      ]);

      if (shareError) {
        console.error('❌ [INVITE] Error compartiendo empresa:', shareError);
        // ROLLBACK: Eliminar usuario y perfil si falla la asignación de empresa
        await adminSupabase.from('profile').delete().eq('id', userId);
        await adminSupabase.auth.admin.deleteUser(userId);

        throw new Error(`Error al compartir empresa: ${shareError.message}`);
      }
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
