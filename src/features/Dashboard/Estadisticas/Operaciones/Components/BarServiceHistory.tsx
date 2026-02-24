'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDailyReportsLatestType } from '@/features/Operaciones/PartesDiarios/actions/actions';

export const description = 'A multiple bar chart per client using dailyReports';

export function ChartBarServiceHistory({ dailyReports }: { dailyReports: getDailyReportsLatestType }) {
  const dailyReportsData = dailyReports;
  const [timeRange, setTimeRange] = React.useState('30d');

  // Derivar datos desde la prop: agregamos por cliente por día y mapeamos cada cliente como una serie
  const { filteredData, seriesKeys, chartConfig, rangeLabel } = React.useMemo(() => {
    const reports = (dailyReportsData ?? []) as any[];

    const slugify = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Determinar fecha de referencia (última disponible) o hoy
    let referenceDate = new Date(0);
    for (const r of reports) {
      if (!r?.date) continue;
      const d = new Date(r.date);
      if (d > referenceDate) referenceDate = d;
    }
    if (referenceDate.getTime() === 0) referenceDate = new Date();

    const daysToSubtract = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 90;
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    const toKey = (d: Date) =>
      new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);

    // Construir mapa: fecha(YYYY-MM-DD) -> mapa cliente->conteo
    const countsByDate = new Map<string, Map<string, number>>();
    for (const r of reports) {
      if (!r?.date) continue;
      const d = new Date(r.date);
      if (d < startDate || d > referenceDate) continue;
      const dateKey = toKey(d);
      const rows = Array.isArray(r?.dailyreportrows) ? r.dailyreportrows : [];
      let map = countsByDate.get(dateKey);
      if (!map) {
        map = new Map<string, number>();
        countsByDate.set(dateKey, map);
      }
      for (const row of rows) {
        const name: string = row?.customers?.name ?? 'Sin cliente';
        map.set(name, (map.get(name) ?? 0) + 1);
      }
    }

    // Asegurar continuidad de fechas en el rango con conteo 0 cuando no hay datos
    for (let d = new Date(startDate); d <= referenceDate; d.setDate(d.getDate() + 1)) {
      const key = toKey(d);
      if (!countsByDate.has(key)) countsByDate.set(key, new Map());
    }

    // Totales por cliente en el rango y set de clientes
    const totals = new Map<string, number>();
    for (const [, map] of countsByDate) {
      for (const [name, count] of map) {
        totals.set(name, (totals.get(name) ?? 0) + count);
      }
    }

    // Orden de series por total descendente para mejor lectura
    const customerNames = Array.from(totals.keys()).sort((a, b) => totals.get(b)! - totals.get(a)!);
    // Mapear a keys seguras para CSS vars y Recharts
    const seriesKeys = customerNames.map((n) => slugify(n) || 'sin-cliente');

    // Usar paleta de colores variados del sistema
    const getChartColor = (index: number) => `var(--chart-${(index % 5) + 1})`;

    // Construir config del chart dinámicamente por cliente
    const chartConfig: ChartConfig = {
      visitors: { label: 'Servicios' },
    };
    customerNames.forEach((name, idx) => {
      const key = seriesKeys[idx];
      (chartConfig as any)[key] = {
        label: name,
        color: getChartColor(idx),
      };
    });

    // Helpers de agrupación
    const startOfWeekMonday = (d: Date) => {
      const temp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const day = temp.getDay(); // 0=Dom ... 6=Sáb
      const diffToMonday = (day + 6) % 7;
      temp.setDate(temp.getDate() - diffToMonday);
      return temp;
    };
    const lastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

    type Bucket = { label: string; sort: string; counts: Map<string, number> };
    const buckets = new Map<string, Bucket>();

    const grouping = timeRange === '7d' ? 'day' : timeRange === '30d' ? 'week' : 'biweek';

    const dateKeys = Array.from(countsByDate.keys()).sort();
    for (const dateKey of dateKeys) {
      const y = Number(dateKey.slice(0, 4));
      const m = Number(dateKey.slice(5, 7)) - 1;
      const d = Number(dateKey.slice(8, 10));
      const date = new Date(y, m, d);

      let bucketKey = '';
      let bucketLabel = '';
      let bucketSort = '';

      if (grouping === 'day') {
        bucketKey = `day-${dateKey}`;
        bucketLabel = date.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' });
        bucketSort = dateKey;
      } else if (grouping === 'week') {
        const weekStart = startOfWeekMonday(date);
        const key = toKey(weekStart);
        bucketKey = `week-${key}`;
        const end = new Date(weekStart);
        end.setDate(end.getDate() + 6);
        bucketLabel = `${weekStart.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`;
        bucketSort = key;
      } else {
        // biweek: 1-15 y 16-fin de mes
        const half = date.getDate() <= 15 ? 1 : 2;
        const startDay = half === 1 ? 1 : 16;
        const endDay = half === 1 ? 15 : lastDayOfMonth(date.getFullYear(), date.getMonth());
        const start = new Date(date.getFullYear(), date.getMonth(), startDay);
        const key = `${toKey(start)}-${half}`;
        bucketKey = `biweek-${key}`;
        bucketLabel = `${startDay}-${endDay} ${start.toLocaleDateString('es-AR', { month: 'short' })}`;
        bucketSort = `${toKey(start)}-${half}`;
      }

      let bucket = buckets.get(bucketKey);
      if (!bucket) {
        bucket = { label: bucketLabel, sort: bucketSort, counts: new Map() };
        buckets.set(bucketKey, bucket);
      }
      const dayCounts = countsByDate.get(dateKey)!;
      for (const [name, count] of dayCounts) {
        bucket.counts.set(name, (bucket.counts.get(name) ?? 0) + count);
      }
    }

    // Construir data final ordenada por sort
    const data = Array.from(buckets.values())
      .sort((a, b) => a.sort.localeCompare(b.sort))
      .map((b) => {
        const row: Record<string, number | string> = { label: b.label };
        customerNames.forEach((name, idx) => {
          const key = seriesKeys[idx];
          row[key] = b.counts.get(name) ?? 0;
        });
        return row;
      });

    const rangeLabel = timeRange === '90d' ? '3 meses' : timeRange === '30d' ? '30 días' : '7 días';
    return { filteredData: data, seriesKeys, chartConfig, rangeLabel };
  }, [dailyReportsData, timeRange]);

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Histórico de servicios por cliente (Barras)</CardTitle>
          <CardDescription>Mostrando últimos {rangeLabel}</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex" aria-label="Seleccionar rango">
            <SelectValue placeholder="Últimos 3 meses" />
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
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <BarChart accessibilityLayer data={filteredData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => String(value)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(value) => String(value)} indicator="dashed" />}
            />
            {seriesKeys.map((key) => (
              <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={4} />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
