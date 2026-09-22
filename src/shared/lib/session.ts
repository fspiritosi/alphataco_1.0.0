import 'server-only';

// P4: auth — único punto de contacto con Supabase Auth para datos. P4 reemplaza este módulo
// por la sesión propia; el resto de `src/shared` y las features sólo conocen estos helpers.
import { supabaseServer } from '@/lib/supabase/server';
import { cache } from 'react';

/**
 * Usuario autenticado del request (`auth.getUser()`, validado contra el servidor de Auth).
 * Memoizado por request con React `cache()`: varias actions/páginas del mismo request no
 * repiten la llamada. Helper server-only, NO es una Server Action.
 */
const getAuthUser = cache(async () => {
  // P4: auth
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

/**
 * Id del usuario de sesión = `profile.credential_id` (hasta P4, el `user.id` de Supabase Auth).
 * Es el valor que esperan `withActor` (`app.user_id`) y las funciones SQL de permisos (`p_user_id`).
 */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const user = await getAuthUser();
  return user?.id ?? null;
});

/** `{ id, email }` del usuario de sesión, o null si no hay sesión. */
export const getSessionUser = cache(async (): Promise<{ id: string; email: string | null } | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
});

/**
 * Empresa activa según el JWT (`app_metadata.company`), o null si el claim no está.
 * Lo consume `getActiveCompanyId()` (tenant.ts), que agrega el fallback a la cookie.
 */
export const getSessionCompanyClaim = cache(async (): Promise<string | null> => {
  // P4: auth
  const user = await getAuthUser();
  const company = user?.app_metadata?.company;
  return typeof company === 'string' && company ? company : null;
});

/**
 * Sesión decodificada desde la cookie — 0 llamadas de red (`auth.getSession()`).
 * Sólo usar DESPUÉS de que el middleware validó al usuario con `getUser()`.
 * Los consumidores leen `session.user.id` y `session.user.app_metadata.company`; P4 los
 * migra a `getSessionUserId()` / `getActiveCompanyId()`.
 */
export const getCachedSession = cache(async () => {
  // P4: auth
  const supabase = await supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
});
