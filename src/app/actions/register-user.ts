'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function registerUserWithRole(values: any, company: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Verificar si el usuario ya existe
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('*')
      .eq('email', values.email)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(profileError.message);
    }

    // Si el perfil existe, verificar acceso a la empresa
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

      if (shareError) throw new Error(shareError.message);
      return { success: true, message: 'Usuario agregado a la empresa exitosamente' };
    }

    // Si no existe el perfil, crear nuevo usuario
    if (values.password) {
      // Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
      });

      if (authError) throw new Error(authError.message);

      // Crear perfil
      const { error: profileCreateError } = await supabase.from('profile').insert([
        {
          id: authData.user.id,
          email: values.email,
          fullname: `${values.firstname} ${values.lastname}`.trim(),
          role: 'CodeControlClient',
          credential_id: authData.user.id,
        },
      ]);

      if (profileCreateError) throw new Error(profileCreateError.message);

      // Compartir la empresa con el nuevo usuario
      const { error: shareError } = await supabase.from('share_company_users').insert([
        {
          company_id: company,
          profile_id: authData.user.id,
          role: values.role,
          customer_id: values.customer || null,
        },
      ]);

      if (shareError) throw new Error(shareError.message);
      return { success: true, message: 'Usuario creado y agregado a la empresa exitosamente' };
    }

    throw new Error('No se pudo completar el registro');
  } catch (error) {
    console.error('Error en registerUserWithRole:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al procesar la solicitud',
    };
  }
}
