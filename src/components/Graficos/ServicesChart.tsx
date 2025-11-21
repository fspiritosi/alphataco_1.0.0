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
import { getServicesDetailByClient } from '@/features/Operaciones/PartesDiarios/actions/actions';
import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Pie, PieChart } from 'recharts';
import { ServicesDetailByClient } from './ServicesDetailByClient';

import { CardFooter } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export const description = 'A pie chart with a label';

interface ServicesSummary {
  type_service: string;
  service_count: number;
  percentage: number;
}

interface ClientServiceData {
  client_name: string;
  total_count: number;
  fill: string;
}

export function ServicesChart({ servicesSummary }: { servicesSummary: ServicesSummary[] }) {
  const servicesData = servicesSummary;
  const [chartData, setChartData] = useState<ClientServiceData[]>([]);
  const [chartConfig2, setChartConfig2] = useState<ChartConfig>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadChartData = async () => {
      try {
        setIsLoading(true);
        const servicesDetail = await getServicesDetailByClient();

        // Crear chartData con los datos de servicios por cliente
        const clientData: ClientServiceData[] = servicesDetail.map((item, index) => ({
          client_name: item.client_name,
          total_count: item.total_count,
          fill: `hsl(var(--chart-${(index % 5) + 1}))`,
        }));

        // Crear chartConfig2 dinámicamente
        const config: ChartConfig = {
          total_count: {
            label: 'Servicios',
          },
        };

        servicesDetail.forEach((item, index) => {
          const clientKey = `client-${index + 1}`;
          config[clientKey] = {
            label: item.client_name,
            color: `var(--chart-${(index % 5) + 1})`,
          };
        });

        setChartData(clientData);
        setChartConfig2(config);
      } catch (error) {
        console.error('Error loading chart data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChartData();
  }, []);

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

      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Distribución de Servicios por Cliente</CardTitle>
          <CardDescription>Servicios del día actual agrupados por cliente</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-[250px]">
              <div className="text-muted-foreground">Cargando datos...</div>
            </div>
          ) : chartData.length > 0 ? (
            <ChartContainer
              config={chartConfig2}
              className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square max-h-[250px] pb-0"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={chartData} dataKey="total_count" label nameKey="client_name" />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px]">
              <div className="text-muted-foreground">No hay datos para mostrar</div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 leading-none font-medium">Distribución actualizada</div>
          <div className="text-muted-foreground leading-none">Mostrando servicios del día actual por cliente</div>
        </CardFooter>
      </Card>
    </div>
  );
}
