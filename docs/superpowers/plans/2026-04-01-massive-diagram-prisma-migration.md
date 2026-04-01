# Massive Diagram — Prisma Migration & Componentization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the entire `massive_diagram` subtab from Supabase client-side fetching to Prisma server actions, componentize the 1220-line monolith, share types, add file_number (legajo), and eliminate dead code — keeping both RPCs as stored procedures called from server actions.

**Architecture:** 3-layer refactor: (1) shared types file, (2) server actions with Prisma + RPC wrappers via `supabaseServer()`, (3) componentized client with `useQuery` instead of `useEffect`+`supabaseBrowser()`. RPCs `check_diagram_conflicts_with_operations_v2` and `process_massive_diagram_creation_v2` stay as stored procedures because they do bulk transactional operations (potentially 9000+ records) with cycle calculations — but get called server-side instead of from the browser.

**Tech Stack:** Next.js 16, React 19, Prisma ORM, Supabase RPCs (via `supabaseServer()`), React Query (`@tanstack/react-query`), React Hook Form + Zod, shadcn/ui, moment.js, Logger

**Branch:** `diagram-prisma-migration` (from `dev`)

**Key findings from investigation:**

- `DiagramMassiveForm.tsx` is 1220 lines with 8 blocks explicitly marked "copiado de EmployesDiagramWrapper"
- `actions/supabase-query.ts` is marked `'use server'` but uses `supabaseBrowser()` — inconsistency (has 11+ other consumers, so we only stop using it here, don't delete it)
- `diagram-search-actions.ts` already has `searchEmployeeDiagrams` + `getDiagramFilterOptions` with Prisma — we reuse these
- The Prisma schema field for legajo is `file` (NOT `file_number`)
- `employees_diagram` fields `day`/`month`/`year` are `Decimal` — need `Number()` when serializing
- `work_diagram` fields `active_working_days`/`inactive_working_days` are `Decimal?` — same
- `executeCreation()` in DiagramMassiveForm is dead code (never called)
- `getSuccessIcon()` in DiagramMassiveResults is dead code (never called)
- Lines 270-278 in DiagramMassiveForm have a hardcoded debug query with literal UUIDs
- Types `ConflictRecord`, `ConflictData`, `MassiveFormData` are duplicated across 3 files
- `ProcessingResult.data.created/updated` and `errors` are typed as `any[]` despite having interfaces defined in the same file

---

## File Structure

### New files to create

| File                                                                   | Responsibility                                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/features/Employees/Diagrams/types/massive-diagram.ts`             | Shared types for the 3-step wizard (ConflictRecord, ConflictData, MassiveFormData, ProcessingResult, etc.) |
| `src/features/Employees/Diagrams/actions/diagram-massive-actions.ts`   | Server actions: work diagrams, novelties, RPC wrappers for conflicts and creation                          |
| `src/features/Employees/Diagrams/components/EmployeeFilterPanel.tsx`   | Extracted: filter form with multi-selects (was ~400 lines in DiagramMassiveForm)                           |
| `src/features/Employees/Diagrams/components/EmployeeSelectionGrid.tsx` | Extracted: employee card grid with checkboxes + pagination                                                 |
| `src/features/Employees/Diagrams/components/StepIndicator.tsx`         | Extracted: 3-step progress indicator (from DiagramMassive)                                                 |

### Files to modify

| File                                                                | Changes                                                                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/features/Employees/Diagrams/DiagramMassive.tsx`                | Import shared types, extract StepIndicator, remove duplicate interfaces, remove dead handlers                       |
| `src/features/Employees/Diagrams/DiagramMassiveForm.tsx`            | Full rewrite: use server actions + useQuery, import extracted components, add file (legajo), remove supabaseBrowser |
| `src/features/Employees/Diagrams/ConflictResolutionModal.tsx`       | Import shared types, replace supabaseBrowser with server action, fix types                                          |
| `src/features/Employees/Diagrams/DiagramMassiveResults.tsx`         | Import shared types, replace any[] with proper types, remove dead code                                              |
| `src/features/Employees/Diagrams/actions/diagram-search-actions.ts` | Add `file` field to `searchEmployeeDiagrams` select + response                                                      |

### Files NOT to modify (out of scope)

| File                        | Why                                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actions/supabase-query.ts` | Has 11+ consumers in other modules — fixing the `'use server'` + `supabaseBrowser()` inconsistency is a separate task. We simply stop importing it from DiagramMassiveForm. |

---

## Task 1: Create shared types file

**Files:**

- Create: `src/features/Employees/Diagrams/types/massive-diagram.ts`

- [ ] **Step 1: Create the shared types file**

```typescript
// src/features/Employees/Diagrams/types/massive-diagram.ts

// ─── Form Data ──────────────────────────────────────────────────────────────

export interface MassiveFormData {
  employeeIds: string[];
  workDiagramId: string;
  activeNoveltyId?: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}

// ─── Conflict Types ─────────────────────────────────────────────────────────

export interface ConflictRecord {
  employee_id: string;
  employee_name: string;
  day: number;
  month: number;
  year: number;
  date_formatted: string;
  current_diagram_type?: string;
  current_diagram_name?: string;
  current_diagram_color?: string;
  new_diagram_name?: string;
  new_diagram_color?: string;
  is_used_in_operations: boolean;
  operation_details?: string;
  can_update: boolean;
  conflict_type: 'IN_USE' | 'CAN_UPDATE';
}

export interface ConflictCheckResult {
  conflicts: ConflictRecord[];
  work_diagram_id: string;
  active_novelty_id: string;
  inactive_novelty_id: string;
}

export interface ConflictData {
  operationConflicts: ConflictRecord[];
  simpleConflicts: ConflictRecord[];
}

// ─── Processing Result Types ────────────────────────────────────────────────

export interface ProcessingResultRecord {
  employee_id: string;
  employee_name?: string;
  date: string;
  day: number;
  month: number;
  year: number;
  is_active: boolean;
  novelty_name?: string;
  novelty_color?: string;
}

export interface UpdatedResultRecord extends ProcessingResultRecord {
  previous_novelty_name?: string;
  previous_novelty_color?: string;
}

export interface ErrorRecord {
  employee_id: string;
  employee_name: string;
  date: string | null;
  error_type: string;
  error_message: string;
}

export interface ProcessingResult {
  success: boolean;
  summary: {
    total_employees: number;
    processed_employees: number;
    total_days: number;
    processed_days: number;
    created_records: number;
    updated_records: number;
    skipped_records: number;
    errors_count: number | null;
    processing_time_seconds: number;
    start_time: string;
    end_time: string;
  };
  data: {
    created: ProcessingResultRecord[];
    updated: UpdatedResultRecord[];
  };
  details: {
    date_range: { from: string; to: string };
    work_diagram: {
      id: string;
      name: string;
      active_days: number;
      inactive_days: number;
      cycle_length: number;
    };
    active_novelty: { id: string; name: string; color: string };
    inactive_novelty: { id: string; name: string; color: string };
    conflict_resolution: string;
    employee_ids: string[];
  };
  errors: ErrorRecord[];
}
```

- [ ] **Step 2: Run type check**

Run: `npm run check-types`
Expected: PASS (new file, no consumers yet)

- [ ] **Step 3: Commit**

```bash
git add src/features/Employees/Diagrams/types/massive-diagram.ts
git commit -m "refactor: add shared types for massive diagram wizard"
```

---

## Task 2: Create server actions for massive diagram

**Files:**

- Create: `src/features/Employees/Diagrams/actions/diagram-massive-actions.ts`
- Modify: `src/features/Employees/Diagrams/actions/diagram-search-actions.ts` (add `file` field)

- [ ] **Step 1: Add `file` field to `searchEmployeeDiagrams` in `diagram-search-actions.ts`**

In the `select` block of `prisma.employees.findMany` (around line 93), add `file: true` to the select. Then in the `data.map()` (around line 137), add `file: emp.file` to the returned object.

In `diagram-search-actions.ts`, the select currently has:

```typescript
select: {
  id: true,
  firstname: true,
  lastname: true,
  document_number: true,
  // ADD THIS LINE:
  file: true,
  employees_diagram: { ... },
  contractor_employee: { ... },
},
```

And in the map function, add `file` to the output object:

```typescript
return {
  data: data.map((emp) => ({
    value: emp.id,
    label: `${emp.lastname?.charAt(0).toUpperCase()}${emp.lastname?.slice(1)} ${emp.firstname?.charAt(0).toUpperCase()}${emp.firstname?.slice(1)}`,
    file: emp.file, // ADD THIS
    diagrams: emp.employees_diagram.map((d) => { ... }),
    contractor_employee: emp.contractor_employee,
  })),
  ...
};
```

- [ ] **Step 2: Create `diagram-massive-actions.ts`**

```typescript
// src/features/Employees/Diagrams/actions/diagram-massive-actions.ts
'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { prisma } from '@/shared/lib/prisma';

import type { ConflictCheckResult, ProcessingResult } from '../types/massive-diagram';

const logger = new Logger('features/Employees/Diagrams/massive');

// ─── Work Diagrams ──────────────────────────────────────────────────────────

export async function getActiveWorkDiagrams() {
  logger.debug('Fetching active work diagrams');

  try {
    const data = await prisma.work_diagram.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        active_working_days: true,
        inactive_working_days: true,
        inactive_novelty: true,
      },
      orderBy: { name: 'asc' },
    });

    return data.map((wd) => ({
      id: wd.id,
      name: wd.name,
      active_working_days: wd.active_working_days ? Number(wd.active_working_days) : null,
      inactive_working_days: wd.inactive_working_days ? Number(wd.inactive_working_days) : null,
      inactive_novelty: wd.inactive_novelty,
    }));
  } catch (error) {
    logger.error('Error fetching active work diagrams', { data: { error } });
    throw error;
  }
}

