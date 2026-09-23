import 'server-only';

import { canAccessCompany } from '@/shared/lib/company-membership';
import { prisma } from '@/shared/lib/prisma';
import { getSessionCompanyClaim, getSessionUserId } from '@/shared/lib/session';
import { cookies } from 'next/headers';
import { cache } from 'react';

export class NoActiveCompanyError extends Error {
  constructor() {
    super('No hay empresa activa para este usuario');
  }
}

/**
 * Empresa activa del request: app_metadata.company del JWT, con fallback a la cookie actualComp.
 * Lanza NoActiveCompanyError si no hay ninguna.
 *
 * Helper server-only (NO es una Server Action): se memoiza por request con React `cache()`,
 * así varias actions/páginas del mismo request no repiten la lectura de sesión.
 */
export const getActiveCompanyId = cache(async (): Promise<string> => {
  const fromJwt = await getSessionCompanyClaim();
  if (fromJwt) return fromJwt;
  const fromCookie = (await cookies()).get('actualComp')?.value;
  if (fromCookie && fromCookie !== 'undefined') return fromCookie;
  throw new NoActiveCompanyError();
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * Es el único punto de escritura de la cookie fuera del middleware y del store del
 * cliente: las features no la conocen, usan `getActiveCompanyId()`. Lo necesita el login
 * anónimo del QR de mantenimiento, donde la empresa sale del legajo/equipo y todavía no
 * está en el JWT. P4 la elimina junto con la sesión de Supabase.
 */
export async function setActiveCompanyCookie(companyId: string, maxAgeSeconds = 60 * 60): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('actualComp', companyId, {
    path: '/',
    maxAge: maxAgeSeconds, // 1 hora por defecto
    httpOnly: false, // el cliente también la lee
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

/** Borra la cookie `actualComp` (cierre de sesión). */
export async function clearActiveCompanyCookie(): Promise<void> {
  (await cookies()).delete('actualComp');
}
