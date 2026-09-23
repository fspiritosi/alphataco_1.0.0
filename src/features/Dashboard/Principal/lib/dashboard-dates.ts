import moment from 'moment';

/**
 * Fechas del dashboard principal.
 *
 * Todo el tablero mira "hoy" en la zona horaria de la operación (UTC-3), no en la del
 * servidor: un parte cargado a las 22:00 en Argentina tiene que seguir contando como hoy
 * aunque el proceso corra en UTC. La conversión vivía repetida en ocho funciones.
 */

/** Offset fijo de la operación (Argentina, sin horario de verano). */
export const OPERATION_UTC_OFFSET = -3;

/** Hoy en la zona de la operación, como `YYYY-MM-DD`. */
export function getOperationToday(now: Date = new Date()): string {
  return moment(now).utcOffset(OPERATION_UTC_OFFSET).format('YYYY-MM-DD');
}

/** Hoy en la zona de la operación, partido en día/mes/año (los diagramas guardan las 3 columnas). */
export function getTodayParts(now: Date = new Date()): { day: number; month: number; year: number } {
  const operationNow = moment(now).utcOffset(OPERATION_UTC_OFFSET);
  return { day: operationNow.date(), month: operationNow.month() + 1, year: operationNow.year() };
}

/** Primer instante del mes en curso, en la zona de la operación. */
export function getStartOfOperationMonth(now: Date = new Date()): Date {
  return moment(now).utcOffset(OPERATION_UTC_OFFSET).startOf('month').toDate();
}

/**
 * WHERE común de `dailyreportrows` acotado al parte de una fecha y una empresa.
 * Sin `targetDate` usa el día de la operación.
 */
export function buildTodayReportWhere(companyId: string, targetDate?: string, now: Date = new Date()) {
  const date = targetDate ?? getOperationToday(now);
  return {
    dailyreport: {
      date: new Date(date),
      is_active: true,
      company_id: companyId,
    },
  } as const;
}
