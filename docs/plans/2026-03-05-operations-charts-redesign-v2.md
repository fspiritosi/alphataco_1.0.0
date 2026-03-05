# Operations Charts Redesign v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redisenar el grafico de operaciones con un AreaChart stacked interactivo (mensual + adicional), navegacion por mes, toggle de granularidad, tooltip enriquecido con desglose por cliente, y un ranking horizontal de clientes.

**Architecture:** Server Component hace fetch Prisma pre-agregado (12 meses), pasa datos al Client Component via dynamic import (ssr: false). El cliente filtra por mes seleccionado + granularidad, renderiza un AreaChart stacked con tooltip custom y un BarChart horizontal de ranking de clientes. Controles: navegador de mes (</>), ToggleGroup (Diario/Semanal/Mensual), multi-select de clientes, y header con stats clickeables.

**Tech Stack:** Next.js 16, Prisma, Recharts (AreaChart + BarChart), shadcn/ui (Chart, ToggleGroup, MultiSelectCombobox, Card), Tailwind CSS, moment.js

---

## Contexto Clave (para el implementador)

### Archivos que se modifican/crean

- `src/features/Dashboard/Estadisticas/Operaciones/actions/actions.server.ts` — MODIFICAR (extender a 12 meses)
- `src/features/Dashboard/Estadisticas/Operaciones/components/OperacionesChartsClient.tsx` — REESCRIBIR
- `src/features/Dashboard/Estadisticas/Operaciones/components/ServiceHistoryAreaChart.tsx` — CREAR
- `src/features/Dashboard/Estadisticas/Operaciones/components/ClientRankingChart.tsx` — CREAR
- `src/features/Dashboard/Estadisticas/Operaciones/components/CustomChartTooltip.tsx` — CREAR
- `src/features/Dashboard/Estadisticas/Operaciones/fallback/OperacionesChartsSkeleton.tsx` — MODIFICAR

### Archivos que NO se tocan

- `OperacionesTabContent.tsx` — ya esta bien (Server Component + dynamic import)
- `OperacionesChartsDynamic.tsx` — ya esta bien (wrapper ssr: false)

### Archivos de referencia (leer antes de empezar)

- `src/components/ui/chart.tsx` — ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent
- `src/components/ui/toggle-group.tsx` — ToggleGroup, ToggleGroupItem (de Radix)
- `src/components/ui/multi-select-combobox.tsx` — MultiSelectCombobox con props: options, placeholder, emptyMessage, selectedValues, onChange, showSelectAll
- `prisma/schema.prisma` — Modelos `dailyreport` y `dailyreportrows`, enum `daily_report_type_enum`

### Patron de imports del proyecto

```typescript
import { prisma } from '@/shared/lib/prisma';
import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@/components/ui/chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Button } from '@/components/ui/button';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import moment from 'moment';
```

### Colores del chart (CSS vars del proyecto)

- `var(--chart-1)` — color primario (mensual)
- `var(--chart-2)` — color secundario (adicional)
- `var(--chart-3)` a `var(--chart-5)` — colores extra disponibles

---

## Task 1: Actualizar server action — extender a 12 meses

**Files:**

- Modify: `src/features/Dashboard/Estadisticas/Operaciones/actions/actions.server.ts`

**Step 1: Actualizar la constante de dias y el tipo**

Cambiar `since = moment().subtract(90, 'days')` a `moment().subtract(12, 'months')`. El tipo `OperationsChartData` se mantiene igual — ya tiene la estructura correcta (rows por dia por cliente con mensual/adicional).

