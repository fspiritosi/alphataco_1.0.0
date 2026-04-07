# Clothing Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clothing/EPP delivery management module with a master catalog (under Empresa > RRHH), employee delivery history tab, and standalone mobile-first delivery wizard.

**Architecture:** 3 entry points share a single Prisma schema and feature directory (`src/features/Clothing/`). The catalog uses the standard 3-layer DataTable architecture with Prisma. The standalone route (`/clothing`) follows the `/operator` pattern with its own login and layout. All DataTable tasks are delegated to the `table-expert` agent.

**Tech Stack:** Next.js 16, React 19, Prisma 7, Supabase Auth/Storage, shadcn/ui, React Query, `signature_pad`, `@react-pdf/renderer` (placeholder)

**Spec:** `docs/superpowers/specs/2026-03-18-clothing-module-design.md`

**Verification after every task:** `npm run check-types && npm run lint`

---

## File Map

### New Files

```
prisma/
  migrations/YYYYMMDDHHMMSS_add_clothing_tables/migration.sql

src/features/Clothing/
  actions/actionsServer.ts                          # CRUD catalog + getClothingOperatorContext
  types/index.ts                                    # Shared types (inferred from Prisma)
  utils/mappers.ts                                  # Enum labels for clothing_delivery_type
  utils/queryInvalidation.ts                        # invalidateAllClothingQueries()
  ClothingBrands/
    ClothingBrandsTabContent.tsx                     # Server Component wrapper
    ClothingBrandsList/
      ClothingBrandsList.tsx                         # Server Component (3-layer)
      _ClothingBrandsDataTable.tsx                   # Client Component
      columns.tsx                                    # Column definitions
      actions.server.ts                              # Paginated queries + facets
      fallback/ClothingBrandsTableSkeleton.tsx
    components/ClothingBrandForm.tsx                 # Create/Edit dialog
  ClothingSizes/
    ClothingSizesTabContent.tsx
    ClothingSizesList/
      ClothingSizesList.tsx
      _ClothingSizesDataTable.tsx
      columns.tsx
      actions.server.ts
      fallback/ClothingSizesTableSkeleton.tsx
    components/ClothingSizeForm.tsx
  ClothingItems/
    ClothingItemsTabContent.tsx
    ClothingItemsList/
      ClothingItemsList.tsx
      _ClothingItemsDataTable.tsx
      columns.tsx
      actions.server.ts
      fallback/ClothingItemsTableSkeleton.tsx
    components/
      ClothingItemForm.tsx
      ItemBrandSizeManager.tsx                       # Manage brand-size combinations
  ClothingReports/
    ClothingReportsTabContent.tsx
    ClothingReportsList/
      ClothingReportsList.tsx
      _ClothingReportsDataTable.tsx
      columns.tsx
      actions.server.ts
      fallback/ClothingReportsTableSkeleton.tsx
  EmployeeDeliveries/
    EmployeeDeliveriesTabContent.tsx
    EmployeeDeliveriesList/
      EmployeeDeliveriesList.tsx
      _EmployeeDeliveriesDataTable.tsx
      columns.tsx
      actions.server.ts
      fallback/EmployeeDeliveriesTableSkeleton.tsx
  ClothingDelivery/
    components/
      DeliveryWizard.tsx
      StepSelectEmployee.tsx
      StepDeliveryType.tsx
      StepAddItems.tsx
      StepSignature.tsx
      StepConfirm.tsx
      SignaturePad.tsx
    actions/actionsServer.ts

src/app/clothing/
  page.tsx                                           # Redirect logic
  login/page.tsx                                     # Login page
  (panel)/layout.tsx                                 # Auth guard + provider
  (panel)/delivery/page.tsx                          # Wizard page
  thanks/page.tsx                                    # Post-delivery confirmation
  clothing-layout-provider.tsx                       # Context provider
```

### Modified Files

```
prisma/schema.prisma                                 # New models + enum
src/features/Empresa/RRHH/RrhhTabContent.tsx         # Add "items-maestro" subtab
src/features/Employees/EmpleadoID/components/EmployeeDetailClient.tsx  # Add "Indumentaria" tab
src/features/Permissions/permissions-map.ts           # Add new tab entries
src/shared/utils/mappers.ts                          # Add clothingDeliveryTypeLabels
```

---

