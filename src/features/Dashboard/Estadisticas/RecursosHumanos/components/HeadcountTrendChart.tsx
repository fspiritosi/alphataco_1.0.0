'use client';

import Cookies from 'js-cookie';
import { TrendingUp } from 'lucide-react';
import React from 'react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { type ChartConfig } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { HeadcountTrendChartComponent } from './charts/headcount-trend-chart';

const chartConfig = {
  dotacion: {
    label: 'Dotación',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

type HeadcountTrendData = {
  date: string;
  dotacion: number;
};

const formatDate = (d: Date) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);

export function HeadcountTrendChart() {
  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d'>('7d');
  const [data, setData] = React.useState<HeadcountTrendData[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      const companyId = Cookies.get('actualComp')?.replace(/^"|"$/g, '') || '';
      if (!companyId) {
        setData([]);
        return;
      }

      const daysToSubtract = timeRange === '90d' ? 90 : timeRange === '7d' ? 7 : 30;
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - daysToSubtract);

      const supabase = supabaseBrowser();
      const { data: rpcData, error } = await supabase.rpc('hr_get_daily_absence_timeseries', {
        p_company_id: companyId,
        p_from: formatDate(from),
        p_to: formatDate(to),
        save_to_table: false,
      });

      if (error) {
        console.error('Error fetching daily absence timeseries:', error);
        setData([]);
        return;
      }

      const mapped = ((rpcData as any[]) ?? []).map((d) => ({
        date: d.fecha ?? d.date,
        dotacion: typeof d.totalDotacion === 'number' ? d.totalDotacion : d.dotacion ?? 0,
      }));
      setData(mapped);
    };

    fetchData();
  }, [timeRange]);

  const currentValue = data[data.length - 1]?.dotacion ?? 0;
  const previousValue = data[data.length - 2]?.dotacion ?? 0;
  const firstValue = data[0]?.dotacion ?? 0;
  const trend = timeRange === '7d' ? currentValue - previousValue : currentValue - firstValue;
  const isPositive = trend > 0;

  const rangeLabel = timeRange === '90d' ? '3 meses' : timeRange === '30d' ? '30 días' : '7 días';
  const trendTextSuffix =
    timeRange === '7d'
      ? 'respecto al día anterior'
      : timeRange === '30d'
        ? 'respecto al inicio de los 30 días'
        : 'respecto al inicio de los 3 meses';

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="text-lg font-semibold">Variación de Dotación</CardTitle>
          <CardDescription>Mostrando últimos {rangeLabel}</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '7d' | '30d' | '90d')}>
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
        <HeadcountTrendChartComponent chartConfig={chartConfig} data={data} showLabels={timeRange === '7d'} />
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {isPositive ? 'Incremento' : 'Reducción'} de {Math.abs(trend)} {trendTextSuffix}
          <TrendingUp className={`h-4 w-4 ${isPositive ? 'text-green-500' : 'text-red-500 rotate-180'}`} />
        </div>
        <div className="text-muted-foreground leading-none">Dotación actual: {currentValue}</div>
      </CardFooter>
    </Card>
  );
}
