'use client';

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

const chartConfig = {
  confirmado: {
    label: 'Confirmados',
    color: 'oklch(0.72 0.17 150)', // green
  },
  pendiente: {
    label: 'Pendientes',
    color: 'oklch(0.80 0.15 85)', // yellow
  },
  rechazado: {
    label: 'Rechazados',
    color: 'oklch(0.75 0.15 55)', // amber/orange
  },
  cancelado: {
    label: 'Cancelados',
    color: 'oklch(0.63 0.20 25)', // red
  },
  otros: {
    label: 'Otros',
    color: 'oklch(0.70 0.02 260)', // gray
  },
} satisfies ChartConfig;

export type OrderChartDataPoint = {
  label: string;
  confirmado: number;
  pendiente: number;
  rechazado: number;
  cancelado: number;
  otros: number;
};

type ActiveView = 'total' | 'confirmado' | 'pendiente' | 'rechazado' | 'cancelado';

interface Props {
  chartData: OrderChartDataPoint[];
  activeView: ActiveView;
}

const SERIES = ['confirmado', 'pendiente', 'rechazado', 'cancelado', 'otros'] as const;

export function OrderManagementChart({ chartData, activeView }: Props) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
      <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => String(value)}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {SERIES.map((key) => {
          const visible = activeView === 'total' || activeView === key;
          if (!visible) return null;
          return (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          );
        })}
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  );
}
