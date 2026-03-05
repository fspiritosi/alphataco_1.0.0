# Skeleton Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all text-based Suspense fallbacks with dedicated Skeleton components and create individual loading.tsx for every dashboard route so users see a faithful skeleton instead of the wrong page layout.

**Architecture:** 5 reusable base skeleton components in `src/shared/components/skeletons/` cover common patterns (tabs page, detail page, form page, table page). Each dashboard route gets its own `loading.tsx` that either uses a base component or a custom skeleton for complex layouts. 49 inline text fallbacks (`<div>Cargando...</div>`) across 18 files are replaced with proper Skeleton components.

**Tech Stack:** React Server Components, shadcn/ui `Skeleton`, `Card`/`CardContent`/`CardHeader`, Lucide icons (for tab skeleton shapes)

---

## Task 1: Create base skeleton components

**Files:**

- Create: `src/shared/components/skeletons/TabsPageSkeleton.tsx`
- Create: `src/shared/components/skeletons/DetailPageSkeleton.tsx`
- Create: `src/shared/components/skeletons/FormPageSkeleton.tsx`
- Create: `src/shared/components/skeletons/TablePageSkeleton.tsx`
- Create: `src/shared/components/skeletons/TableSkeleton.tsx` (inner reusable table skeleton without Card)
- Create: `src/shared/components/skeletons/index.ts` (barrel export)

### Step 1: Create `TableSkeleton` (reusable inner component)

This is the core building block used by multiple skeletons. Renders: toolbar + bordered table + pagination.

```tsx
// src/shared/components/skeletons/TableSkeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
  showCheckbox?: boolean;
  showAvatar?: boolean;
  filterCount?: number;
}

export function TableSkeleton({
  columnCount = 6,
  rowCount = 8,
  showCheckbox = false,
  showAvatar = false,
  filterCount = 2,
}: TableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-64" />
          {Array.from({ length: filterCount }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <div className="border-b p-3">
          <div className="flex gap-4">
            {showCheckbox && <Skeleton className="h-5 w-5" />}
            {Array.from({ length: columnCount }).map((_, i) => (
              <Skeleton key={i} className="h-5 flex-1" />
            ))}
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              {showCheckbox && <Skeleton className="h-4 w-4" />}
              {showAvatar && <Skeleton className="h-8 w-8 rounded-full" />}
              {Array.from({ length: columnCount }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Create `TabsPageSkeleton`

Used for pages with a tab bar at the top and table content below (employees, equipment, documents, etc.)

```tsx
// src/shared/components/skeletons/TabsPageSkeleton.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { TableSkeleton } from './TableSkeleton';

interface TabsPageSkeletonProps {
  tabCount?: number;
  hasSubtabs?: boolean;
  subtabCount?: number;
  contentType?: 'table' | 'cards' | 'empty';
  columnCount?: number;
  rowCount?: number;
}

