import 'server-only';

import { getSessionCompanyClaim } from '@/shared/lib/session';
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
