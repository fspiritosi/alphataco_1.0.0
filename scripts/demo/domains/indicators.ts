/**
 * Snapshots de `daily_indicators`: las series historicas que leen los graficos de Estadisticas
 * y la Sala de Control.
 *
 * Se generan con las MISMAS funciones SQL que usa el job nocturno, llamadas fecha por fecha con
 * `save_to_table = true`. Hoy se calcula con `run_daily_indicators_for_company`, igual que el
 * job. Tres funciones no reciben fecha (uso de personal, uso de flota y conteos de la empresa):
 * miden el estado actual, asi que su historia se arma a partir del snapshot de hoy con una
 * variacion chica dia a dia.
 */
import type { Ctx } from '../lib/ctx.ts';

const HISTORY_DAYS = 90;
/** `hr_get_absenteeism_trend` tarda ~1 s por dia: se calcula solo el rango por defecto del grafico. */
const TREND_DAYS = 30;
const DEVIATION_DAYS = 180;

async function call(ctx: Ctx, sql: string, ...args: unknown[]): Promise<void> {
  await ctx.tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM (SELECT ${sql}) x`, ...args);
}

/** Aplica una variacion de +-6% a los numeros enteros de un JSON (sin tocar fechas ni ids). */
function jitter(value: unknown, roll: () => number): unknown {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value === 0) return value;
    const next = value * (1 + (roll() - 0.5) * 0.12);
    return Number.isInteger(value) ? Math.max(0, Math.round(next)) : Math.round(next * 100) / 100;
  }
  if (Array.isArray(value)) return value.map((v) => jitter(v, roll));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, /date|fecha|id$/i.test(k) ? v : jitter(v, roll)]));
  }
  return value;
}

/**
 * `get_daily_report_deviations_indicator` deja en NULL los desvios de cualquier fecha que no sea
 * hoy: en produccion solo el dia corriente se mide con fidelidad, porque las tablas maestras
 * (asignaciones, diagramas, condicion de los equipos) ya cambiaron. En la demo no cambian, asi
 * que el historico se calcula con una COPIA temporal de la funcion (en `pg_temp`: vive solo en
 * esta conexion, no toca el esquema) que trata cada fecha como medida en vivo.
 */
async function createHistoricalDeviationsFunction(ctx: Ctx): Promise<void> {
  const [{ def }] = await ctx.tx.$queryRaw<Array<{ def: string }>>`
    SELECT pg_get_functiondef('public.get_daily_report_deviations_indicator(uuid, date, boolean)'::regprocedure) AS def`;
  const live = /v_is_live\s*:=\s*v_date\s*=\s*\(NOW\(\) AT TIME ZONE v_tz\)::date;/;
  const header = 'CREATE OR REPLACE FUNCTION public.get_daily_report_deviations_indicator(';
  if (!def.includes(header) || !live.test(def)) {
    throw new Error('get_daily_report_deviations_indicator cambio: revisar la copia temporal de indicators.ts');
  }
  await ctx.tx.$executeRawUnsafe(
    def.replace(header, 'CREATE OR REPLACE FUNCTION pg_temp.demo_deviations_indicator(').replace(live, 'v_is_live := true;')
  );
}

export async function seedIndicators(ctx: Ctx): Promise<void> {
  const { tx, cal, faker, company } = ctx;
  const companyId = company.id;

  // Estadisticas del planner al dia: las tablas se acaban de llenar en esta misma transaccion y
  // el ultimo analisis automatico las vio vacias. Sin esto, las funciones de indicadores eligen
  // planes pensados para tablas vacias y tardan minutos en vez de segundos.
  await tx.$executeRawUnsafe('ANALYZE');
  ctx.log('estadísticas actualizadas (ANALYZE)');

  // Hoy, igual que el job.
  await call(ctx, 'public.run_daily_indicators_for_company($1::uuid)', companyId);
  ctx.log('indicadores de hoy');

  for (let offset = -HISTORY_DAYS; offset < 0; offset++) {
    const d = cal.ymd(offset);
    const [y, m, day] = d.split('-').map(Number);
    await call(ctx, 'public.hr_get_absenteeism_summary(p_company_id => $1::uuid, p_from => $2::date, p_to => $2::date, save_to_table => true)', companyId, d);
    if (offset >= -TREND_DAYS) {
      await call(ctx, 'public.hr_get_absenteeism_trend(p_company_id => $1::uuid, p_from => $2::date, p_to => $2::date, save_to_table => true)', companyId, d);
    }
    await call(ctx, 'public.hr_get_current_absent_employees(p_company_id => $1::uuid, p_date => $2::date, save_to_table => true)', companyId, d);
    await call(ctx, 'public.hr_get_daily_absence_timeseries(p_company_id => $1::uuid, p_from => $2::date, p_to => $2::date, save_to_table => true)', companyId, d);
    await call(ctx, 'public.hr_get_department_absence_reasons(p_company_id => $1::uuid, p_date => $2::date, save_to_table => true)', companyId, d);
    await call(ctx, 'public.hr_get_department_absence_summary(p_company_id => $1::uuid, p_date => $2::date, save_to_table => true)', companyId, d);
    await call(
      ctx,
      'public.get_employee_diagram_count_by_day(p_day => $2::int, p_month => $3::int, p_year => $4::int, p_company_position_ids => NULL, save_to_table => true, p_company_id => $1::uuid)',
      companyId,
      day,
      m,
      y
    );
  }
  ctx.log(`indicadores de RRHH: ${HISTORY_DAYS} días`);
  await createHistoricalDeviationsFunction(ctx);
  for (let offset = -DEVIATION_DAYS; offset < 0; offset++) {
    await call(ctx, 'pg_temp.demo_deviations_indicator(p_company_id => $1::uuid, p_date => $2::date, save_to_table => true)', companyId, cal.ymd(offset));
  }

  ctx.log(`desvíos de partes: ${DEVIATION_DAYS} días`);

  // Funciones sin fecha: historia a partir del snapshot de hoy.
  const today = await tx.daily_indicators.findMany({
    where: {
      company_id: companyId,
      snapshot_date: cal.day(0),
      source: { in: ['get_employee_usage_indicator', 'get_vehicle_usage_indicator', 'get_company_counts_indicator'] },
    },
    select: { source: true, metrics: true },
  });
  const roll = () => faker.number.float({ min: 0, max: 1 });
  const history = today.flatMap((snap) =>
    Array.from({ length: HISTORY_DAYS }, (_, i) => ({
      company_id: companyId,
      snapshot_date: cal.day(-(i + 1)),
      source: snap.source,
      metrics: jitter(snap.metrics, roll) as object,
      created_at: cal.at(-(i + 1), 0, 30),
    }))
  );
  await tx.daily_indicators.createMany({ data: history, skipDuplicates: true });

  const total = await tx.daily_indicators.count({ where: { company_id: companyId } });
  ctx.log(`${total} snapshots de indicadores`);
}