```typescript
'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { prisma } from '@/shared/lib/prisma';
import moment from 'moment';

const logger = new Logger('Dashboard/Estadisticas/Operaciones');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AggregatedChartRow = {
  date: string;
  customerId: string;
  customerName: string;
  mensual: number;
  adicional: number;
};

export type OperationsChartData = {
  rows: AggregatedChartRow[];
  customers: { id: string; name: string }[];
};

// ---------------------------------------------------------------------------
// Main query
// ---------------------------------------------------------------------------

export async function getOperationsChartData(): Promise<OperationsChartData> {
  const companyId = await getServerCompanyId();
  const since = moment().subtract(12, 'months').startOf('month').format('YYYY-MM-DD');

  logger.debug('Fetching operations chart data', { data: { companyId, since } });

  try {
    const rows = await prisma.dailyreportrows.findMany({
      where: {
        dailyreport: {
          company_id: companyId,
          date: { gte: new Date(since) },
          is_active: true,
        },
        customer_id: { not: null },
      },
      select: {
        type_service: true,
        dailyreport: { select: { date: true } },
        customers: { select: { id: true, name: true } },
      },
    });

    // Pre-aggregate in a single loop
    const aggregation = new Map<string, { mensual: number; adicional: number }>();
    const customerMap = new Map<string, string>();

    for (const row of rows) {
      if (!row.dailyreport?.date || !row.customers) continue;

      const dateStr = moment(row.dailyreport.date).format('YYYY-MM-DD');
      const customerId = row.customers.id;
      const customerName = row.customers.name ?? 'Sin cliente';
      const key = `${dateStr}|${customerId}`;

      customerMap.set(customerId, customerName);

      let entry = aggregation.get(key);
      if (!entry) {
        entry = { mensual: 0, adicional: 0 };
        aggregation.set(key, entry);
      }

      if (row.type_service === 'mensual') {
        entry.mensual += 1;
      } else if (row.type_service === 'adicional' || row.type_service === 'adicional_permanente') {
        entry.adicional += 1;
      }
    }

    const aggregatedRows: AggregatedChartRow[] = [];
    for (const [key, counts] of aggregation) {
      const [date, customerId] = key.split('|');
      aggregatedRows.push({
        date,
        customerId,
        customerName: customerMap.get(customerId) ?? 'Sin cliente',
        mensual: counts.mensual,
        adicional: counts.adicional,
      });
    }

    aggregatedRows.sort((a, b) => a.date.localeCompare(b.date));

    const customers = Array.from(customerMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    logger.debug('Operations chart data fetched', {
      data: { rowCount: aggregatedRows.length, customerCount: customers.length },
    });

    return { rows: aggregatedRows, customers };
  } catch (error) {
    logger.error('Error fetching operations chart data', { data: { error } });
    throw error;
  }
}
```

**Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: Sin errores en `actions.server.ts`

**Step 3: Commit**

```
feat(operations-chart): extend data window to 12 months
```

---

## Task 2: Crear tooltip custom con desglose por cliente

**Files:**

- Create: `src/features/Dashboard/Estadisticas/Operaciones/components/CustomChartTooltip.tsx`

**Step 1: Crear el componente**

El tooltip custom recibe el payload de Recharts y muestra:

- Label del periodo (fecha o rango)
- Desglose de mensual con top 5 clientes + "y N mas"
- Desglose de adicional con top 5 clientes + "y N mas"
- Total al final

Los datos de breakdown se inyectan en cada data point como `_breakdown`.