export function TabsPageSkeleton({
  tabCount = 4,
  hasSubtabs = false,
  subtabCount = 2,
  contentType = 'table',
  columnCount = 6,
  rowCount = 8,
}: TabsPageSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {Array.from({ length: tabCount }).map((_, i) => (
          <Skeleton key={i} className={`h-10 ${i === 0 ? 'w-32 border-b-2 border-primary' : 'w-28'} rounded-none`} />
        ))}
      </div>

      {/* Subtab bar (if any) */}
      {hasSubtabs && (
        <div className="flex gap-1 border-b">
          {Array.from({ length: subtabCount }).map((_, i) => (
            <Skeleton key={i} className={`h-9 ${i === 0 ? 'w-36 border-b-2 border-primary' : 'w-32'} rounded-none`} />
          ))}
        </div>
      )}

      {/* Content */}
      {contentType === 'table' && (
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton columnCount={columnCount} rowCount={rowCount} />
          </CardContent>
        </Card>
      )}

      {contentType === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {contentType === 'empty' && (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Step 3: Create `DetailPageSkeleton`

Used for detail/action pages (employee detail, equipment detail, user detail).

```tsx
// src/shared/components/skeletons/DetailPageSkeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DetailPageSkeletonProps {
  showBackButton?: boolean;
  showAvatar?: boolean;
  tabCount?: number;
  fieldCount?: number;
}

export function DetailPageSkeleton({
  showBackButton = true,
  showAvatar = false,
  tabCount = 0,
  fieldCount = 6,
}: DetailPageSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showAvatar && <Skeleton className="h-16 w-16 rounded-full" />}
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          {showBackButton && <Skeleton className="h-9 w-24" />}
        </div>
      </CardHeader>
      <CardContent>
        {/* Tabs (optional) */}
        {tabCount > 0 && (
          <div className="flex gap-1 border-b mb-6">
            {Array.from({ length: tabCount }).map((_, i) => (
              <Skeleton
                key={i}
                className={`h-10 ${i === 0 ? 'w-32 border-b-2 border-primary' : 'w-28'} rounded-none`}
              />
            ))}
          </div>
        )}

        {/* Fields grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: fieldCount }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 4: Create `FormPageSkeleton`

Used for creation/editing forms (company/new, forms/new, etc.)

```tsx
// src/shared/components/skeletons/FormPageSkeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface FormPageSkeletonProps {
  title?: boolean;
  showBackButton?: boolean;
  fieldCount?: number;
  columns?: 1 | 2;
}

export function FormPageSkeleton({
  title = true,
  showBackButton = true,
  fieldCount = 6,
  columns = 2,
}: FormPageSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          {title && <Skeleton className="h-7 w-48" />}
          {showBackButton && <Skeleton className="h-9 w-24" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`grid grid-cols-1 ${columns === 2 ? 'md:grid-cols-2' : ''} gap-6`}>
          {Array.from({ length: fieldCount }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-6">
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 5: Create `TablePageSkeleton`

Used for pages with a Card wrapping a table + optional back button and title.

```tsx
// src/shared/components/skeletons/TablePageSkeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { TableSkeleton } from './TableSkeleton';

interface TablePageSkeletonProps {
  title?: boolean;
  showBackButton?: boolean;
  columnCount?: number;
  rowCount?: number;
}

export function TablePageSkeleton({
  title = true,
  showBackButton = true,
  columnCount = 6,
  rowCount = 8,
}: TablePageSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          {title && <Skeleton className="h-7 w-48" />}
          {showBackButton && <Skeleton className="h-9 w-24" />}
        </div>
      </CardHeader>
      <CardContent>
        <TableSkeleton columnCount={columnCount} rowCount={rowCount} />
      </CardContent>
    </Card>
  );
}
```

### Step 6: Create barrel export

```tsx
// src/shared/components/skeletons/index.ts
export { TabsPageSkeleton } from './TabsPageSkeleton';
export { DetailPageSkeleton } from './DetailPageSkeleton';
export { FormPageSkeleton } from './FormPageSkeleton';
export { TablePageSkeleton } from './TablePageSkeleton';
export { TableSkeleton } from './TableSkeleton';
```

### Step 7: Verify types compile

Run: `npm run check-types`
Expected: PASS

### Step 8: Commit

```bash
git add src/shared/components/skeletons/
git commit -m "feat: add 5 reusable skeleton base components for loading states"
```

---

## Task 2: Create loading.tsx for 6 main dashboard modules

**Files:**

- Create: `src/app/dashboard/employee/loading.tsx`
- Create: `src/app/dashboard/equipment/loading.tsx`
- Create: `src/app/dashboard/document/loading.tsx`
- Create: `src/app/dashboard/maintenance/loading.tsx`
- Create: `src/app/dashboard/operations/loading.tsx`
- Create: `src/app/dashboard/comercial/loading.tsx`

Each module has a unique layout that requires a custom skeleton faithful to its actual content.

### Step 1: Create `employee/loading.tsx`

Employees page: 5 tabs, default tab has 2 subtabs, content is a DataTable with avatar column.

```tsx
// src/app/dashboard/employee/loading.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* 5 tabs */}
      <div className="flex gap-1 border-b">
        <Skeleton className="h-10 w-28 rounded-none border-b-2 border-primary" />
        <Skeleton className="h-10 w-44 rounded-none" />
        <Skeleton className="h-10 w-28 rounded-none" />
        <Skeleton className="h-10 w-40 rounded-none" />
        <Skeleton className="h-10 w-16 rounded-none" />
      </div>

      {/* 2 subtabs */}
      <div className="flex gap-1 border-b">
        <Skeleton className="h-9 w-40 rounded-none border-b-2 border-primary" />
        <Skeleton className="h-9 w-40 rounded-none" />
      </div>

      {/* Employee DataTable in Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>

            {/* Table with avatar column */}
            <div className="rounded-md border">
              <div className="border-b p-3">
                <div className="flex gap-4">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 flex-1" />
                  ))}
                </div>
              </div>
              <div className="divide-y">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    {Array.from({ length: 6 }).map((_, j) => (
                      <Skeleton key={j} className="h-4 flex-1" />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 2: Create `equipment/loading.tsx`

Equipment page: 4 tabs, default has 3 subtabs (Vehiculos, Otros, Dados de Baja), content is DataTable.

```tsx
// src/app/dashboard/equipment/loading.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* 4 tabs */}
      <div className="flex gap-1 border-b">
        <Skeleton className="h-10 w-24 rounded-none border-b-2 border-primary" />
        <Skeleton className="h-10 w-44 rounded-none" />
        <Skeleton className="h-10 w-40 rounded-none" />
        <Skeleton className="h-10 w-36 rounded-none" />
      </div>

      {/* 3 subtabs */}
      <div className="flex gap-1 border-b">
        <Skeleton className="h-9 w-28 rounded-none border-b-2 border-primary" />
        <Skeleton className="h-9 w-20 rounded-none" />
        <Skeleton className="h-9 w-32 rounded-none" />
      </div>

      {/* Vehicle DataTable in Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="border-b p-3">
              <div className="flex gap-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 flex-1" />
                ))}
              </div>
            </div>
            <div className="divide-y">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 3: Create `document/loading.tsx`

Documentation page: 4 tabs, default has 2 subtabs, optional action buttons row, DataTable.

```tsx
// src/app/dashboard/document/loading.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* 4 tabs */}
      <div className="flex gap-1 border-b">
        <Skeleton className="h-10 w-44 rounded-none border-b-2 border-primary" />
        <Skeleton className="h-10 w-44 rounded-none" />
        <Skeleton className="h-10 w-44 rounded-none" />
        <Skeleton className="h-10 w-40 rounded-none" />
      </div>

      {/* Action buttons row */}
      <div className="flex gap-4 flex-wrap">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-48" />
      </div>

      {/* 2 subtabs */}
      <div className="flex gap-1 border-b">
        <Skeleton className="h-9 w-44 rounded-none border-b-2 border-primary" />
        <Skeleton className="h-9 w-40 rounded-none" />
      </div>

      {/* DataTable in Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
            <div className="rounded-md border">
              <div className="border-b p-3">
                <div className="flex gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 flex-1" />
                  ))}
                </div>
              </div>
              <div className="divide-y">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <Skeleton key={j} className="h-4 flex-1" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 4: Create `maintenance/loading.tsx`

Maintenance page: 7 tabs, default is "Operaciones" which shows pipeline (4 chevrons + table).

```tsx
// src/app/dashboard/maintenance/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* 7 tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        <Skeleton className="h-10 w-36 rounded-none" />
        <Skeleton className="h-10 w-36 rounded-none" />
        <Skeleton className="h-10 w-32 rounded-none border-b-2 border-primary" />
        <Skeleton className="h-10 w-24 rounded-none" />
        <Skeleton className="h-10 w-32 rounded-none" />
        <Skeleton className="h-10 w-40 rounded-none" />
        <Skeleton className="h-10 w-32 rounded-none" />
      </div>

      {/* Pipeline: 4 chevron blocks */}
      <div className="flex gap-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] flex-1 rounded-none" />
        ))}
      </div>

      {/* Pipeline content: title + table area */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}
```

### Step 5: Create `operations/loading.tsx`

Operations page: 2 tabs, default is "Gestor de Pedidos" with status mini-cards + DataTable.

```tsx
// src/app/dashboard/operations/loading.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* 2 tabs */}
      <div className="flex gap-1 border-b">
        <Skeleton className="h-10 w-36 rounded-none border-b-2 border-primary" />
        <Skeleton className="h-10 w-32 rounded-none" />
      </div>

      {/* Preparte layout: Card with status cards + table */}
      <Card className="flex w-full gap-4 p-6">
        <div className="space-y-6 w-full">
          {/* Header */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-[220px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>

          {/* Status mini-cards row */}
          <div className="flex w-full overflow-x-auto pb-2 mb-6">
            <div className="flex flex-nowrap gap-2 min-w-max">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 min-w-[120px] rounded-lg border p-3 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-10" />
                </div>
              ))}
            </div>
          </div>

          {/* Inner table Card */}
          <Card>
            <CardContent className="p-2">
              <div className="space-y-4 p-4">
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-[200px]" />
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
                <div className="rounded-md border">
                  <div className="border-b p-3">
                    <div className="flex gap-4">
                      <Skeleton className="h-5 w-5" />
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-5 flex-1" />
                      ))}
                    </div>
                  </div>
                  <div className="divide-y">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-3">
                        <Skeleton className="h-4 w-4" />
                        {Array.from({ length: 8 }).map((_, j) => (
                          <Skeleton key={j} className="h-4 flex-1" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-[180px]" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Card>
    </div>
  );
}
```

### Step 6: Create `comercial/loading.tsx`

Comercial page: 1 top tab with 7 subtabs, default is "Clientes" DataTable.

```tsx
// src/app/dashboard/comercial/loading.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* 1 top tab */}
      <div className="flex gap-1 border-b">
        <Skeleton className="h-10 w-28 rounded-none border-b-2 border-primary" />
      </div>

      {/* 7 subtabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        <Skeleton className="h-9 w-24 rounded-none border-b-2 border-primary" />
        <Skeleton className="h-9 w-20 rounded-none" />
        <Skeleton className="h-9 w-24 rounded-none" />
        <Skeleton className="h-9 w-24 rounded-none" />
        <Skeleton className="h-9 w-28 rounded-none" />
        <Skeleton className="h-9 w-36 rounded-none" />
        <Skeleton className="h-9 w-32 rounded-none" />
      </div>

      {/* DataTable */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
            <div className="rounded-md border">
              <div className="border-b p-3">
                <div className="flex gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 flex-1" />
                  ))}
                </div>
              </div>
              <div className="divide-y">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <Skeleton key={j} className="h-4 flex-1" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 7: Verify types compile

