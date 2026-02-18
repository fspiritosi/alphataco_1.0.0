/**
 * Next.js Instrumentation para captura automática de errores del servidor.
 * Según la documentación de PostHog para Next.js error tracking.
 * https://posthog.com/docs/error-tracking/installation/nextjs
 */

export function register() {
  // No-op para inicialización
}

export const onRequestError = async (
  err: Error,
  request: { headers: { cookie?: string | string[] } },
  context: unknown
) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getPostHogServer } = await import('./src/lib/posthog-server');
    const posthog = getPostHogServer();

    let distinctId: string | null = null;

    // Intentar obtener el distinctId de la cookie de PostHog
    if (request.headers.cookie) {
      const cookieString = Array.isArray(request.headers.cookie)
        ? request.headers.cookie.join('; ')
        : request.headers.cookie;

      const postHogCookieMatch = cookieString.match(/ph_phc_.*?_posthog=([^;]+)/);
      if (postHogCookieMatch && postHogCookieMatch[1]) {
        try {
          const decodedCookie = decodeURIComponent(postHogCookieMatch[1]);
          const postHogData = JSON.parse(decodedCookie);
          distinctId = postHogData.distinct_id;
        } catch (e) {
          // Error parsing PostHog cookie, continuar sin distinctId
        }
      }
    }

    // Capturar la excepción en PostHog
    posthog.captureException(err, distinctId || undefined, {
      $exception_type: 'Server Request Error',
    });
  }
};
