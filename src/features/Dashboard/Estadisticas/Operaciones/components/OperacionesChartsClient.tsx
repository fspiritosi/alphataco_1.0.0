'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import * as React from 'react';
import type { OperationsChartData } from '../actions/actions.server';
import { ClientRankingChart } from './ClientRankingChart';
import type { ChartDataPoint, ClientBreakdown } from './CustomChartTooltip';
import { ServiceHistoryAreaChart } from './ServiceHistoryAreaChart';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ActiveView = 'total' | 'mensual' | 'adicional';

// ---------------------------------------------------------------------------
// Helpers (pure functions outside component)
// ---------------------------------------------------------------------------

function getBucketKey(dateStr: string, granularity: Granularity): { key: string; label: string } {
  const m = moment(dateStr);

  if (granularity === 'daily') {
    return {
      key: `day-${dateStr}`,
      label: m.format('D MMM'),
    };
  }

  if (granularity === 'weekly') {
    const weekStart = m.clone().startOf('isoWeek');
    const weekEnd = weekStart.clone().add(6, 'days');
    return {
      key: `week-${weekStart.format('YYYY-MM-DD')}`,
      label: `${weekStart.format('D MMM')} - ${weekEnd.format('D MMM')}`,
    };
  }

  // monthly & yearly — same bucket (by month)
  return {
    key: `month-${m.format('YYYY-MM')}`,
    label: m.format('MMM YYYY'),
  };
}

