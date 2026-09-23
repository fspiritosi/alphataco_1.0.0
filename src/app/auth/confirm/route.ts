// P4: auth — verifica el OTP de recuperación; sólo Supabase Auth, sin lectura de datos.
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // P4: auth
import { type EmailOtpType } from '@supabase/supabase-js'; // P4: auth
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/reset_password/update-user';
  const cookieStore = await cookies();

  // Crear redirect URL sin el token secreto
  const redirectTo = new URL(request.url);
  redirectTo.pathname = type === 'recovery' ? next : '/dashboard';
  redirectTo.searchParams.delete('token_hash');
  redirectTo.searchParams.delete('token');
  redirectTo.searchParams.delete('type');

  if ((token_hash || token) && type) {
    const supabase = createServerClient( // P4: auth
      process.env.NEXT_PUBLIC_SUPABASE_URL!, // P4: auth
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // P4: auth
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    // Usar token_hash si está disponible, sino usar token como token_hash
    const { error } = await supabase.auth.verifyOtp({ // P4: auth
      type: type as EmailOtpType,
      token_hash: token_hash || token || '',
    });

    if (!error) {
      redirectTo.searchParams.delete('next');
      return NextResponse.redirect(redirectTo);
    }
  }

  // Si hay error, redirigir a la página de error
  redirectTo.pathname = '/reset_password/confirm';
  redirectTo.searchParams.set('error', 'invalid_token');
  return NextResponse.redirect(redirectTo);
}