export type WorkDiagramItem = Awaited<ReturnType<typeof getActiveWorkDiagrams>>[number];

// ─── Novelties ──────────────────────────────────────────────────────────────

export async function getWorkDiagramNovelties(workDiagramId: string) {
  logger.debug('Fetching novelties for work diagram', { data: { workDiagramId } });

  try {
    const [workDiagram, activeNovelties] = await Promise.all([
      prisma.work_diagram.findUnique({
        where: { id: workDiagramId },
        select: {
          inactive_novelty: true,
          diagram_type: {
            select: { id: true, name: true, color: true },
          },
        },
      }),
      prisma.work_diagram_active_novelties.findMany({
        where: { work_diagram_id: workDiagramId },
        select: {
          diagram_type_id: true,
          diagram_type: {
            select: { id: true, name: true, color: true },
          },
        },
      }),
    ]);

    return {
      inactiveNovelty: workDiagram?.diagram_type ?? null,
      activeNovelties: activeNovelties.map((an) => ({
        diagram_type_id: an.diagram_type_id,
        name: an.diagram_type.name,
        color: an.diagram_type.color,
      })),
    };
  } catch (error) {
    logger.error('Error fetching novelties', { data: { error, workDiagramId } });
    throw error;
  }
}

export type NoveltyData = Awaited<ReturnType<typeof getWorkDiagramNovelties>>;
export type ActiveNoveltyItem = NoveltyData['activeNovelties'][number];