## Task 1: Prisma Schema + Migration

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_clothing_tables/migration.sql`

- [ ] **Step 1: Add enum and models to `prisma/schema.prisma`**

Add the `clothing_delivery_type` enum and 6 models: `clothing_brands`, `clothing_sizes`, `clothing_items`, `clothing_item_brand_sizes`, `clothing_deliveries`, `clothing_delivery_items`.

Follow existing patterns: UUID PK with `@default(dbgenerated("gen_random_uuid()"))`, `company_id` FK with cascade, `is_active` with `@default(true)`, timestamps.

Relations:

- `clothing_deliveries.employee_id` → `employees.id`
- `clothing_deliveries.delivered_by_id` → `employees.id`
- `clothing_delivery_items` → `clothing_deliveries`, `clothing_items`, `clothing_brands`, `clothing_sizes`
- `clothing_item_brand_sizes` → `clothing_items`, `clothing_brands`, `clothing_sizes`

Unique constraints:

- `clothing_brands`: `@@unique([name, company_id])`
- `clothing_sizes`: `@@unique([name, company_id])`
- `clothing_items`: `@@unique([name, company_id])`
- `clothing_item_brand_sizes`: `@@unique([clothing_item_id, clothing_brand_id, clothing_size_id])`

- [ ] **Step 2: Generate migration SQL with `prisma migrate diff`**

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Review output — take ONLY the clothing-related changes (ignore drift).

- [ ] **Step 3: Create migration folder and write SQL**

```bash
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_add_clothing_tables
```

Write ONLY the relevant `CREATE TABLE`, `CREATE TYPE`, and constraint statements into `migration.sql`. Also include the storage bucket:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('clothing-signatures', 'clothing-signatures', true)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 4: Apply migration**

```bash
npx prisma db execute --file prisma/migrations/YYYYMMDDHHMMSS_add_clothing_tables/migration.sql
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_add_clothing_tables
npx prisma generate
```

- [ ] **Step 5: Verify with MCP supabase-LOCAL**

Query `information_schema.columns` for all 6 new tables and confirm columns/types are correct.

- [ ] **Step 6: Run `npm run check-types`**

---

## Task 2: Shared Utilities (Mappers, Types, Query Invalidation)

**Files:**

- Create: `src/features/Clothing/utils/mappers.ts`
- Create: `src/features/Clothing/utils/queryInvalidation.ts`
- Create: `src/features/Clothing/types/index.ts`
- Modify: `src/shared/utils/mappers.ts`

- [ ] **Step 1: Create `src/features/Clothing/utils/mappers.ts`**

```typescript
import type { clothing_delivery_type } from '@prisma/client';

export const clothingDeliveryTypeLabels: Record<clothing_delivery_type, string> = {
  PLANNED_CCT: 'Planificada CCT',
  PLANNED_EPP: 'Planificada EPP',
  REPLACEMENT: 'Reposición',
};

import type { BadgeProps } from '@/components/ui/badge';

export const clothingDeliveryTypeBadges: Record<clothing_delivery_type, NonNullable<BadgeProps['variant']>> = {
  PLANNED_CCT: 'default',
  PLANNED_EPP: 'secondary',
  REPLACEMENT: 'outline',
};
```

- [ ] **Step 2: Create `src/features/Clothing/utils/queryInvalidation.ts`**

```typescript
import type { QueryClient } from '@tanstack/react-query';

export function invalidateAllClothingQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['clothing-brands'] });
  queryClient.invalidateQueries({ queryKey: ['clothing-sizes'] });
  queryClient.invalidateQueries({ queryKey: ['clothing-items'] });
  queryClient.invalidateQueries({ queryKey: ['clothing-reports'] });
  queryClient.invalidateQueries({ queryKey: ['employee-deliveries'] });
}
```

- [ ] **Step 3: Create `src/features/Clothing/types/index.ts`**

Empty initially — types will be inferred from server actions and exported as they're created.

- [ ] **Step 4: Note on imports**

DataTable column files and components should import labels directly from `@/features/Clothing/utils/mappers` — do NOT re-export from `src/shared/utils/mappers.ts` to avoid coupling `shared/` back into `features/`.

- [ ] **Step 5: Run `npm run check-types`**

---

## Task 3: CRUD Server Actions (Catalog)

**Files:**

- Create: `src/features/Clothing/actions/actionsServer.ts`

- [ ] **Step 1: Create shared CRUD server actions**

```typescript
'use server';

import { prisma } from '@/shared/lib/prisma';
import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/lib/server-utils';

const logger = new Logger('features/Clothing');

// === BRANDS ===
export async function createClothingBrand(name: string) { ... }
export async function updateClothingBrand(id: string, name: string) { ... }
export async function toggleClothingBrandActive(id: string, isActive: boolean) { ... }

// === SIZES ===
export async function createClothingSize(name: string) { ... }
export async function updateClothingSize(id: string, name: string) { ... }
export async function toggleClothingSizeActive(id: string, isActive: boolean) { ... }

// === ITEMS ===
export async function createClothingItem(data: { name: string; code?: string; description?: string }) { ... }
export async function updateClothingItem(id: string, data: { name: string; code?: string; description?: string }) { ... }
export async function toggleClothingItemActive(id: string, isActive: boolean) { ... }

// === ITEM BRAND SIZES (pivot) ===
export async function getItemBrandSizes(itemId: string) { ... }
export async function setItemBrandSizes(itemId: string, entries: { brandId: string; sizeId: string }[]) { ... }

