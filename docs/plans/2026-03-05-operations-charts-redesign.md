# Operations Charts Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redisenar los graficos de operaciones migrando a Prisma, agregando filtro multi-select por cliente y distinguiendo servicios mensuales vs adicionales con barras/areas stacked.

**Architecture:** Server Component hace fetch Prisma pre-agregado (90 dias), pasa datos al Client Component via dynamic import (ssr: false). El cliente filtra por rango temporal y clientes seleccionados en un solo loop useMemo, renderiza 2 graficos recharts (AreaChart + BarChart) con series stacked por tipo de servicio.

**Tech Stack:** Next.js 16, Prisma, Recharts, shadcn/ui (Chart, Select, MultiSelectCombobox), Tailwind CSS

---

## Contexto Clave (para el implementador)

### Archivos que se modifican/eliminan

- `src/features/Dashboard/Estadisticas/Operaciones/OperacionesTabContent.tsx` — MODIFICAR
- `src/features/Dashboard/Estadisticas/Operaciones/Components/ServicesHistory.tsx` — ELIMINAR
- `src/features/Dashboard/Estadisticas/Operaciones/Components/BarServiceHistory.tsx` — ELIMINAR

### Archivos de referencia (leer antes de empezar)

- `src/features/Dashboard/Estadisticas/EstadisticasTabComponent.tsx` — El padre ya envuelve en `<Suspense>` (linea 38)
- `src/components/ui/multi-select-combobox.tsx` — Componente existente para multi-select
- `src/shared/actions/company.actions.ts` — `getServerCompanyId()` para obtener company_id
- `prisma/schema.prisma:1048-1143` — Modelos `dailyreport` y `dailyreportrows`
- Enum `daily_report_type_enum`: `mensual`, `adicional`, `adicional_permanente` (schema:3101)

### Patron de imports del proyecto

```typescript
import { prisma } from '@/shared/lib/prisma';
import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
```

### Componentes de charts (shadcn)

```typescript
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
```

---

## Task 1: Server Action — Prisma query pre-agregada

**Files:**

- Create: `src/features/Dashboard/Estadisticas/Operaciones/actions/actions.server.ts`

**Step 1: Create the server action file**

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
  const since = moment().subtract(90, 'days').format('YYYY-MM-DD');

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
    const customerMap = new Map<string, string>(); // id -> name

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
      } else {
        // 'adicional', 'adicional_permanente', or null -> count as adicional
        entry.adicional += 1;
      }
    }

    // Transform to array
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

    // Sort by date
    aggregatedRows.sort((a, b) => a.date.localeCompare(b.date));

    // Unique customer list sorted by name
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

**Step 2: Verify types compile**

Run: `npm run check-types`
Expected: No errors related to `actions.server.ts`

**Step 3: Commit**

```
feat: add Prisma server action for operations chart data
```

---

## Task 2: Skeleton fallback

**Files:**

- Create: `src/features/Dashboard/Estadisticas/Operaciones/fallback/OperacionesChartsSkeleton.tsx`

**Step 1: Create the skeleton component**

```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function OperacionesChartsSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-3 mb-4">
      {/* Controls skeleton */}
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-[200px]" />
            <Skeleton className="h-9 w-[160px]" />
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    </section>
  );
}
```

**Step 2: Commit**

```
feat: add skeleton fallback for operations charts
```

---

## Task 3: AreaChart component — stacked mensual/adicional

**Files:**

- Create: `src/features/Dashboard/Estadisticas/Operaciones/components/ServiceHistoryAreaChart.tsx`

**Step 1: Create the area chart**

This component receives pre-processed chart data and renders a stacked AreaChart. Each customer has 2 areas: `{slug}-mensual` (solid) and `{slug}-adicional` (semi-transparent). Uses `stackId="a"` so all areas stack together.

Key recharts pattern (from shadcn chart-area-stacked):

```typescript
<Area
  dataKey="{slug}-mensual"
  type="natural"
  fill="url(#fill-{slug}-mensual)"     // linearGradient
  stroke="var(--color-{slug}-mensual)"
  stackId="a"
/>
<Area
  dataKey="{slug}-adicional"
  type="natural"
  fill="url(#fill-{slug}-adicional)"
  stroke="var(--color-{slug}-adicional)"
  fillOpacity={0.3}                     // lower opacity for adicional
  stackId="a"
/>
```

Props interface:

