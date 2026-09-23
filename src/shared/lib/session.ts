import 'server-only';

// P4: auth — único punto de contacto con Supabase Auth para datos. P4 reemplaza este módulo
// por la sesión propia; el resto de `src/shared` y las features sólo conocen estos helpers.
import { supabaseServer } from '@/lib/supabase/server'; // P4: auth
import { cache } from 'react';

/**
 * Usuario autenticado del request (`auth.getUser()`, validado contra el servidor de Auth).
 * Memoizado por request con React `cache()`: varias actions/páginas del mismo request no
 * repiten la llamada. Helper server-only, NO es una Server Action.
 */
const getAuthUser = cache(async () => {
  const supabase = await supabaseServer(); // P4: auth
  const { data } = await supabase.auth.getUser(); // P4: auth
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
 * `employee_id` del usuario de sesión (`app_metadata` con fallback a `user_metadata`),
 * o null si el claim no está. Lo usa la atribución de respuestas de checklist.
 */
export const getSessionEmployeeIdClaim = cache(async (): Promise<string | null> => {
  // P4: auth
  const user = await getAuthUser();
  const fromApp = user?.app_metadata?.employee_id;
  if (typeof fromApp === 'string' && fromApp) return fromApp;
  const fromUser = user?.user_metadata?.employee_id;
  return typeof fromUser === 'string' && fromUser ? fromUser : null;
});

/**
 * Nombre para mostrar del usuario de sesión (`user_metadata.fullname`, con fallback a
 * `user_metadata.employeeName`). Lo escribe el login anónimo del QR de mantenimiento.
 */
export const getSessionDisplayName = cache(async (): Promise<string | null> => {
  // P4: auth
  const user = await getAuthUser();
  const fullname = user?.user_metadata?.fullname;
  if (typeof fullname === 'string' && fullname) return fullname;
  const employeeName = user?.user_metadata?.employeeName;
  return typeof employeeName === 'string' && employeeName ? employeeName : null;
});

/**
 * `true` si la sesión es anónima (o si no hay sesión): es el caso del operario que entra
 * por el QR de mantenimiento con su CUIL, sin usuario del dashboard.
 */
export const isSessionAnonymous = cache(async (): Promise<boolean> => {
  // P4: auth
  const user = await getAuthUser();
  return user?.is_anonymous ?? true;
});

/**
 * Sesión decodificada desde la cookie — 0 llamadas de red (`auth.getSession()`).
 * Sólo usar DESPUÉS de que el middleware validó al usuario con `getUser()`.
 * Los consumidores leen `session.user.id` y `session.user.app_metadata.company`; P4 los
 * migra a `getSessionUserId()` / `getActiveCompanyId()`.
 */
export const getCachedSession = cache(async () => {
  const supabase = await supabaseServer(); // P4: auth
  const {
    data: { session },
  } = await supabase.auth.getSession(); // P4: auth
  return session;
});
