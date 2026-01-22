'use server';
import { logger } from '@/lib/logger';
import { getPostHogServer } from '@/lib/posthog-server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '../../../database.types';

const supabaseLogger = logger.withScope('Supabase Server');

export const supabaseServer = async () => {
  const cookieStore = await cookies();

  // Interceptor de fetch para loguear peticiones y enviar errores a PostHog
  const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    const requestBody = init?.body;

    try {
      const response = await fetch(input, init);

      // Si hay error HTTP, capturar y enviar a PostHog
      if (!response.ok) {
        // Leer el body de la respuesta para más contexto
        let responseBody: string | object | undefined;
        try {
          responseBody = await response.clone().json();
        } catch {
          try {
            responseBody = await response.clone().text();
          } catch {
            responseBody = undefined;
          }
        }

        const errorData = {
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          responseBody,
          requestBody: requestBody ? String(requestBody).substring(0, 1000) : undefined,
          timestamp: new Date().toISOString(),
        };

        // supabaseLogger.error('Supabase Server Error', { data: errorData });

        // Enviar error a PostHog
        const posthog = getPostHogServer();

        const error = new Error(`Supabase Server Error: ${method} ${url} - ${response.status} ${response.statusText}`);
        posthog.captureException(error, undefined, {
          $exception_type: 'Supabase Server Error',
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          responseBody: typeof responseBody === 'object' ? JSON.stringify(responseBody) : responseBody,
          requestBody: requestBody ? String(requestBody).substring(0, 1000) : undefined,
        });
      }

      return response;
    } catch (error) {
      // Error de red
      const errorData = {
        method,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestBody: requestBody ? String(requestBody).substring(0, 1000) : undefined,
        timestamp: new Date().toISOString(),
      };

      supabaseLogger.error('Supabase Server Network Error', { data: errorData });

      // Enviar error a PostHog
      if (error instanceof Error) {
        const posthog = getPostHogServer();
        posthog.captureException(error, undefined, {
          $exception_type: 'Supabase Server Network Error',
          method,
          url,
          requestBody: requestBody ? String(requestBody).substring(0, 1000) : undefined,
        });
      }

      throw error;
    }
  };

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: interceptedFetch,
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
};

export const adminSupabaseServer = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Ignorar errores en componentes del servidor
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Ignorar errores en componentes del servidor
        }
      },
    },
  });
};
