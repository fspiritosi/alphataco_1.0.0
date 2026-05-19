# Dashboard Diagram Links — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each legend item in the dashboard "Novedades cargadas" chart a clickable link that opens the employee diagrams page with pre-applied filters via URL params.

**Architecture:** Add `diagram_type_id` to `getDiagramIndicators` return type. Convert legend items to `<Link target="_blank">` with `diagOld_` namespaced params. Refactor `EmployesDiagramWrapper` to read URL params (with `diagOld_` prefix), sync filters to URL via `router.replace`, and auto-execute search when URL filters are present. Create a `useDiagramUrlFilters` hook for the URL ↔ state sync logic.

**Tech Stack:** Next.js (App Router), React 19, `useSearchParams`, `useRouter`, Prisma, moment.js

**Spec:** `docs/superpowers/specs/2026-03-29-dashboard-diagram-links-design.md`

---

### Task 1: Add `diagram_type_id` to `getDiagramIndicators` return

**Files:**

- Modify: `src/features/Dashboard/Principal/actions/actions.server.ts:42-46` (interface) + `:330-365` (function)

- [ ] **Step 1: Update the `DiagramIndicatorResult` interface**

In `src/features/Dashboard/Principal/actions/actions.server.ts`, add `diagram_type_id` to the interface:

```typescript
export interface DiagramIndicatorResult {
  diagram_type_id: string;
  diagram_type_name: string;
  diagram_type_color: string;
  cantidad_empleados: number;
}
```

- [ ] **Step 2: Update the typeMap to store the diagram_type key**

In the same file, in `getDiagramIndicators`, the `typeMap` already uses the `diagram_type` UUID as key (`const key = d.diagram_type ?? 'unknown'`). Update the result mapping to include it:

```typescript
const result: DiagramIndicatorResult[] = Array.from(typeMap.entries()).map(([key, t]) => ({
  diagram_type_id: key,
  diagram_type_name: t.name,
  diagram_type_color: t.color,
  cantidad_empleados: t.employees.size,
}));
```

Note: changed `typeMap.values()` to `typeMap.entries()` to capture the key.

- [ ] **Step 3: Update the "Sin diagrama" entry to use `__none__` as ID**

In the same function, update the synthetic entry:

```typescript
if (sinDiagrama > 0) {
  result.push({
    diagram_type_id: '__none__',
    diagram_type_name: 'Sin diagrama',
    diagram_type_color: '#999999',
    cantidad_empleados: sinDiagrama,
  });
}
```

- [ ] **Step 4: Run check-types**

Run: `npm run check-types`
Expected: PASS (the new field is additive; consumers may show warnings if they destructure — fix in next tasks)

---

### Task 2: Convert legend items to links in `RrhhSectionClient`

**Files:**

- Modify: `src/features/Dashboard/Principal/components/RrhhSectionClient.tsx`
- Modify: `src/features/Dashboard/Principal/components/RrhhSection.tsx`

- [ ] **Step 1: Pass `positionIds` through chartData**

In `RrhhSectionClient.tsx`, update the `useMemo` that builds `chartData` to include `id` from `diagramData`:

```typescript
const { chartConfig, chartData } = React.useMemo(() => {
  const config: ChartConfig = { empleados: { label: 'Novedades' } };
  const data = diagramData.map((d) => {
    config[d.diagram_type_name] = {
      label: d.diagram_type_name,
      color: d.diagram_type_color,
    };
    return {
      id: d.diagram_type_id,
      name: d.diagram_type_name,
      value: d.cantidad_empleados,
      fill: d.diagram_type_color,
    };
  });
  return { chartConfig: config, chartData: data };
}, [diagramData]);
```

- [ ] **Step 2: Build the link URL helper**

Add a helper function inside `RrhhSectionClient` (before the return), that builds the URL with `diagOld_` namespace:

