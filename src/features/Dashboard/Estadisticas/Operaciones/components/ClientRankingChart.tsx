'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';

const MAX_CLIENTS_VISIBLE = 7;

const chartConfig = {
  mensual: {
    label: 'Mensual',
    color: 'var(--chart-1)',
  },
  adicional: {
    label: 'Adicional',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

interface ClientRankingData {
  name: string;
  mensual: number;
  adicional: number;
}

interface ClientRankingChartProps {
  data: ClientRankingData[];
  periodLabel: string;
}

export function ClientRankingChart({ data, periodLabel }: ClientRankingChartProps) {
  const visible = data.slice(0, MAX_CLIENTS_VISIBLE);
  const remainingCount = data.length - visible.length;

  if (visible.length === 0) {
    return null;
  }

  // Truncate long names for the Y axis
  const chartData = visible.map((item) => ({
    ...item,
    shortName: item.name.length > 20 ? item.name.slice(0, 18) + '...' : item.name,
  }));

  const chartHeight = Math.max(180, visible.length * 40 + 40);

  return (
    <Card className="py-0">
      <CardHeader className="pb-2 pt-4 px-6">
        <CardTitle className="text-base">Servicios por cliente</CardTitle>
        <CardDescription>{periodLabel}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
          <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 0, right: 12 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="shortName"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={130}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Bar dataKey="mensual" stackId="a" fill="var(--color-mensual)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="adicional" stackId="a" fill="var(--color-adicional)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
        {remainingCount > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-1">
            +{remainingCount} {remainingCount === 1 ? 'cliente' : 'clientes'} mas
          </p>
        )}
      </CardContent>
    </Card>
  );
}
