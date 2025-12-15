'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { type DateRange } from 'react-day-picker';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChartData } from '../hooks/useChartData';

export function DiagramDistributionChart() {
  const { data: rawData, loading } = useChartData('get_employee_diagram_count_by_day');

  const chartData = React.useMemo(() => {
    return rawData.map((item) => ({
      date: item.snapshot_date,
      metrics: item.metrics,
    }));
  }, [rawData]);

  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);

  // Resetear range cuando cambia timeRange
  React.useEffect(() => {
    if (timeRange) {
      const today = new Date();
      const from = new Date();
      const daysToSubtract = timeRange === '1y' ? 365 : timeRange === '90d' ? 90 : timeRange === '7d' ? 7 : 30;
      from.setDate(today.getDate() - daysToSubtract);
      setRange({
        from,
        to: today,
      });
    }
  }, [timeRange]);

  // Filtrar datos por rango
  const filteredChartData = React.useMemo(() => {
    let filtered;
    if (!range?.from && !range?.to) {
      filtered = chartData.filter((item) => {
        const date = new Date(item.date);
        return !isNaN(date.getTime());
      });
    } else {
      filtered = chartData.filter((item) => {
        const date = new Date(item.date);
        if (isNaN(date.getTime())) return false;

        if (range.from && range.to) {
          // Normalizar fechas para comparar solo el día
          const itemDate = new Date(date);
          itemDate.setHours(0, 0, 0, 0);
          const fromDate = new Date(range.from);
          fromDate.setHours(0, 0, 0, 0);
          const toDate = new Date(range.to);
          toDate.setHours(23, 59, 59, 999);
          return itemDate >= fromDate && itemDate <= toDate;
        }
        if (range.from) {
          const itemDate = new Date(date);
          itemDate.setHours(0, 0, 0, 0);
          const fromDate = new Date(range.from);
          fromDate.setHours(0, 0, 0, 0);
          return itemDate >= fromDate;
        }
        return true;
      });
    }

    return filtered;
  }, [chartData, range]);

  // Transformar datos para mostrar evolución temporal
  // Obtener todos los tipos de diagrama únicos de todos los snapshots
  const diagramTypes = React.useMemo(() => {
    const typesMap = new Map<string, { name: string; color: string }>();

    filteredChartData.forEach((item) => {
      const metrics = item.metrics as Array<{
        diagram_type_id?: string;
        diagram_type_name?: string;
        diagram_type_color?: string;
      }>;

      if (Array.isArray(metrics)) {
        metrics.forEach((metric) => {
          const id = metric.diagram_type_id || '';
          const name = metric.diagram_type_name || 'Sin nombre';
          const color = metric.diagram_type_color || 'hsl(var(--chart-1))';

          if (id && !typesMap.has(id)) {
            typesMap.set(id, { name, color });
          }
        });
      }
    });

    const types = Array.from(typesMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      color: data.color,
      key: id.replace(/-/g, '_').replace(/[^a-z0-9_]/gi, '_'),
    }));

    return types;
  }, [filteredChartData]);

  // Crear datos para el gráfico: cada fecha tiene valores para cada tipo de diagrama
  const timeSeriesData = React.useMemo(() => {
    const result = filteredChartData
      .filter((item) => {
        // Validar que la fecha sea válida
        const date = new Date(item.date);
        return !isNaN(date.getTime());
      })
      .map((item) => {
        const metrics = item.metrics as Array<{
          diagram_type_id?: string;
          diagram_type_name?: string;
          cantidad_empleados?: number;
          diagram_type_color?: string;
        }>;

        // Normalizar la fecha
        const date = new Date(item.date);
        const normalizedDate = date.toISOString().split('T')[0];

        const dataPoint: Record<string, any> = {
          date: normalizedDate,
        };

        // Inicializar todos los tipos en 0
        diagramTypes.forEach((type) => {
          dataPoint[type.key] = 0;
        });

        // Llenar con los valores reales
        if (Array.isArray(metrics)) {
          metrics.forEach((metric) => {
            const id = metric.diagram_type_id || '';
            const type = diagramTypes.find((t) => t.id === id);
            if (type) {
              dataPoint[type.key] = metric.cantidad_empleados || 0;
            }
          });
        }

        return dataPoint;
      });

    return result;
  }, [filteredChartData, diagramTypes]);

  // Crear config dinámico basado en los tipos de diagrama
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    diagramTypes.forEach((type, index) => {
      config[type.key] = {
        label: type.name,
        color: type.color,
      };
    });
    return config;
  }, [diagramTypes]);

  // Calcular totales para el footer
  const totals = React.useMemo(() => {
    if (timeSeriesData.length === 0) return { total: 0, types: {} };

    const typeTotals: Record<string, number> = {};
    diagramTypes.forEach((type) => {
      typeTotals[type.name] = 0;
    });

    timeSeriesData.forEach((point) => {
      diagramTypes.forEach((type) => {
        typeTotals[type.name] += point[type.key] || 0;
      });
    });

    const total = Object.values(typeTotals).reduce((sum, val) => sum + val, 0);

    return {
      total: total / timeSeriesData.length, // Promedio
      types: typeTotals,
    };
  }, [timeSeriesData, diagramTypes]);

  // Limitar a los top 8 tipos más comunes para evitar saturación
  const topTypes = React.useMemo(() => {
    const sorted = diagramTypes
      .map((type) => ({
        ...type,
        total: totals.types[type.name] || 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    return sorted;
  }, [diagramTypes, totals]);

  return (
    <Card className="@container/card w-full flex flex-col">
      <CardHeader className="border-b">
        <div className="grid gap-1">
          <CardTitle>Evolución de Distribución de Diagramas de Trabajo</CardTitle>
          <CardDescription>Evolución temporal de empleados por tipo de diagrama</CardDescription>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '7d' | '30d' | '90d' | '1y')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
                <SelectItem value="90d">Últimos 3 meses</SelectItem>
                <SelectItem value="1y">Último año</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {range?.from && range?.to
                    ? `${format(range.from, 'dd/MM/yyyy', { locale: es })} - ${format(range.to, 'dd/MM/yyyy', { locale: es })}`
                    : 'Seleccionar rango de fechas'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                <Calendar
                  className="w-full"
                  mode="range"
                  defaultMonth={range?.from}
                  selected={range}
                  onSelect={setRange}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 pb-0 px-4">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Cargando datos...</p>
          </div>
        ) : !timeSeriesData || timeSeriesData.length === 0 || topTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
            <p className="text-base font-medium">No hay datos disponibles para el período seleccionado</p>
            <p className="text-sm">Intenta seleccionar un rango de fechas diferente o usar otro preset</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
            <AreaChart
              accessibilityLayer
              data={timeSeriesData}
              margin={{
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
                minTickGap={20}
                tickFormatter={(value) => {
                  try {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) return '';
                    return format(date, 'dd/MM', { locale: es });
                  } catch {
                    return '';
                  }
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(value) => {
                      try {
                        const date = new Date(value);
                        if (isNaN(date.getTime())) return String(value);
                        return format(date, 'dd/MM/yyyy', { locale: es });
                      } catch {
                        return String(value);
                      }
                    }}
                  />
                }
              />
              {topTypes.map((type) => (
                <Area
                  key={type.key}
                  dataKey={type.key}
                  type="natural"
                  fill={`var(--color-${type.key})`}
                  fillOpacity={0.6}
                  stroke={`var(--color-${type.key})`}
                  stackId="a"
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="border-t">
        <div className="text-sm space-y-1">
          <div>
            Promedio de empleados en el período:{' '}
            <span className="font-semibold">{Math.round(totals.total).toLocaleString()}</span>
          </div>
          {topTypes.length > 0 && (
            <div className="text-muted-foreground text-xs">
              Mostrando los {topTypes.length} tipos de diagrama más comunes. {timeSeriesData.length} snapshot
              {timeSeriesData.length !== 1 ? 's' : ''} en el rango.
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