```typescript
const buildDiagramLink = React.useCallback(
  (diagramTypeId: string) => {
    const params = new URLSearchParams();
    params.set('tab', 'diagrams');
    params.set('subtab', 'old');
    params.set('diagOld_diagramType', diagramTypeId);
    if (positionIds?.length) {
      params.set('diagOld_position', positionIds.join(','));
    }
    return `/dashboard/employee?${params.toString()}`;
  },
  [positionIds]
);
```

- [ ] **Step 3: Replace legend div items with Link components**

Add `import Link from 'next/link';` at the top of the file.

Replace the legend section (lines 131-144) with:

```typescript
<div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 justify-center max-h-[80px] overflow-y-auto">
  {chartData
    .sort((a, b) => b.value - a.value)
    .map((d) => (
      <Link
        key={d.name}
        href={buildDiagramLink(d.id)}
        target="_blank"
        className="flex items-center gap-1.5 text-xs hover:underline hover:opacity-80 transition-opacity"
      >
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
        <span className="truncate max-w-[140px]">{d.name}</span>: {d.value}
      </Link>
    ))}
</div>
```

Key changes:

- Removed `.slice(0, 6)` — all items shown
- Removed the `+N más` span
- Changed `<div>` to `<Link>` with `target="_blank"` and hover styles

- [ ] **Step 4: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

### Task 3: Pass `searchParams` to `EmployesDiagramWrapper`

**Files:**

- Modify: `src/features/Employees/Diagrams/EmployesDiagram.tsx`
- Modify: `src/features/Employees/Diagrams/EmployesDiagramWrapper.tsx` (only the signature — full refactor in Task 4)

- [ ] **Step 1: Pass searchParams to EmployesDiagramWrapper in EmployesDiagram.tsx**

In `src/features/Employees/Diagrams/EmployesDiagram.tsx`, update the `old` tab content to pass `searchParams`:

```typescript
{
  value: 'old',
  label: (
    <span className="flex items-center gap-2">
      <FolderOpen className="h-4 w-4" />
      Diagramas Cargados
    </span>
  ),
  moduleSlug: 'empleados',
  tabSlug: 'old',
  content: (
    <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-md" />}>
      <EmployesDiagramWrapper searchParams={searchParams} />
    </Suspense>
  ),
},
```

- [ ] **Step 2: Update EmployesDiagramWrapper signature to accept searchParams**

In `src/features/Employees/Diagrams/EmployesDiagramWrapper.tsx`, update the component signature. Only change the signature for now — the full URL sync logic comes in Task 4:

```typescript
export default function EmployesDiagramWrapper({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
```

- [ ] **Step 3: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

### Task 4: Create `useDiagramUrlFilters` hook

**Files:**

- Create: `src/features/Employees/Diagrams/hooks/useDiagramUrlFilters.ts`

- [ ] **Step 1: Create the hook file**

Create `src/features/Employees/Diagrams/hooks/useDiagramUrlFilters.ts`:

