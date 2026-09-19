import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export type UpdateSessionResult = {
  response: NextResponse;
  user: User | null;
};

export async function updateSession(req: NextRequest): Promise<UpdateSessionResult> {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si hay usuario autenticado (no anónimo), asegurar que exista la cookie actualComp
  if (user && !user.is_anonymous) {
    const actualComp = req.cookies.get('actualComp')?.value;

    // Si no hay cookie o es inválida, intentar setearla desde la empresa del JWT
    if (!actualComp || actualComp === 'undefined' || actualComp.trim() === '') {
      const fromJwt = user.app_metadata?.company;

      // Si tampoco hay empresa en el JWT, no fijar nada — proxy.ts redirige a
      // /dashboard/company/new cuando has_company === false
      if (typeof fromJwt === 'string' && fromJwt) {
        const cookieOptions = {
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 año
          sameSite: 'lax' as const,
          secure: process.env.NODE_ENV === 'production',
        };

        // El nombre de la empresa lo resuelve la UI — no se fija actualCompName aquí
        response.cookies.set('actualComp', fromJwt, cookieOptions);
      }
    }
  }

  return { response, user };
}
