'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { getMaintenanceTypeBreakdown } from '../actions/actions.server';

// Barras agrupadas (no apiladas): un grupo por tipo de equipo, dos barras.
const chartConfig = {
  preventivo: { label: 'Preventivo', color: 'var(--chart-2)' },
  correctivo: { label: 'Correctivo', color: 'var(--chart-1)' },
} satisfies ChartConfig;

interface Props {
  monthKey: string;
  monthLabel: string;
}

/**
 * Grafico de equipos UNICOS (dominios) con mantenimiento preventivo vs correctivo
 * discriminado por tipo de equipo, para el mes seleccionado (ticket 233). Se
 * autoabastece con su propia query keyada por monthKey, en sintonia con la
 * navegacion de mes del reporte.
 */
export function MaintenanceTypeBarChart({ monthKey, monthLabel }: Props) {
  const { data, isFetching } = useQuery({
    queryKey: ['mantenimiento-type-breakdown', monthKey],
    queryFn: () => getMaintenanceTypeBreakdown(monthKey),
    staleTime: 5 * 60 * 1000,
  });

  const isEmpty = !data || data.length === 0;

  return (
    <Card className="py-0">
      <CardHeader className="px-6 pt-4 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Mantenimiento preventivo vs correctivo por tipo
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>Equipos únicos que entraron a taller · {monthLabel}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        {isEmpty ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            Sin equipos en mantenimiento este período
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
            <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="typeName"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 12)}…` : v)}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={4} allowDecimals={false} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="preventivo" fill="var(--color-preventivo)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="correctivo" fill="var(--color-correctivo)" radius={[4, 4, 0, 0]} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
