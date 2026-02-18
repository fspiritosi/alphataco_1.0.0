'use server';

import { logger } from '@/lib/logger';
import { adminSupabaseServer, supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function registerUserWithRole(values: any) {
  const supabase = await supabaseServer();
  const adminSupabase = await adminSupabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) throw new Error('No hay compani id');

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
        .eq('company_id', company_id);

      if (accessError) throw new Error(accessError.message);
      if (existingAccess && existingAccess.length > 0) {
        throw new Error('El usuario ya tiene acceso a esta empresa');
      }

      // Asignar company en app_metadata si no lo tiene
      const { data: userData } = await adminSupabase.auth.admin.getUserById(profile.credential_id!);
      if (!userData?.user?.app_metadata?.company) {
        await adminSupabase.auth.admin.updateUserById(profile.credential_id!, {
          app_metadata: {
            company: company_id,
          },
        });
      }

      // Compartir la empresa con el usuario existente
      const { error: shareError } = await supabase.from('share_company_users').insert([
        {
          company_id: company_id,
          profile_id: profile.id,
          customer_id: values.customer || null,
        },
      ]);

      if (shareError) {
        logger.error('Error insertando en share_company_users', { data: { error: shareError } });
        throw new Error(shareError.message);
      }

      // Asignar rol en el sistema de permisos para usuario existente
      const roleId = Number(values.role);

      if (!isNaN(roleId)) {
        // Verificar si ya tiene el rol asignado
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', profile.id)
          .eq('role_id', roleId)
          .single();

        if (!existingRole) {
          const { error: userRoleError } = await supabase.from('user_roles').insert([
            {
              user_id: profile.id,
              role_id: roleId,
            },
          ]);

          if (userRoleError) {
            logger.error('Error asignando rol al usuario existente', { data: { error: userRoleError } });
          }
        }
      }
    } else {
      // 3. Si no existe el perfil, invitar nuevo usuario usando Supabase Auth
      const fullname = values.firstname && values.lastname ? `${values.firstname} ${values.lastname}`.trim() : '';

      // Crear usuario auto-verificado (sin necesidad de confirmar email)
      const hasPassword = values.password && values.password.trim().length > 0;
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: values.email,
        password: hasPassword ? values.password : undefined,
        email_confirm: true,
        user_metadata: {
          fullname: fullname,
          needs_password_change: !hasPassword,
        },
      });

      if (authError) {
        logger.error('Error creando usuario', { data: { error: authError } });
        throw new Error(`Error al crear usuario: ${authError.message}`);
      }

      // Si no se proporcionó contraseña (invitación), enviar email de recuperación
      // para que el usuario pueda establecer su propia contraseña
      if (!hasPassword) {
        await supabase.auth.resetPasswordForEmail(values.email, {
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm`,
        });
      }

      userId = authData.user?.id;
      if (!userId) {
        logger.error('No se pudo obtener el ID del usuario');
        throw new Error('No se pudo obtener el ID del usuario');
      }

      // Obtener el nombre del rol para el campo legacy profile.role
      const roleId = Number(values.role);
      let roleName = 'User'; // Default

      if (!isNaN(roleId)) {
        const { data: roleData } = await supabase.from('roles').select('name').eq('id', roleId).single();

        if (roleData) {
          roleName = roleData.name;
        }
      }

      // Crear perfil
      const { error: profileCreateError } = await adminSupabase.from('profile').insert([
        {
          id: userId,
          email: values.email,
          fullname: fullname,
          role: roleName, // Usar el nombre del rol, no el ID
          credential_id: userId,
        },
      ]);

      if (profileCreateError) {
        logger.error('Error creando perfil', { data: { error: profileCreateError } });
        // ROLLBACK: Eliminar usuario si falla la creación del perfil
        await adminSupabase.auth.admin.deleteUser(userId);

        throw new Error(`Error al crear perfil: ${profileCreateError.message}`);
      }

      // Asignar company en app_metadata
      const { error: metadataError } = await adminSupabase.auth.admin.updateUserById(userId, {
        app_metadata: {
          company: company_id,
        },
      });

      if (metadataError) {
        logger.error('Error asignando metadata', { data: { error: metadataError } });
        // ROLLBACK: Eliminar usuario y perfil si falla la asignación de metadata
        await adminSupabase.from('profile').delete().eq('id', userId);
        await adminSupabase.auth.admin.deleteUser(userId);

        throw new Error(`Error al asignar metadata: ${metadataError.message}`);
      }

      // Compartir empresa
      const { error: shareError } = await adminSupabase.from('share_company_users').insert([
        {
          company_id: company_id,
          profile_id: userId,
          customer_id: values.customer || null,
        },
      ]);

      if (shareError) {
        logger.error('Error compartiendo empresa', { data: { error: shareError } });
        // ROLLBACK: Eliminar usuario y perfil si falla la asignación de empresa
        await adminSupabase.from('profile').delete().eq('id', userId);
        await adminSupabase.auth.admin.deleteUser(userId);

        throw new Error(`Error al compartir empresa: ${shareError.message}`);
      }
    }

    // 4. Asignar rol en el sistema de permisos (user_roles)
    const roleId = Number(values.role);

    if (!isNaN(roleId)) {
      // Asignar el rol al usuario
      const { error: userRoleError } = await supabase.from('user_roles').insert([
        {
          user_id: userId,
          role_id: roleId,
        },
      ]);

      if (userRoleError) {
        logger.error('Error asignando rol al usuario', { data: { error: userRoleError } });
        // No hacer rollback, el usuario ya fue creado exitosamente
        // El rol se puede asignar manualmente después
      }
    } else {
      logger.warn('El rol proporcionado no es un ID válido', { data: { role: values.role } });
    }

    return {
      success: true,
      message: 'Usuario creado exitosamente',
    };
  } catch (error) {
    logger.error('Error en registerUserWithRole', { data: { error } });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al procesar la solicitud',
    };
  }
}
