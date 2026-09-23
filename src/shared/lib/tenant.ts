import 'server-only';

import { canAccessCompany, canUseCompanyAsTenant } from '@/shared/lib/company-membership';
import { prisma } from '@/shared/lib/prisma';
import { getSessionCompanyClaim, getSessionUserId } from '@/shared/lib/session';
import { cookies } from 'next/headers';
import { cache } from 'react';

export class NoActiveCompanyError extends Error {
  constructor() {
    super('No hay empresa activa para este usuario');
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ¿Puede `companyId` ser la empresa activa de esta sesión?
 *
 * Es el predicado de `canUseCompanyAsTenant()` resuelto contra la base: owner de la
 * empresa, miembro activo de `share_company_users`, o empleado de esa empresa vinculado al
 * profile. Devuelve `false` (nunca lanza) ante cualquier duda: sin sesión, sin profile,
 * id que no es uuid o empresa inexistente.
 *
 * Lo usan `getActiveCompanyId()` para validar la cookie y `switchActiveCompany()` para
 * validar el cambio de empresa que pide el cliente. Memoizado por request y por
 * `companyId` con React `cache()`.
 */
export const canUseAsActiveCompany = cache(async (companyId: string): Promise<boolean> => {
  if (!UUID_RE.test(companyId)) return false;

  const credentialId = await getSessionUserId();
  if (!credentialId) return false;

  const profile = await prisma.profile.findUnique({
    where: { credential_id: credentialId },
    select: { id: true, employee_id: true },
  });
  if (!profile) return false;

  const [company, membership, employee] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { owner_id: true } }),
    prisma.share_company_users.findFirst({
      where: { profile_id: profile.id, company_id: companyId },
      select: { is_active: true },
    }),
    profile.employee_id
      ? prisma.employees.findFirst({
          where: { id: profile.employee_id, company_id: companyId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  return canUseCompanyAsTenant({
    profileId: profile.id,
    company,
    membership,
    hasEmployeeInCompany: employee !== null,
  });
});

/**
 * Empresa activa del request: `app_metadata.company` del JWT, con fallback a la cookie
 * `actualComp`. Lanza `NoActiveCompanyError` si no hay ninguna utilizable.
 *
 * El claim del JWT es de confianza: lo escribe el servidor (`switchActiveCompany()`, el
 * login del QR) y sólo después de validar la pertenencia. La cookie NO lo es por sí sola
 * —es el valor que más viaja por el sistema y define el perímetro de casi toda action—,
 * así que se valida con `canUseAsActiveCompany()` antes de devolverla: una cookie con un
 * uuid ajeno se descarta como si no existiera.
 *
 * Helper server-only (NO es una Server Action): se memoiza por request con React `cache()`,
 * así varias actions/páginas del mismo request no repiten la lectura de sesión.
 */
export const getActiveCompanyId = cache(async (): Promise<string> => {
  const fromJwt = await getSessionCompanyClaim();
  if (fromJwt) return fromJwt;

  const fromCookie = (await cookies()).get('actualComp')?.value;
  if (fromCookie && fromCookie !== 'undefined' && (await canUseAsActiveCompany(fromCookie))) {
    return fromCookie;
  }

  throw new NoActiveCompanyError();
});

/**
 * Verifica que el usuario de sesión pueda operar sobre `companyId` (owner o miembro activo de
 * `share_company_users`). Sin RLS, toda Server Action que reciba un `companyId` del cliente
 * tiene que llamarlo al inicio: si no, cualquier UUID de empresa pasa a ser consultable.
 *
 * Lanza `NoActiveCompanyError` sin sesión y `Error('Sin acceso a la empresa')` en cualquier
 * otro caso (empresa inexistente, id inválido, profile ausente, sin pertenencia).
 * Memoizado por request y por `companyId` con React `cache()`.
 */
export const assertCompanyAccess = cache(async (companyId: string): Promise<void> => {
  const credentialId = await getSessionUserId();
  if (!credentialId) throw new NoActiveCompanyError();
  if (!UUID_RE.test(companyId)) throw new Error('Sin acceso a la empresa');

  const profile = await prisma.profile.findUnique({ where: { credential_id: credentialId }, select: { id: true } });
  if (!profile) throw new Error('Sin acceso a la empresa');

  const [company, membership] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { owner_id: true } }),
    prisma.share_company_users.findFirst({
      where: { profile_id: profile.id, company_id: companyId },
      select: { is_active: true },
    }),
  ]);

  if (!canAccessCompany({ profileId: profile.id, company, membership })) {
    throw new Error('Sin acceso a la empresa');
  }
});

/**
 * Escribe la cookie `actualComp` desde el servidor.
 *
 * Es el único punto de escritura de la cookie junto con el middleware: el cliente ya no la
 * escribe (es `httpOnly`, `document.cookie` no la puede pisar) y para cambiar de empresa
 * llama a `switchActiveCompany()`. Las features no la conocen, usan `getActiveCompanyId()`.
 * La necesitan los logins derivados del servidor —el QR de mantenimiento y el panel de
 * ropa—, donde la empresa sale del legajo/equipo y todavía no está en el JWT.
 * P4 la elimina junto con la sesión de Supabase.
 *
 * El valor que recibe tiene que venir ya validado por quien llama (el empleado del legajo,
 * el vehículo escaneado o `canUseAsActiveCompany()`).
 */
export async function setActiveCompanyCookie(companyId: string, maxAgeSeconds = 60 * 60): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('actualComp', companyId, {
    path: '/',
    maxAge: maxAgeSeconds, // 1 hora por defecto
    httpOnly: true, // sólo el servidor: era escribible desde document.cookie
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

/** Borra la cookie `actualComp` (cierre de sesión). */
export async function clearActiveCompanyCookie(): Promise<void> {
  (await cookies()).delete('actualComp');
}
