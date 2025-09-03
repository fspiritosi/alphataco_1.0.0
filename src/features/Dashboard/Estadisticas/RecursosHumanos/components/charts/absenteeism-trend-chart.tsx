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
}

export function AbsenteeismTrendChartComponent({ chartConfig, data }: AbsenteeismTrendChartProps) {
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
          tickFormatter={(value) => value.split('/')[0]}
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
          <LabelList
            position="top"
            offset={12}
            className="fill-foreground"
            fontSize={12}
            formatter={(value: number) => `${value}%`}
          />
        </Line>
      </LineChart>
    </ChartContainer>
  );
}
