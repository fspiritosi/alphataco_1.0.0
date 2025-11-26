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

      // Asignar company en app_metadata si no lo tiene
      const { data: userData } = await adminSupabase.auth.admin.getUserById(profile.credential_id!);
      if (!userData?.user?.app_metadata?.company) {
        await adminSupabase.auth.admin.updateUserById(profile.credential_id!, {
          app_metadata: {
            company: company,
          },
        });
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

      // Asignar rol en el sistema de permisos para usuario existente
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id, slug')
        .or(`name.eq.${values.role},slug.eq.${values.role.toLowerCase()}`)
        .single();

      if (!roleError && roleData) {
        // Verificar si ya tiene el rol asignado
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', profile.id)
          .eq('role_id', roleData.id)
          .single();

        if (!existingRole) {
          await supabase.from('user_roles').insert([
            {
              user_id: profile.id,
              role_id: roleData.id,
            },
          ]);
        }
      }
    } else {
      // 3. Si no existe el perfil, invitar nuevo usuario usando Supabase Auth
      const fullname = values.firstname && values.lastname ? `${values.firstname} ${values.lastname}`.trim() : '';

      // Invitar usuario usando el método nativo de Supabase
      const { data: authData, error: authError } = await adminSupabase.auth.admin.inviteUserByEmail(values.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm`,
        data: {
          fullname: fullname,
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
          role: values.role,
          credential_id: userId,
        },
      ]);

      if (profileCreateError) {
        console.error('❌ [INVITE] Error creando perfil:', profileCreateError);
        // ROLLBACK: Eliminar usuario si falla la creación del perfil
        await adminSupabase.auth.admin.deleteUser(userId);

        throw new Error(`Error al crear perfil: ${profileCreateError.message}`);
      }

      // Asignar company en app_metadata
      const { error: metadataError } = await adminSupabase.auth.admin.updateUserById(userId, {
        app_metadata: {
          company: company,
        },
      });

      if (metadataError) {
        console.error('❌ [INVITE] Error asignando metadata:', metadataError);
        // ROLLBACK: Eliminar usuario y perfil si falla la asignación de metadata
        await adminSupabase.from('profile').delete().eq('id', userId);
        await adminSupabase.auth.admin.deleteUser(userId);

        throw new Error(`Error al asignar metadata: ${metadataError.message}`);
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

    // 4. Asignar rol en el sistema de permisos (user_roles)
    // Buscar el rol por nombre o slug
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id, slug')
      .or(`name.eq.${values.role},slug.eq.${values.role.toLowerCase()}`)
      .single();

    if (roleError || !roleData) {
      console.warn('⚠️ No se encontró el rol en el sistema de permisos:', values.role);
      // No hacer rollback, el usuario ya fue creado exitosamente
    } else {
      // Asignar el rol al usuario
      const { error: userRoleError } = await supabase.from('user_roles').insert([
        {
          user_id: userId,
          role_id: roleData.id,
        },
      ]);

      if (userRoleError) {
        console.error('❌ Error asignando rol al usuario:', userRoleError);
        // No hacer rollback, el usuario ya fue creado exitosamente
        // El rol se puede asignar manualmente después
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
