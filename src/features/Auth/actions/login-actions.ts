'use server';

import { supabaseServer } from '@/lib/supabase/server'; // P4: auth
import { clearActiveCompanyCookie } from '@/shared/lib/tenant';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Login, logout y OAuth. Son llamadas `auth.*`: se conservan tal cual y las reemplaza P4
 * (Better Auth). Acá no queda acceso a datos.
 *
 * El flujo propio de recuperación de contraseña (`password_reset_tokens`, `verifyResetToken`,
 * `markTokenAsUsed`) se eliminó: quedó sin llamadores cuando se borraron sus rutas API y el
 * flujo vigente es el nativo (`resetPasswordAction` en `auth-actions.ts`).
 */
export async function login(formData: FormData) {
  const supabase = await supabaseServer(); // P4: auth

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error, data: user } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error?.message };
  }
  return user;
}

export async function logout() {
  const supabase = await supabaseServer(); // P4: auth
  await supabase.auth.signOut();
  await clearActiveCompanyCookie();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function googleLogin(url: string) {
  const supabase = await supabaseServer(); // P4: auth

  const { data, error } = await supabase.auth.signInWithOAuth({
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