```typescript
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useRef } from 'react';

const NAMESPACE = 'diagOld_';

// Keys that are arrays (comma-separated in URL)
const ARRAY_KEYS = [
  'position',
  'workflow',
  'costCenter',
  'covenant',
  'guild',
  'category',
  'contractor',
  'diagramType',
] as const;

// Keys that are plain strings
const STRING_KEYS = ['firstname', 'lastname'] as const;

type ArrayKey = (typeof ARRAY_KEYS)[number];
type StringKey = (typeof STRING_KEYS)[number];

export type DiagramFilterState = {
  [K in StringKey]: string;
} & {
  [K in ArrayKey]: string[];
};

const DEFAULT_FILTERS: DiagramFilterState = {
  firstname: '',
  lastname: '',
  position: [],
  workflow: [],
  costCenter: [],
  covenant: [],
  guild: [],
  category: [],
  contractor: [],
  diagramType: [],
};

/**
 * Reads `diagOld_*` params from the server-provided searchParams (initial mount).
 */
function parseInitialFilters(serverParams: Record<string, string | string[] | undefined>): {
  filters: DiagramFilterState;
  hasUrlFilters: boolean;
} {
  const filters = { ...DEFAULT_FILTERS };
  let hasAny = false;

  for (const key of STRING_KEYS) {
    const raw = serverParams[`${NAMESPACE}${key}`];
    if (typeof raw === 'string' && raw.trim()) {
      filters[key] = raw.trim();
      hasAny = true;
    }
  }

  for (const key of ARRAY_KEYS) {
    const raw = serverParams[`${NAMESPACE}${key}`];
    if (typeof raw === 'string' && raw.trim()) {
      filters[key] = raw.split(',').filter(Boolean);
      hasAny = true;
    }
  }

  return { filters, hasUrlFilters: hasAny };
}

/**
 * Hook that syncs diagram filter state with URL params using `diagOld_` namespace.
 *
 * - On mount: parses server searchParams for initial filters.
 * - `syncToUrl(filters)`: writes current filters to URL via `router.replace`.
 * - `clearUrl()`: removes all `diagOld_*` params from URL.
 * - `hasUrlFilters`: whether there were filters in the URL at mount time (for auto-submit).
 */
export function useDiagramUrlFilters(serverSearchParams: Record<string, string | string[] | undefined>) {
  const router = useRouter();
  const pathname = usePathname();
  const clientSearchParams = useSearchParams();

  // Parse initial filters ONCE from server params
  const initial = useMemo(() => parseInitialFilters(serverSearchParams), [serverSearchParams]);
  const hasUrlFiltersRef = useRef(initial.hasUrlFilters);

  const syncToUrl = useCallback(
    (filters: DiagramFilterState) => {
      const params = new URLSearchParams(clientSearchParams.toString());

      // Remove all existing diagOld_ params first
      const keysToRemove: string[] = [];
      params.forEach((_val, key) => {
        if (key.startsWith(NAMESPACE)) keysToRemove.push(key);
      });
      keysToRemove.forEach((k) => params.delete(k));

      // Write current filters
      for (const key of STRING_KEYS) {
        if (filters[key].trim()) {
          params.set(`${NAMESPACE}${key}`, filters[key].trim());
        }
      }
      for (const key of ARRAY_KEYS) {
        if (filters[key].length > 0) {
          params.set(`${NAMESPACE}${key}`, filters[key].join(','));
        }
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [clientSearchParams, pathname, router]
  );

  const clearUrl = useCallback(() => {
    const params = new URLSearchParams(clientSearchParams.toString());
    const keysToRemove: string[] = [];
    params.forEach((_val, key) => {
      if (key.startsWith(NAMESPACE)) keysToRemove.push(key);
    });
    keysToRemove.forEach((k) => params.delete(k));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [clientSearchParams, pathname, router]);

  return {
    initialFilters: initial.filters,
    hasUrlFilters: hasUrlFiltersRef.current,
    syncToUrl,
    clearUrl,
    DEFAULT_FILTERS,
  };
}
```

- [ ] **Step 2: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

### Task 5: Refactor `EmployesDiagramWrapper` to use URL filters

**Files:**

- Modify: `src/features/Employees/Diagrams/EmployesDiagramWrapper.tsx`

- [ ] **Step 1: Replace filter state with the URL hook**

Replace the entire component. Key changes:

1. Import and use `useDiagramUrlFilters` hook
2. Initialize `filters` with `initialFilters` from the hook (instead of `defaultFilters`)
3. Auto-submit on mount when `hasUrlFilters` is true
4. On manual submit: call `syncToUrl(filters)` before executing search
5. On clear: call `clearUrl()` and reset filters
6. Map filter keys: the old `FilterState` uses `'contractor_employee.contractor_id'` but the URL hook uses `'contractor'` — map internally

Full replacement for `src/features/Employees/Diagrams/EmployesDiagramWrapper.tsx`:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Logger } from '@/lib/logger';
import InfoComponent from '@/shared/components/common/InfoComponent';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import DiagramEmployeeViewCOPI from './DiagramEmployeeViewCOPI';
import {
  getDiagramFilterOptions,
  searchEmployeeDiagrams,
  type CategoryFilterOption,
  type DiagramEmployee,
} from './actions/diagram-search-actions';
import { useDiagramUrlFilters, type DiagramFilterState } from './hooks/useDiagramUrlFilters';

