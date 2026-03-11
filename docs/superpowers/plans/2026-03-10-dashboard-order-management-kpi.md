# Dashboard — Gestion de Pedidos KPI + Fix Export Imagen

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la seccion "Gestion de Pedidos — Sala de Control" en Estadisticas > Operaciones con UI estilo "Historico de servicios" (stats clickeables, filtro de cliente, grafico de lineas), y corregir la exportacion de imagen del modal de servicios para incluir titulo y descripcion.

**Architecture:** Server action con Prisma sobre `preparte` (ultimos 12 meses) pre-agregando por fecha + status + cliente. Client component con controles de navegacion, filtro MultiSelectCombobox, stats clickeables a la derecha del header, y LineChart de Recharts. Se integra debajo de los graficos existentes en OperacionesTabContent via dynamic import. Ademas, fix puntual en ServicesDetailDialog para incluir titulo/descripcion en el area capturable.

**Tech Stack:** Prisma, Recharts (LineChart), shadcn/ui (ChartContainer, Card, ToggleGroup, MultiSelectCombobox), moment.js, next/dynamic, html-to-image

---

## Archivos

| Accion | Archivo                                                                                  |
| ------ | ---------------------------------------------------------------------------------------- |
| CREATE | `src/features/Dashboard/Estadisticas/Operaciones/actions/preparte-kpi.server.ts`         |
| CREATE | `src/features/Dashboard/Estadisticas/Operaciones/components/OrderManagementChart.tsx`    |
| CREATE | `src/features/Dashboard/Estadisticas/Operaciones/components/OrderManagementClient.tsx`   |
| CREATE | `src/features/Dashboard/Estadisticas/Operaciones/components/OrderManagementDynamic.tsx`  |
| MODIFY | `src/features/Dashboard/Estadisticas/Operaciones/OperacionesTabContent.tsx`              |
| MODIFY | `src/features/Dashboard/Estadisticas/Operaciones/fallback/OperacionesChartsSkeleton.tsx` |
| MODIFY | `src/features/Dashboard/Principal/components/ServicesDetailDialog.tsx`                   |

---

## Task 1: Server Action — `getPreparteKpiData()`

**Files:**

- Create: `src/features/Dashboard/Estadisticas/Operaciones/actions/preparte-kpi.server.ts`

- [ ] **Step 1: Crear la server action**

```typescript
'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { prisma } from '@/shared/lib/prisma';
import moment from 'moment';

const logger = new Logger('Dashboard/Estadisticas/Operaciones/PreparteKpi');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PreparteKpiRow = {
  date: string; // YYYY-MM-DD
  customerId: string;
  customerName: string;
  pendiente: number;
  confirmado: number;
  rechazado: number;
  cancelado: number;
  otros: number; // reprogramado + vencido
  total: number;
};

export type PreparteKpiData = {
  rows: PreparteKpiRow[];
  customers: { id: string; name: string }[];
};

// ---------------------------------------------------------------------------
// Main query
// ---------------------------------------------------------------------------

export async function getPreparteKpiData(): Promise<PreparteKpiData> {
  const companyId = await getServerCompanyId();
  const since = moment().subtract(12, 'months').startOf('month').format('YYYY-MM-DD');

  logger.debug('Fetching preparte KPI data', { data: { companyId, since } });

  try {
    const records = await prisma.preparte.findMany({
      where: {
        company_id: companyId,
        created_at: { gte: new Date(since) },
      },
      select: {
        status: true,
        created_at: true,
        customers: { select: { id: true, name: true } },
      },
    });

    // Pre-aggregate by date + customer
    const aggregation = new Map<string, PreparteKpiRow>();
    const customerMap = new Map<string, string>();

    for (const record of records) {
      if (!record.created_at || !record.customers) continue;

      const dateKey = moment(record.created_at).format('YYYY-MM-DD');
      const customerId = record.customers.id;
      const customerName = record.customers.name ?? 'Sin cliente';
      const key = `${dateKey}|${customerId}`;

      customerMap.set(customerId, customerName);

      let entry = aggregation.get(key);
      if (!entry) {
        entry = {
          date: dateKey,
          customerId,
          customerName,
          pendiente: 0,
          confirmado: 0,
          rechazado: 0,
          cancelado: 0,
          otros: 0,
          total: 0,
        };
        aggregation.set(key, entry);
      }

      entry.total++;
      switch (record.status) {
        case 'pendiente':
          entry.pendiente++;
          break;
        case 'confirmado':
          entry.confirmado++;
          break;
        case 'rechazado':
          entry.rechazado++;
          break;
        case 'cancelado':
          entry.cancelado++;
          break;
        default:
          // reprogramado, vencido, null
          entry.otros++;
          break;
      }
    }

    const rows = Array.from(aggregation.values()).sort((a, b) => a.date.localeCompare(b.date));

    const customers = Array.from(customerMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    logger.debug('Preparte KPI data fetched', {
      data: { totalRecords: records.length, aggregatedRows: rows.length, customerCount: customers.length },
    });

    return { rows, customers };
  } catch (error) {
    logger.error('Error fetching preparte KPI data', { data: { error } });
    throw error;
  }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```
