'use client';

import Cookies from 'js-cookie';
import { TrendingUp, X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { type ChartConfig } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YearMonthPicker } from '@/components/ui/year-month-picker';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { AbsenteeismTrendChartComponent } from './charts/absenteeism-trend-chart';

const chartConfig = {
  percentage: {
    label: 'Ausentismo',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

type TrendData = {
  date: string;
  percentage: number;
};

const formatDate = (d: Date) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);

export function AbsenteeismTrendChart() {
  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d'>('7d');
  const [data, setData] = React.useState<TrendData[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);

  React.useEffect(() => {
    const fetchData = async () => {
      const companyId = Cookies.get('actualComp')?.replace(/^"|"/g, '') || '';
      if (!companyId) {
        setData([]);
        return;
      }

      let from: Date;
      let to: Date;

      if (selectedDate) {
        // Si hay una fecha seleccionada, filtrar desde el inicio hasta el final del mes
        from = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        to = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      } else {
        // Usar el rango de tiempo seleccionado
        const daysToSubtract = timeRange === '90d' ? 90 : timeRange === '7d' ? 7 : 30;
        to = new Date();
        from = new Date();
        from.setDate(to.getDate() - daysToSubtract);
      }

      const supabase = supabaseBrowser();
      const { data: rpcData, error } = await supabase.rpc('hr_get_absenteeism_trend', {
        p_company_id: companyId,
        p_from: formatDate(from),
        p_to: formatDate(to),
        save_to_table: false,
      });

      if (error) {
        console.error('Error fetching absenteeism trend:', error);
        setData([]);
        return;
      }

      setData((rpcData as TrendData[]) ?? []);
    };

    fetchData();
  }, [timeRange, selectedDate]);

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

  const years = Array.from({ length: 5 }, (_, i) => (selectedDate?.getFullYear() || new Date().getFullYear()) - i - 1);

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