Run: `npm run check-types`
Expected: PASS

### Step 8: Commit

```bash
git add src/app/dashboard/employee/loading.tsx src/app/dashboard/equipment/loading.tsx src/app/dashboard/document/loading.tsx src/app/dashboard/maintenance/loading.tsx src/app/dashboard/operations/loading.tsx src/app/dashboard/comercial/loading.tsx
git commit -m "feat: add page-specific loading skeletons for 6 main dashboard modules"
```

---

## Task 3: Create loading.tsx for secondary dashboard routes

**Files to create** (22 files, each using a reusable base component):

### Step 1: Detail pages using `DetailPageSkeleton`

Create the following files, each with the pattern shown. Adjust props per page.

**`src/app/dashboard/employee/action/loading.tsx`** — Employee detail/create (has avatar, has tabs)

```tsx
import { DetailPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <DetailPageSkeleton showAvatar tabCount={4} fieldCount={8} />;
}
```

**`src/app/dashboard/equipment/action/loading.tsx`** — Vehicle/equipment detail/create (no avatar, has tabs internally via forms)

```tsx
import { DetailPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <DetailPageSkeleton tabCount={3} fieldCount={10} />;
}
```

**`src/app/dashboard/company/[id]/loading.tsx`** — Edit company (form, no avatar, no back button)

