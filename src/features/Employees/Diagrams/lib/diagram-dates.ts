import moment from 'moment';

/**
 * Fechas de `employees_diagram`: la tabla guarda `day`/`month`/`year` como columnas
 * numéricas separadas (sin columna date), así que todo rango se traduce a comparaciones
 * sobre esas tres columnas. Módulo puro (sin Prisma ni red) para poder testearlo.
 */
export interface DiagramDay {
  year: number;
  month: number;
  day: number;
}

const ISO_DATE = 'YYYY-MM-DD';

/** `Date` (fecha local) o texto `YYYY-MM-DD` → día/mes/año numéricos. */
export function toDiagramDay(date: Date | string): DiagramDay {
  const parsed = typeof date === 'string' ? moment(date, ISO_DATE, true) : moment(date);
  if (!parsed.isValid()) throw new Error(`Fecha inválida: ${String(date)}`);
  return { year: parsed.year(), month: parsed.month() + 1, day: parsed.date() };
}

/** Clave estable `YYYY-MM-DD` (también es el formato en que la función SQL devolvía `date_formatted`). */
export function diagramDayKey(day: DiagramDay): string {
  const mm = String(day.month).padStart(2, '0');
  const dd = String(day.day).padStart(2, '0');
  return `${day.year}-${mm}-${dd}`;
}

export function compareDiagramDays(a: DiagramDay, b: DiagramDay): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

function toMoment(day: DiagramDay) {
  return moment({ year: day.year, month: day.month - 1, day: day.day });
}

/** Todos los días entre `from` y `to` (inclusive). Rango invertido → `[]`. */
export function enumerateDiagramDays(from: DiagramDay, to: DiagramDay): DiagramDay[] {
  const days: DiagramDay[] = [];
  const cursor = toMoment(from);
  const end = toMoment(to);
  while (cursor.isSameOrBefore(end, 'day')) {
    days.push({ year: cursor.year(), month: cursor.month() + 1, day: cursor.date() });
    cursor.add(1, 'day');
  }
  return days;
}

type NumberFilter = number | { gt?: number; gte?: number; lt?: number; lte?: number };

/** Fragmento de `where` sobre `year`/`month`/`day` (compatible con Prisma). */
export interface DiagramDayWhere {
  year?: NumberFilter;
  month?: NumberFilter;
  day?: NumberFilter;
}

export type DiagramDayRangeWhere = DiagramDayWhere | { OR: DiagramDayWhere[] };

/**
 * `where` de Prisma equivalente a `make_date(year, month, day) BETWEEN from AND to`.
 * El legacy (PostgREST) sólo comparaba el mes de inicio y el de fin: los meses
 * intermedios no se traían. Acá se cubren todos.
 */
export function buildDiagramDayRangeWhere(from: DiagramDay, to: DiagramDay): DiagramDayRangeWhere {
  if (compareDiagramDays(from, to) > 0) {
    throw new Error('Rango de fechas inválido: la fecha desde es posterior a la fecha hasta');
  }

  if (from.year === to.year && from.month === to.month) {
    return { year: from.year, month: from.month, day: { gte: from.day, lte: to.day } };
  }

  const or: DiagramDayWhere[] = [{ year: from.year, month: from.month, day: { gte: from.day } }];

  if (from.year === to.year) {
    if (to.month - from.month > 1) or.push({ year: from.year, month: { gt: from.month, lt: to.month } });
  } else {
    if (from.month < 12) or.push({ year: from.year, month: { gt: from.month } });
    if (to.year - from.year > 1) or.push({ year: { gt: from.year, lt: to.year } });
    if (to.month > 1) or.push({ year: to.year, month: { lt: to.month } });
  }

  or.push({ year: to.year, month: to.month, day: { lte: to.day } });
  return { OR: or };
}

/**
 * Día activo dentro de un diagrama de trabajo cíclico (ej. 4x4), contando el ciclo desde
 * la fecha de inicio de la carga (`dayIndex` 0 = primer día). Misma fórmula que
 * `process_massive_diagram_creation_v2`: `((date - date_from) % (activos + inactivos)) + 1 <= activos`.
 */
export function isActiveDayInCycle(dayIndex: number, activeDays: number, inactiveDays: number): boolean {
  const cycleLength = activeDays + inactiveDays;
  if (cycleLength <= 0) return true;
  return (dayIndex % cycleLength) + 1 <= activeDays;
}
