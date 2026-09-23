import { createBrowserClient } from '@supabase/ssr'; // P4: auth
import Cookies from 'js-cookie';
import posthog from 'posthog-js';
import { Database } from '../../../database.types'; // P4: auth — tipos del cliente Supabase Auth, se van con él

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

      // Enviar error a PostHog
      try {
        const error = new Error(`Supabase Browser Error: ${method} ${url} - ${response.status} ${response.statusText}`);
        posthog.captureException(error, {
          $exception_type: 'Supabase Browser Error',
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          responseBody: typeof responseBody === 'object' ? JSON.stringify(responseBody) : responseBody,
          requestBody: requestBody ? String(requestBody).substring(0, 1000) : undefined,
        });
      } catch {
        // Silenciar errores de PostHog para no interrumpir el flujo
      }
    }

    return response;
  } catch (error) {
    // Error de red - enviar a PostHog
    try {
      if (error instanceof Error) {
        posthog.captureException(error, {
          $exception_type: 'Supabase Browser Network Error',
          method,
          url,
          requestBody: requestBody ? String(requestBody).substring(0, 1000) : undefined,
        });
      }
    } catch {
      // Silenciar errores de PostHog para no interrumpir el flujo
    }

    throw error;
  }
};

export const supabaseBrowser = () => // P4: auth
  createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { // P4: auth
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
