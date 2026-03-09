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
import dynamic from 'next/dynamic';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { CookieFilter } from '../shared/CookieFilter';
import { RadialGauge } from '../shared/RadialGauge';

// bundle-dynamic-imports — dialog loads only when opened
const AvailableVehiclesDialog = dynamic(() => import('./AvailableVehiclesDialog'), {
  ssr: false,
});

const chartConfig = {
  activos: {
    label: 'Activos',
    color: 'var(--chart-2)',
  },
  fueraDeServicio: {
    label: 'Fuera de Servicio',
    color: 'var(--chart-1)',
  },
  trabajando: {
    label: 'Trabajando',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig;

interface EquipmentChartItem {
  name: string;
  shortName: string;
  activos: number;
  fueraDeServicio: number;
  trabajando: number;
}

interface Props {
  date: string;
  chartData: EquipmentChartItem[];
  totalActive: number;
  totalInUse: number;
  totalAvailable: number;
  usagePercentage: number;
  typeIds?: string[];
  vehicleTypes: { label: string; value: string }[];
  initialFilterValues: string[];
}

export function EquipmentOperationClient({
  date,
  chartData,
  totalActive,
  totalInUse,
  totalAvailable,
  usagePercentage,
  typeIds,
  vehicleTypes,
  initialFilterValues,
}: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const stats = React.useMemo(
    () => [
      { label: 'Activos', value: totalActive },
      { label: 'En Uso', value: totalInUse },
      { label: 'Disponibles', value: totalAvailable, onClick: () => setDialogOpen(true) },
    ],
    [totalActive, totalInUse, totalAvailable]
  );

  const dynamicHeight = React.useMemo(() => {
    const len = chartData.length;
    if (len === 0) return 200;
    // Each bar needs ~44px height; add 40px bottom padding for the legend
    return Math.max(len * 44 + 40, 200);
  }, [chartData]);

  return (
    <>
      <Card>
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base">Estado de Equipos</CardTitle>
              <CardDescription>Activos, Fuera de Servicio y Trabajando por Tipo</CardDescription>
            </div>
            <CookieFilter
              cookieName="type-filter"
              options={vehicleTypes}
              placeholder="Filtrar por tipo..."
              initialValues={initialFilterValues}
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Chart */}
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="w-full" style={{ height: dynamicHeight }}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 140, bottom: 0, left: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tick={{ fontSize: 11 }}
                  hide
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent className="w-[200px]" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="activos" stackId="stack" fill="var(--color-activos)" radius={[0, 0, 0, 0]} />
                <Bar
                  dataKey="fueraDeServicio"
                  stackId="stack"
                  fill="var(--color-fueraDeServicio)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar dataKey="trabajando" stackId="stack" fill="var(--color-trabajando)" radius={[0, 2, 2, 0]}>
                  <LabelList dataKey="shortName" position="right" offset={8} fontSize={11} />
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Sin datos de equipos para hoy
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t text-center">
            {stats.map((stat) =>
              stat.onClick ? (
                <button
                  key={stat.label}
                  type="button"
                  onClick={stat.onClick}
                  className="rounded-lg border p-2 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-lg font-bold tabular-nums">{stat.value.toLocaleString('es-AR')}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </button>
              ) : (
                <div key={stat.label} className="rounded-lg border p-2">
                  <p className="text-lg font-bold tabular-nums">{stat.value.toLocaleString('es-AR')}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              )
            )}
          </div>
          <RadialGauge value={usagePercentage} label="Operatividad" accentColor="var(--chart-2)" />
          <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t text-center">
            <span className="font-semibold">Indicador</span> = Equipos activos − Equipos en uso
          </p>
        </CardContent>
      </Card>

      {dialogOpen && (
        <AvailableVehiclesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          count={totalAvailable}
          typeIds={typeIds}
        />
      )}
    </>
  );
}
