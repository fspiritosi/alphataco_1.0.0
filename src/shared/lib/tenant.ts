'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export class NoActiveCompanyError extends Error {
  constructor() {
    super('No hay empresa activa para este usuario');
  }
}

/** Empresa activa del request: app_metadata.company del JWT, con fallback a la cookie actualComp. Lanza NoActiveCompanyError si no hay ninguna. */
export async function getActiveCompanyId(): Promise<string> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const fromJwt = data.user?.app_metadata?.company;
  if (typeof fromJwt === 'string' && fromJwt) return fromJwt;
  const fromCookie = (await cookies()).get('actualComp')?.value;
  if (fromCookie && fromCookie !== 'undefined') return fromCookie;
  throw new NoActiveCompanyError();
}
