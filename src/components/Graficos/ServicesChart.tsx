'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig } from '@/components/ui/chart';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye } from 'lucide-react';
import { use } from 'react';
import { ServicesDetailByClient } from './ServicesDetailByClient';

const chartConfig = {
  visitors: {
    label: 'Servicios',
  },
  mensual: {
    label: 'Mensual',
    color: '#22c55e', // Verde
  },
  adicional: {
    label: 'Adicional',
    color: '#3b82f6', // Azul
  },
  adicional_permanente: {
    label: 'Adicional Permanente',
    color: '#f59e0b', // Amarillo
  },
  sin_tipo: {
    label: 'Sin Tipo',
    color: '#6b7280', // Gris
  },
} satisfies ChartConfig;

interface ServicesSummary {
  type_service: string;
  service_count: number;
  percentage: number;
}

export function ServicesChart({ servicesSummary }: { servicesSummary: Promise<ServicesSummary[]> }) {
  const servicesData = use(servicesSummary);

  const dataChart = servicesData.map((service) => ({
    browser: service.type_service,
    visitors: service.service_count,
    fill: getColorByType(service.type_service),
  }));

  const totalServices = servicesData.reduce((sum, service) => sum + service.service_count, 0);
  const today = new Date().toLocaleDateString();

  function getColorByType(type: string): string {
    switch (type) {
      case 'mensual':
        return '#22c55e';
      case 'adicional':
        return '#3b82f6';
      case 'adicional_permanente':
        return '#f59e0b';
      case 'sin_tipo':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  }

  function getTypeLabel(type: string): string {
    switch (type) {
      case 'mensual':
        return 'Mensual';
      case 'adicional':
        return 'Adicional';
      case 'adicional_permanente':
        return 'Adicional Permanente';
      case 'sin_tipo':
        return 'Sin Tipo';
      default:
        return type;
    }
  }

  return (
    <div className="grid grid-cols-1  gap-4">
      {/* Gráfico de Pastel */}
      {/* <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Servicios por tipo de operación</CardTitle>
          <CardDescription>{today}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip 
                cursor={false} 
                content={<ChartTooltipContent 
                  hideLabel 
                  formatter={(value, name) => [
                    `${value} (${servicesData.find(s => s.type_service === name)?.percentage.toFixed(1)}%)`,
                    chartConfig[name as keyof typeof chartConfig]?.label || name
                  ]}
                />} 
              />
              <Pie data={dataChart} dataKey="visitors" nameKey="browser" innerRadius={60} strokeWidth={5}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                            {totalServices}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                            Servicios Totales
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card> */}

      {/* Tabla de Detalles */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Detalle por tipo</CardTitle>
              <CardDescription>Distribución de servicios</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Ver detalle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Detalle de servicios por cliente</DialogTitle>
                  <DialogDescription>
                    Distribución detallada de servicios mensuales y adicionales por cliente
                  </DialogDescription>
                </DialogHeader>
                <ServicesDetailByClient />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Servicio</TableHead>
                <TableHead className="text-center">Cantidad</TableHead>
                <TableHead className="text-center">Porcentaje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicesData.length > 0 ? (
                servicesData.map((service, index) => (
                  <TableRow key={index}>
                    <TableCell className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getColorByType(service.type_service) }}
                      />
                      <span className="font-medium">{getTypeLabel(service.type_service)}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono">
                        {service.service_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="font-mono"
                        style={{
                          borderColor: getColorByType(service.type_service),
                          color: getColorByType(service.type_service),
                        }}
                      >
                        {service.percentage.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No hay servicios ejecutados para mostrar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Resumen Total */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Total de servicios:</span>
              <Badge variant="default" className="font-mono text-base">
                {totalServices}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
