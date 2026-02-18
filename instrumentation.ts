/**
 * Next.js Instrumentation — captura automática de errores del servidor.
 * Documentación: https://posthog.com/docs/error-tracking/installation/nextjs
 *
 * onRequestError se dispara para:
 * - Errores en Server Components durante el render (routeType: 'render')
 * - Errores en Route Handlers no capturados (routeType: 'route')
 * - Errores en Server Actions que hacen throw (routeType: 'action')
 *
 * NO se dispara para:
 * - Errores capturados dentro de try/catch en el código de la app
 * - Errores en middleware (bug Next.js #83404 en Node.js runtime)
 *
 * NOTA: El middleware en src/middleware.ts inyecta X-POSTHOG-SESSION-ID
 * y X-POSTHOG-DISTINCT-ID en los headers de cada request, haciendo posible
 * el session linking sin parsear cookies aquí.
 *
 * Los logs del Logger (warn/error) se envían a PostHog vía OTLP HTTP directo
 * desde src/lib/posthog-logs.ts (sin depender del SDK de OTEL, que tiene
 * problemas de singleton con Turbopack en Windows).
 */

export function register() {
  // No-op para inicialización
}

export const onRequestError = async (
  err: unknown,
  request: {
    headers: {
      cookie?: string | string[];
      get?: (name: string) => string | null;
      [key: string]: unknown;
    };
    url?: string;
    method?: string;
  },
  context: { routerKind?: string; routePath?: string; routeType?: string }
) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getPostHogServer } = await import('./src/lib/posthog-server');
    const { normalizeError, extractPostHogCookieData } = await import('./src/lib/posthog/utils');

    const posthog = getPostHogServer();
    const normalizedError = normalizeError(err);

    // Estrategia A: leer de los headers inyectados por middleware (más confiable)
    let distinctId: string | undefined;
    let sessionId: string | undefined;

    const getHeader = (name: string): string | null => {
      if (typeof request.headers.get === 'function') {
        return request.headers.get(name);
      }
      const val = (request.headers as Record<string, unknown>)[name.toLowerCase()];
      return typeof val === 'string' ? val : null;
    };

    const headerDistinctId = getHeader('x-posthog-distinct-id');
    const headerSessionId = getHeader('x-posthog-session-id');

    if (headerDistinctId) {
      distinctId = headerDistinctId;
      sessionId = headerSessionId ?? undefined;
    } else {
      // Estrategia B (fallback): parsear la cookie directamente
      const cookieRaw = request.headers.cookie;
      if (cookieRaw) {
        const cookieString = Array.isArray(cookieRaw) ? cookieRaw.join('; ') : cookieRaw;
        const cookieData = extractPostHogCookieData(cookieString);
        distinctId = cookieData.distinctId;
        sessionId = cookieData.sessionId;
      }
    }

    await posthog.captureException(normalizedError, distinctId ?? undefined, {
      ...(sessionId ? { $session_id: sessionId } : {}),
      // Contexto de la request
      url: request.url,
      method: request.method,
      // Contexto de Next.js (routeType: 'action' | 'render' | 'route')
      route_kind: context.routerKind,
      route_path: context.routePath,
      route_type: context.routeType,
    });

    await posthog.flush();
  }
};