const logger = new Logger('Diagrams/EmployesDiagramWrapper');

const PAGE_SIZE = 100;

export default function EmployesDiagramWrapper({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { initialFilters, hasUrlFilters, syncToUrl, clearUrl, DEFAULT_FILTERS } =
    useDiagramUrlFilters(searchParams);

  const [filters, setFilters] = useState<DiagramFilterState>(initialFilters);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Accumulated employees across pages for "load more" behaviour
  const [accumulatedEmployees, setAccumulatedEmployees] = useState<DiagramEmployee[]>([]);
  const [lastSyncedPage, setLastSyncedPage] = useState<number>(0);

  // The committed search params sent to the server (only updated on submit)
  const [committedFilters, setCommittedFilters] = useState<DiagramFilterState | null>(
    hasUrlFilters ? initialFilters : null
  );

  // ── Auto-submit when URL filters are present ─────────────────────────────
  const autoSubmitDone = useRef(false);
  useEffect(() => {
    if (hasUrlFilters && !autoSubmitDone.current) {
      autoSubmitDone.current = true;
      setHasSearched(true);
      // committedFilters is already set to initialFilters above
    }
  }, [hasUrlFilters]);

  // ── Search query ──────────────────────────────────────────────────────────
  const {
    data: searchResult,
    isLoading: isSearching,
    isFetching,
  } = useQuery({
    queryKey: ['diagram-search', committedFilters, currentPage],
    queryFn: async () => {
      if (!committedFilters) return null;
      logger.debug('Fetching diagram search results', { data: { page: currentPage } });
      return searchEmployeeDiagrams({
        firstname: committedFilters.firstname,
        lastname: committedFilters.lastname,
        positions: committedFilters.position,
        workflows: committedFilters.workflow,
        costCenters: committedFilters.costCenter,
        covenants: committedFilters.covenant,
        guilds: committedFilters.guild,
        categories: committedFilters.category,
        contractors: committedFilters.contractor,
        diagramTypes: committedFilters.diagramType,
        page: currentPage,
        pageSize: PAGE_SIZE,
      });
    },
    enabled: !!committedFilters,
    staleTime: 0,
  });

  // Sync accumulated employees when a new page result arrives
  if (searchResult && currentPage !== lastSyncedPage && !isFetching) {
    setLastSyncedPage(currentPage);
    if (currentPage === 1) {
      setAccumulatedEmployees(searchResult.data);
    } else {
      setAccumulatedEmployees((prev) => [...prev, ...searchResult.data]);
    }
  }

  const isLoadingFirstPage = isSearching && currentPage === 1;
  const isLoadingMore = isFetching && currentPage > 1;
  const hasMoreData = searchResult?.hasMore ?? false;

  // ── Filter option queries (each catalog loads independently) ──────────────
  const { data: positions } = useQuery({
    queryKey: ['diagram-filter', 'positions'],
    queryFn: () => getDiagramFilterOptions('positions'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: workflows } = useQuery({
    queryKey: ['diagram-filter', 'workflows'],
    queryFn: () => getDiagramFilterOptions('workflows'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: costCenters } = useQuery({
    queryKey: ['diagram-filter', 'costCenters'],
    queryFn: () => getDiagramFilterOptions('costCenters'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: covenants } = useQuery({
    queryKey: ['diagram-filter', 'covenants'],
    queryFn: () => getDiagramFilterOptions('covenants'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: guilds } = useQuery({
    queryKey: ['diagram-filter', 'guilds'],
    queryFn: () => getDiagramFilterOptions('guilds'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories } = useQuery({
    queryKey: ['diagram-filter', 'categories'],
    queryFn: () => getDiagramFilterOptions('categories'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: contractors } = useQuery({
    queryKey: ['diagram-filter', 'contractors'],
    queryFn: () => getDiagramFilterOptions('contractors'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: diagramTypes } = useQuery({
    queryKey: ['diagram-filter', 'diagramTypes'],
    queryFn: () => getDiagramFilterOptions('diagramTypes'),
    staleTime: 5 * 60 * 1000,
  });

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleFilterChange = (name: 'firstname' | 'lastname', value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiFilterChange = (
    name: Exclude<keyof DiagramFilterState, 'firstname' | 'lastname'>,
    values: string[]
  ) => {
    setFilters((prev) => ({ ...prev, [name]: values }));
  };

  const clearFilter = (name: keyof DiagramFilterState) => {
    if (name === 'firstname' || name === 'lastname') {
      setFilters((prev) => ({ ...prev, [name]: '' }));
    } else {
      setFilters((prev) => ({ ...prev, [name]: [] }));
    }
  };

  // ── Form submit ───────────────────────────────────────────────────────────
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    logger.debug('Submitting diagram search', { data: { filters } });
    setHasSearched(true);
    setCurrentPage(1);
    setLastSyncedPage(0);
    setAccumulatedEmployees([]);
    setCommittedFilters({ ...filters });
    syncToUrl(filters);
  };

  // ── Clear all filters ─────────────────────────────────────────────────────
  const handleClearAll = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setHasSearched(false);
    setCurrentPage(1);
    setLastSyncedPage(0);
    setAccumulatedEmployees([]);
    setCommittedFilters(null);
    clearUrl();
  };

  // ── Load more ─────────────────────────────────────────────────────────────
  const handleLoadMore = () => {
    if (isLoadingMore || !hasMoreData) return;
    setCurrentPage((prev) => prev + 1);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Buscador de diagramas de empleados</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Filtro por nombre y apellido */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="firstname">Nombre</Label>
                  <div className="relative">
                    <Input
                      id="firstname"
                      placeholder="Buscar por nombre"
                      value={filters.firstname}
                      onChange={(e) => handleFilterChange('firstname', e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    {filters.firstname && (
                      <button
                        type="button"
                        onClick={() => clearFilter('firstname')}
                        className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-black text-red-500"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="lastname">Apellido</Label>
                  <div className="relative">
                    <Input
                      id="lastname"
                      placeholder="Buscar por apellido"
                      value={filters.lastname}
                      onChange={(e) => handleFilterChange('lastname', e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    {filters.lastname && (
                      <button
                        type="button"
                        onClick={() => clearFilter('lastname')}
                        className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-black text-red-500"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filtro por puesto en la empresa */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Puesto en la empresa</Label>
                  {filters.position.length > 0 && (
                    <button type="button" onClick={() => clearFilter('position')} className="text-muted-foreground hover:text-black text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={(positions ?? []).map((p) => ({ label: p.name || 'Sin nombre', value: p.id }))}
                  placeholder="Seleccionar puestos"
                  emptyMessage="No hay puestos"
                  selectedValues={filters.position}
                  onChange={(values) => handleMultiFilterChange('position', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por diagrama de trabajo */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Diagrama de trabajo</Label>
                  {filters.workflow.length > 0 && (
                    <button type="button" onClick={() => clearFilter('workflow')} className="text-muted-foreground hover:text-black text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={(workflows ?? []).map((w) => ({ label: w.name || 'Sin nombre', value: w.id }))}
                  placeholder="Seleccionar diagramas"
                  emptyMessage="No hay diagramas"
                  selectedValues={filters.workflow}
                  onChange={(values) => handleMultiFilterChange('workflow', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por centro de costos */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Centro de costos</Label>
                  {filters.costCenter.length > 0 && (
                    <button type="button" onClick={() => clearFilter('costCenter')} className="text-muted-foreground hover:text-black text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={(costCenters ?? []).map((cc) => ({ label: cc.name || 'Sin nombre', value: cc.id }))}
                  placeholder="Seleccionar centros de costos"
                  emptyMessage="No hay centros de costos"
                  selectedValues={filters.costCenter}
                  onChange={(values) => handleMultiFilterChange('costCenter', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por convenio */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Convenio</Label>
                  {filters.covenant.length > 0 && (
                    <button type="button" onClick={() => clearFilter('covenant')} className="text-muted-foreground hover:text-black text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={(covenants ?? []).map((c) => ({ label: c.name || 'Sin nombre', value: c.id }))}
                  placeholder="Seleccionar convenios"
                  emptyMessage="No hay convenios"
                  selectedValues={filters.covenant}
                  onChange={(values) => handleMultiFilterChange('covenant', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por gremio */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Gremio</Label>
                  {filters.guild.length > 0 && (
                    <button type="button" onClick={() => clearFilter('guild')} className="text-muted-foreground hover:text-black text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={(guilds ?? []).map((g) => ({ label: g.name || 'Sin nombre', value: g.id }))}
                  placeholder="Seleccionar gremios"
                  emptyMessage="No hay gremios"
                  selectedValues={filters.guild}
                  onChange={(values) => handleMultiFilterChange('guild', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por categoría */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Categoría</Label>
                  {filters.category.length > 0 && (
                    <button type="button" onClick={() => clearFilter('category')} className="text-muted-foreground hover:text-black text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={((categories as CategoryFilterOption[] | undefined) ?? []).map((cat) => ({
                    label: cat.name
                      ? `${cat.name}${cat.covenant?.name ? ' - ' + cat.covenant.name : ''}`
                      : 'Sin nombre',
                    value: cat.id,
                  }))}
                  placeholder="Seleccionar categorías"
                  emptyMessage="No hay categorías"
                  selectedValues={filters.category}
                  onChange={(values) => handleMultiFilterChange('category', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por contratista */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Contratista</Label>
                  {filters.contractor.length > 0 && (
                    <button type="button" onClick={() => clearFilter('contractor')} className="text-muted-foreground hover:text-black text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={(contractors ?? []).map((c) => ({ label: c.name || 'Sin nombre', value: c.id }))}
                  placeholder="Seleccionar contratistas"
                  emptyMessage="No hay contratistas"
                  selectedValues={filters.contractor}
                  onChange={(values) => handleMultiFilterChange('contractor', values)}
                  showSelectAll
                />
              </div>

              {/* Filtro por tipos de diagrama */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Tipo de Diagrama</Label>
                  {filters.diagramType.length > 0 && (
                    <button type="button" onClick={() => clearFilter('diagramType')} className="text-muted-foreground hover:text-black text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <MultiSelectCombobox
                  options={[
                    { label: 'Sin diagramas asignados', value: '__none__' },
                    ...(diagramTypes ?? []).map((t) => ({
                      label: t.name || 'Sin nombre',
                      value: t.id,
                    })),
                  ]}
                  placeholder="Seleccionar tipos de diagrama"
                  emptyMessage="No hay tipos de diagrama"
                  selectedValues={filters.diagramType}
                  onChange={(values) => handleMultiFilterChange('diagramType', values)}
                  showSelectAll
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              {hasSearched && (
                <Button type="button" variant="outline" onClick={handleClearAll}>
                  Limpiar filtros
                </Button>
              )}
              <Button type="submit" disabled={isSearching}>
                {isSearching ? 'Buscando...' : 'Buscar diagramas'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoadingFirstPage ? (
        <div className="flex justify-center items-center p-10">
          <p className="text-lg">Buscando diagramas de empleados...</p>
        </div>
      ) : accumulatedEmployees.length > 0 ? (
        <>
          {hasMoreData && (
            <div className="flex justify-center mb-2">
              <InfoComponent
                size="sm"
                message="Hay más registros disponibles. Al final de la página encontrará la opción para cargar más datos."
              />
            </div>
          )}

          <DiagramEmployeeViewCOPI employeesData={accumulatedEmployees} />

          {hasMoreData && (
            <div className="flex justify-center mt-4 mb-8">
              <Button onClick={handleLoadMore} disabled={isLoadingMore} variant="outline" className="px-8">
                {isLoadingMore ? 'Cargando más empleados...' : 'Cargar más empleados'}
              </Button>
            </div>
          )}
        </>
      ) : hasSearched && accumulatedEmployees.length === 0 ? (
        <div className="p-6 rounded-lg border text-center">
          <p>No se encontraron diagramas para los empleados seleccionados.</p>
        </div>
      ) : (
        <div className="p-6 rounded-lg border text-center">
          <p>Para mostrar diagramas debe aplicar al menos un filtro.</p>
        </div>
      )}
    </div>
  );
}
```

Key changes from original:

- Uses `useDiagramUrlFilters` hook for initial state and URL sync
- Renamed `searchParams` state to `committedFilters` to avoid collision with the prop
- Renamed `'contractor_employee.contractor_id'` filter key to `'contractor'` (cleaner URL param)
- Changed `'sin_diagrama'` to `'__none__'` for consistency with dashboard link
- Added `handleClearAll` function that resets both state and URL
- Auto-submit via `useEffect` when `hasUrlFilters` is true
- Removed `activeFilters` state tracking (was unused for the actual search logic)
- Added "Limpiar filtros" button visible when `hasSearched` is true

- [ ] **Step 2: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

### Task 6: Update `searchEmployeeDiagrams` to handle `__none__` value

**Files:**

- Modify: `src/features/Employees/Diagrams/actions/diagram-search-actions.ts`

- [ ] **Step 1: Replace `sin_diagrama` with `__none__` in the diagram type filter**

In `src/features/Employees/Diagrams/actions/diagram-search-actions.ts`, update lines 68-84:

```typescript
// Diagram type filter
if (params.diagramTypes?.length) {
  const hasNoDiagram = params.diagramTypes.includes('__none__');
  const actualTypes = params.diagramTypes.filter((t) => t !== '__none__');

  if (hasNoDiagram && actualTypes.length === 0) {
    where.employees_diagram = { none: {} };
  } else if (hasNoDiagram && actualTypes.length > 0) {
    where.OR = [
      { employees_diagram: { none: {} } },
      { employees_diagram: { some: { diagram_type: { in: actualTypes } } } },
    ];
  } else {
    where.employees_diagram = {
      some: { diagram_type: { in: actualTypes } },
    };
  }
}
```

This is a minimal change: `'sin_diagrama'` → `'__none__'` (2 occurrences).

- [ ] **Step 2: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

### Task 7: Final verification

**Files:** All modified files

- [ ] **Step 1: Run full type check**

Run: `npm run check-types`
Expected: PASS with zero errors

- [ ] **Step 2: Verify the complete data flow manually**

Trace the flow:

1. Dashboard: `getDiagramIndicators()` returns items with `diagram_type_id`
2. `RrhhSectionClient` builds link: `/dashboard/employee?tab=diagrams&subtab=old&diagOld_diagramType=UUID&diagOld_position=POS1,POS2`
3. `employee/page.tsx` resolves searchParams, passes to `EmployesDiagram`
4. `EmployesDiagram` passes searchParams to `EmployesDiagramWrapper`
5. `useDiagramUrlFilters` parses `diagOld_*` params, sets `hasUrlFilters=true`
6. `EmployesDiagramWrapper` auto-submits with those filters
7. `searchEmployeeDiagrams` handles `__none__` correctly

- [ ] **Step 3: Verify no Supabase direct usage remains in the flow**

Run: `grep -r "supabaseBrowser\|supabaseServer\|supabase\." src/features/Employees/Diagrams/actions/diagram-search-actions.ts`
Expected: No matches (already uses Prisma)

Run: `grep -r "supabaseBrowser\|supabaseServer" src/features/Employees/Diagrams/EmployesDiagramWrapper.tsx`
Expected: No matches

Note: `DiagramEmployeeViewCOPI` uses Supabase realtime (`postgres_changes`) — this is expected and stays as-is per spec.