```tsx
import { FormPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <FormPageSkeleton showBackButton={false} fieldCount={10} />;
}
```

**`src/app/dashboard/company/actualCompany/loading.tsx`** — Company tabs (EmpresaComponent)

```tsx
import { TabsPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <TabsPageSkeleton tabCount={5} hasSubtabs subtabCount={3} />;
}
```

**`src/app/dashboard/company/actualCompany/contact/loading.tsx`** — Contact list

```tsx
import { TablePageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <TablePageSkeleton />;
}
```

**`src/app/dashboard/company/actualCompany/contact/action/loading.tsx`** — Contact form

```tsx
import { FormPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <FormPageSkeleton fieldCount={6} />;
}
```

**`src/app/dashboard/company/actualCompany/covenant/action/loading.tsx`** — Covenant form

```tsx
import { FormPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <FormPageSkeleton fieldCount={4} />;
}
```

**`src/app/dashboard/company/actualCompany/customers/action/loading.tsx`** — Customer detail (has table inside)

```tsx
import { DetailPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <DetailPageSkeleton tabCount={3} fieldCount={6} />;
}
```

**`src/app/dashboard/company/actualCompany/services/[id]/loading.tsx`** — Service items table

```tsx
import { TablePageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <TablePageSkeleton title showBackButton columnCount={5} />;
}
```

