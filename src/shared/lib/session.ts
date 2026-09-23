import 'server-only';

import { auth } from '@/shared/lib/auth';
import { headers } from 'next/headers';
import { cache } from 'react';

/**
 * Único punto de LECTURA de la sesión. El resto de `src/shared` y las features sólo conocen
 * estos helpers: cambiar de proveedor de auth se hace acá (P4 pasó de Supabase Auth a Better
 * Auth sin tocar a los consumidores).
 *
 * Los claims (`company`, `employeeId`) salen de la fila de `auth_session`, que sólo escribe el
 * servidor — ver `shared/lib/session-claims.ts` y el bloque de la invariante en
 * `shared/lib/auth.ts`. No hay cookie cache: `getSession` va a la base, así que un claim
 * recién escrito se ve en el request siguiente sin esperar a que expire nada.
 */

/**
 * Sesión del request, memoizada con React `cache()`: varias actions/páginas del mismo request
 * no repiten la consulta. Helper server-only, NO es una Server Action.
 */
const getAuthSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Id del usuario de sesión = `profile.credential_id` (el `user.id` de Better Auth, un uuid).
 * Es el valor que esperan `withActor` (`app.user_id`) y las funciones SQL de permisos
 * (`p_user_id`).
 */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const session = await getAuthSession();
  return session?.user.id ?? null;
});

/** `{ id, email }` del usuario de sesión, o null si no hay sesión. */
export const getSessionUser = cache(async (): Promise<{ id: string; email: string | null } | null> => {
  const session = await getAuthSession();
  if (!session) return null;
  return { id: session.user.id, email: session.user.email ?? null };
});

/**
 * Empresa activa según el claim de la sesión, o null si no está.
 * Lo consume `getActiveCompanyId()` (tenant.ts), que agrega el fallback a la cookie.
 */
export const getSessionCompanyClaim = cache(async (): Promise<string | null> => {
  const session = await getAuthSession();
  const company = session?.session.company;
  return typeof company === 'string' && company ? company : null;
});

/**
 * `employee_id` del usuario de sesión: el legajo que el login del QR validó contra el CUIL.
 * Lo usa la atribución de respuestas de checklist.
 */
export const getSessionEmployeeIdClaim = cache(async (): Promise<string | null> => {
  const session = await getAuthSession();
  const employeeId = session?.session.employeeId;
  return typeof employeeId === 'string' && employeeId ? employeeId : null;
});

/**
 * Nombre para mostrar del usuario de sesión. En el QR lo escribe el login del empleado con el
 * nombre del legajo; en el dashboard es el nombre con el que se dio de alta al usuario.
 */
export const getSessionDisplayName = cache(async (): Promise<string | null> => {
  const session = await getAuthSession();
  const name = session?.user.name;
  return typeof name === 'string' && name ? name : null;
});

/**
 * `true` si la sesión es anónima: el operario que entra por el QR de mantenimiento con su
 * CUIL, sin usuario del dashboard.
 *
 * Falla CERRADO: sin sesión devuelve `false`. Es lo contrario de lo que hacía la versión de
 * Supabase (`user?.is_anonymous ?? true`), donde la ausencia de sesión se leía como "anónima".
 * De esta función depende un corte de seguridad —`completeMaintenanceEmployeeAnonymous
 * Session()` la usa para negarse a escribir los claims sobre una sesión que no sea anónima—,
 * y el default correcto para eso es negar.
 */
export const isSessionAnonymous = cache(async (): Promise<boolean> => {
  const session = await getAuthSession();
  return session?.user.isAnonymous === true;
});

/**
 * `true` si el usuario entró con una contraseña temporal y todavía no la cambió (lo mira el
 * cartel de cambio de contraseña obligatorio).
 */
export const getSessionNeedsPasswordChange = cache(async (): Promise<boolean> => {
  const session = await getAuthSession();
  return session?.user.needsPasswordChange === true;
});

/**
 * Token de la sesión del request. Lo necesitan las escrituras de claims de
 * `shared/lib/session-claims.ts`, que apuntan a la fila de `auth_session` por su token.
 * No sale nunca al cliente.
 */
export const getSessionToken = cache(async (): Promise<string | null> => {
  const session = await getAuthSession();
  return session?.session.token ?? null;
});