// === CONTEXT (standalone route) ===
export async function getClothingOperatorContext() { ... }
export async function clothingLogin(email: string, password: string) { ... }
```

Each function follows the pattern: Logger.debug → try/catch → prisma query → Logger.error on failure → throw.

- [ ] **Step 2: Export inferred types**

```typescript
export type ClothingBrand = Awaited<ReturnType<typeof createClothingBrand>>;
export type ClothingItem = Awaited<ReturnType<typeof createClothingItem>>;
```

- [ ] **Step 3: Run `npm run check-types`**

---

## Task 4: Navigation Wiring — RRHH Subtab Container

**Files:**

- Create: `src/features/Clothing/ClothingCatalogTabContent.tsx`
- Modify: `src/features/Empresa/RRHH/RrhhTabContent.tsx`

- [ ] **Step 1: Create `ClothingCatalogTabContent.tsx`**

Server Component that renders a `TabsManagerServer` with `paramName="clothing-tab"` containing 4 subtabs: Articulos, Marcas, Talles, Reportes. Each subtab wraps its list in `<Suspense>` with a dedicated skeleton.

Reference: `RrhhTabContent.tsx` pattern — `TabsManagerServer` with `paramName`, `moduleSlug: 'empresa'`, and `tabSlug` matching permissions-map entries.

```typescript
import { TabsManagerServer } from '@/features/TabsManager';

