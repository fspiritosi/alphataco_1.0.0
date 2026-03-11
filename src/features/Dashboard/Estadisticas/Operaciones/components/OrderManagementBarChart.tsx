'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import type { OrderChartDataPoint } from './OrderManagementChart';

const MAX_CLIENTS_VISIBLE = 7;

const chartConfig = {
  confirmado: {
    label: 'Confirmados',
    color: 'oklch(0.72 0.17 150)',
  },
  pendiente: {
    label: 'Pendientes',
    color: 'oklch(0.80 0.15 85)',
  },
  rechazado: {
    label: 'Rechazados',
    color: 'oklch(0.75 0.15 55)',
  },
  cancelado: {
    label: 'Cancelados',
    color: 'oklch(0.63 0.20 25)',
  },
  otros: {
    label: 'Otros',
    color: 'oklch(0.70 0.02 260)',
  },
} satisfies ChartConfig;

type ActiveView = 'total' | 'confirmado' | 'pendiente' | 'rechazado' | 'cancelado';

const SERIES = ['confirmado', 'pendiente', 'rechazado', 'cancelado', 'otros'] as const;

interface Props {
  chartData: OrderChartDataPoint[];
  activeView: ActiveView;
  periodLabel: string;
}

export function OrderManagementBarChart({ chartData, activeView, periodLabel }: Props) {
  const [showAll, setShowAll] = useState(false);

  const remainingCount = Math.max(0, chartData.length - MAX_CLIENTS_VISIBLE);
  const displayData = showAll ? chartData : chartData.slice(0, MAX_CLIENTS_VISIBLE);
  const visibleSeries = SERIES.filter((key) => activeView === 'total' || activeView === key);

  const chartHeight = Math.max(200, displayData.length * 45 + 60);

  return (
    <Card className="py-0">
      <CardHeader className="pb-2 pt-4 px-6">
        <CardTitle className="text-base">Pedidos por cliente</CardTitle>
        <CardDescription>{periodLabel}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
          <BarChart accessibilityLayer data={displayData} layout="vertical" margin={{ left: 0, right: 12 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={130}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            {visibleSeries.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={`var(--color-${key})`}
                radius={idx === visibleSeries.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
        {remainingCount > 0 && (
          <div className="flex justify-center mt-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-7 gap-1"
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? (
                <>
                  Mostrar menos <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  +{remainingCount} {remainingCount === 1 ? 'cliente' : 'clientes'}{' '}
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
