'use server';

import { captureServerActionError } from '@/lib/posthog/captureServerError';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Server Action que lanza un Error estándar de JavaScript.
 * Prueba: ¿aparece en PostHog vía onRequestError + captureServerActionError?
 */
export async function testStandardError(): Promise<{ ok: boolean; message: string }> {
  try {
    throw new Error('Error de prueba desde Server Action — Error estándar JavaScript');
  } catch (err) {
    await captureServerActionError(err, {
      action: 'testStandardError',
      extra: { test_type: 'standard_js_error', triggered_at: new Date().toISOString() },
    });
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Server Action que ejecuta una query Supabase INVÁLIDA.
 * Prueba: ¿se captura el PostgrestError correctamente con mensaje legible?
 */
export async function testSupabaseError(): Promise<{ ok: boolean; message: string }> {
  try {
    const supabase = await supabaseServer();
    // Columna que no existe — genera PostgrestError 42703
    const { data, error } = await supabase
      .from('employees')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select('id, this_column_does_not_exist_test_posthog' as any)
      .limit(1);

    if (error) {
      await captureServerActionError(error, {
        action: 'testSupabaseError',
        extra: {
          test_type: 'supabase_query_error',
          supabase_code: error.code,
          supabase_message: error.message,
        },
      });
      return { ok: false, message: `Supabase error: ${error.message} (code: ${error.code})` };
    }

    return { ok: true, message: `Inesperadamente exitoso: ${JSON.stringify(data)}` };
  } catch (err) {
    await captureServerActionError(err, {
      action: 'testSupabaseError',
      extra: { test_type: 'unexpected_throw' },
    });
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Server Action que lanza una promesa rechazada sin capturar.
 * Prueba: ¿llega a onRequestError en instrumentation.ts?
 */
export async function testUnhandledError(): Promise<never> {
  // Capturar manualmente también para comparar ambos mecanismos
  const err = new Error('Error NO manejado desde Server Action — test de onRequestError');
  await captureServerActionError(err, {
    action: 'testUnhandledError',
    extra: { test_type: 'unhandled_server_action_error' },
  });
  throw err;
}

/**
 * Server Action que simula un error de autenticación de Supabase.
 */
export async function testAuthError(): Promise<{ ok: boolean; message: string }> {
  try {
    const supabase = await supabaseServer();
    // Intentar acceder a una tabla con RLS para verificar permisos
    const { data, error } = await supabase.from('employees').select('id').limit(1);

    if (error) {
      await captureServerActionError(error, {
        action: 'testAuthError',
        extra: { test_type: 'rls_error', supabase_code: error.code },
      });
      return { ok: false, message: `RLS/Auth error: ${error.message}` };
    }

    return { ok: true, message: `OK — registros encontrados: ${data?.length ?? 0}` };
  } catch (err) {
    await captureServerActionError(err, { action: 'testAuthError' });
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Server Action que registra un evento personalizado de PostHog.
 * Útil para verificar que el usuario está correctamente identificado.
 */
export async function testCustomEvent(payload: {
  eventName: string;
  userId?: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const { getPostHogServer } = await import('@/lib/posthog-server');
    const { extractPostHogCookieData } = await import('@/lib/posthog/utils');
    const { cookies } = await import('next/headers');

    const posthog = getPostHogServer();
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

    posthog.capture({
      distinctId: distinctId ?? 'anonymous-test',
      event: payload.eventName,
      properties: {
        ...(sessionId ? { $session_id: sessionId } : {}),
        test: true,
        triggered_at: new Date().toISOString(),
        source: 'posthog-test-page',
      },
    });

    await posthog.flush();

    return {
      ok: true,
      message: `Evento "${payload.eventName}" enviado — distinctId: ${distinctId ?? 'no identificado'}, sessionId: ${sessionId ?? 'no disponible'}`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
