'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const supabase = supabaseServer();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error, data: user } = await supabase.auth.signInWithPassword(data);
  // const { error, data: user } = await supabase.auth.signInWithOtp({
  //   email: data.email,
  //   options: {
  //     emailRedirectTo: 'http://localhost:3000/login/auth/callback',
  //   },
  // })
  console.log(error);

  if (error) {
    console.log(error.message);
    return { error: error.message };
  }
  if (user.session) {
    redirect(`/dashboard`);
  } else {
    redirect('/login');
  }
}

export async function logout() {
  const supabase = supabaseServer();
  await supabase.auth.signOut();
  const cookiesStore = cookies();
  cookiesStore.delete('actualComp');
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function googleLogin(url: string) {
  const supabase = supabaseServer();

  let { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: url + '/login/auth/callback',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return error;
  }
  if (data.url) {
    redirect(data.url); // use the redirect API for your server framework
  }
}

export async function verifyResetToken(token: string, email: string) {
  const supabase = supabaseServer();

  try {
    // Verificar que el token existe y es válido
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens' as any)
      .select(
        `
        *,
        profile:profile_id (email)
      `
      )
      .eq('token', token)
      .eq('used', false)
      .gt('expires', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      return {
        success: false,
        error: 'Token inválido o expirado',
      };
    }

    // Verificar que el email coincide
    if (tokenData.profile.email !== email) {
      return {
        success: false,
        error: 'Token no coincide con el email',
      };
    }

    return {
      success: true,
      profileId: tokenData.profile_id,
    };
  } catch (error) {
    console.error('Error verificando token:', error);
    return {
      success: false,
      error: 'Error al verificar el token',
    };
  }
}

export async function markTokenAsUsed(token: string) {
  const supabase = supabaseServer();

  try {
    const { error } = await supabase
      .from('password_reset_tokens' as any)
      .update({ used: true })
      .eq('token', token);

    if (error) {
      console.error('Error marcando token como usado:', error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error marcando token como usado:', error);
    return { success: false };
  }
}