// ─── RPC Wrappers ───────────────────────────────────────────────────────────

export async function checkDiagramConflicts(params: {
  employeeIds: string[];
  workDiagramId: string;
  dateFrom: string;
  dateTo: string;
  activeNoveltyId?: string;
}) {
  logger.debug('Checking diagram conflicts', { data: { params } });

  try {
    const supabase = await supabaseServer();

    const { data, error } = await supabase.rpc('check_diagram_conflicts_with_operations_v2', {
      p_employee_ids: params.employeeIds,
      p_work_diagram_id: params.workDiagramId,
      p_date_from: params.dateFrom,
      p_date_to: params.dateTo,
      p_active_novelty_id: params.activeNoveltyId || '',
    });

    if (error) {
      logger.error('Error checking diagram conflicts', { data: { error } });
      throw error;
    }

    return data as ConflictCheckResult;
  } catch (error) {
    logger.error('Error in checkDiagramConflicts', { data: { error } });
    throw error;
  }
}

export async function processMassiveDiagramCreation(params: {
  employeeIds: string[];
  workDiagramId: string;
  activeNoveltyId: string;
  dateFrom: string;
  dateTo: string;
  conflictResolution: 'skip' | 'update';
}) {
  logger.debug('Processing massive diagram creation', { data: { params } });

  try {
    const supabase = await supabaseServer();

    const { data, error } = await supabase.rpc('process_massive_diagram_creation_v2', {
      p_employee_ids: params.employeeIds,
      p_work_diagram_id: params.workDiagramId,
      p_active_novelty_id: params.activeNoveltyId,
      p_date_from: params.dateFrom,
      p_date_to: params.dateTo,
      p_conflict_resolution: params.conflictResolution,
    });

    if (error) {
      logger.error('Error processing massive diagram creation', { data: { error } });
      throw error;
    }

    return data as ProcessingResult;
  } catch (error) {
    logger.error('Error in processMassiveDiagramCreation', { data: { error } });
    throw error;
  }
}
```

- [ ] **Step 3: Run type check**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/Employees/Diagrams/actions/diagram-massive-actions.ts src/features/Employees/Diagrams/actions/diagram-search-actions.ts
git commit -m "feat: add server actions for massive diagram (Prisma + RPC wrappers)"
```

---

## Task 3: Extract StepIndicator component

**Files:**

- Create: `src/features/Employees/Diagrams/components/StepIndicator.tsx`

- [ ] **Step 1: Create StepIndicator**

```tsx
// src/features/Employees/Diagrams/components/StepIndicator.tsx

interface Step {
  label: string;
  value: string;
}

const STEPS: Step[] = [
  { label: 'Formulario', value: 'form' },
  { label: 'Verificación', value: 'conflicts' },
  { label: 'Resultados', value: 'results' },
];

interface Props {
  currentStep: 'form' | 'conflicts' | 'results';
}

export function StepIndicator({ currentStep }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.value === currentStep);

  return (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        {STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const colorClass = isActive
            ? 'text-blue-600 font-semibold'
            : isCompleted
              ? 'text-green-600'
              : 'text-gray-400';
          const bgClass = isActive
            ? 'bg-blue-100 text-blue-600'
            : isCompleted
              ? 'bg-green-100 text-green-600'
              : 'bg-gray-100 text-gray-400';

          return (
            <div key={step.value} className="flex items-center space-x-4">
              {index > 0 && <div className="w-8 h-px bg-gray-300" />}
              <div className={`flex items-center space-x-2 ${colorClass}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgClass}`}>{index + 1}</div>
                <span>{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/Employees/Diagrams/components/StepIndicator.tsx
git commit -m "refactor: extract StepIndicator component from DiagramMassive"
```