```typescript
interface ServiceHistoryAreaChartProps {
  chartData: Record<string, string | number>[];
  seriesKeys: { key: string; type: 'mensual' | 'adicional' }[];
  chartConfig: ChartConfig;
  rangeLabel: string;
}
```

Wrapped in `<Card>` with `<CardHeader>` showing title "Historico de servicios por cliente" and description with `rangeLabel`.

Uses `<ChartLegend content={<ChartLegendContent />} />` and `<ChartTooltip content={<ChartTooltipContent indicator="dot" />} />`.

**Step 2: Commit**

```
feat: add ServiceHistoryAreaChart with stacked mensual/adicional
```

---

## Task 4: BarChart component — stacked mensual/adicional

**Files:**

- Create: `src/features/Dashboard/Estadisticas/Operaciones/components/ServiceHistoryBarChart.tsx`

**Step 1: Create the bar chart**

Same pattern as Task 3 but using `<BarChart>` with `<Bar>` elements. Each customer has 2 bars stacked:

```typescript
<Bar dataKey="{slug}-mensual" stackId="a" fill="var(--color-{slug}-mensual)" radius={[0, 0, 4, 4]} />
<Bar dataKey="{slug}-adicional" stackId="a" fill="var(--color-{slug}-adicional)" radius={[4, 4, 0, 0]} opacity={0.5} />
```

Bottom radius on mensual (bottom of stack), top radius on adicional (top of stack).

Props interface identical to AreaChart (same `ServiceHistoryBarChartProps`).

Title: "Historico de servicios por cliente (Barras)"

**Step 2: Commit**

```
feat: add ServiceHistoryBarChart with stacked mensual/adicional
```

---

## Task 5: Client Component — controles + logica + graficos

**Files:**

- Create: `src/features/Dashboard/Estadisticas/Operaciones/components/OperacionesChartsClient.tsx`

**Step 1: Create the client component**

```typescript
'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import type { OperationsChartData } from '../actions/actions.server';
import type { ChartConfig } from '@/components/ui/chart';
import { ServiceHistoryAreaChart } from './ServiceHistoryAreaChart';
import { ServiceHistoryBarChart } from './ServiceHistoryBarChart';
```

**State:**

- `timeRange`: `'7d' | '30d' | '90d'` — default `'30d'`
- `selectedCustomerIds`: `string[]` — default `[]` (empty = all)

**Main useMemo logic (one single loop):**

1. Compute `startDateStr` from `timeRange` relative to max date in data
2. Compute `grouping`: `'day'` (7d), `'week'` (30d), `'biweek'` (90d)
3. Build `customerFilter` Set from `selectedCustomerIds` (null if empty = show all)
4. Single loop over `data.rows`:
   - Skip if `row.date < startDateStr`
   - Skip if `customerFilter && !customerFilter.has(row.customerId)`
   - Compute `bucketKey` via `getBucketKey(row.date, grouping)` helper
   - Accumulate `mensual` and `adicional` per customer per bucket
5. Compute totals per customer, sort by total descending
6. Slugify customer names for CSS-safe keys
7. Build `chartConfig` dynamically: `{slug}-mensual` gets `var(--chart-N)`, `{slug}-adicional` gets same color
8. Build `chartData` array for Recharts: `[{ label, '{slug}-mensual': N, '{slug}-adicional': N, ... }]`
9. Build `seriesKeys` array: `[{ key: '{slug}-mensual', type: 'mensual' }, { key: '{slug}-adicional', type: 'adicional' }]`

**Helper function `getBucketKey`** extracted as pure function outside component:

- `'day'` → `day-YYYY-MM-DD` + label `DD mmm`
- `'week'` → `week-YYYY-MM-DD` (monday) + label `DD mmm - DD mmm`
- `'biweek'` → `biweek-YYYY-MM-DD-H` + label `1-15 mmm` / `16-28 mmm`

Returns `{ key: string; label: string }`.

**Render layout:**

```tsx
<section className="grid grid-cols-1 gap-3 mb-4">
  {/* Shared controls bar */}
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
    <MultiSelectCombobox
      options={data.customers.map((c) => ({ label: c.name, value: c.id }))}
      placeholder="Filtrar por cliente"
      emptyMessage="No se encontraron clientes"
      selectedValues={selectedCustomerIds}
      onChange={setSelectedCustomerIds}
      showSelectAll
    />
    <Select value={timeRange} onValueChange={setTimeRange}>
      {/* 90d, 30d, 7d options */}
    </Select>
  </div>
  <ServiceHistoryAreaChart
    chartData={chartData}
    seriesKeys={seriesKeys}
    chartConfig={chartConfig}
    rangeLabel={rangeLabel}
  />
  <ServiceHistoryBarChart
    chartData={chartData}
    seriesKeys={seriesKeys}
    chartConfig={chartConfig}
    rangeLabel={rangeLabel}
  />
</section>
```

