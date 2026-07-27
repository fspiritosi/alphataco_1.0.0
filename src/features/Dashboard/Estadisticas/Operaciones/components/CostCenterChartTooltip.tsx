'use client';

import * as React from 'react';
import type { ChartDataPoint } from './CustomChartTooltip';

interface CostCenterChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
    payload: ChartDataPoint;
  }>;
  activeView: 'total' | 'mensual' | 'adicional';
}

const VIEW_LABELS: Record<'total' | 'mensual' | 'adicional', string> = {
  total: 'Total',
  mensual: 'Mensual',
  adicional: 'Adicional',
};

/**
 * Tooltip de la vista por centro de costo: un renglon por centro con su valor.
 * No muestra un total sumado a proposito — un mismo servicio puede estar contado en
 * varios centros, asi que esa suma no representaria una cantidad real de servicios.
 */
export const CostCenterChartTooltip = React.memo(function CostCenterChartTooltip({
  active,
  payload,
  activeView,
}: CostCenterChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const label = payload[0].payload.label;

  // Mayor a menor, para leer de un vistazo que centro traccionó mas
  const sorted = [...payload].sort((a, b) => b.value - a.value);

  return (
    <div className="border-border/50 bg-background min-w-[220px] max-w-[300px] rounded-lg border px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-medium">{label}</p>
      <p className="mb-1.5 text-muted-foreground">{VIEW_LABELS[activeView]}</p>

      {sorted.map((item) => (
        <div key={item.dataKey} className="flex items-center gap-1.5">
          <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
          <span className="truncate text-muted-foreground">{item.name}</span>
          <span className="ml-auto font-mono font-medium tabular-nums">{item.value.toLocaleString('es-AR')}</span>
        </div>
      ))}
    </div>
  );
});
