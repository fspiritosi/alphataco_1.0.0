'use server';

/**
 * Borde servidor del PDF de Orden de Mantenimiento (ticket 684).
 *
 * Lo unico que hace es resolver quien esta emitiendo el documento y delegar en
 * `buildMaintenanceOrderReportData`. La consulta y el mapeo viven en
 * `report-data.ts` — sin directiva — para que se puedan ejecutar tambien fuera
 * de Next (verificacion del PDF con datos reales).
 *
 * No importa nada de `@react-pdf/renderer`: el layout lo carga el boton, en el
 * cliente y recien al hacer clic.
 */

import { supabaseServer } from '@/lib/supabase/server';
import { buildMaintenanceOrderReportData } from './report-data';
import type { MaintenanceOrderReportData } from './types';

/** Datos completos del PDF de una orden, listos para el layout. */
export async function getMaintenanceOrderReportData(orderId: string): Promise<MaintenanceOrderReportData> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return buildMaintenanceOrderReportData(orderId, user?.id ?? null);
}
