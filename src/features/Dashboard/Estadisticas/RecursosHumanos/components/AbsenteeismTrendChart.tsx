'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { type ChartConfig } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YearMonthPicker } from '@/components/ui/year-month-picker';
import { getAbsenteeismTrend } from '../actions.server';
import { AbsenteeismTrendChartComponent } from './charts/absenteeism-trend-chart';

const chartConfig = {
  percentage: {
    label: 'Ausentismo',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

const formatDate = (d: Date) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);

interface AbsenteeismTrendChartProps {
  companyId: string;
}

export function AbsenteeismTrendChart({ companyId }: AbsenteeismTrendChartProps) {
  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d'>('7d');
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);

  const { from, to } = React.useMemo(() => {
    if (selectedDate) {
      return {
        from: formatDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)),
        to: formatDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)),
      };
    }
    const daysToSubtract = timeRange === '90d' ? 90 : timeRange === '7d' ? 7 : 30;
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - daysToSubtract);
    return {
      from: formatDate(fromDate),
      to: formatDate(toDate),
    };
  }, [selectedDate, timeRange]);

  const { data = [] } = useQuery({
    queryKey: ['absenteeism-trend', companyId, from, to],
    queryFn: () => getAbsenteeismTrend(from, to),
    enabled: !!companyId,
  });

  const currentValue = data[data.length - 1]?.percentage ?? 0;
  const previousValue = data[data.length - 2]?.percentage ?? 0;
  const firstValue = data[0]?.percentage ?? 0;
  const trend = timeRange === '7d' ? currentValue - previousValue : currentValue - firstValue;
  const isPositive = trend > 0;

  const getRangeLabel = () => {
    if (selectedDate) {
      const monthNames = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];
      return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    }
    return timeRange === '90d' ? '3 meses' : timeRange === '30d' ? '30 días' : '7 días';
  };

  const rangeLabel = getRangeLabel();
  const trendTextSuffix = selectedDate
    ? 'en el mes seleccionado'
    : timeRange === '7d'
      ? 'desde el día anterior'
      : 'en el período seleccionado';

  const clearDateFilter = () => {
    setSelectedDate(undefined);
  };

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="text-lg font-semibold">Variación de Ausentismo</CardTitle>
          <CardDescription>
            {selectedDate ? `Mostrando datos de ${rangeLabel}` : `Mostrando últimos ${rangeLabel}`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <YearMonthPicker
            date={selectedDate}
            key={selectedDate?.toISOString() || ''}
            setDate={setSelectedDate}
            placeholder="Buscar por mes"
          />
          {selectedDate && (
            <Button onClick={clearDateFilter} className="px-2 py-1 " title="Limpiar filtro de mes" variant={'ghost'}>
              <X className="h-5 w-5 text-red-500" />
            </Button>
          )}
        </div>
        <Select
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as '7d' | '30d' | '90d')}
          disabled={!!selectedDate}
        >
          <SelectTrigger className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex" aria-label="Seleccionar rango">
            <SelectValue placeholder="Últimos 7 días" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Últimos 3 meses
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Últimos 30 días
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Últimos 7 días
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <AbsenteeismTrendChartComponent
          chartConfig={chartConfig}
          data={data}
          showLabels={!selectedDate && timeRange === '7d'}
        />
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {isPositive ? 'Incremento' : 'Reducción'} de {Math.abs(trend).toFixed(2)}% {trendTextSuffix}
          <TrendingUp className={`h-4 w-4 ${isPositive ? 'text-red-500' : 'text-green-500 rotate-180'}`} />
        </div>
        <div className="text-muted-foreground leading-none">Ausentismo actual: {currentValue}%</div>
      </CardFooter>
    </Card>
  );
}
