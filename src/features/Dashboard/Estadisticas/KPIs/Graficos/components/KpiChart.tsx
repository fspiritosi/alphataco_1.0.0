'use client';

import { CalendarIcon } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
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

// Configurar moment en español
moment.locale('es');

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';
type TimeRange = '7d' | '30d' | '90d' | '1y';

interface KpiChartProps {
  kpiCode: KpiCode;
  kpiName: string;
  kpiDescription: string;
  expectedPercentage: number;
}

const chartConfig = {
  indicator: {
    label: 'Indicador (%)',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

// Función para calcular el rango de fechas según el filtro seleccionado (usando moment)
function calculateDateRange(timeRange: TimeRange): { from: Date; to: Date } {
  const today = moment();

  if (timeRange === '1y') {
    // Año actual completo: 1 enero - 31 diciembre
    return {
      from: moment().startOf('year').toDate(),
      to: moment().endOf('year').toDate(),
    };
  }

  // Para otros filtros: calcular días hacia atrás
  const daysMap: Record<TimeRange, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };

  return {
    from: moment().subtract(daysMap[timeRange], 'days').toDate(),
    to: today.toDate(),
  };
}

export function KpiChart({ kpiCode, kpiName, kpiDescription, expectedPercentage }: KpiChartProps) {
  // Estado del filtro de tiempo
  const [timeRange, setTimeRange] = React.useState<TimeRange>('30d');

  // Estado del rango de fechas (calculado automáticamente o manual via calendario)
  const [dateRange, setDateRange] = React.useState<DateRange>(() => calculateDateRange('30d'));

  // Estado para saber si el usuario está usando el calendario manual
  const [isCustomRange, setIsCustomRange] = React.useState(false);

  // Cuando cambia el timeRange, recalcular las fechas
  const handleTimeRangeChange = React.useCallback((value: TimeRange) => {
    setTimeRange(value);
    setIsCustomRange(false);
    const newRange = calculateDateRange(value);
    setDateRange(newRange);
  }, []);

  // Cuando el usuario selecciona un rango manual
  const handleCalendarSelect = React.useCallback((range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setIsCustomRange(true);
      setDateRange(range);
    }
  }, []);

  // Obtener datos del hook - SIEMPRE usando las fechas del estado
  const fromDate = dateRange.from || moment().subtract(30, 'days').toDate();
  const toDate = dateRange.to || moment().toDate();

  const { data: rawData, loading } = useKpiChartData(kpiCode, fromDate, toDate);

  // Procesar datos para el gráfico
  // snapshot_date viene de la BD en formato 'YYYY-MM-DD'
  const chartData = React.useMemo(() => {
    if (!rawData || rawData.length === 0) {
      return [];
    }
    return rawData.map((item) => ({
      date: item.snapshot_date, // Ya viene en formato 'YYYY-MM-DD' de la BD
      indicator: item.metrics?.indicator ?? 0,
    }));
  }, [rawData]);

  // Calcular si mostrar labels (solo para rangos pequeños)
  const showLabels = React.useMemo(() => {
    if (!dateRange.from || !dateRange.to) return false;
    const diffDays = moment(dateRange.to).diff(moment(dateRange.from), 'days');
    return diffDays <= 15;
  }, [dateRange]);

  // Calcular promedio para el footer
  const averageIndicator = React.useMemo(() => {
    if (chartData.length === 0) return '0';
    const sum = chartData.reduce((acc, curr) => acc + curr.indicator, 0);
    return (sum / chartData.length).toFixed(1);
  }, [chartData]);

  // Renderizar contenido del gráfico
  const renderChartContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p>Cargando datos...</p>
        </div>
      );
    }

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-[250px] text-muted-foreground">
          <p>No hay datos disponibles para el rango seleccionado</p>
        </div>
      );
    }

    // Determinar si invertir colores (para KPI-0003 y KPI-0006)
    const invertColors = kpiCode === 'KPI-0003' || kpiCode === 'KPI-0006';

    return (
      <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
        <LineChart accessibilityLayer data={chartData} margin={{ top: 20, left: 12, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={20}
            tickFormatter={(value) => {
              // value viene en formato 'YYYY-MM-DD' de la BD
              return moment(value, 'YYYY-MM-DD').format('DD/MM');
            }}
          />
          <YAxis hide />
          <ChartTooltip
            cursor={false}
            content={(props) => {
              if (!props.active || !props.payload || !props.payload.length) return null;
              const value = props.payload[0].value as number;
              const isAboveExpected = value > expectedPercentage;
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
                    {/* props.label viene en formato 'YYYY-MM-DD' */}
                    {moment(props.label as string, 'YYYY-MM-DD').format('DD/MM/YYYY')}
                  </div>
                  <div className="flex w-full items-center gap-2">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: indicatorColor }} />
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
          <Line
            dataKey="indicator"
            type="monotone"
            stroke="hsl(var(--muted-foreground) / 0.3)"
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              const isAboveExpected = payload.indicator > expectedPercentage;
              const dotColor = invertColors
                ? isAboveExpected
                  ? 'hsl(142.1 76.2% 36.3%)'
                  : 'hsl(0 84.2% 60.2%)'
                : isAboveExpected
                  ? 'hsl(0 84.2% 60.2%)'
                  : 'hsl(142.1 76.2% 36.3%)';
              return <circle cx={cx} cy={cy} r={5} fill={dotColor} stroke="white" strokeWidth={2} />;
            }}
            activeDot={{ r: 7 }}
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
    );
  };

  return (
    <Card className="@container/card w-full">
      <CardHeader className="border-b">
        <div className="grid gap-1">
          <CardTitle>{kpiName}</CardTitle>
          <CardDescription>{kpiDescription}</CardDescription>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <Select
              value={isCustomRange ? undefined : timeRange}
              onValueChange={(v) => handleTimeRangeChange(v as TimeRange)}
              disabled={loading}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={isCustomRange ? 'Personalizado' : undefined} />
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
                <Button variant="outline" className="w-[200px]" disabled={loading}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from && dateRange.to
                    ? `${moment(dateRange.from).format('DD/MM/YYYY')} - ${moment(dateRange.to).format('DD/MM/YYYY')}`
                    : 'Seleccionar rango'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                <Calendar
                  className="w-full"
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange}
                  onSelect={handleCalendarSelect}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4">{renderChartContent()}</CardContent>
      {!loading && chartData.length > 0 && (
        <CardFooter className="border-t">
          <div className="flex flex-col gap-1 text-sm">
            <div>
              Promedio del período: <span className="font-semibold">{averageIndicator}%</span>
            </div>
            {expectedPercentage > 0 && (
              <div className="text-muted-foreground">
                Umbral objetivo: <span className="font-semibold">{expectedPercentage}%</span>
              </div>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
