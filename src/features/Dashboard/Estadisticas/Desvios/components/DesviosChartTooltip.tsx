'use client';

import { DEVIATION_SERIES, seriesColorVar } from '../constants';

/**
 * Un punto del grafico: el bucket temporal mas los cinco contadores.
 *
 * Los contadores en `null` (series sin medicion para ese periodo) hacen que
 * recharts corte la linea, que es exactamente lo que se quiere mostrar.
 */
export type DeviationChartPoint = {
  key: string;
  label: string;
  rows_with_deviations: number | null;
  employee_deviations: number | null;
  equipment_deviations: number | null;
  duplicated_employees: number;
  duplicated_equipment: number;
};

type TooltipPayloadEntry = {
  dataKey?: string | number;
  payload?: DeviationChartPoint;
};

interface Props {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

export function DesviosChartTooltip({ active, payload }: Props) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  // Solo las series efectivamente dibujadas: si el usuario apago una, no tiene
  // sentido mostrarla en el detalle.
  const visibleKeys = new Set(payload.map((entry) => String(entry.dataKey)));
  const rows = DEVIATION_SERIES.filter((serie) => visibleKeys.has(serie.key));

  return (
    <div className="grid min-w-[15rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <div className="font-medium">{point.label}</div>

      {rows.map((serie) => (
        <div key={serie.key} className="flex w-full items-center gap-2">
          <div
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: seriesColorVar(serie.key) }}
          />
          <div className="flex flex-1 items-center justify-between gap-3 leading-none">
            <span className="text-muted-foreground">{serie.label}</span>
            <span className="font-medium tabular-nums text-foreground">
              {point[serie.key] ?? <span className="text-muted-foreground">sin registro</span>}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