**`src/app/dashboard/company/actualCompany/user/[id]/loading.tsx`** — User permissions page

```tsx
import { DetailPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <DetailPageSkeleton showBackButton={false} fieldCount={4} />;
}
```

**`src/app/dashboard/company/new/loading.tsx`** — Create company form

```tsx
import { FormPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <FormPageSkeleton showBackButton={false} fieldCount={10} />;
}
```

**`src/app/dashboard/company/loading.tsx`** — Company list

```tsx
import { TablePageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <TablePageSkeleton showBackButton={false} />;
}
```

### Step 2: Document detail page

**`src/app/dashboard/document/[id]/loading.tsx`** — Document detail with preview (2-column grid: info left, embed right)

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: info + tabs */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <Skeleton className="h-9 w-24 rounded-none border-b-2 border-primary" />
          <Skeleton className="h-9 w-28 rounded-none" />
          <Skeleton className="h-9 w-28 rounded-none" />
          <Skeleton className="h-9 w-28 rounded-none" />
        </div>
        <Card>
          <CardContent className="pt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Right column: document preview */}
      <div className="lg:col-span-2">
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    </div>
  );
}
```

### Step 3: Forms module pages

**`src/app/dashboard/forms/loading.tsx`** — Forms list (FormulariosComponent with tabs)

```tsx
import { TabsPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <TabsPageSkeleton tabCount={2} />;
}
```

**`src/app/dashboard/forms/[id]/loading.tsx`** — Checklist answers table

```tsx
import { TablePageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <TablePageSkeleton columnCount={5} />;
}
```

**`src/app/dashboard/forms/[id]/new/loading.tsx`** — New checklist answer form

```tsx
import { FormPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <FormPageSkeleton fieldCount={8} columns={1} />;
}
```

**`src/app/dashboard/forms/[id]/view/loading.tsx`** — View checklist answer (read-only form)

```tsx
import { FormPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <FormPageSkeleton fieldCount={8} columns={1} />;
}
```

**`src/app/dashboard/forms/new/example/loading.tsx`** — Custom form example

```tsx
import { FormPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <FormPageSkeleton fieldCount={4} columns={1} showBackButton={false} />;
}
```

### Step 4: Help and remaining pages

**`src/app/dashboard/help/loading.tsx`** — Help page (simple form for reporting issues)

```tsx
import { FormPageSkeleton } from '@/shared/components/skeletons';
export default function Loading() {
  return <FormPageSkeleton title showBackButton={false} fieldCount={3} columns={1} />;
}
```

**`src/app/dashboard/operations/[uuid]/loading.tsx`** — Daily report detail (has tabs with 1 tab)

```tsx
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/shared/components/skeletons';