---

## Task 4: Extract EmployeeFilterPanel component

**Files:**

- Create: `src/features/Employees/Diagrams/components/EmployeeFilterPanel.tsx`

- [ ] **Step 1: Create EmployeeFilterPanel**

This component encapsulates the filter form (nombre, apellido, 6 multi-selects, badges de filtros activos, botones de aplicar/limpiar). It uses `useQuery` with `enabled: showFilters` for on-demand catalog loading via `getDiagramFilterOptions` from `diagram-search-actions.ts`.

```tsx
// src/features/Employees/Diagrams/components/EmployeeFilterPanel.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { FormEvent } from 'react';

import { getDiagramFilterOptions } from '../actions/diagram-search-actions';

export interface FilterState {
  firstname: string;
  lastname: string;
  position: string[];
  workflow: string[];
  costCenter: string[];
  covenant: string[];
  guild: string[];
  category: string[];
  contractors: string[];
}

export const EMPTY_FILTERS: FilterState = {
  firstname: '',
  lastname: '',
  position: [],
  workflow: [],
  costCenter: [],
  covenant: [],
  guild: [],
  category: [],
  contractors: [],
};

const FILTER_LABELS: Record<keyof FilterState, string> = {
  firstname: 'Nombre',
  lastname: 'Apellido',
  position: 'Posición',
  workflow: 'Diagrama de Trabajo',
  costCenter: 'Centro de Costo',
  covenant: 'Convenio',
  guild: 'Gremio',
  category: 'Categoría',
  contractors: 'Contratista',
};

interface Props {
  filters: FilterState;
  activeFilters: (keyof FilterState)[];
  showFilters: boolean;
  isSearching: boolean;
  onFiltersChange: (filters: FilterState) => void;
  onActiveFiltersChange: (activeFilters: (keyof FilterState)[]) => void;
  onToggleFilters: () => void;
  onSubmit: () => void;
  onClearAll: () => void;
}

export function EmployeeFilterPanel({
  filters,
  activeFilters,
  showFilters,
  isSearching,
  onFiltersChange,
  onActiveFiltersChange,
  onToggleFilters,
  onSubmit,
  onClearAll,
}: Props) {
  // On-demand catalog loading — only when filters panel is open
  const { data: positions = [] } = useQuery({
    queryKey: ['massive-filter', 'positions'],
    queryFn: () => getDiagramFilterOptions('positions'),
    staleTime: 5 * 60 * 1000,
    enabled: showFilters,
  });

  const { data: costCenters = [] } = useQuery({
    queryKey: ['massive-filter', 'costCenters'],
    queryFn: () => getDiagramFilterOptions('costCenters'),
    staleTime: 5 * 60 * 1000,
    enabled: showFilters,
  });

  const { data: covenants = [] } = useQuery({
    queryKey: ['massive-filter', 'covenants'],
    queryFn: () => getDiagramFilterOptions('covenants'),
    staleTime: 5 * 60 * 1000,
    enabled: showFilters,
  });

  const { data: guilds = [] } = useQuery({
    queryKey: ['massive-filter', 'guilds'],
    queryFn: () => getDiagramFilterOptions('guilds'),
    staleTime: 5 * 60 * 1000,
    enabled: showFilters,
  });

  const { data: rawCategories = [] } = useQuery({
    queryKey: ['massive-filter', 'categories'],
    queryFn: () => getDiagramFilterOptions('categories'),
    staleTime: 5 * 60 * 1000,
    enabled: showFilters,
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['massive-filter', 'contractors'],
    queryFn: () => getDiagramFilterOptions('contractors'),
    staleTime: 5 * 60 * 1000,
    enabled: showFilters,
  });

  // Cast categories to include covenant relation
  const categories = rawCategories as { id: string; name: string | null; covenant?: { name: string | null } | null }[];

  const handleTextChange = (name: 'firstname' | 'lastname', value: string) => {
    onFiltersChange({ ...filters, [name]: value });
    if (value && !activeFilters.includes(name)) {
      onActiveFiltersChange([...activeFilters, name]);
    } else if (!value && activeFilters.includes(name)) {
      onActiveFiltersChange(activeFilters.filter((f) => f !== name));
    }
  };

  const handleMultiChange = (name: Exclude<keyof FilterState, 'firstname' | 'lastname'>, values: string[]) => {
    onFiltersChange({ ...filters, [name]: values });
    if (values.length > 0 && !activeFilters.includes(name)) {
      onActiveFiltersChange([...activeFilters, name]);
    } else if (values.length === 0 && activeFilters.includes(name)) {
      onActiveFiltersChange(activeFilters.filter((f) => f !== name));
    }
  };

  const clearFilter = (name: keyof FilterState) => {
    const newValue = name === 'firstname' || name === 'lastname' ? '' : [];
    onFiltersChange({ ...filters, [name]: newValue });
    onActiveFiltersChange(activeFilters.filter((f) => f !== name));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filtros de Empleados</CardTitle>
          <div className="flex items-center space-x-2">
            <Button type="button" variant="outline" size="sm" onClick={onToggleFilters}>
              <Search className="h-4 w-4 mr-2" />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </Button>
            {activeFilters.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={onClearAll}>
                <X className="h-4 w-4 mr-2" />
                Limpiar Todo
              </Button>
            )}
          </div>
        </div>
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {activeFilters.map((filter) => (
              <Badge
                key={filter}
                variant="secondary"
                className="cursor-pointer hover:bg-red-100"
                onClick={() => {
                  if (filter !== 'workflow') clearFilter(filter);
                }}
              >
                {FILTER_LABELS[filter]}
                {filter !== 'workflow' && <X className="h-3 w-3 ml-1" />}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      {showFilters && (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstname-filter">Nombre</Label>
                <Input
                  id="firstname-filter"
                  placeholder="Buscar por nombre..."
                  value={filters.firstname}
                  onChange={(e) => handleTextChange('firstname', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname-filter">Apellido</Label>
                <Input
                  id="lastname-filter"
                  placeholder="Buscar por apellido..."
                  value={filters.lastname}
                  onChange={(e) => handleTextChange('lastname', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Posición</Label>
                <MultiSelectCombobox
                  options={positions.map((p) => ({ value: p.id, label: p.name || 'Sin nombre' }))}
                  selectedValues={filters.position}
                  onChange={(v) => handleMultiChange('position', v)}
                  placeholder="Seleccionar posiciones..."
                  emptyMessage="No se encontraron posiciones"
                />
              </div>
              <div className="space-y-2">
                <Label>Centro de Costo</Label>
                <MultiSelectCombobox
                  options={costCenters.map((c) => ({ value: c.id, label: c.name || 'Sin nombre' }))}
                  selectedValues={filters.costCenter}
                  onChange={(v) => handleMultiChange('costCenter', v)}
                  placeholder="Seleccionar centros..."
                  emptyMessage="No se encontraron centros de costo"
                />
              </div>
              <div className="space-y-2">
                <Label>Convenio</Label>
                <MultiSelectCombobox
                  options={covenants.map((c) => ({ value: c.id, label: c.name || 'Sin nombre' }))}
                  selectedValues={filters.covenant}
                  onChange={(v) => handleMultiChange('covenant', v)}
                  placeholder="Seleccionar convenios..."
                  emptyMessage="No se encontraron convenios"
                />
              </div>
              <div className="space-y-2">
                <Label>Gremio</Label>
                <MultiSelectCombobox
                  options={guilds.map((g) => ({ value: g.id, label: g.name || 'Sin nombre' }))}
                  selectedValues={filters.guild}
                  onChange={(v) => handleMultiChange('guild', v)}
                  placeholder="Seleccionar gremios..."
                  emptyMessage="No se encontraron gremios"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <MultiSelectCombobox
                  options={categories.map((c) => ({
                    value: c.id,
                    label: `${c.name || 'Sin nombre'}${c.covenant?.name ? ` (${c.covenant.name})` : ''}`,
                  }))}
                  selectedValues={filters.category}
                  onChange={(v) => handleMultiChange('category', v)}
                  placeholder="Seleccionar categorías..."
                  emptyMessage="No se encontraron categorías"
                />
              </div>
              <div className="space-y-2">
                <Label>Contratista</Label>
                <MultiSelectCombobox
                  options={contractors.map((c) => ({ value: c.id, label: c.name || 'Sin nombre' }))}
                  selectedValues={filters.contractors}
                  onChange={(v) => handleMultiChange('contractors', v)}
                  placeholder="Seleccionar contratistas..."
                  emptyMessage="No se encontraron contratistas"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="submit" variant="outline" disabled={isSearching}>
                <Search className="h-4 w-4 mr-2" />
                {isSearching ? 'Buscando...' : 'Aplicar Filtros'}
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/Employees/Diagrams/components/EmployeeFilterPanel.tsx
git commit -m "refactor: extract EmployeeFilterPanel component"
```

