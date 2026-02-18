'use server';

import { getPostHogServer } from '@/lib/posthog-server';
import { extractPostHogCookieData, normalizeError, serializeForPostHog } from '@/lib/posthog/utils';
import { cookies } from 'next/headers';

/**
 * Captura un error de una Server Action en PostHog, vinculándolo al usuario actual.
 *
 * Úsala en Server Actions para capturar errores ANTES de relanzarlos:
 *
 * @example
 * ```typescript
 * export async function myServerAction(data: FormData) {
 *   try {
 *     const supabase = await supabaseServer();
 *     const { error } = await supabase.from('table').insert(data);
 *     if (error) throw error;
 *   } catch (err) {
 *     await captureServerActionError(err, { action: 'myServerAction' });
 *     throw err; // relanzar para que el cliente sepa que falló
 *   }
 * }
 * ```
 */
export async function captureServerActionError(
  err: unknown,
  context: {
    action: string;
    extra?: Record<string, unknown>;
  }
) {
  try {
    const posthog = getPostHogServer();
    const normalizedError = normalizeError(err);

    // Leer cookies para vincular al usuario
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const postHogCookieEntry = allCookies.find((c) => /ph_phc_.*_posthog$/.test(c.name));

    let distinctId: string | undefined;
    let sessionId: string | undefined;

    if (postHogCookieEntry) {
      const cookieString = `${postHogCookieEntry.name}=${postHogCookieEntry.value}`;
      const cookieData = extractPostHogCookieData(cookieString);
      distinctId = cookieData.distinctId;
      sessionId = cookieData.sessionId;
    }

    const extraProps: Record<string, unknown> = {};
    if (context.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        extraProps[key] = serializeForPostHog(value);
      }
    }

    posthog.captureException(normalizedError, distinctId ?? undefined, {
      ...(sessionId ? { $session_id: sessionId } : {}),
      server_action: context.action,
      ...extraProps,
    });

    await posthog.flush();
  } catch {
    // Silenciar errores de PostHog — nunca interrumpir el flujo de la app
  }
}
