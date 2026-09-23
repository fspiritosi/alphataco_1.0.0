'use server';

import type { indicator_function } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('features/Dashboard/KPIs/Graficos');

/** Las funciones de indicador que los gráficos saben leer (subconjunto del enum de la base). */
export type IndicatorFunction = Extract<
  indicator_function,
  | 'get_employee_usage_indicator'
  | 'get_vehicle_usage_indicator'
  | 'hr_get_absenteeism_summary'
  | 'hr_get_absenteeism_trend'
  | 'hr_get_daily_absence_timeseries'
  | 'get_company_counts_indicator'
  | 'get_employee_diagram_count_by_day'
  | 'hr_get_current_absent_employees'
  | 'hr_get_department_absence_reasons'
  | 'hr_get_department_absence_summary'
>;

/**
 * `snapshot_date` es `@db.Date`: Prisma la devuelve a medianoche UTC, así que se recorta el
 * ISO en vez de formatearla con `moment` — formatear aplicaría la zona del proceso y en un
 * server con `TZ` al oeste de UTC el eje X se correría un día.
 */
function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export interface DailyIndicatorPoint {
  /** `YYYY-MM-DD`: los gráficos lo usan como eje X y para ordenar. */
  snapshot_date: string;
  /** Forma libre según la función de indicador; cada gráfico la castea a lo que espera. */
  metrics: unknown;
  created_at: string;
}

/**
 * Serie histórica de un indicador diario de la empresa activa.
 *
 * Perímetro: la empresa sale de `getActiveCompanyId()`, no de la cookie leída a mano.
 * `source` es un valor del enum `indicator_function`, así que no hay nombre de función
 * libre viajando desde el cliente.
 */
export async function getDailyIndicators(source: IndicatorFunction): Promise<DailyIndicatorPoint[]> {
  try {
    const companyId = await getActiveCompanyId();

    const rows = await prisma.daily_indicators.findMany({
      where: withCompany({ source }, companyId),
      select: { snapshot_date: true, metrics: true, created_at: true },
      orderBy: { snapshot_date: 'asc' },
    });

    return rows.map((row) => ({
      snapshot_date: toDateOnly(row.snapshot_date),
      metrics: row.metrics,
      created_at: row.created_at.toISOString(),
    }));
  } catch (error) {
    logger.error('Error al obtener los indicadores diarios', { data: { error, source } });
    return [];
  }
}
