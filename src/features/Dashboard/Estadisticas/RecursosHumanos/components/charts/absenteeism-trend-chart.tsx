'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { CartesianGrid, LabelList, Line, LineChart, XAxis } from 'recharts';

interface TrendData {
  date: string;
  percentage: number;
}

interface AbsenteeismTrendChartProps {
  data: TrendData[];
  chartConfig: ChartConfig;
  showLabels?: boolean;
}

export function AbsenteeismTrendChartComponent({ chartConfig, data, showLabels }: AbsenteeismTrendChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
      <LineChart
        accessibilityLayer
        data={data}
        margin={{
          top: 20,
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: string) => {
            if (!value) return '';
            // Si ya viene como D/M o DD/MM(/YYYY), tomar día/mes
            if (value.includes('/')) {
              const parts = value.split('/');
              if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
            }
            // ISO YYYY-MM-DD -> D/M
            const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
            if (iso) {
              const [, , m, d] = iso;
              return `${parseInt(d, 10)}/${parseInt(m, 10)}`;
            }
            // Intento de parseo genérico
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
              return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
            }
            return value;
          }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
        <Line
          dataKey="percentage"
          type="natural"
          stroke="var(--color-percentage)"
          strokeWidth={2}
          dot={{
            fill: 'var(--color-percentage)',
          }}
          activeDot={{
            r: 6,
          }}
        >
          {showLabels && (
            <LabelList
              position="top"
              offset={12}
              className="fill-foreground"
              fontSize={12}
              formatter={(value: number) => `${value}%`}
            />
          )}
        </Line>
      </LineChart>
    </ChartContainer>
  );
}
