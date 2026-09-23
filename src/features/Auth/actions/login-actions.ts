'use server';

import { auth } from '@/shared/lib/auth';
import { normalizeEmail } from '@/shared/lib/auth-credentials';
import { clearActiveCompanyCookie } from '@/shared/lib/tenant';
import { APIError } from 'better-auth/api';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Login, logout y OAuth del dashboard, sobre Better Auth. Acá no hay acceso a datos.
 *
 * El claim de empresa de la sesión NO se escribe acá: lo estampa el hook
 * `session.create.before` de `shared/lib/auth.ts`, resolviéndolo contra la base. Este módulo
 * sólo entrega credenciales.
 *
 * La cookie de sesión la escribe el plugin `nextCookies()` cuando la llamada corre dentro de
 * una Server Action; por eso el login pasa por acá y no por el cliente.
 */

export type LoginResult = { error: string } | { success: true };

/** Traduce los errores de Better Auth a los mensajes que ya mostraba la UI. */
function loginErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    const message = error.body?.message ?? '';
    if (error.status === 'FORBIDDEN' && message) return message;
    if (error.body?.code === 'INVALID_EMAIL_OR_PASSWORD' || message.toLowerCase().includes('invalid')) {
      return 'Correo o contraseña inválidos';
    }
    if (message) return message;
  }
  return 'No se pudo iniciar sesión';
}

export async function login(formData: FormData): Promise<LoginResult> {
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return { error: 'Correo o contraseña inválidos' };
  }

  try {
    await auth.api.signInEmail({
      body: { email: normalizeEmail(email), password },
      headers: await headers(),
    });
  } catch (error) {
    return { error: loginErrorMessage(error) };
  }

  return { success: true };
}

export async function logout() {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Sin sesión válida el cierre es un no-op: igual se limpia la empresa activa.
  }
  await clearActiveCompanyCookie();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Arranca el OAuth de Google. Devuelve la URL del proveedor y redirige.
 *
 * `disableSignUp` está activo en el proveedor (ver `shared/lib/auth.ts`): Google no da de
 * alta, sólo deja entrar a un mail que ya tiene usuario creado por invitación.
 */
export async function googleLogin(callbackPath = '/dashboard'): Promise<{ error: string } | never> {
  let url: string | undefined;

  try {
    const result = await auth.api.signInSocial({
      body: { provider: 'google', callbackURL: callbackPath, errorCallbackURL: '/login?error=oauth' },
      headers: await headers(),
    });
    url = result.url;
  } catch (error) {
    return { error: loginErrorMessage(error) };
  }

  if (!url) return { error: 'No se pudo iniciar sesión con Google' };
  redirect(url);
}
