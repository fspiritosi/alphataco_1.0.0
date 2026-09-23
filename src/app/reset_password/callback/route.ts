// P4: auth — verifica el OTP de reseteo de contraseña; sólo Supabase Auth.
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // P4: auth
import { type EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const email = searchParams.get('email');
  const next = searchParams.get('next') ?? '/reset_password/update-user';
  const cookieStore = await cookies();

  if ((token_hash || token) && type) {
    const supabase = createServerClient( // P4: auth
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    let verifyResult;

    if (token_hash) {
      // Usar token_hash para PKCE flow
      verifyResult = await supabase.auth.verifyOtp({
        token_hash,
        type: type as EmailOtpType,
      });
    } else if (token && email) {
      // Usar token para implicit flow (requiere email)
      verifyResult = await supabase.auth.verifyOtp({
        token,
        email,
        type: type as EmailOtpType,
      });
    }

    if (verifyResult && !verifyResult.error) {
      // Redirigir a la página de actualización de contraseña
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si hay error, redirigir a la página de error
  return NextResponse.redirect(`${origin}/reset_password/confirm?error=invalid_token`);
}
