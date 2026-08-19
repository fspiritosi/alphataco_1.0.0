import moment from 'moment';
import 'moment/locale/es';

/**
 * Granularidades pedidas en el ticket 578: ver el detalle dia a dia y, a la vez,
 * poder comparar meses entre si.
 */
export type DeviationGranularity = 'daily' | 'weekly' | 'monthly';

/**
 * Agrupa una fecha en su bucket temporal.
 *
 * El `key` esta armado para ordenarse alfabeticamente en el mismo orden que
 * cronologicamente, de modo que el sort final no tenga que volver a parsear fechas.
 */
export function getBucketKey(dateStr: string, granularity: DeviationGranularity): { key: string; label: string } {
  const m = moment(dateStr, 'YYYY-MM-DD');

  if (granularity === 'daily') {
    return { key: `day-${dateStr}`, label: m.format('D MMM') };
  }

  if (granularity === 'weekly') {
    const weekStart = m.clone().startOf('isoWeek');
    const weekEnd = weekStart.clone().add(6, 'days');
    return {
      key: `week-${weekStart.format('YYYY-MM-DD')}`,
      label: `${weekStart.format('D MMM')} - ${weekEnd.format('D MMM')}`,
    };
  }

  return { key: `month-${m.format('YYYY-MM')}`, label: m.format('MMM YYYY') };
}

/**
 * Ventana de datos visible segun la granularidad, anclada al mes seleccionado.
 * Mensual abre a 12 meses para que la comparacion entre meses tenga sentido.
 */
export function getDataWindow(
  selectedMonth: moment.Moment,
  granularity: DeviationGranularity
): { start: string; end: string } {
  const end = selectedMonth.clone().endOf('month').format('YYYY-MM-DD');

  if (granularity === 'daily') {
    return { start: selectedMonth.clone().startOf('month').format('YYYY-MM-DD'), end };
  }

  if (granularity === 'weekly') {
    return { start: selectedMonth.clone().subtract(2, 'months').startOf('month').format('YYYY-MM-DD'), end };
  }

  return { start: selectedMonth.clone().subtract(11, 'months').startOf('month').format('YYYY-MM-DD'), end };
}

/** Etiqueta legible del periodo visible, para el subtitulo de la Card. */
export function getPeriodLabel(selectedMonth: moment.Moment, granularity: DeviationGranularity): string {
  const { start, end } = getDataWindow(selectedMonth, granularity);
  const startLabel = moment(start, 'YYYY-MM-DD').format('MMM YYYY');
  const endLabel = moment(end, 'YYYY-MM-DD').format('MMM YYYY');

  if (granularity === 'daily') return selectedMonth.format('MMMM YYYY');
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}
