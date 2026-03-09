'use client';

import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';

const DEFAULT_THRESHOLDS = { success: 75, warning: 50 } as const;

interface RadialGaugeProps {
  value: number; // 0-100
  label: string;
  accentColor: string; // CSS var like "var(--chart-2)"
  thresholds?: { success: number; warning: number };
  className?: string;
}

function getStatusColor(value: number, thresholds: { success: number; warning: number }) {
  if (value >= thresholds.success) return 'text-emerald-600';
  if (value >= thresholds.warning) return 'text-amber-600';
  return 'text-red-600';
}

export const RadialGauge = React.memo(function RadialGauge({
  value,
  label,
  accentColor,
  thresholds = DEFAULT_THRESHOLDS,
  className,
}: RadialGaugeProps) {
  const chartConfig = React.useMemo<ChartConfig>(
    () => ({ value: { label, color: accentColor } }),
    [label, accentColor]
  );

  const chartData = React.useMemo(
    () => [{ name: label, value: Math.min(Math.max(value, 0), 100), fill: accentColor }],
    [label, value, accentColor]
  );

  const statusColor = getStatusColor(value, thresholds);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <ChartContainer config={chartConfig} className="w-full max-w-[200px] h-[110px]">
        <RadialBarChart data={chartData} startAngle={180} endAngle={0} innerRadius="70%" outerRadius="100%">
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'hsl(var(--muted))' }} />
        </RadialBarChart>
      </ChartContainer>
      <div className="-mt-4 text-center relative z-10">
        <p className={cn('text-2xl font-bold tabular-nums', statusColor)}>{Math.round(value)}%</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
});
