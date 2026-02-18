'use client';

import { usePostHog as usePostHogHook } from 'posthog-js/react';

/**
 * Hook personalizado para usar PostHog en componentes del cliente.
 * Proporciona helpers adicionales y asegura que PostHog esté disponible.
 *
 * Nota: con `defaults: '2025-11-30'`, las pageviews se trackean automáticamente
 * vía History API. No es necesario llamar trackPageView manualmente.
 *
 * @example
 * ```typescript
 * const { trackEvent, captureError } = usePostHog();
 *
 * const handleClick = () => {
 *   trackEvent('button_clicked', { button: 'submit' });
 * };
 * ```
 */
export function usePostHog() {
  const posthog = usePostHogHook();

  return {
    posthog,
    /**
     * Rastrea un evento personalizado con propiedades tipadas.
     */
    trackEvent: (eventName: string, properties?: Record<string, string | number | boolean>) => {
      posthog?.capture(eventName, properties);
    },
    /**
     * Captura un error en PostHog desde un componente cliente.
     */
    captureError: (error: Error, properties?: Record<string, string | number | boolean>) => {
      posthog?.captureException(error, properties);
    },
  };
}
