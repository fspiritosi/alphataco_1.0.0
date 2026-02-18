'use server';
import { logger } from '@/lib/logger';
import { getPostHogServer } from '@/lib/posthog-server';
import { extractPostHogCookieData, serializeForPostHog } from '@/lib/posthog/utils';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '../../../database.types';

const supabaseLogger = logger.withScope('Supabase Server');

export const supabaseServer = async () => {
  const cookieStore = await cookies();

  // Extraer distinctId y sessionId de las cookies de PostHog para vincular errores al usuario
  const allCookies = cookieStore.getAll();
  const postHogCookieEntry = allCookies.find((c) => /ph_phc_.*_posthog$/.test(c.name));
  let posthogDistinctId: string | undefined;
  let posthogSessionId: string | undefined;

  if (postHogCookieEntry) {
    try {
      const cookieString = `${postHogCookieEntry.name}=${postHogCookieEntry.value}`;
      const cookieData = extractPostHogCookieData(cookieString);
      posthogDistinctId = cookieData.distinctId;
      posthogSessionId = cookieData.sessionId;
    } catch {
      // Silenciar — no interrumpir el flujo
    }
  }

  const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? 'GET';
    const requestBody = init?.body;

    try {
      const response = await fetch(input, init);

      if (!response.ok) {
        // Leer el body para obtener el mensaje de error de Supabase/PostgreSQL
        let responseBody: Record<string, unknown> | string | undefined;
        try {
          responseBody = await response.clone().json();
        } catch {
          try {
            responseBody = await response.clone().text();
          } catch {
            responseBody = undefined;
          }
        }

        // Construir un mensaje de error legible
        // PostgrestError tiene: { code, message, details, hint }
        let errorMessage = `Supabase ${response.status} ${response.statusText}: ${method} ${url}`;
        if (responseBody && typeof responseBody === 'object' && typeof responseBody.message === 'string') {
          errorMessage = `${responseBody.message} [${response.status}] ${method} ${url}`;
        }

        const error = new Error(errorMessage);
        error.name = 'SupabaseServerError';

        const posthog = getPostHogServer();
        posthog.captureException(error, posthogDistinctId, {
          ...(posthogSessionId ? { $session_id: posthogSessionId } : {}),
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          // Serializar el body correctamente — nunca pasar objetos crudos
          response_body: serializeForPostHog(responseBody),
          request_body: requestBody
            ? serializeForPostHog(typeof requestBody === 'string' ? requestBody.substring(0, 500) : requestBody)
            : undefined,
        });

        supabaseLogger.error('Supabase Server Error', {
          data: { status: response.status, method, url, responseBody },
        });
      }

      return response;
    } catch (error) {
      // Error de red — la request no llegó al servidor
      supabaseLogger.error('Supabase Server Network Error', {
        data: {
          method,
          url,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      if (error instanceof Error) {
        const posthog = getPostHogServer();
        posthog.captureException(error, posthogDistinctId, {
          ...(posthogSessionId ? { $session_id: posthogSessionId } : {}),
          method,
          url,
          request_body: requestBody
            ? serializeForPostHog(typeof requestBody === 'string' ? requestBody.substring(0, 500) : requestBody)
            : undefined,
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
            // Ignorar si se llama desde un Server Component (sin middleware)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Ignorar si se llama desde un Server Component (sin middleware)
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
          // Ignorar
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Ignorar
        }
      },
    },
  });
};
