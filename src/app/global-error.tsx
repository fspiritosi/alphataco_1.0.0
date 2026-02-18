'use client';

import NextError from 'next/error';
import posthog from 'posthog-js';
import { useEffect } from 'react';

/**
 * Global Error Boundary — reemplaza el root layout completo cuando ocurre
 * un error catastrófico. Esto significa que PostHogProvider NO se monta,
 * por lo que posthog.init() NO ha sido llamado.
 *
 * Solución: re-inicializar PostHog inline solo para capturar el error.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!apiKey) return;

    // Re-inicializar PostHog si no está cargado (no hay Provider en este contexto)
    if (!posthog.__loaded) {
      posthog.init(apiKey, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        capture_exceptions: true,
        defaults: '2025-11-30',
        // No capturar pageviews ni sesiones — solo necesitamos el error
        autocapture: false,
        disable_session_recording: true,
      });
    }

    posthog.captureException(error, {
      $exception_source: 'GlobalError',
      digest: error.digest ?? null,
    });

    // sendBeacon garantiza que el evento salga incluso si la página se descarta
    // posthog-js usa sendBeacon internamente para captureException
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