**Step 2: Verify types compile**

Run: `npm run check-types`

**Step 3: Commit**

```
feat: add OperacionesChartsClient with multi-select filter and time range
```

---

## Task 6: Wire up Server Component + dynamic import

**Files:**

- Modify: `src/features/Dashboard/Estadisticas/Operaciones/OperacionesTabContent.tsx`

**Step 1: Rewrite OperacionesTabContent**

```typescript
import dynamic from 'next/dynamic';
import { getOperationsChartData } from './actions/actions.server';
import { OperacionesChartsSkeleton } from './fallback/OperacionesChartsSkeleton';

const OperacionesChartsClient = dynamic(
  () => import('./components/OperacionesChartsClient').then((m) => m.OperacionesChartsClient),
  { ssr: false, loading: () => <OperacionesChartsSkeleton /> }
);

export default async function OperacionesTabContent() {
  const data = await getOperationsChartData();

  return <OperacionesChartsClient data={data} />;
}
```

Note: The parent `EstadisticasTabComponent.tsx` (line 38) already wraps this in `<Suspense fallback={<Skeleton />}>`, so the data fetch is non-blocking for the rest of the page.

**Step 2: Verify types compile**

Run: `npm run check-types`

**Step 3: Commit**

```
feat: wire OperacionesTabContent with Prisma + dynamic import
```

---

## Task 7: Cleanup — delete old files

**Files:**

- Delete: `src/features/Dashboard/Estadisticas/Operaciones/Components/ServicesHistory.tsx`
- Delete: `src/features/Dashboard/Estadisticas/Operaciones/Components/BarServiceHistory.tsx`

**Step 1: Delete old components**

Remove both files. The `Components/` folder should be empty after this — delete the folder too.

**Step 2: Verify no broken imports**

Run: `npm run check-types`
Expected: No errors. The only file that imported these was `OperacionesTabContent.tsx` which was rewritten in Task 6.

Also verify `getDailyReportsLatest` is not imported anywhere else for this feature:

- It may still be used by other features — do NOT delete the function from `PartesDiarios/actions/actions.ts`
- Only remove the import from the files we control

**Step 3: Commit**

```
chore: remove old Supabase-based chart components
```

---

## Task 8: Final verification

**Step 1: Type check**

Run: `npm run check-types`
Expected: PASS — zero errors

**Step 2: Visual verification**

Navigate to `/dashboard?tab=estadisticas&subtab=operaciones` and verify:

- [ ] Charts render with data
- [ ] Time range selector works (7d, 30d, 90d) — default 30d
- [ ] Multi-select de clientes funciona (seleccionar uno, varios, todos)
- [ ] Barras/areas distinguen mensual (solido) vs adicional (semi-transparente)
- [ ] Tooltip muestra desglose por tipo
- [ ] Skeleton aparece durante carga
- [ ] No hay errores en consola

**Step 3: Final commit**

```
feat: complete operations charts redesign with Prisma + client filter + service type distinction
```

---

## Summary

| Task | Archivo                                                    | Accion                                 |
| ---- | ---------------------------------------------------------- | -------------------------------------- |
| 1    | `actions/actions.server.ts`                                | CREATE — Prisma query pre-agregada     |
| 2    | `fallback/OperacionesChartsSkeleton.tsx`                   | CREATE — Skeleton                      |
| 3    | `components/ServiceHistoryAreaChart.tsx`                   | CREATE — AreaChart stacked             |
| 4    | `components/ServiceHistoryBarChart.tsx`                    | CREATE — BarChart stacked              |
| 5    | `components/OperacionesChartsClient.tsx`                   | CREATE — Client con controles + logica |
| 6    | `OperacionesTabContent.tsx`                                | MODIFY — dynamic import + nueva action |
| 7    | `Components/ServicesHistory.tsx` + `BarServiceHistory.tsx` | DELETE — old files                     |
| 8    | —                                                          | VERIFY — types + visual                |
