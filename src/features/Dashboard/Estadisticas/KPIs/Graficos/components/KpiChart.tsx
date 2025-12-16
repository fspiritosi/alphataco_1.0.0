'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import moment from 'moment';
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
import { useKpiChartData } from '../hooks/useKpiChartData';

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

interface KpiChartProps {
  kpiCode: KpiCode;
  kpiName: string;
  kpiDescription: string;
  expectedPercentage: number;
  initialData: any[];
  initialFromDate: Date;
  initialToDate: Date;
}

const chartConfig = {
  indicator: {
    label: 'Indicador (%)',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export function KpiChart({
  kpiCode,
  kpiName,
  kpiDescription,
  expectedPercentage,
  initialData,
  initialFromDate,
  initialToDate,
}: KpiChartProps) {
  // DEBUG 1: Dato que llega como prop initialData
  if (kpiCode === 'KPI-0006') {
    const item25Nov = initialData?.find((i: any) => i.snapshot_date === '2025-11-25');
    console.log(`[EOC TRACE 1] initialData prop:`, item25Nov?.metrics?.indicator);
  }

  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: initialFromDate,
    to: initialToDate,
  });

  // Resetear range cuando cambia timeRange
  React.useEffect(() => {
    if (timeRange) {
      const today = new Date();

      // Para "1y" mostrar el año actual completo (1 enero - 31 diciembre)
      if (timeRange === '1y') {
        const currentYear = today.getFullYear();
        setRange({
          from: new Date(currentYear, 0, 1), // 1 de enero
          to: new Date(currentYear, 11, 31), // 31 de diciembre
        });
      } else {
        const from = new Date();
        const daysToSubtract = timeRange === '90d' ? 90 : timeRange === '7d' ? 7 : 30;
        from.setDate(today.getDate() - daysToSubtract);
        setRange({
          from,
          to: today,
        });
      }
    }
  }, [timeRange]);

  // Obtener datos del gráfico
  const fromDate = range?.from || initialFromDate;
  const toDate = range?.to || initialToDate;
  const { data: rawData, loading } = useKpiChartData(kpiCode, fromDate, toDate, initialData);

  // DEBUG 2: Dato que devuelve el hook (rawData)
  if (kpiCode === 'KPI-0006') {
    const item25Nov = rawData?.find((i: any) => i.snapshot_date === '2025-11-25');
    console.log(`[EOC TRACE 2] rawData del hook:`, item25Nov?.metrics?.indicator);
  }

  // Procesar datos
  const chartData = React.useMemo(() => {
    if (!rawData || rawData.length === 0) {
      return [];
    }
    const processed = rawData.map((item) => {
      const metrics = item.metrics as {
        indicator?: number;
      };
      const result = {
        date: item.snapshot_date,
        indicator: metrics?.indicator ?? 0,
      };

      return result;
    });

    // DEBUG 3: Dato procesado en chartData
    if (kpiCode === 'KPI-0006') {
      const item25Nov = processed.find((p) => p.date === '2025-11-25');
      console.log(`[EOC TRACE 3] chartData procesado:`, item25Nov?.indicator);
    }

    return processed;
  }, [rawData, kpiCode]);

  // Helper para formatear fecha local a string YYYY-MM-DD
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filtrar datos por rango de fechas (comparando strings para evitar problemas de timezone)
  const filteredData = React.useMemo(() => {
    let result;
    if (!range?.from && !range?.to) {
      result = chartData;
    } else {
      const fromStr = range.from ? formatDateLocal(range.from) : null;
      const toStr = range.to ? formatDateLocal(range.to) : null;

      result = chartData.filter((item) => {
        // Comparar strings directamente para evitar problemas de timezone
        if (fromStr && toStr) {
          return item.date >= fromStr && item.date <= toStr;
        }
        if (fromStr) {
          return item.date >= fromStr;
        }
        return true;
      });
    }

    // DEBUG 4: Dato filtrado en filteredData
    if (kpiCode === 'KPI-0006') {
      const item25Nov = result.find((p) => p.date === '2025-11-25');
      console.log(`[EOC TRACE 4] filteredData:`, item25Nov?.indicator, `(incluido: ${!!item25Nov})`);
    }

    return result;
  }, [chartData, range, kpiCode]);

  // Calcular si el rango supera un mes (30 días)
  const showLabels = React.useMemo(() => {
    if (!range?.from || !range?.to) {
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
          <CardTitle>{kpiName || kpiCode}</CardTitle>
          <CardDescription>Cargando datos del indicador...</CardDescription>
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
          <CardTitle>{kpiName || kpiCode}</CardTitle>
          <CardDescription>Evolución del indicador</CardDescription>
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
          <CardTitle>{kpiName || kpiCode}</CardTitle>
          <CardDescription>{kpiDescription}</CardDescription>
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
        {/* DEBUG 5: Dato justo antes del LineChart */}
        {kpiCode === 'KPI-0006' &&
          (() => {
            console.log(
              `[EOC TRACE 5] Datos al LineChart:`,
              filteredData.find((p) => p.date === '2025-11-25')?.indicator
            );
            return null;
          })()}
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
                // Usar moment para parsear la fecha sin problemas de timezone
                return moment(value, 'YYYY-MM-DD').format('DD/MM');
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

                const isAboveExpected = value > expectedPercentage;
                // Para KPI-0003 y KPI-0006 (objetivo 95%), invertir colores: verde si supera, rojo si no
                const invertColors = kpiCode === 'KPI-0003' || kpiCode === 'KPI-0006';
                const indicatorColor = invertColors
                  ? isAboveExpected
                    ? 'hsl(142.1 76.2% 36.3%)'
                    : 'hsl(0 84.2% 60.2%)'
                  : isAboveExpected
                    ? 'hsl(0 84.2% 60.2%)'
                    : 'hsl(142.1 76.2% 36.3%)';

                return (
                  <div className="grid min-w-[10rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs shadow-xl">
                    <div className="font-medium">
                      {/* Usar moment para parsear la fecha sin problemas de timezone */}
                      {moment(props.label as string, 'YYYY-MM-DD').format('DD/MM/YYYY')}
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
            {expectedPercentage > 0 && (
              <ReferenceLine
                y={expectedPercentage}
                stroke="hsl(142.1 76.2% 36.3%)"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `${expectedPercentage}%`,
                  position: 'insideTopRight',
                  fill: 'hsl(142.1 76.2% 36.3%)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            )}
            {/* Línea principal con stroke gris y puntos de colores */}
            <Line
              dataKey="indicator"
              type="monotone"
              stroke="hsl(var(--muted-foreground) / 0.3)"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isAboveExpected = payload.indicator > expectedPercentage;
                // Para KPI-0003 y KPI-0006 (objetivo 95%), invertir colores: verde si supera, rojo si no
                const invertColors = kpiCode === 'KPI-0003' || kpiCode === 'KPI-0006';
                const dotColor = invertColors
                  ? isAboveExpected
                    ? 'hsl(142.1 76.2% 36.3%)'
                    : 'hsl(0 84.2% 60.2%)'
                  : isAboveExpected
                    ? 'hsl(0 84.2% 60.2%)'
                    : 'hsl(142.1 76.2% 36.3%)';
                return <circle cx={cx} cy={cy} r={5} fill={dotColor} stroke="white" strokeWidth={2} />;
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
        <div className="flex flex-col gap-1 text-sm">
          <div>
            Promedio del período: <span className="font-semibold">{totals.indicator}%</span>
          </div>
          {expectedPercentage > 0 && (
            <div className="text-muted-foreground">
              Umbral objetivo: <span className="font-semibold">{expectedPercentage}%</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
