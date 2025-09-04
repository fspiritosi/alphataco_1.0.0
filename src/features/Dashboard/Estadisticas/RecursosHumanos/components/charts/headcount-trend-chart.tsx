'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { CartesianGrid, LabelList, Line, LineChart, XAxis } from 'recharts';

interface HeadcountTrendData {
  date: string;
  dotacion: number;
}

interface HeadcountTrendChartProps {
  data: HeadcountTrendData[];
  chartConfig: ChartConfig;
  showLabels?: boolean;
}

export function HeadcountTrendChartComponent({ chartConfig, data, showLabels }: HeadcountTrendChartProps) {
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
            if (value.includes('/')) {
              const parts = value.split('/');
              if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
            }
            const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
            if (iso) {
              const [, , m, d] = iso;
              return `${parseInt(d, 10)}/${parseInt(m, 10)}`;
            }
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
              return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
            }
            return value;
          }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
        <Line
          dataKey="dotacion"
          type="natural"
          stroke="var(--color-dotacion)"
          strokeWidth={2}
          dot={{
            fill: 'var(--color-dotacion)',
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
              formatter={(value: number) => `${value}`}
            />
          )}
        </Line>
      </LineChart>
    </ChartContainer>
  );
}
