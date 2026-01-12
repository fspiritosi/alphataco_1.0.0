'use client';

import NextError from 'next/error';
import posthog from 'posthog-js';
import { useEffect } from 'react';

/**
 * Global Error Boundary para capturar errores no manejados en el root layout.
 * Según la documentación de PostHog para Next.js error tracking.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Enviar error a PostHog
    posthog.captureException(error, {
      $exception_type: 'Global Error',
      digest: error.digest,
    });
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
