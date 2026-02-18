import { createBrowserClient } from '@supabase/ssr';
import Cookies from 'js-cookie';
import posthog from 'posthog-js';
import { Database } from '../../../database.types';
import { serializeForPostHog } from '../posthog/utils';

/**
 * Captura un error en PostHog desde el cliente de forma segura.
 * Verifica que PostHog esté inicializado antes de llamar captureException,
 * resolviendo la race condition entre supabaseBrowser() y posthog.init().
 */
function captureSupabaseBrowserError(error: Error, properties: Record<string, unknown>) {
  try {
    // posthog.__loaded es la señal interna de que posthog.init() se completó
    if (posthog.__loaded) {
      posthog.captureException(error, properties);
    }
    // Si PostHog no está inicializado aún, silenciar en lugar de perder el evento en la queue
    // (posthog-js no hace queuing de captureException antes de init)
  } catch {
    // Silenciar para no interrumpir el flujo de la app
  }
}

const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method ?? 'GET';
  const requestBody = init?.body;

  try {
    const response = await fetch(input, init);

    if (!response.ok) {
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

      // Construir mensaje legible — nunca [object Object]
      // PostgrestError tiene: { code, message, details, hint }
      let errorMessage = `Supabase ${response.status} ${response.statusText}: ${method} ${url}`;
      if (responseBody && typeof responseBody === 'object' && typeof responseBody.message === 'string') {
        errorMessage = `${responseBody.message} [${response.status}] ${method} ${url}`;
      }

      const error = new Error(errorMessage);
      error.name = 'SupabaseBrowserError';

      captureSupabaseBrowserError(error, {
        method,
        url,
        status: response.status,
        statusText: response.statusText,
        response_body: serializeForPostHog(responseBody),
        request_body: requestBody
          ? serializeForPostHog(typeof requestBody === 'string' ? requestBody.substring(0, 500) : requestBody)
          : undefined,
      });
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      captureSupabaseBrowserError(error, {
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

export const supabaseBrowser = () =>
  createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      fetch: interceptedFetch,
    },
    cookies: {
      get(name: string) {
        return Cookies.get(name) ?? undefined;
      },
      set(name: string, value: string) {
        Cookies.set(name, value);
      },
      remove(name: string) {
        return Cookies.remove(name);
      },
    },
  });