feat: add preparte KPI server action with customer aggregation
```

---

## Task 2: Line Chart — `OrderManagementChart.tsx`

**Files:**

- Create: `src/features/Dashboard/Estadisticas/Operaciones/components/OrderManagementChart.tsx`

- [ ] **Step 1: Crear el componente del grafico de lineas**

Referencia: `ServiceHistoryAreaChart.tsx` usa el mismo patron `ChartContainer` + Recharts.

```typescript
'use client';

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

const chartConfig = {
  confirmado: {
    label: 'Confirmados',
    color: 'oklch(0.72 0.17 150)', // green
  },
  pendiente: {
    label: 'Pendientes',
    color: 'oklch(0.80 0.15 85)', // yellow
  },
  rechazado: {
    label: 'Rechazados',
    color: 'oklch(0.75 0.15 55)', // amber/orange
  },
  cancelado: {
    label: 'Cancelados',
    color: 'oklch(0.63 0.20 25)', // red
  },
  otros: {
    label: 'Otros',
    color: 'oklch(0.70 0.02 260)', // gray
  },
} satisfies ChartConfig;

export type OrderChartDataPoint = {
  label: string;
  confirmado: number;
  pendiente: number;
  rechazado: number;
  cancelado: number;
  otros: number;
};

type ActiveView = 'total' | 'confirmado' | 'pendiente' | 'rechazado' | 'cancelado';

interface Props {
  chartData: OrderChartDataPoint[];
  activeView: ActiveView;
}

const SERIES = ['confirmado', 'pendiente', 'rechazado', 'cancelado', 'otros'] as const;

export function OrderManagementChart({ chartData, activeView }: Props) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
      <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => String(value)}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {SERIES.map((key) => {
          const visible = activeView === 'total' || activeView === key;
          if (!visible) return null;
          return (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          );
        })}
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```
feat: add order management line chart component
```

---

## Task 3: Client Component — `OrderManagementClient.tsx`

**Files:**

- Create: `src/features/Dashboard/Estadisticas/Operaciones/components/OrderManagementClient.tsx`

- [ ] **Step 1: Crear el componente principal**