export default async function ClothingCatalogTabContent({ searchParams, permissions }) {
  return (
    <TabsManagerServer
      paramName="clothing-tab"
      searchParams={searchParams}
      defaultTab="articulos"
      permissions={permissions}
      tabs={[
        { value: 'articulos', label: 'Artículos', moduleSlug: 'empresa', tabSlug: 'articulos_indumentaria',
          content: <Suspense fallback={<Skeleton />}><ClothingItemsTabContent searchParams={searchParams} permissions={permissions} /></Suspense> },
        { value: 'marcas', label: 'Marcas', moduleSlug: 'empresa', tabSlug: 'marcas_indumentaria',
          content: <Suspense fallback={<Skeleton />}><ClothingBrandsTabContent searchParams={searchParams} permissions={permissions} /></Suspense> },
        { value: 'talles', label: 'Talles', moduleSlug: 'empresa', tabSlug: 'talles_indumentaria',
          content: <Suspense fallback={<Skeleton />}><ClothingSizesTabContent searchParams={searchParams} permissions={permissions} /></Suspense> },
        { value: 'reportes', label: 'Reportes', moduleSlug: 'empresa', tabSlug: 'reportes_indumentaria',
          content: <Suspense fallback={<Skeleton />}><ClothingReportsTabContent searchParams={searchParams} permissions={permissions} /></Suspense> },
      ]}
    />
  );
}
```

- [ ] **Step 2: Add subtab entry to `RrhhTabContent.tsx`**

Add a new entry to the `tabs` array in the existing `TabsManagerServer`:

```typescript
{
  value: 'items-maestro',
  label: <span className="flex items-center gap-2"><Shirt className="h-4 w-4" />Artículos</span>,
  moduleSlug: 'empresa',
  tabSlug: 'listado_maestro_articulos',
  content: (
    <Card>
      <CardHeader className="bg-gh dark:bg-muted/50 border-b-2">
        <CardTitle>Listado Maestro de Artículos</CardTitle>
        <CardDescription>Gestión del catálogo de indumentaria y EPP</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ClothingCatalogTabContent searchParams={searchParams} permissions={permissions} />
      </CardContent>
    </Card>
  ),
}
```

- [ ] **Step 3: Run `npm run check-types`**

---

## Task 5: Brands DataTable — DELEGATE TO `table-expert`

**Files to create (all inside `src/features/Clothing/ClothingBrands/`):**

- `ClothingBrandsTabContent.tsx`
- `ClothingBrandsList/ClothingBrandsList.tsx`
- `ClothingBrandsList/actions.server.ts`
- `ClothingBrandsList/columns.tsx`
- `ClothingBrandsList/components/_ClothingBrandsDataTable.tsx`
- `ClothingBrandsList/fallback/ClothingBrandsTableSkeleton.tsx`

**Delegate entirely to `table-expert` agent** with these instructions:

> CREATE mode. Entity: `clothing_brands`. Prisma model: `clothing_brands`.
> Company-scoped (`company_id`). Has `is_active` (active/inactive toggle in toolbar).
>
> Columns:
>
> - `name` (String, NOT NULL) — text filter
> - `is_active` (Boolean) — faceted filter (Activo/Inactivo)
> - `created_at` (DateTime) — dateRange filter, hidden by default
> - `actions` — Edit / Delete (protected by permissions `empresa:marcas_indumentaria:update/delete`)
>
> Table ID: `clothing-brands`. Query key: `['clothing-brands']`.
> Permission: module `empresa`, tab `marcas_indumentaria`.
> Search placeholder: "Buscar por nombre..."
> Empty message: "No se encontraron marcas"
> Export: yes, filename "Marcas de Indumentaria".
>
> Reference: `src/features/Employees/Empleados/EmployeeList/` for all patterns.
> Use `@.claude/agents/table-expert.md` and skill `@vercel-react-best-practices`.

- [ ] **Step 1: Delegate to table-expert agent (CREATE mode)**
- [ ] **Step 2: Verify output with `npm run check-types && npm run lint`**

---

## Task 6: Brand Create/Edit Form

**Files:**

- Create: `src/features/Clothing/ClothingBrands/components/ClothingBrandForm.tsx`

- [ ] **Step 1: Create form component**

`'use client'` dialog with shadcn `Form` + `react-hook-form` + `zod`. Schema: `{ name: z.string().min(1, 'El nombre es requerido') }`. Calls `createClothingBrand` or `updateClothingBrand` from shared actions. Invalidates `['clothing-brands']` on success.

Use shadcn MCP to verify `Dialog`, `Form`, `Input`, `Button` API.

- [ ] **Step 2: Wire form into DataTable toolbar and actions column**

Add "Nueva Marca" button to toolbar (protected by `PermissionGuard` create). Add "Editar" action in columns that opens the form pre-filled.

- [ ] **Step 3: Run `npm run check-types && npm run lint`**

---

## Task 7: Sizes DataTable — DELEGATE TO `table-expert`

**Same pattern as Task 5** but for `clothing_sizes`.

> CREATE mode. Entity: `clothing_sizes`. Same structure as brands.
> Table ID: `clothing-sizes`. Query key: `['clothing-sizes']`.
> Permission: `empresa:talles_indumentaria`.
> Search placeholder: "Buscar por nombre..."
> Empty message: "No se encontraron talles"
> Export: filename "Talles de Indumentaria".

- [ ] **Step 1: Delegate to table-expert agent (CREATE mode)**
- [ ] **Step 2: Verify with `npm run check-types && npm run lint`**

---

## Task 8: Size Create/Edit Form

**Same pattern as Task 6** but for sizes. Form schema: `{ name: z.string().min(1) }`.

- [ ] **Step 1: Create `ClothingSizeForm.tsx`**
- [ ] **Step 2: Wire into toolbar + actions column**
- [ ] **Step 3: Run `npm run check-types && npm run lint`**

---

## Task 9: Items DataTable — DELEGATE TO `table-expert`

**Files to create (all inside `src/features/Clothing/ClothingItems/`):**

> CREATE mode. Entity: `clothing_items`.
>
> Columns:
>
> - `name` (String, NOT NULL) — text filter
> - `code` (String, nullable) — text filter
> - `description` (String, nullable) — text filter, hidden by default
> - `is_active` (Boolean) — faceted filter
> - `created_at` (DateTime) — dateRange filter, hidden by default
> - `actions` — Ver detalle / Editar / Eliminar
>
> Table ID: `clothing-items`. Query key: `['clothing-items']`.
> Permission: `empresa:articulos_indumentaria`.
> Search placeholder: "Buscar por nombre o código..."
> Empty message: "No se encontraron artículos"
> Export: filename "Artículos de Indumentaria".

- [ ] **Step 1: Delegate to table-expert agent (CREATE mode)**
- [ ] **Step 2: Verify with `npm run check-types && npm run lint`**

---

## Task 10: Item Create/Edit Form + Brand-Size Manager

**Files:**

- Create: `src/features/Clothing/ClothingItems/components/ClothingItemForm.tsx`
- Create: `src/features/Clothing/ClothingItems/components/ItemBrandSizeManager.tsx`

- [ ] **Step 1: Create `ClothingItemForm.tsx`**

Dialog form with schema: `{ name: z.string().min(1), code: z.string().optional(), description: z.string().optional() }`. Calls `createClothingItem` / `updateClothingItem`.

- [ ] **Step 2: Create `ItemBrandSizeManager.tsx`**

`'use client'` component shown below the form when editing an item. UI:

- Fetches current `clothing_item_brand_sizes` for this item via `getItemBrandSizes(itemId)` (useQuery)
- Lists existing brand-size combinations grouped by brand
- "Agregar combinación" button: combobox to select brand → multi-select for sizes
- "Eliminar" per combination
- Calls `setItemBrandSizes(itemId, entries)` to persist changes

Use `useQuery` for fetching brands list and sizes list (on-demand when combobox opens).

- [ ] **Step 3: Wire form + manager into DataTable**

"Ver detalle" action opens the form in edit mode with the brand-size manager below.

- [ ] **Step 4: Run `npm run check-types && npm run lint`**

---

## Task 11: Reports DataTable — DELEGATE TO `table-expert`

**Files to create (all inside `src/features/Clothing/ClothingReports/`):**

> CREATE mode. Entity: `clothing_deliveries` (readonly, no CRUD).
>
> Columns:
>
> - `delivered_at` (DateTime) — dateRange filter
> - `employee` (FK → employees) — accessorFn: `[file] lastname firstname`, faceted filter
> - `delivered_by` (FK → employees) — accessorFn: `[file] lastname firstname`, faceted filter
> - `delivery_type` (enum clothing_delivery_type) — faceted filter with labels from mappers
> - `items_summary` (virtual) — no filter, shows count of items "3 artículos"
> - `signature` (computed from signature_url) — faceted boolean "Con firma"/"Sin firma"
> - `notes` (String, nullable) — text filter, hidden by default
> - `created_at` (DateTime) — dateRange, hidden
>
> Advanced filters (custom where):
>
> - Employee position (FK through employees → company_positions)
> - Specific article (M:M through clothing_delivery_items → clothing_items)
>
> Prisma include: `{ employee: { select: { id, firstname, lastname, file } }, delivered_by_employee: { select: { id, firstname, lastname, file } }, clothing_delivery_items: { include: { clothing_item, clothing_brand, clothing_size } } }`
>
> Table ID: `clothing-reports`. Query key: `['clothing-reports']`.
> Permission: `empresa:reportes_indumentaria` (view only).
> No actions column. Readonly.
> Search placeholder: "Buscar por notas..."
> Empty message: "No se encontraron entregas"
> Export: filename "Reporte de Entregas", formatters for enum→label, date→DD/MM/YYYY, boolean→Sí/No.
>
> **Note:** The legajo field in the `employees` Prisma model is `file` (NOT `file_number`). The Prisma select for employee relations must include `file`. Display format: `[file] lastname firstname`.

- [ ] **Step 1: Delegate to table-expert agent (CREATE mode)**
- [ ] **Step 2: Verify with `npm run check-types && npm run lint`**

---

## Task 12: Employee Deliveries DataTable — DELEGATE TO `table-expert`

**Files to create (all inside `src/features/Clothing/EmployeeDeliveries/`):**

> CREATE mode. Entity: `clothing_deliveries` filtered by `employee_id` (prop).
> Readonly — no CRUD, no actions column.
>
> Columns:
>
> - `delivered_at` (DateTime) — dateRange
> - `delivery_type` (enum) — faceted filter
> - `delivered_by` (FK → employees) — accessorFn: `[file] lastname`, faceted filter
> - `items_detail` (virtual) — tooltip/expandable showing articles with brand, size, quantity
> - `signature` (computed) — icon Check/X
> - `notes` (String, nullable) — text filter, hidden
>
> The `employee_id` is passed as a parameter to the server action, NOT from URL searchParams.
>
> Table ID: `employee-deliveries`. Query key: `['employee-deliveries', employeeId]`.
> Permission: `empleados:indumentaria_empleado` (view only).
> Search placeholder: "Buscar por notas..."
> Empty message: "No se encontraron entregas para este empleado"
> Export: filename "Entregas del Empleado".
>
> **Note:** The legajo field in the `employees` Prisma model is `file` (NOT `file_number`). The Prisma select for `delivered_by` must include `file`. Display format: `[file] lastname`.

- [ ] **Step 1: Delegate to table-expert agent (CREATE mode)**
- [ ] **Step 2: Verify with `npm run check-types && npm run lint`**

---

## Task 13: Employee Detail Tab Wiring

**Files:**

- Create: `src/features/Clothing/EmployeeDeliveries/EmployeeDeliveriesTabContent.tsx`
- Modify: `src/features/Employees/EmpleadoID/components/EmployeeDetailClient.tsx`

- [ ] **Step 1: Create `EmployeeDeliveriesTabContent.tsx`**

Server Component that receives `employeeId` and `searchParams`, fetches initial data, and renders the `EmployeeDeliveriesList`.

- [ ] **Step 2: Find parent page that renders `EmployeeDetailClient.tsx`**

Read the parent Server Component (likely `src/app/dashboard/empresa/empleados/[id]/page.tsx` or `src/features/Employees/EmpleadoID/EmpleadoIdPage.tsx`). Understand how slots (`documentsSlot`, `diagramsSlot`) are passed. The new "Indumentaria" tab needs either:

- A `clothingSlot` prop passed from the parent (preferred, matches existing pattern), OR
- Inline content if the component accepts it

- [ ] **Step 3: Add `canViewClothing` guard and new tab to `EmployeeDetailClient.tsx`**

Add permission check mirroring `hasDiagramAccess`:

```typescript
const canViewClothing = canView('empleados', 'indumentaria_empleado');
```

Add tab entry conditionally (spread pattern), after "documents" and before "diagrams":

```typescript
...(canViewClothing ? [{
  value: 'clothing',
  label: <span className="flex items-center gap-2"><Shirt className="h-4 w-4" />Indumentaria</span>,
  moduleSlug: 'empleados' as const,
  tabSlug: 'indumentaria_empleado',
  disabled: currentMode === 'new',
  content: clothingSlot,  // passed from parent Server Component
}] : []),
```

Import `Shirt` from `lucide-react`.

- [ ] **Step 4: Update parent Server Component**

Pass the `clothingSlot` prop with `<Suspense>` + skeleton wrapping `<EmployeeDeliveriesTabContent>`.

- [ ] **Step 5: Run `npm run check-types && npm run lint`**

---

## Task 14: Standalone Route — Auth (Login + Layout + Context)

**Files:**

- Create: `src/app/clothing/page.tsx`
- Create: `src/app/clothing/login/page.tsx`
- Create: `src/app/clothing/(panel)/layout.tsx`
- Create: `src/app/clothing/clothing-layout-provider.tsx`
- Create: `src/app/clothing/thanks/page.tsx`

- [ ] **Step 1: Create `getClothingOperatorContext()` in `src/features/Clothing/actions/actionsServer.ts`**

```typescript
export async function getClothingOperatorContext() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { employee_id: true } });
  if (!profile?.employee_id) return null;

  const employee = await prisma.employees.findUnique({
    where: { id: profile.employee_id },
    select: { id: true, firstname: true, lastname: true, file: true, company_id: true },
  });
  if (!employee) return null;

  return {
    userId: user.id,
    employeeId: employee.id,
    employeeName: `${employee.lastname} ${employee.firstname}`,
    employeeFile: employee.file,
    companyId: employee.company_id!,
  };
}
export type ClothingOperatorContext = NonNullable<Awaited<ReturnType<typeof getClothingOperatorContext>>>;
```

Also add `clothingLogin(email, password)` server action following the `operatorLogin` pattern but using **Prisma for DB queries** (NOT `supabase.from('profile').select(...)` like `operatorLogin` does). Use `supabaseServer()` ONLY for `auth.signInWithPassword()`. Profile/employee lookups must use `prisma.profile.findUnique()` and `prisma.employees.findUnique()`. Then set `actualComp` cookie → return success/error.

- [ ] **Step 2: Create `clothing-layout-provider.tsx`**

`'use client'` component. Creates a `QueryClientProvider` and `ClothingLayoutContext.Provider`. Exports `useClothingContext()` hook.

Pattern: copy `src/app/operator/operator-layout-provider.tsx` and adapt. Remove `sectorId`/`workshopId` fields.

- [ ] **Step 3: Create `(panel)/layout.tsx`**

Server Component. Call `getClothingOperatorContext()` → if null, `redirect('/clothing/login')`. Wrap children in `ClothingLayoutProvider`. Minimal layout: header with user name + logout button, `<main>` container.

- [ ] **Step 4: Create `login/page.tsx`**

Server Component. Check if user already authenticated (call `getClothingOperatorContext()`) → if yes, redirect to `/clothing/delivery`. Otherwise render `ClothingLoginForm`.

Create `ClothingLoginForm` as `'use client'` component with `react-hook-form` + `zod`. Email + password fields. Call `clothingLogin()` server action. On success: `router.push('/clothing/delivery')`.

Pattern: copy `src/features/OperatorPanel/components/LoginForm.tsx` and adapt.

- [ ] **Step 5: Create root `page.tsx`**

Redirect logic: check session → if authenticated with valid context, redirect to `/clothing/delivery`. Otherwise redirect to `/clothing/login`.

- [ ] **Step 6: Create `thanks/page.tsx`**

Simple page with success message. Auto-redirect to `/clothing/delivery` after 5 seconds using `useEffect` + `setTimeout` + `router.push`.

Pattern: check `src/app/maintenance/thanks/page.tsx`.

- [ ] **Step 7: Run `npm run check-types && npm run lint`**

---

## Task 15: Standalone Route — Delivery Wizard

**Files:**

- Create: `src/app/clothing/(panel)/delivery/page.tsx`
- Create: `src/features/Clothing/ClothingDelivery/components/DeliveryWizard.tsx`
- Create: `src/features/Clothing/ClothingDelivery/components/StepSelectEmployee.tsx`
- Create: `src/features/Clothing/ClothingDelivery/components/StepDeliveryType.tsx`
- Create: `src/features/Clothing/ClothingDelivery/components/StepAddItems.tsx`
- Create: `src/features/Clothing/ClothingDelivery/components/StepSignature.tsx`
- Create: `src/features/Clothing/ClothingDelivery/components/StepConfirm.tsx`
- Create: `src/features/Clothing/ClothingDelivery/components/SignaturePad.tsx`
- Create: `src/features/Clothing/ClothingDelivery/actions/actionsServer.ts`

- [ ] **Step 1: Install `signature_pad`**

```bash
npm install signature_pad
```

- [ ] **Step 2: Create wizard server actions**

`src/features/Clothing/ClothingDelivery/actions/actionsServer.ts`:

```typescript
'use server';
export async function getEmployeesForDelivery(companyId: string, search?: string) { ... }
export async function getItemsForDelivery(companyId: string) { ... }
export async function getBrandsForItem(itemId: string) { ... }
export async function getSizesForItemBrand(itemId: string, brandId: string) { ... }
export async function createClothingDelivery(data: {
  employeeId: string; deliveredById: string; deliveryType: clothing_delivery_type;
  signatureUrl?: string; notes?: string; deliveredAt: Date; companyId: string;
  items: { clothingItemId: string; clothingBrandId?: string; clothingSizeId?: string; quantity: number }[];
}) { ... }
export async function uploadSignatureImage(formData: FormData) { ... }
```

- [ ] **Step 3: Create `SignaturePad.tsx`**

`'use client'` component using `signature_pad` library. Load dynamically with `next/dynamic` (`ssr: false`). Props: `onSave(dataUrl: string)`, `onClear()`. Canvas that auto-resizes. "Limpiar" and "Confirmar" buttons.

- [ ] **Step 4: Create `DeliveryWizard.tsx`**

`'use client'` component with 5-step wizard. State: `currentStep`, `wizardData` (all step values). Navigation: previous/next buttons. Step validation before advancing.

Layout: `grid gap-6 lg:grid-cols-3` — side stepper card (`lg:col-span-1`) + content card (`lg:col-span-2`). On mobile: stepper collapses to compact indicator.

Pattern: reference `src/features/Mantenimiento/NuevoPedido/components/NuevoPedidoChecklistForm.tsx`.

- [ ] **Step 5: Create `StepSelectEmployee.tsx`**

Combobox/search for employees. Display: `[file] Apellido Nombre`. On select, show card with employee info (position, CUIL). Uses `useQuery` with `getEmployeesForDelivery`. Search is debounced.

- [ ] **Step 6: Create `StepDeliveryType.tsx`**

Simple select with 3 options from `clothing_delivery_type` enum. Uses shadcn `Select` component.

- [ ] **Step 7: Create `StepAddItems.tsx`**

Dynamic form array. Each row: article combobox → brand combobox (filtered by article via `getBrandsForItem`) → size combobox (filtered by article+brand via `getSizesForItemBrand`) → quantity input. "Agregar artículo" button. "Eliminar" per row. Minimum 1 item validation.

Uses `useQuery` for each combobox's options (enabled when parent field has value).

- [ ] **Step 8: Create `StepSignature.tsx`**

Renders `SignaturePad` (loaded dynamically). On confirm, calls `uploadSignatureImage` to upload to Storage. Stores returned URL in wizard state.

- [ ] **Step 9: Create `StepConfirm.tsx`**

Readonly summary of all steps. Employee card + delivery type badge + items table + signature preview image. "Confirmar Entrega" button. On confirm: call `createClothingDelivery` → on success, redirect to `/clothing/thanks`.

Include a disabled "Descargar Comprobante PDF" button with tooltip "Próximamente" (placeholder per spec Section 6).

- [ ] **Step 10: Create `delivery/page.tsx`**

Thin page that renders `<DeliveryWizard />`.

- [ ] **Step 11: Run `npm run check-types && npm run lint`**

---

## Task 16a: Permissions Map Update (Code Only — before DataTables)

**Files:**

- Modify: `src/features/Permissions/permissions-map.ts`

**IMPORTANT:** This task MUST be completed before Tasks 5-12 (DataTables). The DataTable components reference permission slugs that must exist in the map for TypeScript to compile.

- [ ] **Step 1: Generate UUIDs for new tabs**

Generate 6 UUIDs:

- `listado_maestro_articulos` (parent tab under RRHH)
- `articulos_indumentaria`
- `marcas_indumentaria`
- `talles_indumentaria`
- `reportes_indumentaria`
- `indumentaria_empleado` (under detalle-empleado in empleados module)

- [ ] **Step 2: Update `permissions-map.ts`**

Add entries under empresa > rrhh > subtabs:

```typescript
'listado_maestro_articulos': {
  slug: 'listado_maestro_articulos', name: 'Listado Maestro de Artículos',
  tabId: '<UUID1>', parent: 'rrhh', allowedActions: ['view'],
  subtabs: {
    articulos_indumentaria: { slug: 'articulos_indumentaria', tabId: '<UUID2>', parent: 'listado_maestro_articulos', allowedActions: ['view','create','update','delete'] },
    marcas_indumentaria: { ... },
    talles_indumentaria: { ... },
    reportes_indumentaria: { slug: 'reportes_indumentaria', tabId: '<UUID5>', parent: 'listado_maestro_articulos', allowedActions: ['view'] },
  },
}
```

Add under empleados > detalle-empleado > subtabs:

```typescript
indumentaria_empleado: { slug: 'indumentaria_empleado', tabId: '<UUID6>', parent: 'detalle-empleado', allowedActions: ['view'] }
```

- [ ] **Step 3: Run `npm run check-types`**

---

## Task 16b: Permissions SQL Migration (after all code is done)

**Files:**

- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_clothing_permissions/migration.sql`

