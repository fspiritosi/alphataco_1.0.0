/**
 * Semáforo de los puntos de las series del dashboard.
 *
 * Los gráficos de uso (empleados, equipos) y el de ausentismo pintan cada punto según
 * esté por encima o por debajo del valor esperado. La regla vivía repetida y con `any`
 * dentro de tres componentes; acá es lógica pura con test.
 */

/** Rojo: el valor superó el umbral esperado. */
export const THRESHOLD_DOT_ABOVE_COLOR = 'hsl(0 84.2% 60.2%)';
/** Verde: el valor está dentro de lo esperado (incluye el umbral exacto). */
export const THRESHOLD_DOT_WITHIN_COLOR = 'hsl(142.1 76.2% 36.3%)';

/**
 * `true` sólo si `value` es un número finito MAYOR que el umbral.
 * Un valor ausente o no numérico cuenta como dentro de lo esperado.
 */
export function isAboveThreshold(value: unknown, threshold: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > threshold;
}

/** Color del punto según el umbral. */
export function thresholdDotColor(value: unknown, threshold: number): string {
  return isAboveThreshold(value, threshold) ? THRESHOLD_DOT_ABOVE_COLOR : THRESHOLD_DOT_WITHIN_COLOR;
}
