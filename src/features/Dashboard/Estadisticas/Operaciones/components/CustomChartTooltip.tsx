'use client';

import * as React from 'react';

const MAX_CLIENTS_IN_TOOLTIP = 5;

export type ClientBreakdown = {
  name: string;
  mensual: number;
  adicional: number;
};

export type ChartDataPoint = {
  label: string;
  mensual: number;
  adicional: number;
  _breakdown: ClientBreakdown[];
  [key: string]: unknown;
};

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: ChartDataPoint;
    color: string;
  }>;
  label?: string;
  activeView: 'total' | 'mensual' | 'adicional';
}

export const CustomChartTooltip = React.memo(function CustomChartTooltip({
  active,
  payload,
  activeView,
}: CustomChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const breakdown = data._breakdown ?? [];

  // Sort clients by total descending
  const sorted = [...breakdown].sort((a, b) => b.mensual + b.adicional - (a.mensual + a.adicional));

  const visible = sorted.slice(0, MAX_CLIENTS_IN_TOOLTIP);
  const remaining = sorted.slice(MAX_CLIENTS_IN_TOOLTIP);
  const remainingMensual = remaining.reduce((s, c) => s + c.mensual, 0);
  const remainingAdicional = remaining.reduce((s, c) => s + c.adicional, 0);

  const showMensual = activeView === 'total' || activeView === 'mensual';
  const showAdicional = activeView === 'total' || activeView === 'adicional';

  return (
    <div className="border-border/50 bg-background min-w-[220px] max-w-[300px] rounded-lg border px-3 py-2 text-xs shadow-xl">
      {/* Period label */}
      <p className="font-medium mb-1.5">{data.label}</p>

      {/* Mensual section */}
      {showMensual && data.mensual > 0 && (
        <div className="mb-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: 'var(--chart-1)' }} />
            <span className="text-muted-foreground">Mensual</span>
            <span className="ml-auto font-mono font-medium tabular-nums">{data.mensual.toLocaleString('es-AR')}</span>
          </div>
          {visible
            .filter((c) => c.mensual > 0)
            .map((c) => (
              <div key={c.name} className="flex justify-between pl-3.5 text-muted-foreground">
                <span className="truncate max-w-[160px]">{c.name}</span>
                <span className="font-mono tabular-nums">{c.mensual}</span>
              </div>
            ))}
          {remaining.length > 0 && remainingMensual > 0 && (
            <div className="flex justify-between pl-3.5 text-muted-foreground italic">
              <span>...y {remaining.length} mas</span>
              <span className="font-mono tabular-nums">{remainingMensual}</span>
            </div>
          )}
        </div>
      )}

      {/* Adicional section */}
      {showAdicional && data.adicional > 0 && (
        <div className="mb-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: 'var(--chart-2)' }} />
            <span className="text-muted-foreground">Adicional</span>
            <span className="ml-auto font-mono font-medium tabular-nums">{data.adicional.toLocaleString('es-AR')}</span>
          </div>
          {visible
            .filter((c) => c.adicional > 0)
            .map((c) => (
              <div key={c.name} className="flex justify-between pl-3.5 text-muted-foreground">
                <span className="truncate max-w-[160px]">{c.name}</span>
                <span className="font-mono tabular-nums">{c.adicional}</span>
              </div>
            ))}
          {remaining.length > 0 && remainingAdicional > 0 && (
            <div className="flex justify-between pl-3.5 text-muted-foreground italic">
              <span>...y {remaining.length} mas</span>
              <span className="font-mono tabular-nums">{remainingAdicional}</span>
            </div>
          )}
        </div>
      )}

      {/* Total */}
      {activeView === 'total' && (
        <div className="flex justify-between border-t border-border/50 pt-1.5 font-medium">
          <span>Total</span>
          <span className="font-mono tabular-nums">{(data.mensual + data.adicional).toLocaleString('es-AR')}</span>
        </div>
      )}
    </div>
  );
});