- [ ] **Step 1: Verify order_index**

Query the DB to get the current max order_index under RRHH and detalle-empleado:

```sql
SELECT MAX(order_index) FROM tabs WHERE parent_tab_id = '10000000-0000-0000-0000-000000000002';
SELECT MAX(order_index) FROM tabs WHERE parent_tab_id = '20000000-0000-0000-0000-000000000006';
```

Use `MAX + 1` for the new entries.

- [ ] **Step 2: Write migration SQL**

```sql
-- Insert tabs (use verified order_index values)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('<UUID1>', 'e0478383-1287-4b5e-a727-985baf867173', 'listado_maestro_articulos', 'Listado Maestro de Artículos', 'Catálogo de indumentaria y EPP', <MAX+1>, '10000000-0000-0000-0000-000000000002'),
('<UUID2>', 'e0478383-1287-4b5e-a727-985baf867173', 'articulos_indumentaria', 'Artículos', 'Gestión de artículos', 1, '<UUID1>'),
('<UUID3>', 'e0478383-1287-4b5e-a727-985baf867173', 'marcas_indumentaria', 'Marcas', 'Gestión de marcas', 2, '<UUID1>'),
('<UUID4>', 'e0478383-1287-4b5e-a727-985baf867173', 'talles_indumentaria', 'Talles', 'Gestión de talles', 3, '<UUID1>'),
('<UUID5>', 'e0478383-1287-4b5e-a727-985baf867173', 'reportes_indumentaria', 'Reportes', 'Reportes de entregas', 4, '<UUID1>'),
('<UUID6>', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'indumentaria_empleado', 'Indumentaria', 'Historial de entregas del empleado', <MAX+1>, '20000000-0000-0000-0000-000000000006')
ON CONFLICT (id) DO NOTHING;

-- Assign all permissions to admin role
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM roles r, tabs t, actions a
WHERE r.slug = 'admin'
AND t.slug IN ('listado_maestro_articulos', 'articulos_indumentaria', 'marcas_indumentaria', 'talles_indumentaria', 'reportes_indumentaria', 'indumentaria_empleado')
AND a.slug IN ('view', 'create', 'update', 'delete')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
```

