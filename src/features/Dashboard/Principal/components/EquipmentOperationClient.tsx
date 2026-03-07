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
import type { VehicleNotInReportResult } from '../actions/actions.server';
import { CookieFilter } from '../shared/CookieFilter';
import { IndicatorStats } from '../shared/IndicatorStats';
import { RadialGauge } from '../shared/RadialGauge';

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
  vehiclesNotInReport: VehicleNotInReportResult[];
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
  vehiclesNotInReport,
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
    return Math.max(len * 44, 160);
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
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
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
                  <LabelList dataKey="shortName" position="right" offset={8} fontSize={11} width={120} />
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Sin datos de equipos para hoy
            </div>
          )}

          {/* Stats + Gauge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t">
            <IndicatorStats items={stats} />
            <RadialGauge value={usagePercentage} label="Operatividad" accentColor="var(--chart-2)" />
          </div>
        </CardContent>
      </Card>

      {dialogOpen && (
        <AvailableVehiclesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          vehicles={vehiclesNotInReport}
          count={totalAvailable}
        />
      )}
    </>
  );
}