---

## Task 5: Extract EmployeeSelectionGrid component

**Files:**

- Create: `src/features/Employees/Diagrams/components/EmployeeSelectionGrid.tsx`

- [ ] **Step 1: Create EmployeeSelectionGrid**

This component renders the grid of employee cards with checkboxes, "Select All"/"Clear" buttons, the "Load More" button, and the empty states. It uses the `file` field from `DiagramSearchResult` to show legajo.

```tsx
// src/features/Employees/Diagrams/components/EmployeeSelectionGrid.tsx
'use client';

import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

import type { DiagramEmployee } from '../actions/diagram-search-actions';

interface Props {
  employees: DiagramEmployee[];
  selectedIds: string[];
  maxEmployees: number;
  isSearching: boolean;
  hasSearched: boolean;
  hasMoreData: boolean;
  onToggle: (employeeId: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: () => void;
  onLoadMore: () => void;
}

export function EmployeeSelectionGrid({
  employees,
  selectedIds,
  maxEmployees,
  isSearching,
  hasSearched,
  hasMoreData,
  onToggle,
  onSelectAll,
  onClearSelection,
  onLoadMore,
}: Props) {
  if (isSearching && employees.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (employees.length === 0 && hasSearched && !isSearching) {
    return (
      <div className="p-6 bg-white rounded-lg border text-center">
        <p>No se encontraron empleados para los filtros seleccionados.</p>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="p-6 rounded-lg border text-center">
        <p>Para mostrar empleados debe aplicar al menos un filtro.</p>
      </div>
    );
  }

  const handleSelectAll = () => {
    const allIds = employees.map((emp) => emp.value);
    const limitedIds = allIds.slice(0, maxEmployees);
    onSelectAll(limitedIds);
    if (allIds.length > maxEmployees) {
      toast.warning(`Solo se seleccionaron los primeros ${maxEmployees} empleados debido al límite máximo.`);
    }
  };

  return (
    <>
      {hasMoreData && (
        <div className="flex justify-center mb-2">
          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
            Hay más registros disponibles. Al final de la sección encontrará la opción para cargar más datos.
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <FormLabel>
            Empleados ({selectedIds.length}/{maxEmployees})
          </FormLabel>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={employees.length === 0}
            >
              Seleccionar Todos
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onClearSelection}>
              Limpiar Selección
            </Button>
          </div>
        </div>

        <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {employees.map((employee) => {
              const isSelected = selectedIds.includes(employee.value);
              return (
                <div
                  key={employee.value}
                  className={`flex items-center space-x-2 p-3 rounded cursor-pointer hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50 border border-blue-200' : 'border border-gray-200'
                  }`}
                  onClick={() => onToggle(employee.value)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(employee.value)}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      <span className="text-muted-foreground">[{employee.file}]</span> {employee.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {hasMoreData && (
        <div className="flex justify-center mt-4 mb-8">
          <Button onClick={onLoadMore} disabled={isSearching} variant="outline" className="px-8">
            {isSearching ? 'Cargando más empleados...' : 'Cargar más empleados'}
          </Button>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npm run check-types`
