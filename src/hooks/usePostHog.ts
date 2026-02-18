'use client';

import { usePostHog as usePostHogHook } from 'posthog-js/react';

/**
 * Hook personalizado para usar PostHog en componentes del cliente.
 * Proporciona helpers adicionales y asegura que PostHog esté disponible.
 *
 * @example
 * ```typescript
 * const posthog = usePostHog();
 *
 * const handleClick = () => {
 *   posthog?.trackEvent('button_clicked', { button: 'submit' });
 * };
 * ```
 */
export function usePostHog() {
  const posthog = usePostHogHook();

  return {
    ...posthog,
    /**
     * Rastrea una vista de página
     */
    trackPageView: (path: string) => {
      posthog?.capture('$pageview', { path });
    },
    /**
     * Rastrea un evento personalizado
     */
    trackEvent: (eventName: string, properties?: Record<string, any>) => {
      posthog?.capture(eventName, properties);
    },
  };
}
