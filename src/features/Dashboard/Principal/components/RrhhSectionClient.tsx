'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import dynamic from 'next/dynamic';
import * as React from 'react';
import { Cell, Label, Pie, PieChart } from 'recharts';
import type { DiagramIndicatorResult, EmployeeNotInReportResult } from '../actions/actions.server';
import { CookieFilter } from '../shared/CookieFilter';
import { IndicatorStats } from '../shared/IndicatorStats';
import { RadialGauge } from '../shared/RadialGauge';

const AvailableEmployeesDialog = dynamic(() => import('./AvailableEmployeesDialog'), {
  ssr: false,
});

interface Props {
  date: string;
  diagramData: DiagramIndicatorResult[];
  operativos: number;
  enOperacion: number;
  disponibles: number;
  indicatorPercent: number;
  employeesNotInReport: EmployeeNotInReportResult[];
  positions: { label: string; value: string }[];
  initialFilterValues: string[];
}

export function RrhhSectionClient({
  date,
  diagramData,
  operativos,
  enOperacion,
  disponibles,
  indicatorPercent,
  employeesNotInReport,
  positions,
  initialFilterValues,
}: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { chartConfig, chartData } = React.useMemo(() => {
    const config: ChartConfig = { empleados: { label: 'Novedades' } };
    const data = diagramData.map((d) => {
      config[d.diagram_type_name] = {
        label: d.diagram_type_name,
        color: d.diagram_type_color,
      };
      return {
        name: d.diagram_type_name,
        value: d.cantidad_empleados,
        fill: d.diagram_type_color,
      };
    });
    return { chartConfig: config, chartData: data };
  }, [diagramData]);

  const stats = React.useMemo(
    () => [
      { label: 'Con diagrama', value: operativos },
      { label: 'En operacion', value: enOperacion },
      { label: 'Disponibles', value: disponibles, onClick: () => setDialogOpen(true) },
    ],
    [operativos, enOperacion, disponibles]
  );

  const totalDiagramEmployees = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <>
      <Card>
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base">Recursos Humanos</CardTitle>
              <CardDescription>{date}</CardDescription>
            </div>
            <CookieFilter
              cookieName="position-filter"
              options={positions}
              placeholder="Filtrar por posicion..."
              initialValues={initialFilterValues}
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Donut with center text */}
            <div>
              <h4 className="text-sm font-medium mb-3">Novedades cargadas</h4>
              {chartData.length > 0 ? (
                <>
                  <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[220px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        strokeWidth={2}
                      >
                        {chartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                              return (
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                  <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                                    {totalDiagramEmployees}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy ?? 0) + 20}
                                    className="fill-muted-foreground text-xs"
                                  >
                                    Empleados
                                  </tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 justify-center max-h-[80px] overflow-y-auto">
                    {chartData
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 6)
                      .map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                          <span className="truncate max-w-[140px]">{d.name}</span>: {d.value}
                        </div>
                      ))}
                    {chartData.length > 6 && (
                      <span className="text-xs text-muted-foreground">+{chartData.length - 6} más</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                  Sin diagramas para hoy
                </div>
              )}
            </div>

            {/* Right: Stats + Gauge */}
            <div className="flex flex-col gap-4">
              <IndicatorStats items={stats} />
              <RadialGauge value={indicatorPercent} label="Operativos" accentColor="var(--chart-2)" />
            </div>
          </div>
        </CardContent>
      </Card>

      {dialogOpen && (
        <AvailableEmployeesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          employees={employeesNotInReport}
          count={disponibles}
        />
      )}
    </>
  );
}