export default function Loading() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 border-b mb-6">
          <Skeleton className="h-10 w-24 rounded-none border-b-2 border-primary" />
        </div>
        <TableSkeleton columnCount={6} rowCount={6} />
      </CardContent>
    </Card>
  );
}
```

### Step 5: Verify types compile

Run: `npm run check-types`
Expected: PASS

### Step 6: Commit

```bash
git add src/app/dashboard/
git commit -m "feat: add loading.tsx for 22 secondary dashboard routes"
```

---

## Task 4: Replace 49 text-based Suspense fallbacks

Replace every `<div>Cargando ...</div>`, `<p>Cargando...</p>`, `<p>Loading...</p>` with a proper `<Skeleton>` component. Group by file for efficiency.

### Approach

For each file, replace the text fallback with an inline Skeleton that matches what the Suspense child renders:

- If wrapping a **table/list** → `<Skeleton className="h-[400px] w-full rounded-md" />`
- If wrapping a **form** → `<Skeleton className="h-64 w-full rounded-md" />`
- If wrapping a **small section/component** → `<Skeleton className="h-32 w-full rounded-md" />`
- If wrapping a **chart/diagram** → `<Skeleton className="h-[300px] w-full rounded-md" />`

**Import needed in each file:** `import { Skeleton } from '@/components/ui/skeleton';` (add if not already present)

### Step 1: Replace fallbacks in `src/features/` files (27 occurrences)

**File: `src/features/Comercial/Comerce/ComerceTabContent.tsx`** — 7 fallbacks (all wrap DataTable tabs)

- Replace all 7 `<div>Cargando X...</div>` with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/features/Dashboard/Estadisticas/EstadisticasTabComponent.tsx`** — 2 fallbacks

- Replace `<div>Cargando operaciones...</div>` with `<Skeleton className="h-[400px] w-full rounded-md" />`
- Replace `<div>Cargando KPIs...</div>` with `<Skeleton className="h-[300px] w-full rounded-md" />`

**File: `src/features/Dashboard/Estadisticas/KPIs/KpisTabClient.tsx`** — 1 fallback

- Replace `<p>Cargando KPIs...</p>` with `<Skeleton className="h-[300px] w-full rounded-md" />`

**File: `src/features/Dashboard/Estadisticas/KPIs/KpisTabContent.tsx`** — 2 fallbacks

- Replace both `<div>Cargando X...</div>` with `<Skeleton className="h-[300px] w-full rounded-md" />`

**File: `src/features/Documentacion/DocumentacionComponent.tsx`** — 1 fallback

- Replace `<div>Cargando tipos de documentos...</div>` with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/features/Documentacion/DocumentosEmpresa/DocumentosEmpresaTabContent.tsx`** — 2 fallbacks

- Replace both `<div>Cargando documentos X...</div>` with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/features/Documentacion/TiposDocumentos/TiposDocumentosTabContent.tsx`** — 2 fallbacks

- Replace both `<div>Cargando tipos de documentos X...</div>` with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/features/Empresa/Equipos/titulares/EquipmentTitulares.tsx`** — 1 fallback (spinner + text)

- Replace `<div className="flex..."><Loader2 /><span>Cargando equipos...</span></div>` with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/features/Empresa/General/components/cost-center/CostCenterTabClient.tsx`** — 1 fallback

- Replace `<p>Loading...</p>` with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/features/Empresa/General/components/mantenimiento/MantenimientoTabClient.tsx`** — 2 fallbacks

- Replace both `<div className="p-4">Cargando X...</div>` with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/features/Empresa/General/components/mantenimiento/sectores/SectoresTabClient.tsx`** — 1 fallback

