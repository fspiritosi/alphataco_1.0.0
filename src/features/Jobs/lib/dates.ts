/**
 * Fecha de negocio de los jobs.
 *
 * Todo el SQL portado calcula el día con `(NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`
 * y el contenedor de cron corre con `TZ=America/Argentina/Buenos_Aires`. El proceso de Next,
 * en cambio, puede estar en UTC. Si el job resolviera la fecha con `new Date()` local, el job
 * de las 00:30 AR (03:30 UTC) caería en el día siguiente para el TypeScript y en el día
 * correcto para el SQL: la clave de idempotencia y la fila de `daily_indicators` quedarían
 * en días distintos.
 *
 * Por eso la fecha se resuelve SIEMPRE en hora argentina, igual que el SQL.
 */
export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** `YYYY-MM-DD` del momento dado (o de ahora) en hora argentina. */
export function argentinaDate(at: Date = new Date()): string {
  // `en-CA` formatea como YYYY-MM-DD, que es lo que espera Postgres y `sql.ts::{ date }`.
  return at.toLocaleDateString('en-CA', { timeZone: ARGENTINA_TIME_ZONE });
}

/** `24/12/2026` a partir de un `YYYY-MM-DD`. */
export function formatDateAr(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** `jueves, 24 de diciembre de 2026` a partir de un `YYYY-MM-DD`. */
export function formatLongDateAr(isoDate: string): string {
  // El mediodía evita que el desplazamiento horario corra el día al construir el Date.
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('es-AR', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