```typescript
'use client';

import * as React from 'react';

const MAX_CLIENTS_IN_TOOLTIP = 5;

export type ClientBreakdown = {
  name: string;
  mensual: number;
  adicional: number;
};

export type ChartDataPoint = {
  label: string;
  mensual: number;
  adicional: number;
  _breakdown: ClientBreakdown[];
  [key: string]: unknown;
};

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: ChartDataPoint;
    color: string;
  }>;
  label?: string;
  activeView: 'total' | 'mensual' | 'adicional';
}

export const CustomChartTooltip = React.memo(function CustomChartTooltip({
  active,
  payload,
  activeView,
}: CustomChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const breakdown = data._breakdown ?? [];

  // Sort clients by total descending
  const sorted = [...breakdown].sort(
    (a, b) => b.mensual + b.adicional - (a.mensual + a.adicional)
  );

  const visible = sorted.slice(0, MAX_CLIENTS_IN_TOOLTIP);
  const remaining = sorted.slice(MAX_CLIENTS_IN_TOOLTIP);
  const remainingMensual = remaining.reduce((s, c) => s + c.mensual, 0);
  const remainingAdicional = remaining.reduce((s, c) => s + c.adicional, 0);

  const showMensual = activeView === 'total' || activeView === 'mensual';
  const showAdicional = activeView === 'total' || activeView === 'adicional';

  return (
    <div className="border-border/50 bg-background min-w-[220px] max-w-[300px] rounded-lg border px-3 py-2 text-xs shadow-xl">
      {/* Period label */}
      <p className="font-medium mb-1.5">{data.label}</p>

      {/* Mensual section */}
      {showMensual && data.mensual > 0 && (
        <div className="mb-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: 'var(--chart-1)' }} />
            <span className="text-muted-foreground">Mensual</span>
            <span className="ml-auto font-mono font-medium tabular-nums">
              {data.mensual.toLocaleString('es-AR')}
            </span>
          </div>
          {visible
            .filter((c) => c.mensual > 0)
            .map((c) => (
              <div key={c.name} className="flex justify-between pl-3.5 text-muted-foreground">
                <span className="truncate max-w-[160px]">{c.name}</span>
                <span className="font-mono tabular-nums">{c.mensual}</span>
              </div>
            ))}
          {remaining.length > 0 && remainingMensual > 0 && (
            <div className="flex justify-between pl-3.5 text-muted-foreground italic">
              <span>...y {remaining.length} mas</span>
              <span className="font-mono tabular-nums">{remainingMensual}</span>
            </div>
          )}
        </div>
      )}

      {/* Adicional section */}
      {showAdicional && data.adicional > 0 && (
        <div className="mb-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: 'var(--chart-2)' }} />
            <span className="text-muted-foreground">Adicional</span>
            <span className="ml-auto font-mono font-medium tabular-nums">
              {data.adicional.toLocaleString('es-AR')}
            </span>
          </div>
          {visible
            .filter((c) => c.adicional > 0)
            .map((c) => (
              <div key={c.name} className="flex justify-between pl-3.5 text-muted-foreground">
                <span className="truncate max-w-[160px]">{c.name}</span>
                <span className="font-mono tabular-nums">{c.adicional}</span>
              </div>
            ))}
          {remaining.length > 0 && remainingAdicional > 0 && (
            <div className="flex justify-between pl-3.5 text-muted-foreground italic">
              <span>...y {remaining.length} mas</span>
              <span className="font-mono tabular-nums">{remainingAdicional}</span>
            </div>
          )}
        </div>
      )}

      {/* Total */}
      {activeView === 'total' && (
        <div className="flex justify-between border-t border-border/50 pt-1.5 font-medium">
          <span>Total</span>
          <span className="font-mono tabular-nums">
            {(data.mensual + data.adicional).toLocaleString('es-AR')}
          </span>
        </div>
      )}
    </div>
  );
});
```

**Step 2: Verificar tipos**

Run: `npm run check-types`

**Step 3: Commit**

```
feat(operations-chart): add custom tooltip with client breakdown
```

---

## Task 3: Crear componente AreaChart — stacked mensual/adicional

**Files:**

- Create: `src/features/Dashboard/Estadisticas/Operaciones/components/ServiceHistoryAreaChart.tsx`

**Step 1: Crear el area chart**

Componente presentacional que recibe chart data procesado y renderiza un stacked AreaChart con gradientes. Las 2 areas: mensual (gradiente solido) y adicional (gradiente mas transparente). Curvas `type="natural"`.

Usa `<ChartTooltip content={...} />` con el CustomChartTooltip.

```typescript
'use client';

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import type { ChartDataPoint } from './CustomChartTooltip';
import { CustomChartTooltip } from './CustomChartTooltip';

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

interface ServiceHistoryAreaChartProps {
  chartData: ChartDataPoint[];
  activeView: 'total' | 'mensual' | 'adicional';
}

export function ServiceHistoryAreaChart({ chartData, activeView }: ServiceHistoryAreaChartProps) {
  const showMensual = activeView === 'total' || activeView === 'mensual';
  const showAdicional = activeView === 'total' || activeView === 'adicional';

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
      <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
        <defs>
          <linearGradient id="fillMensual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-mensual)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-mensual)" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fillAdicional" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-adicional)" stopOpacity={0.6} />
            <stop offset="95%" stopColor="var(--color-adicional)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
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
          content={<CustomChartTooltip activeView={activeView} />}
        />
        {showMensual && (
          <Area
            dataKey="mensual"
            type="natural"
            fill="url(#fillMensual)"
            stroke="var(--color-mensual)"
            strokeWidth={2}
            stackId="a"
          />
        )}
        {showAdicional && (
          <Area
            dataKey="adicional"
            type="natural"
            fill="url(#fillAdicional)"
            stroke="var(--color-adicional)"
            strokeWidth={2}
            stackId="a"
          />
        )}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
```

