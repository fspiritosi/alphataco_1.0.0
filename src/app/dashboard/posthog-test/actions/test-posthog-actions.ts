'use server';

import { getPostHogServer } from '@/lib/posthog-server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Dispara un error de Supabase Server (columna inexistente) → capturado por interceptedFetch en server.ts
 */
export async function triggerSupabaseServerError() {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('employees').select('columna_inexistente_test').limit(1);
  if (error) throw new Error(error.message);
}

/**
 * Dispara un error 406 PGRST116 de Supabase Server (0 filas con .single())
 */
export async function triggerSupabaseServer406() {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('employees')
    .select('id')
    .eq('id', '00000000-0000-0000-0000-000000000000')
    .single();
  if (error) throw new Error(error.message);
}

/**
 * Dispara un error de Server Action capturado por onRequestError en instrumentation.ts
 * (lanza directamente sin capturar)
 */
export async function triggerServerActionException() {
  throw new Error('[PostHog Test] Error lanzado directamente desde Server Action');
}

/**
 * Captura un evento personalizado desde el servidor via posthog-node
 */
export async function triggerServerCustomEvent() {
  const posthog = getPostHogServer();
  posthog.capture({
    distinctId: 'posthog-test-page',
    event: 'posthog_test_event',
    properties: {
      source: 'posthog-test-page',
      type: 'server_custom_event',
      timestamp: new Date().toISOString(),
    },
  });
  return { success: true };
}
