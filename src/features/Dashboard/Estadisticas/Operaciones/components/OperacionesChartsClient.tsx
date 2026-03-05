'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import moment from 'moment';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import type { OperationsChartData } from '../actions/actions.server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBucketKey(dateStr: string, grouping: 'day' | 'week' | 'biweek'): { key: string; label: string } {
  const m = moment(dateStr);

  if (grouping === 'day') {
    return {
      key: `day-${dateStr}`,
      label: m.format('D MMM'),
    };
  }

  if (grouping === 'week') {
    const weekStart = m.clone().startOf('isoWeek');
    const weekEnd = weekStart.clone().add(6, 'days');
    return {
      key: `week-${weekStart.format('YYYY-MM-DD')}`,
      label: `${weekStart.format('D MMM')} - ${weekEnd.format('D MMM')}`,
    };
  }

  // biweek
  const day = m.date();
  const half = day <= 15 ? 1 : 2;
  const startDay = half === 1 ? 1 : 16;
  const endDay = half === 1 ? 15 : m.clone().endOf('month').date();
  const bucketStart = m.clone().date(startDay);
  return {
    key: `biweek-${m.format('YYYY-MM')}-${String(startDay).padStart(2, '0')}-${half}`,
    label: `${startDay}-${endDay} ${bucketStart.format('MMM')}`,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ActiveView = 'total' | 'mensual' | 'adicional';

const chartConfig = {
  mensual: {
    label: 'Mensual',
    color: 'var(--chart-1)',
  },
  adicional: {
    label: 'Adicional',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

interface Props {
  data: OperationsChartData;
}

export function OperacionesChartsClient({ data }: Props) {
  const [timeRange, setTimeRange] = React.useState('30d');
  const [selectedCustomerIds, setSelectedCustomerIds] = React.useState<string[]>([]);
  const [activeView, setActiveView] = React.useState<ActiveView>('total');

  const { chartData, totals, rangeLabel } = React.useMemo(() => {
    // 1. Reference date
    let refDate = '0000-00-00';
    for (const row of data.rows) {
      if (row.date > refDate) refDate = row.date;
    }
    if (refDate === '0000-00-00') {
      refDate = moment().format('YYYY-MM-DD');
    }

    // 2. Start date
    const daysToSubtract = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDateStr = moment(refDate).subtract(daysToSubtract, 'days').format('YYYY-MM-DD');

    // 3. Grouping
    const grouping: 'day' | 'week' | 'biweek' = timeRange === '7d' ? 'day' : timeRange === '30d' ? 'week' : 'biweek';

    // 4. Customer filter
    const customerFilter = selectedCustomerIds.length > 0 ? new Set(selectedCustomerIds) : null;

    // 5. Single loop: filter + bucket + aggregate into 2 series (mensual, adicional)
    const buckets = new Map<string, { label: string; mensual: number; adicional: number }>();
    let totalMensual = 0;
    let totalAdicional = 0;

    for (const row of data.rows) {
      if (row.date < startDateStr || row.date > refDate) continue;
      if (customerFilter && !customerFilter.has(row.customerId)) continue;

      const { key: bucketKey, label: bucketLabel } = getBucketKey(row.date, grouping);

      let bucket = buckets.get(bucketKey);
      if (!bucket) {
        bucket = { label: bucketLabel, mensual: 0, adicional: 0 };
        buckets.set(bucketKey, bucket);
      }

      bucket.mensual += row.mensual;
      bucket.adicional += row.adicional;
      totalMensual += row.mensual;
      totalAdicional += row.adicional;
    }

    // 6. Chart data sorted by bucket key
    const chartData = Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, bucket]) => ({
        label: bucket.label,
        mensual: bucket.mensual,
        adicional: bucket.adicional,
      }));

    const rangeLabel = timeRange === '7d' ? '7 días' : timeRange === '30d' ? '30 días' : '3 meses';

    return {
      chartData,
      totals: { mensual: totalMensual, adicional: totalAdicional },
      rangeLabel,
    };
  }, [data.rows, timeRange, selectedCustomerIds]);

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-4">
          <CardTitle className="text-base">Histórico de servicios</CardTitle>
          <CardDescription>
            Mostrando últimos {rangeLabel}
            {selectedCustomerIds.length > 0 && (
              <span className="ml-1">
                ({selectedCustomerIds.length} {selectedCustomerIds.length === 1 ? 'cliente' : 'clientes'})
              </span>
            )}
          </CardDescription>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-[220px]">
              <MultiSelectCombobox
                options={data.customers.map((c) => ({ label: c.name, value: c.id }))}
                placeholder="Todos los clientes"
                emptyMessage="No se encontraron clientes"
                selectedValues={selectedCustomerIds}
                onChange={setSelectedCustomerIds}
                showSelectAll
              />
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px] rounded-lg" aria-label="Seleccionar rango">
                <SelectValue placeholder="Últimos 30 días" />
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
          </div>
        </div>
        <div className="flex">
          {(['total', 'mensual', 'adicional'] as const).map((key) => {
            const value = key === 'total' ? totals.mensual + totals.adicional : totals[key];
            const label = key === 'total' ? 'Total' : key === 'mensual' ? 'Mensual' : 'Adicional';
            return (
              <button
                key={key}
                data-active={activeView === key}
                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveView(key)}
              >
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-lg leading-none font-bold sm:text-3xl">{value.toLocaleString('es-AR')}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <BarChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
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
              content={
                <ChartTooltipContent
                  className="w-[180px]"
                  labelFormatter={(value) => String(value)}
                  indicator="dashed"
                />
              }
            />
            {(activeView === 'total' || activeView === 'mensual') && (
              <Bar
                dataKey="mensual"
                stackId={activeView === 'total' ? 'a' : undefined}
                fill="var(--color-mensual)"
                radius={activeView === 'mensual' ? [4, 4, 4, 4] : [0, 0, 4, 4]}
              />
            )}
            {(activeView === 'total' || activeView === 'adicional') && (
              <Bar
                dataKey="adicional"
                stackId={activeView === 'total' ? 'a' : undefined}
                fill="var(--color-adicional)"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