**Step 2: Verificar tipos**

Run: `npm run check-types`

**Step 3: Commit**

```
feat(operations-chart): add stacked area chart with gradient fills
```

---

## Task 4: Crear componente ranking horizontal de clientes

**Files:**

- Create: `src/features/Dashboard/Estadisticas/Operaciones/components/ClientRankingChart.tsx`

**Step 1: Crear el ranking chart**

Horizontal bar chart mostrando top 5 clientes del periodo seleccionado. Barras stacked (mensual + adicional). Usa `layout="vertical"` de Recharts.

```typescript
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import * as React from 'react';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';

const MAX_CLIENTS_VISIBLE = 7;

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

interface ClientRankingData {
  name: string;
  mensual: number;
  adicional: number;
}

interface ClientRankingChartProps {
  data: ClientRankingData[];
  periodLabel: string;
}

export function ClientRankingChart({ data, periodLabel }: ClientRankingChartProps) {
  const visible = data.slice(0, MAX_CLIENTS_VISIBLE);
  const remainingCount = data.length - visible.length;

  if (visible.length === 0) {
    return null;
  }

  // Truncate long names for the Y axis
  const chartData = visible.map((item) => ({
    ...item,
    shortName: item.name.length > 20 ? item.name.slice(0, 18) + '...' : item.name,
  }));

  const chartHeight = Math.max(180, visible.length * 40 + 40);

  return (
    <Card className="py-0">
      <CardHeader className="pb-2 pt-4 px-6">
        <CardTitle className="text-base">Servicios por cliente</CardTitle>
        <CardDescription>{periodLabel}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 0, right: 12 }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="shortName"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={130}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar
              dataKey="mensual"
              stackId="a"
              fill="var(--color-mensual)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="adicional"
              stackId="a"
              fill="var(--color-adicional)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
        {remainingCount > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-1">
            +{remainingCount} {remainingCount === 1 ? 'cliente' : 'clientes'} mas
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verificar tipos**

Run: `npm run check-types`

**Step 3: Commit**

```
feat(operations-chart): add horizontal client ranking chart
```

---

## Task 5: Reescribir componente cliente — controles + logica + layout

**Files:**

- Rewrite: `src/features/Dashboard/Estadisticas/Operaciones/components/OperacionesChartsClient.tsx`

**Step 1: Reescribir el componente completo**

Este es el componente principal que contiene:

- Navegador de mes (< Marzo 2026 >)
- ToggleGroup de granularidad (Diario/Semanal/Mensual)
- Multi-select de clientes
- Header con stats clickeables (Total/Mensual/Adicional)
- Area chart (Task 3)
- Client ranking chart (Task 4)

**Logica del useMemo (single loop):**

1. Determinar ventana de datos segun granularidad:
   - Diario: mes seleccionado (1 mes)
   - Semanal: mes seleccionado + 2 anteriores (3 meses)
   - Mensual: mes seleccionado + 11 anteriores (12 meses)
2. Filtrar por cliente si hay seleccion
3. Agrupar en buckets segun granularidad
4. Calcular breakdown por cliente por bucket (para tooltip)
5. Calcular totals por cliente (para ranking)
6. Retornar chartData, totals, clientRanking

```typescript
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

type Granularity = 'daily' | 'weekly' | 'monthly';
type ActiveView = 'total' | 'mensual' | 'adicional';

// ---------------------------------------------------------------------------
// Helpers (pure functions outside component)
// ---------------------------------------------------------------------------

function getBucketKey(
  dateStr: string,
  granularity: Granularity
): { key: string; label: string } {
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

  // monthly
  return {
    key: `month-${m.format('YYYY-MM')}`,
    label: m.format('MMM YYYY'),
  };
}

