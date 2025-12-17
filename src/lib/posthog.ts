import { PostHog } from 'posthog-node';

let posthogInstance: PostHog | null = null;

/**
 * Obtiene la instancia singleton de PostHog para uso en el servidor.
 * Según la documentación oficial, este patrón garantiza una única instancia.
 *
 * @returns Instancia de PostHog o null si no está configurado
 */
export function getPostHogServer(): PostHog | null {
  // Usar POSTHOG_KEY (sin NEXT_PUBLIC_) para el servidor
  if (!process.env.POSTHOG_KEY) {
    return null;
  }

  if (!posthogInstance) {
    posthogInstance = new PostHog(process.env.POSTHOG_KEY, {
      host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1, // Enviar eventos inmediatamente (importante para funciones de servidor)
      flushInterval: 0, // Sin intervalo de flush
    });
  }

  return posthogInstance;
}

/**
 * Helper para capturar eventos desde el servidor.
 * Asegúrate de llamar a shutdown() después de capturar eventos en funciones de servidor.
 *
 * @example
 * ```typescript
 * const posthog = getPostHogServer();
 * if (posthog) {
 *   posthog.capture({
 *     distinctId: 'user_id',
 *     event: 'server_event',
 *     properties: { key: 'value' }
 *   });
 *   await posthog.shutdown();
 * }
 * ```
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, any>
): Promise<void> {
  const client = getPostHogServer();
  if (client) {
    client.capture({
      distinctId,
      event,
      properties,
    });
    // Importante: hacer flush antes de que termine la función
    await client.shutdown();
  }
}