UI estilo "Historico de servicios" con stats clickeables a la derecha del header, controles de navegacion + filtro de cliente a la izquierda, y el grafico de lineas debajo.

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
import type { PreparteKpiData } from '../actions/preparte-kpi.server';
import { OrderManagementChart, type OrderChartDataPoint } from './OrderManagementChart';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Granularity = 'weekly' | 'monthly';
type ActiveView = 'total' | 'confirmado' | 'pendiente' | 'rechazado' | 'cancelado';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBucketKey(dateStr: string, granularity: Granularity): { key: string; label: string } {
  const m = moment(dateStr);

  if (granularity === 'weekly') {
    const weekStart = m.clone().startOf('isoWeek');
    const weekEnd = weekStart.clone().add(6, 'days');
    return {
      key: `week-${weekStart.format('YYYY-MM-DD')}`,
      label: `${weekStart.format('D MMM')} - ${weekEnd.format('D MMM')}`,
    };
  }

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

  if (granularity === 'weekly') {
    return {
      start: selectedMonth.clone().startOf('month').format('YYYY-MM-DD'),
      end,
    };
  }

  // monthly — last 6 months
  return {
    start: selectedMonth.clone().subtract(5, 'months').startOf('month').format('YYYY-MM-DD'),
    end,
  };
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface Props {
  data: PreparteKpiData;
}

export function OrderManagementClient({ data }: Props) {
  const [selectedMonth, setSelectedMonth] = React.useState(() => moment().startOf('month'));
  const [granularity, setGranularity] = React.useState<Granularity>('monthly');
  const [selectedCustomerIds, setSelectedCustomerIds] = React.useState<string[]>([]);
  const [activeView, setActiveView] = React.useState<ActiveView>('total');

  // Earliest month with data
  const earliestMonth = React.useMemo(() => {
    if (data.rows.length === 0) return moment();
    return moment(data.rows[0].date).startOf('month');
  }, [data.rows]);

  const canGoBack = selectedMonth.isAfter(earliestMonth, 'month');
  const canGoForward = selectedMonth.isBefore(moment(), 'month');

  // Process data
  const { chartData, stats, periodLabel } = React.useMemo(() => {
    moment.locale('es');

    const { start, end } = getDataWindow(selectedMonth, granularity);
    const customerFilter = selectedCustomerIds.length > 0 ? new Set(selectedCustomerIds) : null;

    // Bucket aggregation for chart
    const buckets = new Map<
      string,
      { label: string; confirmado: number; pendiente: number; rechazado: number; cancelado: number; otros: number }
    >();

    // Current month stats (always the selected month regardless of granularity)
    const monthStart = selectedMonth.clone().startOf('month').format('YYYY-MM-DD');
    const monthEnd = selectedMonth.clone().endOf('month').format('YYYY-MM-DD');
    let totalCount = 0;
    let confirmadoCount = 0;
    let pendienteCount = 0;
    let rechazadoCount = 0;
    let canceladoCount = 0;

    for (const row of data.rows) {
      if (customerFilter && !customerFilter.has(row.customerId)) continue;

      // Current month stats
      if (row.date >= monthStart && row.date <= monthEnd) {
        totalCount += row.total;
        confirmadoCount += row.confirmado;
        pendienteCount += row.pendiente;
        rechazadoCount += row.rechazado;
        canceladoCount += row.cancelado;
      }

      // Chart data (may span wider window)
      if (row.date < start || row.date > end) continue;

      const { key, label } = getBucketKey(row.date, granularity);

      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { label, confirmado: 0, pendiente: 0, rechazado: 0, cancelado: 0, otros: 0 };
        buckets.set(key, bucket);
      }

      bucket.confirmado += row.confirmado;
      bucket.pendiente += row.pendiente;
      bucket.rechazado += row.rechazado;
      bucket.cancelado += row.cancelado;
      bucket.otros += row.otros;
    }

    const chartData: OrderChartDataPoint[] = Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, b]) => ({
        label: b.label,
        confirmado: b.confirmado,
        pendiente: b.pendiente,
        rechazado: b.rechazado,
        cancelado: b.cancelado,
        otros: b.otros,
      }));

    const stats = {
      total: totalCount,
      confirmado: confirmadoCount,
      pendiente: pendienteCount,
      rechazado: rechazadoCount,
      cancelado: canceladoCount,
    };

    // Period label
    let periodLabel: string;
    if (granularity === 'weekly') {
      periodLabel = selectedMonth.clone().locale('es').format('MMMM YYYY');
      periodLabel = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
    } else {
      const startM = selectedMonth.clone().subtract(5, 'months');
      periodLabel = `${startM.locale('es').format('MMM YYYY')} – ${selectedMonth.clone().locale('es').format('MMM YYYY')}`;
    }

    return { chartData, stats, periodLabel };
  }, [data.rows, selectedMonth, granularity, selectedCustomerIds]);

  // Month display
  const monthDisplay = selectedMonth.clone().locale('es').format('MMMM YYYY');
  const capitalizedMonth = monthDisplay.charAt(0).toUpperCase() + monthDisplay.slice(1);

  // Stat buttons config (right side of header)
  const statButtons: { key: ActiveView; label: string; value: number }[] = [
    { key: 'total', label: 'Total', value: stats.total },
    { key: 'confirmado', label: 'Confirmados', value: stats.confirmado },
    { key: 'pendiente', label: 'Pendientes', value: stats.pendiente },
    { key: 'rechazado', label: 'Rechazados', value: stats.rechazado },
    { key: 'cancelado', label: 'Cancelados', value: stats.cancelado },
  ];

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        {/* Left: title + controls */}
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-4">
          <CardTitle className="text-base">Gestion de Pedidos — Sala de Control</CardTitle>
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

        {/* Right: stat buttons (identical pattern to Historico de servicios) */}
        <div className="flex">
          {statButtons.map(({ key, label, value }) => (
            <button
              key={key}
              data-active={activeView === key}
              className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6 cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => setActiveView(key)}
            >
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-lg leading-none font-bold sm:text-3xl">
                {value.toLocaleString('es-AR')}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {chartData.length > 0 ? (
          <OrderManagementChart chartData={chartData} activeView={activeView} />
        ) : (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
            No hay datos de pedidos para este periodo
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```
feat: add order management client component with stats and line chart
```

---

## Task 4: Dynamic Wrapper — `OrderManagementDynamic.tsx`

**Files:**

- Create: `src/features/Dashboard/Estadisticas/Operaciones/components/OrderManagementDynamic.tsx`

- [ ] **Step 1: Crear wrapper dinamico**

Mismo patron que `OperacionesChartsDynamic.tsx`.

```typescript
'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PreparteKpiData } from '../actions/preparte-kpi.server';

function OrderManagementSkeleton() {
  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-4">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-40" />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-8 w-[160px]" />
            <Skeleton className="h-8 w-[220px]" />
          </div>
        </div>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <Skeleton className="h-[280px] w-full" />
      </CardContent>
    </Card>
  );
}

const OrderManagementClient = dynamic(
  () => import('./OrderManagementClient').then((m) => m.OrderManagementClient),
  { ssr: false, loading: () => <OrderManagementSkeleton /> }
);

interface Props {
  data: PreparteKpiData;
}

export function OrderManagementDynamic({ data }: Props) {
  return <OrderManagementClient data={data} />;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```
feat: add order management dynamic wrapper with skeleton
```

---

## Task 5: Integrar en OperacionesTabContent

**Files:**

- Modify: `src/features/Dashboard/Estadisticas/Operaciones/OperacionesTabContent.tsx`

- [ ] **Step 1: Modificar para fetchear ambos datasets en paralelo**

El archivo actual:

```typescript
import { getOperationsChartData } from './actions/actions.server';
import { OperacionesChartsDynamic } from './components/OperacionesChartsDynamic';

export default async function OperacionesTabContent() {
  const data = await getOperationsChartData();

  return <OperacionesChartsDynamic data={data} />;
}
```

Reemplazar por:

```typescript
import { getOperationsChartData } from './actions/actions.server';
import { getPreparteKpiData } from './actions/preparte-kpi.server';
import { OperacionesChartsDynamic } from './components/OperacionesChartsDynamic';
import { OrderManagementDynamic } from './components/OrderManagementDynamic';

export default async function OperacionesTabContent() {
  const [chartData, preparteKpiData] = await Promise.all([
    getOperationsChartData(),
    getPreparteKpiData(),
  ]);

  return (
    <div className="space-y-3">
      <OperacionesChartsDynamic data={chartData} />
      <OrderManagementDynamic data={preparteKpiData} />
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```
feat: integrate order management KPIs into operaciones tab
```

---

## Task 6: Actualizar Skeleton de Operaciones

**Files:**

- Modify: `src/features/Dashboard/Estadisticas/Operaciones/fallback/OperacionesChartsSkeleton.tsx`

- [ ] **Step 1: Agregar skeleton de la nueva seccion**

Agregar DESPUES del cierre del `</section>` actual (o al final del skeleton existente), un nuevo skeleton que refleje la estructura del `OrderManagementClient`:

Agregar dentro del `<section>`, despues del skeleton del client ranking chart, ANTES del cierre `</section>`:

```tsx
{
  /* Order management KPI skeleton */
}
<Card className="py-0">
  <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
    <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-4">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-8 w-[160px]" />
        <Skeleton className="h-8 w-[220px]" />
      </div>
    </div>
    <div className="flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
        >
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  </CardHeader>
  <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
    <Skeleton className="h-[280px] w-full" />
  </CardContent>
</Card>;
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```
feat: update operaciones skeleton with order management section
```

---

## Task 7: Fix exportacion de imagen — ServicesDetailDialog

**Files:**

- Modify: `src/features/Dashboard/Principal/components/ServicesDetailDialog.tsx`

- [ ] **Step 1: Incluir titulo y descripcion dentro del area capturable**

El `captureRef` actual (linea 150) contiene solo la fecha y la tabla. Agregar el titulo y descripcion DENTRO del `captureRef`, justo antes del div de fecha existente:

```tsx
{
  /* Capturable content — this div is what gets exported as image */
}
<div ref={captureRef}>
  {/* Title + description for the image export */}
  <div className="mb-2">
    <h3 className="text-lg font-semibold">Detalle de servicios por cliente</h3>
    <p className="text-sm text-muted-foreground">
      Distribucion detallada de servicios mensuales y adicionales por cliente
    </p>
  </div>

  {/* Date header for the image export (already exists) */}
  <div className="mb-3 text-sm font-medium text-muted-foreground">
    Fecha: {moment(selectedDate).locale('es').format('DD [de] MMMM [de] YYYY')}
  </div>

  {/* ... rest of table stays the same ... */}
</div>;
```

Los textos se duplican (uno en `DialogHeader` para el dialog, otro dentro del `captureRef` para la imagen), pero eso es intencional ya que `DialogHeader` queda fuera del area capturada.

- [ ] **Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev` y navegar a `/dashboard`, abrir el modal "Ver detalle" de servicios, hacer click en "Descargar imagen" y verificar que la imagen PNG incluye titulo + descripcion + fecha + tabla.

- [ ] **Step 4: Commit**

```
fix: include title and description in services detail export image
```

---

## Verificacion Final

- [ ] **Step 1:** Run `npm run check-types` — verificar que no hay errores de tipos
- [ ] **Step 2:** Run `npm run dev` — navegar a `/dashboard?tab=estadisticas&subtab=operaciones` y verificar:
  - Los graficos existentes ("Historico de servicios" + "Servicios por cliente") se ven igual
  - Debajo aparece "Gestion de Pedidos — Sala de Control" con stats clickeables, filtro de cliente, y grafico de lineas
  - Los stats se actualizan al cambiar mes/granularidad/filtro de cliente
  - Clickear un stat filtra las lineas del grafico
- [ ] **Step 3:** Navegar al dashboard principal, abrir "Ver detalle" de servicios, descargar imagen y verificar que incluye titulo + descripcion