function getDataWindow(
  selectedMonth: moment.Moment,
  granularity: Granularity
): { start: string; end: string } {
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

  // monthly
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
    const customerFilter =
      selectedCustomerIds.length > 0 ? new Set(selectedCustomerIds) : null;

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
      periodLabel = selectedMonth.format('MMMM YYYY');
    } else if (granularity === 'weekly') {
      const startM = selectedMonth.clone().subtract(2, 'months');
      periodLabel = `${startM.format('MMM YYYY')} - ${selectedMonth.format('MMM YYYY')}`;
    } else {
      const startM = selectedMonth.clone().subtract(11, 'months');
      periodLabel = `${startM.format('MMM YYYY')} - ${selectedMonth.format('MMM YYYY')}`;
    }

    return {
      chartData,
      totals: { mensual: totalMensual, adicional: totalAdicional },
      clientRanking,
      periodLabel,
    };
  }, [data.rows, selectedMonth, granularity, selectedCustomerIds]);

  // Capitalize first letter for month display
  const monthDisplay = selectedMonth.locale('es').format('MMMM YYYY');
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
                  ({selectedCustomerIds.length}{' '}
                  {selectedCustomerIds.length === 1 ? 'cliente' : 'clientes'})
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
                <span className="text-sm font-medium min-w-[130px] text-center">
                  {capitalizedMonth}
                </span>
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
              const value =
                key === 'total'
                  ? totals.mensual + totals.adicional
                  : totals[key];
              const label =
                key === 'total' ? 'Total' : key === 'mensual' ? 'Mensual' : 'Adicional';
              return (
                <button
                  key={key}
                  data-active={activeView === key}
                  className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                  onClick={() => setActiveView(key)}
                >
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-lg leading-none font-bold sm:text-3xl">
                    {value.toLocaleString('es-AR')}
                  </span>
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
```

**Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: Sin errores

**Step 3: Commit**

```
feat(operations-chart): rewrite client component with area chart + month nav + ranking
```

---

## Task 6: Actualizar skeleton

**Files:**

- Modify: `src/features/Dashboard/Estadisticas/Operaciones/fallback/OperacionesChartsSkeleton.tsx`

**Step 1: Actualizar el skeleton para reflejar el nuevo layout**

Debe mostrar: Card principal (con header + area placeholder) + Card del ranking.

```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function OperacionesChartsSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-3 mb-4">
      {/* Main area chart skeleton */}
      <Card className="py-0">
        <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
            <div className="flex items-center gap-2 mt-2">
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-8 w-[220px]" />
            </div>
          </div>
          <div className="flex">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              >
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>

      {/* Client ranking skeleton */}
      <Card className="py-0">
        <CardHeader className="pb-2 pt-4 px-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="px-2 pb-4 sm:px-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-[130px]" />
                <Skeleton className="h-6 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
```

**Step 2: Commit**

```
feat(operations-chart): update skeleton for new layout
```

---

## Task 7: Verificacion final

**Step 1: Type check**

Run: `npm run check-types`
Expected: PASS — zero errors

**Step 2: Visual verification**

Navegar a `/dashboard?tab=estadisticas&subtab=operaciones` y verificar:

- [ ] Area chart renderiza con datos
- [ ] Navegador de mes funciona (flechas < >)
- [ ] Toggle Diario/Semanal/Mensual cambia la granularidad y ventana de datos
- [ ] Multi-select de clientes filtra correctamente
- [ ] Botones Total/Mensual/Adicional focalizan la serie correspondiente
- [ ] Tooltip muestra desglose por cliente (top 5 + "y N mas")
- [ ] Gradientes del area chart se ven suaves
- [ ] Leyenda aparece debajo del chart
- [ ] Ranking de clientes se muestra debajo con barras horizontales
- [ ] Skeleton aparece durante carga
- [ ] No hay errores en consola
- [ ] Responsive: funciona en pantallas chicas (controles hacen wrap)

**Step 3: Commit final**

```
feat(operations-chart): complete redesign v2 with area chart + month nav + client ranking
```

---

## Summary

| Task | Archivo                                  | Accion                                    |
| ---- | ---------------------------------------- | ----------------------------------------- |
| 1    | `actions/actions.server.ts`              | MODIFY — extender a 12 meses              |
| 2    | `components/CustomChartTooltip.tsx`      | CREATE — tooltip con desglose por cliente |
| 3    | `components/ServiceHistoryAreaChart.tsx` | CREATE — AreaChart stacked con gradientes |
| 4    | `components/ClientRankingChart.tsx`      | CREATE — ranking horizontal de clientes   |
| 5    | `components/OperacionesChartsClient.tsx` | REWRITE — controles + logica + layout     |
| 6    | `fallback/OperacionesChartsSkeleton.tsx` | MODIFY — nuevo layout                     |
| 7    | —                                        | VERIFY — types + visual                   |
