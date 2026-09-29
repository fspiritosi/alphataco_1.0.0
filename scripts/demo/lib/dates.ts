/**
 * Fechas de la demo. Todo se expresa como un offset en dias contra "hoy" en hora argentina,
 * asi la demo corrida cualquier dia queda igual de viva: hoy siempre tiene partes, novedades
 * de diagrama y documentos por vencer.
 *
 * El contenedor corre en UTC; por eso "hoy" se calcula explicitamente en
 * America/Argentina/Buenos_Aires (sin DST, UTC-3 fijo), igual que `getOperationToday()`.
 */

const AR_TZ = 'America/Argentina/Buenos_Aires';

/** `YYYY-MM-DD` de hoy en Argentina. */
export function argentinaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: AR_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export interface DemoCalendar {
  /** Hoy AR, `YYYY-MM-DD`. */
  today: string;
  /** `YYYY-MM-DD` de hoy + n dias. */
  ymd(offset: number): string;
  /** Fecha para columnas `@db.Date`: medianoche UTC del dia (Prisma manda solo la fecha). */
  day(offset: number): Date;
  /** Instante `timestamptz` del dia `offset` a la hora AR indicada. */
  at(offset: number, hour?: number, minute?: number): Date;
  /** Dia de la semana del offset (0 = domingo). */
  weekday(offset: number): number;
  /** `YYYY-MM` del mes que esta `monthsAgo` meses antes del actual. */
  period(monthsAgo: number): string;
  /** Offset del primer y del ultimo dia del mes `monthsAgo`. */
  monthRange(monthsAgo: number): { from: number; to: number };
  /** Offset (dias) de una fecha `YYYY-MM-DD`. */
  offsetOf(ymd: string): number;
}

const DAY_MS = 86_400_000;

export function buildCalendar(today: string): DemoCalendar {
  const base = Date.parse(`${today}T00:00:00Z`);
  const ymd = (offset: number) => new Date(base + offset * DAY_MS).toISOString().slice(0, 10);
  const period = (monthsAgo: number) => {
    const d = new Date(base);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - monthsAgo);
    return d.toISOString().slice(0, 7);
  };
  const offsetOf = (value: string) => Math.round((Date.parse(`${value}T00:00:00Z`) - base) / DAY_MS);
  return {
    today,
    ymd,
    day: (offset) => new Date(base + offset * DAY_MS),
    at: (offset, hour = 12, minute = 0) =>
      new Date(`${ymd(offset)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`),
    weekday: (offset) => new Date(base + offset * DAY_MS).getUTCDay(),
    period,
    monthRange: (monthsAgo) => ({
      from: offsetOf(`${period(monthsAgo)}-01`),
      to: offsetOf(`${period(monthsAgo - 1)}-01`) - 1,
    }),
    offsetOf,
  };
}

/** `DD/MM/YYYY` (formato de `documents_company.validity`), o con otro separador. */
export function toDmy(ymd: string, separator = '/'): string {
  const [y, m, d] = ymd.split('-');
  return [d, m, y].join(separator);
}