function getDataWindow(selectedMonth: moment.Moment, granularity: Granularity): { start: string; end: string } {
  const end = selectedMonth.clone().endOf('month').format('YYYY-MM-DD');

  if (granularity === 'daily') {
    return {
      start: selectedMonth.clone().startOf('month').format('YYYY-MM-DD'),
      end,
    };
  }

  if (granularity === 'weekly') {
    return {
      start: selectedMonth.clone().subtract(2, 'months').startOf('month').format('YYYY-MM-DD'),
      end,
    };
  }

  if (granularity === 'monthly') {
    return {
      start: selectedMonth.clone().subtract(2, 'months').startOf('month').format('YYYY-MM-DD'),
      end,
    };
  }

  // yearly — 12 months back from selected month
  return {
    start: selectedMonth.clone().subtract(11, 'months').startOf('month').format('YYYY-MM-DD'),
    end,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  data: OperationsChartData;
}

export function OperacionesChartsClient({ data }: Props) {
  const [selectedMonth, setSelectedMonth] = React.useState(() => moment().startOf('month'));
  const [granularity, setGranularity] = React.useState<Granularity>('daily');
  const [selectedCustomerIds, setSelectedCustomerIds] = React.useState<string[]>([]);
  const [activeView, setActiveView] = React.useState<ActiveView>('total');

  // Determine the earliest month we have data for (to disable left arrow)
  const earliestMonth = React.useMemo(() => {
    if (data.rows.length === 0) return moment();
    return moment(data.rows[0].date).startOf('month');
  }, [data.rows]);

  const canGoBack = selectedMonth.isAfter(earliestMonth, 'month');
  const canGoForward = selectedMonth.isBefore(moment(), 'month');

  // Main processing — single loop
  const { chartData, totals, clientRanking, periodLabel } = React.useMemo(() => {
    moment.locale('es');

    const { start, end } = getDataWindow(selectedMonth, granularity);
    const customerFilter = selectedCustomerIds.length > 0 ? new Set(selectedCustomerIds) : null;

    // Bucket map: key -> { label, mensual, adicional, breakdownMap }
    const buckets = new Map<
      string,
      {
        label: string;
        mensual: number;
        adicional: number;
        breakdownMap: Map<string, { name: string; mensual: number; adicional: number }>;
      }
    >();

    // Client totals for ranking
    const clientTotals = new Map<string, { name: string; mensual: number; adicional: number }>();

    let totalMensual = 0;
    let totalAdicional = 0;

    for (const row of data.rows) {
      if (row.date < start || row.date > end) continue;
      if (customerFilter && !customerFilter.has(row.customerId)) continue;

      const { key: bucketKey, label: bucketLabel } = getBucketKey(row.date, granularity);

      // Bucket aggregation
      let bucket = buckets.get(bucketKey);
      if (!bucket) {
        bucket = { label: bucketLabel, mensual: 0, adicional: 0, breakdownMap: new Map() };
        buckets.set(bucketKey, bucket);
      }

      bucket.mensual += row.mensual;
      bucket.adicional += row.adicional;
      totalMensual += row.mensual;
      totalAdicional += row.adicional;

      // Per-client breakdown within bucket (for tooltip)
      let clientInBucket = bucket.breakdownMap.get(row.customerId);
      if (!clientInBucket) {
        clientInBucket = { name: row.customerName, mensual: 0, adicional: 0 };
        bucket.breakdownMap.set(row.customerId, clientInBucket);
      }
      clientInBucket.mensual += row.mensual;
      clientInBucket.adicional += row.adicional;

      // Client totals (for ranking)
      let clientTotal = clientTotals.get(row.customerId);
      if (!clientTotal) {
        clientTotal = { name: row.customerName, mensual: 0, adicional: 0 };
        clientTotals.set(row.customerId, clientTotal);
      }
      clientTotal.mensual += row.mensual;
      clientTotal.adicional += row.adicional;
    }

    // Build chart data sorted by bucket key
    const chartData: ChartDataPoint[] = Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, bucket]) => ({
        label: bucket.label,
        mensual: bucket.mensual,
        adicional: bucket.adicional,
        _breakdown: Array.from(bucket.breakdownMap.values()) as ClientBreakdown[],
      }));

    // Client ranking sorted by total descending
    const clientRanking = Array.from(clientTotals.values()).sort(
      (a, b) => b.mensual + b.adicional - (a.mensual + a.adicional)
    );

    // Period label
    let periodLabel: string;
    if (granularity === 'daily') {
      periodLabel = selectedMonth.clone().locale('es').format('MMMM YYYY');
      periodLabel = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
    } else if (granularity === 'weekly' || granularity === 'monthly') {
      const startM = selectedMonth.clone().subtract(2, 'months');
      periodLabel = `${startM.locale('es').format('MMM YYYY')} - ${selectedMonth.clone().locale('es').format('MMM YYYY')}`;
    } else {
      // yearly
      const startM = selectedMonth.clone().subtract(11, 'months');
      periodLabel = `${startM.locale('es').format('MMM YYYY')} - ${selectedMonth.clone().locale('es').format('MMM YYYY')}`;
    }

    return {
      chartData,
      totals: { mensual: totalMensual, adicional: totalAdicional },
      clientRanking,
      periodLabel,
    };
  }, [data.rows, selectedMonth, granularity, selectedCustomerIds]);

  // Capitalize first letter for month display
  const monthDisplay = selectedMonth.clone().locale('es').format('MMMM YYYY');
  const capitalizedMonth = monthDisplay.charAt(0).toUpperCase() + monthDisplay.slice(1);

  return (
    <section className="grid grid-cols-1 gap-3 mb-4">
      {/* Main area chart card */}
      <Card className="py-0">
        <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
          {/* Left: title + controls */}
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-4">
            <CardTitle className="text-base">Historico de servicios</CardTitle>
            <CardDescription>
              {periodLabel}
              {selectedCustomerIds.length > 0 && (
                <span className="ml-1">
                  ({selectedCustomerIds.length} {selectedCustomerIds.length === 1 ? 'cliente' : 'clientes'})
                </span>
              )}
            </CardDescription>

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Month navigator */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!canGoBack}
                  onClick={() => setSelectedMonth((m) => m.clone().subtract(1, 'month'))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[130px] text-center">{capitalizedMonth}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!canGoForward}
                  onClick={() => setSelectedMonth((m) => m.clone().add(1, 'month'))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Granularity toggle */}
              <ToggleGroup
                type="single"
                value={granularity}
                onValueChange={(val) => {
                  if (val) setGranularity(val as Granularity);
                }}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="daily">Diario</ToggleGroupItem>
                <ToggleGroupItem value="weekly">Semanal</ToggleGroupItem>
                <ToggleGroupItem value="monthly">Mensual</ToggleGroupItem>
                <ToggleGroupItem value="yearly">Anual</ToggleGroupItem>
              </ToggleGroup>

              {/* Client filter */}
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
            </div>
          </div>

          {/* Right: stat buttons */}
          <div className="flex">
            {(['total', 'mensual', 'adicional'] as const).map((key) => {
              const value = key === 'total' ? totals.mensual + totals.adicional : totals[key];
              const label = key === 'total' ? 'Total' : key === 'mensual' ? 'Mensual' : 'Adicional';
              return (
                <button
                  key={key}
                  data-active={activeView === key}
                  className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6 cursor-pointer transition-colors hover:bg-muted/30"
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
          <ServiceHistoryAreaChart chartData={chartData} activeView={activeView} />
        </CardContent>
      </Card>

      {/* Client ranking chart */}
      <ClientRankingChart data={clientRanking} periodLabel={periodLabel} />
    </section>
  );
}
