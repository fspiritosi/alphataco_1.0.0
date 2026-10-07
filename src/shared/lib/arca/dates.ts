/**
 * Fechas para ARCA sin depender del TZ del proceso. Argentina no tiene horario de verano: el
 * offset es siempre -03:00, así que se calcula a mano.
 */

const AR_OFFSET_MS = -3 * 60 * 60 * 1000;

function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0');
}

/** Componentes de fecha y hora en la hora oficial argentina. */
function argentinaParts(date: Date) {
  const shifted = new Date(date.getTime() + AR_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
  };
}

/** `2026-10-06T10:00:00-03:00` (formato que exige el TRA de WSAA). */
export function toArgentinaIsoDateTime(date: Date): string {
  const p = argentinaParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}-03:00`;
}

/** Fecha argentina de `date` como `YYYY-MM-DD`. */
export function argentinaDateOnly(date: Date): string {
  const p = argentinaParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** `YYYY-MM-DD` → `YYYYMMDD` (formato de fechas de WSFE). */
export function toArcaDate(dateOnly: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) throw new Error(`Fecha inválida: ${dateOnly}`);
  return dateOnly.replace(/-/g, '');
}

/** `YYYYMMDD` → `YYYY-MM-DD`. */
export function fromArcaDate(arcaDate: string): string {
  if (!/^\d{8}$/.test(arcaDate)) throw new Error(`Fecha de ARCA inválida: ${arcaDate}`);
  return `${arcaDate.slice(0, 4)}-${arcaDate.slice(4, 6)}-${arcaDate.slice(6, 8)}`;
}