Expected: PASS (may need to verify `DiagramEmployee` has `file` field after Task 2)

- [ ] **Step 3: Commit**

```bash
git add src/features/Employees/Diagrams/components/EmployeeSelectionGrid.tsx
git commit -m "refactor: extract EmployeeSelectionGrid component with file_number"
```

---

## Task 6: Rewrite DiagramMassiveForm

**Files:**

- Modify: `src/features/Employees/Diagrams/DiagramMassiveForm.tsx` (full rewrite — from 1220 lines to ~350)

This is the core task. The new component:

- Uses `useQuery` for work diagrams (loaded on mount via React Query, no useEffect)
- Uses `searchEmployeeDiagrams` from `diagram-search-actions.ts` for employee search (via useQuery triggered by `searchTrigger`)
- Uses `checkDiagramConflicts` server action instead of `supabase.rpc()` directly
- Delegates filters to `EmployeeFilterPanel` and employee grid to `EmployeeSelectionGrid`
- Derives `selectedEmployees` directly in render (no useEffect)
- Removes `supabaseBrowser`, `js-cookie`, `useEffect`s, `executeCreation` (dead code), hardcoded UUID query
- Shows `file` (legajo) via `EmployeeSelectionGrid`

- [ ] **Step 1: Rewrite DiagramMassiveForm.tsx**

Replace the entire file content. The new component should:

1. Import from server actions and extracted components:

   - `getActiveWorkDiagrams`, `getWorkDiagramNovelties`, `checkDiagramConflicts` from `./actions/diagram-massive-actions`
   - `searchEmployeeDiagrams` from `./actions/diagram-search-actions`
   - `EmployeeFilterPanel`, `FilterState`, `EMPTY_FILTERS` from `./components/EmployeeFilterPanel`
   - `EmployeeSelectionGrid` from `./components/EmployeeSelectionGrid`
   - Types from `./types/massive-diagram`

2. Use `useQuery` for:

   - `workDiagrams` — `queryKey: ['massive-work-diagrams']`, `queryFn: getActiveWorkDiagrams`
   - `employeeResult` — `queryKey: ['massive-employees', searchTrigger, currentPage]`, `queryFn: () => searchEmployeeDiagrams(searchParams)`, `enabled: searchTrigger > 0`

3. Use `useState` only for:

   - `noveltyData` — loaded on-demand when work diagram changes (via `getWorkDiagramNovelties`)
   - `showActiveNoveltySelect` — boolean
   - `filters` (FilterState), `activeFilters`, `showFilters` — for the filter panel
   - `searchTrigger` (number, incremented to trigger search), `currentPage`, `accumulatedEmployees`
   - `form` (react-hook-form)

4. Derive in render (no state/effect):

   - `employees` — merge `accumulatedEmployees` with latest `employeeResult.data`
   - `employeeCount`, `days`, `totalRecords`, `estimatedTime`

