import {
  MAINTENANCE_KIND_COLORS,
  MAINTENANCE_KIND_ORDER,
  REQUEST_SOURCE_COLORS,
  REQUEST_SOURCE_ORDER,
} from '../chart-constants';

/**
 * Única fuente del color para el gráfico, su leyenda y sus KPI.
 *
 * Las leyendas y los porcentajes viven FUERA del `ChartContainer`, así que el
 * `theme` del `ChartConfig` de shadcn no alcanza (solo define las variables
 * dentro del contenedor del gráfico). Declarándolas acá, en un ancestro común
 * de las dos tarjetas, el mismo color llega a los tres lugares y el modo oscuro
 * se resuelve por CSS, sin JS. Mismo patrón que `SeriesColorVars` de Sala de
 * Control.
 */
export function MaintenanceStatsColorVars() {
  const declarations = (mode: 'light' | 'dark') =>
    [
      ...REQUEST_SOURCE_ORDER.map((s) => `--mnt-source-${s}: ${REQUEST_SOURCE_COLORS[s][mode]};`),
      ...MAINTENANCE_KIND_ORDER.map((k) => `--mnt-kind-${k.toLowerCase()}: ${MAINTENANCE_KIND_COLORS[k][mode]};`),
    ].join(' ');

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: [
          `[data-maintenance-stats] { ${declarations('light')} }`,
          `.dark [data-maintenance-stats] { ${declarations('dark')} }`,
        ].join('\n'),
      }}
    />
  );
}
