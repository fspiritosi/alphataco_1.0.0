'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import moment from 'moment';
import dynamic from 'next/dynamic';
import * as React from 'react';
import { Cell, Label, Pie, PieChart } from 'recharts';
import type { ServicesSummaryResult } from '../actions/actions.server';
import { getServicesDetailByClient } from '../actions/actions.server';

const ServicesDetailDialog = dynamic(() => import('./ServicesDetailDialog'), { ssr: false });

const SERVICE_LABELS: Record<string, string> = {
  mensual: 'Mensual',
  adicional: 'Adicional',
  adicional_permanente: 'Adicional Permanente',
};

// High-contrast palette for donut charts — avoids similar tones
const CHART_COLORS = [
  '#e76e50', // terracotta
  '#2a9d8f', // teal
  '#e9c46a', // saffron
  '#264653', // dark cyan
  '#f4a261', // sandy
  '#7209b7', // purple
  '#3a86ff', // blue
  '#06d6a0', // mint
];

interface Props {
  servicesSummary: ServicesSummaryResult[];
}

export function ServicesSection({ servicesSummary }: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const date = moment().format('DD/MM/YYYY');

  const { data: clientDetail } = useQuery({
    queryKey: ['services-detail-by-client-today'],
    queryFn: () => getServicesDetailByClient(),
    staleTime: 5 * 60 * 1000,
  });

  const typesSummary = React.useMemo(() => {
    const byType = new Map<string, { count: number; percentage: number }>();
    for (const row of servicesSummary) {
      const count = Number(row.service_count) || 0;
      const percentage = Number(row.percentage) || 0;
      const existing = byType.get(row.type_service);
      if (existing) {
        existing.count += count;
      } else {
        byType.set(row.type_service, { count, percentage });
      }
    }
    return Array.from(byType.entries()).map(([type, data]) => ({
      type,
      label: SERVICE_LABELS[type] ?? type,
      ...data,
    }));
  }, [servicesSummary]);

  const totalServices = typesSummary.reduce((sum, t) => sum + t.count, 0);

  const clientData = React.useMemo(() => {
    if (!clientDetail || clientDetail.length === 0) return [];
    return clientDetail.map((c, i) => ({
      name: c.client_name,
      value: c.total_count,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [clientDetail]);

  const chartConfig = React.useMemo<ChartConfig>(() => {
    const config: ChartConfig = { value: { label: 'Servicios' } };
    clientData.forEach((d) => {
      config[d.name] = { label: d.name, color: d.fill };
    });
    return config;
  }, [clientData]);

  const totalClientServices = clientData.reduce((sum, d) => sum + d.value, 0);

  return (
    <>
      <Card>
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base">Servicios del Día</CardTitle>
              <CardDescription>{date}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Ver detalle por cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Types table */}
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Servicio</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typesSummary.map((t, i) => (
                    <TableRow key={t.type}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          {t.label}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {t.count.toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="tabular-nums">
                          {t.percentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{totalServices.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right">
                      <Badge>100%</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Right: Client donut chart with center text */}
            <div>
              <h4 className="text-sm font-medium mb-3">Distribución por Cliente</h4>
              {clientData.length > 0 ? (
                <>
                  <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[220px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={clientData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        strokeWidth={2}
                      >
                        {clientData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                              return (
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                  <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                                    {totalClientServices.toLocaleString('es-AR')}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy ?? 0) + 20}
                                    className="fill-muted-foreground text-xs"
                                  >
                                    Servicios
                                  </tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="flex flex-wrap gap-3 mt-3 justify-center">
                    {clientData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                        <span className="truncate max-w-[120px]">{d.name}</span>: {d.value}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                  Sin servicios para hoy
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {dialogOpen && <ServicesDetailDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
    </>
  );
}