5. Props interface stays the same but properly typed:

   ```typescript
   interface Props {
     onConflictsFound: (conflicts: ConflictData, formData: MassiveFormData) => void;
     onProcessingComplete: (result: ProcessingResult) => void;
     loading: boolean;
     setLoading: (loading: boolean) => void;
   }
   ```

   (Remove `onSubmit` and `onNoConflicts` since they are unused in the current code)

6. `handleVerifyAndSubmit` calls `checkDiagramConflicts` server action instead of `supabase.rpc()`

7. `handleWorkDiagramChange` calls `getWorkDiagramNovelties` server action, updates `noveltyData` state and auto-sets the workflow filter

8. The JSX renders: form fields (work diagram select, novelty select, date range) + `<EmployeeFilterPanel>` + `<EmployeeSelectionGrid>` + summary card + submit button

**Target: ~350 lines** (down from 1220).

- [ ] **Step 2: Run type check**

Run: `npm run check-types`
Expected: PASS. If errors, fix type mismatches between `DiagramEmployee` (from `diagram-search-actions`) and what `EmployeeSelectionGrid` expects.

- [ ] **Step 3: Commit**

```bash
git add src/features/Employees/Diagrams/DiagramMassiveForm.tsx
git commit -m "refactor: rewrite DiagramMassiveForm with Prisma server actions and extracted components"
```

---

## Task 7: Refactor ConflictResolutionModal

**Files:**

- Modify: `src/features/Employees/Diagrams/ConflictResolutionModal.tsx`

Changes:

- Import shared types from `types/massive-diagram.ts` (remove all local interface duplicates)
- Replace `supabaseBrowser().rpc(...)` with `processMassiveDiagramCreation` server action
- Remove `supabaseBrowser` import and instance
- Type `onProcessingComplete` prop as `(result: ProcessingResult) => void` (not `any`)
- Remove unused `onResolve` prop (never called in current code)

- [ ] **Step 1: Refactor the component**

Key changes to make:

1. Replace imports:

   ```typescript
   // REMOVE:
   import { supabaseBrowser } from '@/lib/supabase/browser';
   // ADD:
   import { processMassiveDiagramCreation } from './actions/diagram-massive-actions';
   import type { ConflictData, MassiveFormData, ProcessingResult } from './types/massive-diagram';
   ```

2. Remove all local interface definitions (`ConflictRecord`, `ConflictData`, `MassiveFormData`)

3. Update Props:

   ```typescript
   interface Props {
     conflicts: ConflictData;
     formData: MassiveFormData;
     onCancel: () => void;
     onProcessingComplete: (result: ProcessingResult) => void;
   }
   ```

4. Replace `handleContinue`:

   ```typescript
   const handleContinue = async () => {
     setProcessing(true);
     try {
       if (
         !formData?.employeeIds?.length ||
         !formData?.workDiagramId ||
         !formData?.dateRange?.from ||
         !formData?.dateRange?.to
       ) {
         logger.error('formData missing required properties', { data: { formData } });
         toast.error('Error: Datos del formulario no disponibles');
         return;
       }

       const result = await processMassiveDiagramCreation({
         employeeIds: formData.employeeIds,
         workDiagramId: formData.workDiagramId,
         activeNoveltyId: formData.activeNoveltyId || '',
         dateFrom: formData.dateRange.from.toISOString().split('T')[0],
         dateTo: formData.dateRange.to.toISOString().split('T')[0],
         conflictResolution: 'update',
       });

       onProcessingComplete(result);
       toast.success('Diagramas procesados correctamente');
     } catch (error) {
       logger.error('Error in creation', { data: { error } });
       toast.error('Error en la creación');
     } finally {
       setProcessing(false);
     }
   };
   ```

5. Remove `const supabase = supabaseBrowser();` from component body.

- [ ] **Step 2: Run type check**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/Employees/Diagrams/ConflictResolutionModal.tsx
git commit -m "refactor: migrate ConflictResolutionModal to server action, share types"
```

---

## Task 8: Refactor DiagramMassiveResults

**Files:**

- Modify: `src/features/Employees/Diagrams/DiagramMassiveResults.tsx`

Changes:

- Import `ProcessingResult`, `ProcessingResultRecord`, `UpdatedResultRecord`, `ErrorRecord` from `types/massive-diagram.ts`
- Remove the local `ProcessingResult` export and all local record interfaces
- Re-export `ProcessingResult` from the shared types (for backward compatibility with DiagramMassive.tsx import)
- Remove dead function `getSuccessIcon()`
- The `any[]` in `ProcessingResult.data.created/updated` and `errors` are fixed because the shared type uses proper types

- [ ] **Step 1: Refactor the component**

1. Replace the top of the file:

   ```typescript
   // REMOVE: local ProcessingResult, CreatedRecord, UpdatedRecord, ErrorRecord interfaces
   // ADD:
   import type {
     ProcessingResult,
     ProcessingResultRecord,
     UpdatedResultRecord,
     ErrorRecord,
   } from './types/massive-diagram';

   // Re-export for backward compat
   export type { ProcessingResult };
   ```

2. Delete `getSuccessIcon()` function (declared at line ~225, never used).

3. Update `getDetails()` return type to use shared record types:
   ```typescript
   const getDetails = (): {
     created_records: ProcessingResultRecord[];
     updated_records: UpdatedResultRecord[];
     error_records: ErrorRecord[];
   } => { ... };
   ```

- [ ] **Step 2: Run type check**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/Employees/Diagrams/DiagramMassiveResults.tsx
git commit -m "refactor: use shared types in DiagramMassiveResults, remove dead code"
```

