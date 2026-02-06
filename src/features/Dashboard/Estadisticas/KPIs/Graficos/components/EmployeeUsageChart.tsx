'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { type DateRange } from 'react-day-picker';
import { CartesianGrid, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';

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
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChartData } from '../hooks/useChartData';

// Constante para el porcentaje esperado del indicador
const EXPECTED_INDICATOR_PERCENTAGE = 60;

const chartConfig = {
  indicator: {
    label: 'Indicador (%)',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export function EmployeeUsageChart() {
  const { data: rawData, loading } = useChartData('get_employee_usage_indicator');

  // Procesar datos
  const chartData = React.useMemo(() => {
    return rawData.map((item) => {
      const metrics = item.metrics as {
        indicator?: number;
        employees_used?: number;
        employees_operativos?: number;
      };
      return {
        date: item.snapshot_date,
        indicator: metrics.indicator || 0,
      };
    });
  }, [rawData]);

  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);

  // Actualizar rango cuando cambia timeRange
  React.useEffect(() => {
    if (!range) {
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

  // Filtrar datos por rango de fechas
  const filteredData = React.useMemo(() => {
    if (!range?.from && !range?.to) {
      return chartData;
    }

    return chartData.filter((item) => {
      const date = new Date(item.date);
      if (range.from && range.to) {
        return date >= range.from && date <= range.to;
      }
      if (range.from) {
        return date >= range.from;
      }
      return true;
    });
  }, [chartData, range]);

  // Calcular si el rango supera un mes (30 días)
  const showLabels = React.useMemo(() => {
    if (!range?.from || !range?.to) {
      // Si no hay rango, usar el timeRange para determinar
      return timeRange === '7d' || timeRange === '30d';
    }
    const diffTime = Math.abs(range.to.getTime() - range.from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 15;
  }, [range, timeRange]);

  // Calcular totales para el footer
  const totals = React.useMemo(() => {
    if (filteredData.length === 0) return { indicator: 0 };

    const sum = filteredData.reduce(
      (acc, curr) => ({
        indicator: acc.indicator + curr.indicator,
      }),
      { indicator: 0 }
    );

    return {
      indicator: (sum.indicator / filteredData.length).toFixed(1),
    };
  }, [filteredData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uso de Empleados</CardTitle>
          <CardDescription>Evolución del indicador de uso y empleados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Cargando datos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uso de Empleados</CardTitle>
          <CardDescription>Evolución del indicador de uso y empleados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>No hay datos disponibles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card w-full">
      <CardHeader className="border-b">
        <div className="grid gap-1">
          <CardTitle>Uso de Empleados</CardTitle>
          <CardDescription>Evolución del indicador de uso y empleados</CardDescription>
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
                <Button variant="outline" className="w-[260px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {range?.from && range?.to
                    ? `${format(range.from, 'dd/MM/yyyy', { locale: es })} - ${format(range.to, 'dd/MM/yyyy', { locale: es })}`
                    : 'Seleccionar rango'}
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
      <CardContent className="px-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <LineChart
            accessibilityLayer
            data={filteredData}
            margin={{
              top: 20,
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
                const date = new Date(value);
                return format(date, 'dd/MM', { locale: es });
              }}
            />
            <YAxis hide />
            <ChartTooltip
              cursor={false}
              content={(props) => {
                if (!props.active || !props.payload || !props.payload.length) {
                  return null;
                }
                const item = props.payload[0];
                const value = item.value as number;
                const isAboveExpected = value > EXPECTED_INDICATOR_PERCENTAGE;
                const indicatorColor = isAboveExpected ? 'hsl(0 84.2% 60.2%)' : 'hsl(142.1 76.2% 36.3%)';

                return (
                  <div className="grid min-w-[10rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs shadow-xl">
                    <div className="font-medium">
                      {format(new Date(props.label as string), 'dd/MM/yyyy', { locale: es })}
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor: indicatorColor,
                          borderColor: indicatorColor,
                        }}
                      />
                      <div className="flex flex-1 justify-between leading-none items-center gap-3">
                        <span className="text-muted-foreground">Indicador</span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {Number(value).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {/* Línea de referencia del porcentaje esperado */}
            <ReferenceLine
              y={EXPECTED_INDICATOR_PERCENTAGE}
              stroke="hsl(142.1 76.2% 36.3%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: `${EXPECTED_INDICATOR_PERCENTAGE}%`,
                position: 'insideTopRight',
                fill: 'hsl(142.1 76.2% 36.3%)',
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            {/* Línea principal con stroke gris y puntos de colores */}
            <Line
              dataKey="indicator"
              type="monotone"
              stroke="hsl(var(--muted-foreground) / 0.3)"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isAboveExpected = payload.indicator > EXPECTED_INDICATOR_PERCENTAGE;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={isAboveExpected ? 'hsl(0 84.2% 60.2%)' : 'hsl(142.1 76.2% 36.3%)'}
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{
                r: 7,
              }}
            >
              {showLabels && (
                <LabelList
                  position="top"
                  offset={12}
                  className="fill-foreground"
                  fontSize={12}
                  formatter={(value: number) => `${value}%`}
                />
              )}
            </Line>
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="border-t">
        <div className="text-sm">
          Promedio del período: <span className="font-semibold">{totals.indicator}%</span> indicador.
        </div>
      </CardFooter>
    </Card>
  );
}