- Replace `<p>Cargando...</p>` with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/features/Empresa/General/components/mantenimiento/talleres/TalleresTabClient.tsx`** — 1 fallback

- Replace `<p>Cargando...</p>` with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/features/Mantenimiento/MantenimientoComponent.tsx`** — 3 fallbacks

- Replace `<div>Cargando formulario...</div>` with `<Skeleton className="h-64 w-full rounded-md" />`
- Replace `<div>Cargando tipos de reparación...</div>` with `<Skeleton className="h-[400px] w-full rounded-md" />`
- Replace `<div>Cargando grupos...</div>` with `<Skeleton className="h-[400px] w-full rounded-md" />`

### Step 2: Replace fallbacks in `src/components/` files (10 occurrences)

**File: `src/components/Diagrams/EmployesDiagram.tsx`** — 4 fallbacks

- Replace all 4 (diagramas, formulario, carga masiva, reportes) with `<Skeleton className="h-[300px] w-full rounded-md" />`

**File: `src/components/DocumentEquipmentComponent.tsx`** — 2 fallbacks

- Replace both with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/components/Tipos_de_reparaciones/RepairEntryWrapper.tsx`** — 2 fallbacks

- Replace both `<div>Cargando formulario...</div>` with `<Skeleton className="h-64 w-full rounded-md" />`

**File: `src/components/Tipos_de_reparaciones/RepairTypes.tsx`** — 4 fallbacks

- Replace all 4 (solicitudes, tipos, formulario, grupos) with `<Skeleton className="h-[400px] w-full rounded-md" />`

### Step 3: Replace fallbacks in `src/app/` files (9 occurrences)

**File: `src/app/dashboard/company/actualCompany/contact/action/page.tsx`** — 1 fallback

- Replace `<div>Cargando...</div>` with `<Skeleton className="h-64 w-full rounded-md" />`

**File: `src/app/dashboard/company/actualCompany/contact/page.tsx`** — 1 fallback

- Replace `<div>Cargando...</div>` with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/app/dashboard/company/actualCompany/covenant/action/page.tsx`** — 1 fallback

- Replace `<div>Cargando...</div>` with `<Skeleton className="h-64 w-full rounded-md" />`

**File: `src/app/dashboard/company/actualCompany/customers/action/page.tsx`** — 1 fallback

- Replace `<div>Cargando...</div>` with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/app/dashboard/document/documentComponents/EquipmentTabs.tsx`** — 2 fallbacks

- Replace both with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/app/dashboard/document/DocumentTable.tsx`** — 2 fallbacks

- Replace both with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/app/dashboard/equipment/equipmentComponentes/EquipmentListTabs.tsx`** — 3 fallbacks

- Replace all 3 (vehiculos, otros equipos, dados de baja) with `<Skeleton className="h-[400px] w-full rounded-md" />`

**File: `src/app/maintenance/page.tsx`** — 1 fallback

- Replace `<div className="flex items-center justify-center min-h-screen">Cargando...</div>` with `<Skeleton className="h-64 w-full rounded-md" />`

### Step 4: Verify types compile

Run: `npm run check-types`
Expected: PASS

### Step 5: Commit

```bash
git add -A
git commit -m "fix: replace 49 text-based Suspense fallbacks with Skeleton components"
```

---

## Task 5: Final verification

### Step 1: Run full build

Run: `npm run build`
Expected: PASS — all routes compile

### Step 2: Verify no remaining text fallbacks

Run: Search for remaining `Cargando` in Suspense fallbacks and `Loading...` patterns.
Expected: Zero matches in Suspense fallback positions.

### Step 3: Verify every dashboard route has loading.tsx

Expected: `src/app/dashboard/` has its own loading.tsx, plus every sub-route that has a page.tsx also has a loading.tsx.

### Step 4: Final commit (if any fixes needed)

```bash
git add -A
git commit -m "chore: final cleanup after skeleton overhaul"
```