---

## Task 9: Refactor DiagramMassive orchestrator

**Files:**

- Modify: `src/features/Employees/Diagrams/DiagramMassive.tsx`

Changes:

- Import shared types from `types/massive-diagram.ts` (remove all local interfaces)
- Import `StepIndicator` from `components/StepIndicator`
- Remove `handleNoConflicts` and `handleConflictResolution` (redundant — both just do `setCurrentStep('results')`)
- Remove `onSubmit` and `onNoConflicts` props from `<DiagramMassiveForm>` since they're removed
- Remove `onResolve` prop from `<ConflictResolutionModal>` since it's removed
- Keep `ProcessingResult` import from `DiagramMassiveResults` (it re-exports from shared types)

- [ ] **Step 1: Refactor the orchestrator**

1. Replace imports:

   ```typescript
   // REMOVE local interfaces
   // ADD:
   import type { ConflictData, MassiveFormData, ProcessingResult } from './types/massive-diagram';
   import { StepIndicator } from './components/StepIndicator';
   ```

2. Remove redundant handlers:

   ```typescript
   // REMOVE handleNoConflicts and handleConflictResolution
   // handleFormSubmit is also unused (onSubmit prop removed), so remove it too
   ```

3. Replace the step indicator JSX (lines 93-161) with:

   ```tsx
   <StepIndicator currentStep={currentStep} />
   ```

4. Update child component props:

   ```tsx
   {
     currentStep === 'form' && (
       <DiagramMassiveForm
         onConflictsFound={handleConflictsFound}
         onProcessingComplete={handleProcessingComplete}
         loading={loading}
         setLoading={setLoading}
       />
     );
   }

   {
     currentStep === 'conflicts' && conflicts && (
       <ConflictResolutionModal
         conflicts={conflicts}
         formData={{
           ...formData,
           workDiagramId: formData?.workDiagramId || '',
           employeeIds: formData?.employeeIds || [],
           dateRange: formData?.dateRange || { from: new Date(), to: new Date() },
         }}
         onCancel={handleStartOver}
         onProcessingComplete={handleProcessingComplete}
       />
     );
   }
   ```

- [ ] **Step 2: Run type check**

Run: `npm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/Employees/Diagrams/DiagramMassive.tsx
git commit -m "refactor: use shared types and StepIndicator in DiagramMassive"
```

---

## Task 10: Final verification

**Files:**

- No new files

- [ ] **Step 1: Run full type check**

Run: `npm run check-types`
Expected: PASS with zero errors

- [ ] **Step 2: Verify no supabaseBrowser in massive diagram files**

Run: `grep -r "supabaseBrowser" src/features/Employees/Diagrams/DiagramMassive*.tsx src/features/Employees/Diagrams/ConflictResolution*.tsx`
Expected: No matches. `supabaseBrowser` should ONLY remain in files outside the massive diagram scope (e.g., `supabase-query.ts` used by other modules).

- [ ] **Step 3: Verify no :any types in modified files**

Run: `grep -n ": any" src/features/Employees/Diagrams/DiagramMassive*.tsx src/features/Employees/Diagrams/ConflictResolution*.tsx src/features/Employees/Diagrams/types/massive-diagram.ts src/features/Employees/Diagrams/actions/diagram-massive-actions.ts`
Expected: No matches (zero `:any` in the migrated files).

- [ ] **Step 4: Verify file (legajo) is present in employee search**

Run: `grep -n "file" src/features/Employees/Diagrams/actions/diagram-search-actions.ts | head -5`
Expected: `file: true` in the select and `file: emp.file` in the map.

- [ ] **Step 5: Start dev server and manually test**

Run: `npm run dev`

Manual test checklist:

1. Navigate to `/dashboard/employee?tab=diagrams&subtab=massive_diagram`
2. Verify the 3-step indicator renders
3. Select a work diagram → verify novelties load
4. Open filters → verify catalogs load on-demand
5. Apply filters → verify employee list loads with legajo visible `[123]`
6. Select employees → verify count updates
7. Select date range → verify summary card
8. Click "Verificar y Crear Diagramas" → verify conflict check works
9. If conflicts found → verify ConflictResolutionModal shows correctly
10. Confirm → verify results page shows with proper data
11. Download TXT report → verify file downloads

- [ ] **Step 6: Commit final state if any fixes were needed**

```bash
git add -A
git commit -m "fix: address type check and runtime issues from massive diagram migration"
```
