'use client';

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import type { ChartDataPoint } from './CustomChartTooltip';
import { CustomChartTooltip } from './CustomChartTooltip';

const chartConfig = {
  mensual: {
    label: 'Mensual',
    color: 'oklch(0.78 0.145 70)',
  },
  adicional: {
    label: 'Adicional',
    color: 'oklch(0.70 0.10 185)',
  },
} satisfies ChartConfig;

interface ServiceHistoryAreaChartProps {
  chartData: ChartDataPoint[];
  activeView: 'total' | 'mensual' | 'adicional';
}

export function ServiceHistoryAreaChart({ chartData, activeView }: ServiceHistoryAreaChartProps) {
  const showMensual = activeView === 'total' || activeView === 'mensual';
  const showAdicional = activeView === 'total' || activeView === 'adicional';

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
      <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
        <defs>
          <linearGradient id="fillMensual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-mensual)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-mensual)" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fillAdicional" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-adicional)" stopOpacity={0.6} />
            <stop offset="95%" stopColor="var(--color-adicional)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => String(value)}
        />
        <ChartTooltip cursor={false} content={<CustomChartTooltip activeView={activeView} />} />
        {showMensual && (
          <Area
            dataKey="mensual"
            type="natural"
            fill="url(#fillMensual)"
            stroke="var(--color-mensual)"
            strokeWidth={2}
            stackId="a"
          />
        )}
        {showAdicional && (
          <Area
            dataKey="adicional"
            type="natural"
            fill="url(#fillAdicional)"
            stroke="var(--color-adicional)"
            strokeWidth={2}
            stackId="a"
          />
        )}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