- [ ] **Step 3: Apply migration**

```bash
npx prisma db execute --file prisma/migrations/YYYYMMDDHHMMSS_add_clothing_permissions/migration.sql
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_add_clothing_permissions
```

- [ ] **Step 4: Verify with MCP supabase-LOCAL**

Query tabs and role_permissions to confirm inserts.

- [ ] **Step 5: Run `npm run check-types && npm run lint`**

---

## Execution Order & Dependencies

```
Task 1 (Schema + Migration)
  ↓
Task 2 (Utils)
  ↓
Task 3 (CRUD Actions)
  ↓
Task 16a (Permissions Map — code only, NO SQL migration)
  ↓   ← MUST be before DataTables (TypeScript needs the slugs)
Task 4 (Nav Wiring)
  ↓
┌─────────────────────────────────────────┐
│ Tasks 5-6 (Brands) │ Tasks 7-8 (Sizes) │  ← parallelizable
└─────────────────────────────────────────┘
  ↓
Tasks 9-10 (Items + Brand-Size Manager)
  ↓
┌───────────────────────────────────────────────┐
│ Task 11 (Reports) │ Task 12 (Employee Deliv.) │  ← parallelizable
└───────────────────────────────────────────────┘
  ↓
Task 13 (Employee Detail Tab)
  ↓
Task 14 (Standalone Auth) ← can start after Task 3
  ↓
Task 15 (Wizard)
  ↓
Task 16b (Permissions SQL Migration) ← LAST
```

**Parallelizable groups:**

- Tasks 5+6 and Tasks 7+8 can run in parallel
- Tasks 11 and 12 can run in parallel
- Task 14 can start as soon as Task 3 is done (independent of DataTables)

---

## Notes for Implementer

1. **ALL DataTable tasks (5, 7, 9, 11, 12) MUST be delegated to `table-expert` agent** — never implement DataTables manually
2. **Use `@vercel-react-best-practices` skill** when writing React components — especially async-parallel, bundle-dynamic-imports, rerender-memo
3. **Use `@prisma-expert` skill** when writing schema and server actions
4. **Use shadcn MCP** before implementing any UI component to verify the latest API
5. **Use Context7 MCP** for library docs (signature_pad, react-hook-form, etc.)
6. **Verify after every task**: `npm run check-types && npm run lint`
7. **No commits until user asks** — follow git-rules.md
8. **Logger, not console.\*** — all server actions use `new Logger('features/Clothing')`
9. **No `:any`** — all types inferred from Prisma or Zod
10. **moment.js for dates** — not date-fns
