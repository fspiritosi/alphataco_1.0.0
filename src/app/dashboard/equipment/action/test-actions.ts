'use server';

import { supabaseServer } from '@/lib/supabase/server';

/**
 * Server Action para generar un error de prueba
 * Intenta consultar una columna que no existe en la tabla employees
 */
export async function testServerError() {
  try {
    const supabase = await supabaseServer();
    // Intentar consultar una columna que no existe (prueba)
    const { data, error } = await supabase.from('employees').select('prueba').limit(1);

    if (error) {
      console.error('[Test Server Error]', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Test Server Error Catch]', error);
    throw error;
  }
}
