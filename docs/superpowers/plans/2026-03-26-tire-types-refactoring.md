# Tire Types Refactoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear entidad `tire_types` (medida + tipo banda), nueva tab Marcas y tab Tipos bajo Gomería, y refactorizar `tires` para usar `tire_type_id` en vez de `size`/`tread_type` directos.

**Architecture:** Nueva tabla `tire_types` independiente de marcas. `tires` mantiene `brand_id` y agrega `tire_type_id`. Dos tabs nuevas (Marcas, Tipos) como hermanas bajo Gomería con DataTable paginada + lazy-load facets. Se elimina el widget colapsable TireBrandManager del Catálogo.

**Tech Stack:** Prisma (schema + migration), Next.js Server Components, React Query, shadcn/ui DataTable, Zod forms.

**Spec:** `docs/superpowers/specs/2026-03-26-tire-types-refactoring-design.md`

---

## File Map

### New Files

| File                                                                        | Responsibility                                         |
| --------------------------------------------------------------------------- | ------------------------------------------------------ |
| `prisma/migrations/YYYYMMDD_add_tire_types/migration.sql`                   | SQL: create table, migrate data, alter tires           |
| `src/features/Mantenimiento/Gomeria/Marcas/MarcasTabContent.tsx`            | Server Component — fetch data, render list             |
| `src/features/Mantenimiento/Gomeria/Marcas/components/MarcasList.tsx`       | Server Component — paginated fetch + DataTable wrapper |
| `src/features/Mantenimiento/Gomeria/Marcas/components/_MarcasDataTable.tsx` | Client Component — filters, facets, export, toolbar    |
| `src/features/Mantenimiento/Gomeria/Marcas/components/columns.tsx`          | Column definitions for marcas table                    |
| `src/features/Mantenimiento/Gomeria/Marcas/components/MarcaForm.tsx`        | Dialog CRUD — crear/editar marca                       |
| `src/features/Mantenimiento/Gomeria/Marcas/actions/actions.server.ts`       | Server actions: paginated, export, facets, CRUD        |
| `src/features/Mantenimiento/Gomeria/Marcas/fallback/MarcasSkeleton.tsx`     | Skeleton fallback                                      |
| `src/features/Mantenimiento/Gomeria/Tipos/TiposTabContent.tsx`              | Server Component — fetch data, render list             |
| `src/features/Mantenimiento/Gomeria/Tipos/components/TiposList.tsx`         | Server Component — paginated fetch + DataTable wrapper |
| `src/features/Mantenimiento/Gomeria/Tipos/components/_TiposDataTable.tsx`   | Client Component — filters, facets, export, toolbar    |
| `src/features/Mantenimiento/Gomeria/Tipos/components/columns.tsx`           | Column definitions for tipos table                     |
| `src/features/Mantenimiento/Gomeria/Tipos/components/TipoForm.tsx`          | Dialog CRUD — crear/editar tipo                        |
| `src/features/Mantenimiento/Gomeria/Tipos/actions/actions.server.ts`        | Server actions: paginated, export, facets, CRUD        |
| `src/features/Mantenimiento/Gomeria/Tipos/fallback/TiposSkeleton.tsx`       | Skeleton fallback                                      |

### Modified Files

| File                                                                         | Change                                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                                       | Add `tire_types` model, modify `tires` model                                    |
| `src/features/Mantenimiento/Gomeria/GomeriaTabContent.tsx`                   | Add 2 new tabs (Marcas, Tipos)                                                  |
| `src/features/Mantenimiento/Gomeria/Catalogo/CatalogoTabContent.tsx`         | Remove TireBrandManager                                                         |
| `src/features/Mantenimiento/Gomeria/Catalogo/actions/actions.server.ts`      | Update TIRE_SELECT, queries, facets to use `tire_type` relation                 |
| `src/features/Mantenimiento/Gomeria/Catalogo/components/columns.tsx`         | Update `size`/`tread_type` columns to resolve from `tire_type`                  |
| `src/features/Mantenimiento/Gomeria/Catalogo/components/_TiresDataTable.tsx` | Update facets for `size`/`tread_type` via `tire_type`, update export formatters |
| `src/features/Mantenimiento/Gomeria/Catalogo/components/TireForm.tsx`        | Replace `size`+`tread_type` fields with `tire_type_id` select                   |
| `src/features/Mantenimiento/Gomeria/Catalogo/components/TireBulkForm.tsx`    | Replace `size`+`tread_type` fields with `tire_type_id` select                   |
| `src/features/Permissions/permissions-map.ts`                                | Add `marcas_cubiertas` and `tipos_cubiertas` subtabs                            |

### Deleted Files

| File                                                                          | Reason                        |
| ----------------------------------------------------------------------------- | ----------------------------- |
| `src/features/Mantenimiento/Gomeria/Catalogo/components/TireBrandManager.tsx` | Moved to dedicated Marcas tab |

---

## Task 1: Prisma Schema — Add `tire_types` model and modify `tires`

**Files:**

- Modify: `prisma/schema.prisma` (lines 2604-2644)

- [ ] **Step 1: Add `tire_types` model to schema**

Add after the `tire_brands` model (after line 2616):

```prisma
model tire_types {
  id         String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name       String
  size       String
  tread_type TireTreadType
  company_id String        @db.Uuid
  is_active  Boolean       @default(true)
  created_at DateTime      @default(now()) @db.Timestamptz(6)
  updated_at DateTime      @updatedAt @db.Timestamptz(6)

  company company @relation(fields: [company_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  tires   tires[]

  @@unique([size, tread_type, company_id])
  @@schema("public")
}
```

- [ ] **Step 2: Modify `tires` model — add `tire_type_id`, remove `size`/`tread_type`**

In the `tires` model:

- Remove: `size String` and `tread_type TireTreadType`
- Add: `tire_type_id String @db.Uuid`
- Add relation: `tire_type tire_types @relation(fields: [tire_type_id], references: [id], onDelete: NoAction, onUpdate: NoAction)`

The modified `tires` model should have these fields (in order):

```prisma
model tires {
  id              String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  serial_number   String
  brand_id        String            @db.Uuid
  tire_type_id    String            @db.Uuid
  is_new          Boolean           @default(true)
  retread_level   TireRetreadLevel?
  tread_depth     Decimal?          @db.Decimal(5, 2)
  status          TireStatus        @default(AVAILABLE)
  discard_photo   String?
  discard_comment String?
  discarded_at    DateTime?         @db.Timestamptz(6)
  company_id      String            @db.Uuid
  is_active       Boolean           @default(true)
  created_at      DateTime          @default(now()) @db.Timestamptz(6)
  updated_at      DateTime          @updatedAt @db.Timestamptz(6)

  brand                      tire_brands              @relation(fields: [brand_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  tire_type                  tire_types               @relation(fields: [tire_type_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  company                    company                  @relation(fields: [company_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  vehicle_tire_positions     vehicle_tire_positions[]
  tire_service_items_current tire_service_items[]      @relation("tire_at_position")
  tire_service_items_new     tire_service_items[]      @relation("replacement_tire")

  @@unique([serial_number, company_id])
  @@schema("public")
}
```

---

## Task 2: Database Migration

**Files:**

- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_tire_types/migration.sql`

- [ ] **Step 1: Generate diff to see what Prisma wants**

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Review the output. Only take the relevant changes (create tire_types, alter tires).

- [ ] **Step 2: Create migration folder**

```bash
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_add_tire_types
```

- [ ] **Step 3: Write migration SQL**

Create `migration.sql` with this content:

```sql
-- 1. Create tire_types table
CREATE TABLE "public"."tire_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "tread_type" "public"."TireTreadType" NOT NULL,
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_types_pkey" PRIMARY KEY ("id")
);

-- 2. Unique constraint
ALTER TABLE "public"."tire_types" ADD CONSTRAINT "tire_types_size_tread_type_company_id_key"
    UNIQUE ("size", "tread_type", "company_id");

-- 3. FK to company
ALTER TABLE "public"."tire_types" ADD CONSTRAINT "tire_types_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 4. Migrate existing data: insert unique (size, tread_type, company_id) combinations
INSERT INTO "public"."tire_types" ("id", "name", "size", "tread_type", "company_id", "created_at", "updated_at")
SELECT DISTINCT ON (t.size, t.tread_type, t.company_id)
    gen_random_uuid(),
    t.size || ' ' || CASE t.tread_type
        WHEN 'SMOOTH' THEN 'Liso'
        WHEN 'MIXED' THEN 'Mixto'
        WHEN 'BLOCK' THEN 'Taco'
        ELSE t.tread_type::text
    END,
    t.size,
    t.tread_type,
    t.company_id,
    NOW(),
    NOW()
FROM "public"."tires" t
WHERE t.size IS NOT NULL
ON CONFLICT ("size", "tread_type", "company_id") DO NOTHING;

-- 5. Add tire_type_id column (nullable first)
ALTER TABLE "public"."tires" ADD COLUMN "tire_type_id" UUID;

-- 6. Populate tire_type_id from existing data
UPDATE "public"."tires" t
SET "tire_type_id" = tt."id"
FROM "public"."tire_types" tt
WHERE t."size" = tt."size"
  AND t."tread_type" = tt."tread_type"
  AND t."company_id" = tt."company_id";

-- 7. Make tire_type_id NOT NULL
ALTER TABLE "public"."tires" ALTER COLUMN "tire_type_id" SET NOT NULL;

-- 8. Add FK constraint
ALTER TABLE "public"."tires" ADD CONSTRAINT "tires_tire_type_id_fkey"
    FOREIGN KEY ("tire_type_id") REFERENCES "public"."tire_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 9. Drop old columns
ALTER TABLE "public"."tires" DROP COLUMN "size";
ALTER TABLE "public"."tires" DROP COLUMN "tread_type";
```

- [ ] **Step 4: Apply migration**

```bash
npx prisma db execute --file prisma/migrations/YYYYMMDDHHMMSS_add_tire_types/migration.sql
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_add_tire_types
```

- [ ] **Step 5: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 6: Verify migration with MCP supabase-LOCAL**

Check that tire_types table exists and tires.tire_type_id is populated:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tire_types'
ORDER BY ordinal_position;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'tires' AND column_name IN ('tire_type_id', 'size', 'tread_type');

SELECT COUNT(*) FROM tire_types;
SELECT COUNT(*) FROM tires WHERE tire_type_id IS NOT NULL;
```

---

## Task 3: Permissions — Add new tabs

**Files:**

- Modify: `src/features/Permissions/permissions-map.ts` (lines 1037-1065)
- Create: migration SQL for tabs + role_permissions

- [ ] **Step 1: Add tabs to permissions-map.ts**

In the `gomeria.subtabs` object (after `ordenes_gomeria` entry, around line 1063), add:

```typescript
    marcas_cubiertas: {
      slug: 'marcas_cubiertas',
      name: 'Marcas de Cubiertas',
      tabId: '60000000-0000-0000-0000-000000000064',
      parent: 'gomeria',
      allowedActions: ['view', 'create', 'update'],
    },
    tipos_cubiertas: {
      slug: 'tipos_cubiertas',
      name: 'Tipos de Cubierta',
      tabId: '60000000-0000-0000-0000-000000000065',
      parent: 'gomeria',
      allowedActions: ['view', 'create', 'update'],
    },
```

- [ ] **Step 2: Create migration for tabs + permissions**

Create a new migration folder and SQL file. Add the SQL to insert tab records and assign permissions to admin, administrador, and full-access-provisional roles:

```sql
-- Insert new tabs (children of gomeria tab)
INSERT INTO "public"."tabs" ("id", "module_id", "slug", "name", "description", "order_index", "parent_tab_id")
VALUES
  ('60000000-0000-0000-0000-000000000064', '421e96da-5235-4857-bf81-e63336447f13', 'marcas_cubiertas', 'Marcas de Cubiertas', 'CRUD de marcas de cubiertas', 4, '60000000-0000-0000-0000-000000000070'),
  ('60000000-0000-0000-0000-000000000065', '421e96da-5235-4857-bf81-e63336447f13', 'tipos_cubiertas', 'Tipos de Cubierta', 'CRUD de tipos de cubierta', 5, '60000000-0000-0000-0000-000000000070')
ON CONFLICT ("id") DO NOTHING;

-- Assign view, create, update permissions to admin, administrador, full-access-provisional
INSERT INTO "public"."role_permissions" ("role_id", "tab_id", "action_id")
SELECT r.id, t.id, a.id
FROM "public"."roles" r
CROSS JOIN "public"."tabs" t
CROSS JOIN "public"."actions" a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND t.id IN ('60000000-0000-0000-0000-000000000064', '60000000-0000-0000-0000-000000000065')
  AND a.slug IN ('view', 'create', 'update')
ON CONFLICT ("role_id", "tab_id", "action_id") DO NOTHING;
```

- [ ] **Step 3: Apply and resolve the migration**

```bash
npx prisma db execute --file prisma/migrations/YYYYMMDDHHMMSS_add_tire_tab_permissions/migration.sql
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_add_tire_tab_permissions
```

---

## Task 4: Marcas Tab — Server Actions

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/Marcas/actions/actions.server.ts`

- [ ] **Step 1: Create server actions file**

Create the file with `'use server'` directive. Implement:

1. `getTireBrandsPaginated(searchParams)` — Prisma paginated query with `parseSearchParams`, `stateToPrismaParams`, `buildSearchWhere`, `buildFiltersWhere`, `buildTextFiltersWhere`, `buildDateRangeFiltersWhere`. Select: `{ id, name, is_active, created_at, _count: { select: { tires: true } } }`. VALID_SORT_FIELDS: `['name', 'is_active', 'created_at']`. Returns `{ data, total }`.

2. `getTireBrandsForExport(searchParams)` — same where, no skip/take.

3. `getTireBrandSingleFacet(columnId, searchParams)` — handle `is_active` (boolean facet with values `true`/`false`, labels Activa/Inactiva).

4. `createTireBrand(data: { name, company_id })` — check unique `(name, company_id)`, create.

5. `updateTireBrand(id, data: { name })` — update name.

6. `toggleTireBrandActive(id, isActive)` — update `is_active`.

7. Export type `TireBrandListItem = Awaited<ReturnType<typeof getTireBrandsPaginated>>['data'][number]`.

Use `Logger('features/Mantenimiento/Gomeria/Marcas')`, try-catch on all functions.

---

## Task 5: Marcas Tab — Columns + DataTable + Form

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/Marcas/components/columns.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Marcas/components/_MarcasDataTable.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Marcas/components/MarcaForm.tsx`

- [ ] **Step 1: Create columns.tsx**

Columns (using `ColumnDef<TireBrandListItem>`):

- `select` — checkbox
- `name` — accessorKey `name`, text, meta title "Nombre"
- `is_active` — accessorKey `is_active`, Badge (success "Activa" / outline "Inactiva"), filterFn `value.includes(String(row.getValue(id)))`
- `tire_count` — accessorFn `row._count?.tires ?? 0`, Badge outline, enableSorting false, meta title "Cubiertas"
- `created_at` — accessorKey `created_at`, `moment().format('DD/MM/YYYY')`, meta title "Creado"
- `actions` — botones individuales con Tooltip (NO DropdownMenu): Editar (Pencil), Activar/Desactivar (PowerOff con color destructive si activa). Condicionados a `canUpdate`.

Receive `permissions` and action callbacks (`onEdit`, `onToggle`) as params to `getColumns()`.

- [ ] **Step 2: Create MarcaForm.tsx**

Dialog CRUD con zod schema: `{ name: z.string().min(1, 'El nombre es requerido').max(100) }`.
Props: `open`, `onOpenChange`, `companyId`, `brand?: TireBrandListItem`, `queryKey`.

- Query key: `['tire-brands-list']`
- On success: invalidate queryKey, close dialog, toast success.

- [ ] **Step 3: Create \_MarcasDataTable.tsx**

Client Component following the DataTable checklist:

- `TABLE_ID = 'tire-brands'`
- `paramNamespace={TABLE_ID}`
- `queryFn` + `queryKey={['tire-brands-list']}` + `onStateChange` + `currentParams`
- Faceted filters: `is_active` (boolean facet)
- Text filters: `name`
- Date range: `created_at`
- `DEFAULT_VISIBLE_FILTERS = ['is_active', 'name']`
- Export config with formatters for `is_active` → "Activa"/"Inactiva", `created_at` → moment format
- Toolbar: "Nueva Marca" button conditioned to `canCreate`
- AlertDialog for toggle active/inactive confirmation
- Permissions via `permissionsMap` prop from server

---

## Task 6: Marcas Tab — TabContent + Skeleton + Integration

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/Marcas/MarcasTabContent.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Marcas/components/MarcasList.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Marcas/fallback/MarcasSkeleton.tsx`

- [ ] **Step 1: Create MarcasSkeleton.tsx**

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function MarcasSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

- [ ] **Step 2: Create MarcasList.tsx (Server Component)**

Server Component that:

1. Defines `TABLE_ID = 'tire-brands'`
2. Calls `stripPrefixFromSearchParams(searchParams, TABLE_ID)`
3. `Promise.all`: `getTireBrandsPaginated(tableParams)`, `getTablePreferences(TABLE_ID)`
4. Renders `<Card><CardContent className="pt-6"><_MarcasDataTable .../></CardContent></Card>`
5. Passes `data`, `totalRows`, `searchParams`, `tableId`, `permissionsMap`, `initialColumnVisibility`, `initialFilterVisibility`

- [ ] **Step 3: Create MarcasTabContent.tsx (Server Component)**

Server Component that:

1. Gets `companyId` and `permissionsMap` via `Promise.all`
2. Renders `<Suspense fallback={<MarcasSkeleton />}><MarcasList .../></Suspense>`

---

## Task 7: Tipos Tab — Server Actions

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/Tipos/actions/actions.server.ts`

- [ ] **Step 1: Create server actions file**

Implement:

1. `getTireTypesPaginated(searchParams)` — Select: `{ id, name, size, tread_type, is_active, created_at, updated_at, _count: { select: { tires: true } } }`. VALID_SORT_FIELDS: `['name', 'size', 'tread_type', 'is_active', 'created_at']`. Company-scoped via `getUserCompanyId()`.

2. `getTireTypesForExport(searchParams)` — same where, no pagination.

3. `getTireTypeSingleFacet(columnId, searchParams)` — handle: `tread_type` (enum facet), `is_active` (boolean facet).

4. `createTireType(data: { name, size, tread_type, company_id })` — create with unique check.

5. `updateTireType(id, data: { name?, size?, tread_type? })` — partial update.

6. `toggleTireTypeActive(id, isActive)` — update `is_active`.

7. `getTireTypesForSelect()` — returns `{ id, name, size, tread_type }` where `is_active: true`, ordered by `name`. For use in TireForm/TireBulkForm select dropdown.

8. Export type `TireTypeListItem`.

---

## Task 8: Tipos Tab — Columns + DataTable + Form

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/Tipos/components/columns.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Tipos/components/_TiposDataTable.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Tipos/components/TipoForm.tsx`

- [ ] **Step 1: Create columns.tsx**

Columns:

- `select` — checkbox
- `name` — accessorKey `name`, text, meta title "Nombre"
- `size` — accessorKey `size`, font-mono, meta title "Medida"
- `tread_type` — accessorKey `tread_type`, Badge with `tireTreadTypeLabels`, filterFn enum, meta title "Tipo de banda"
- `is_active` — Badge (Activo/Inactivo), filterFn boolean
- `tire_count` — accessorFn `row._count?.tires ?? 0`, Badge outline, enableSorting false
- `created_at` — moment format
- `actions` — botones individuales (Editar, Activar/Desactivar), NO DropdownMenu

- [ ] **Step 2: Create TipoForm.tsx**

Dialog CRUD con zod schema:

```typescript
const tireTypeFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  size: z.string().min(1, 'La medida es requerida'),
  tread_type: z.nativeEnum(TireTreadType, { required_error: 'Seleccione el tipo de banda' }),
});
```

Props: `open`, `onOpenChange`, `companyId`, `tireType?: TireTypeListItem`, `queryKey`.
Fields: Input nombre, Input medida (placeholder "295/80R22.5"), Select tipo de banda (using `tireTreadTypeLabels`).

- [ ] **Step 3: Create \_TiposDataTable.tsx**

Same pattern as Marcas DataTable:

- `TABLE_ID = 'tire-types'`
- Faceted: `tread_type` (enum), `is_active` (boolean)
- Text: `name`, `size`
- DateRange: `created_at`
- `DEFAULT_VISIBLE_FILTERS = ['tread_type', 'is_active', 'name']`
- Export formatters for `tread_type` → `tireTreadTypeLabels`, `is_active` → Activo/Inactivo
- Toolbar: "Nuevo Tipo" button

---

## Task 9: Tipos Tab — TabContent + Skeleton + Integration

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/Tipos/TiposTabContent.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Tipos/components/TiposList.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Tipos/fallback/TiposSkeleton.tsx`

- [ ] **Step 1: Create TiposSkeleton.tsx**

Same pattern as MarcasSkeleton.

- [ ] **Step 2: Create TiposList.tsx (Server Component)**

Same pattern as MarcasList — `TABLE_ID = 'tire-types'`, fetch paginated + preferences, render DataTable in Card.

- [ ] **Step 3: Create TiposTabContent.tsx (Server Component)**

Same pattern as MarcasTabContent.

---

## Task 10: GomeriaTabContent — Add 2 New Tabs

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/GomeriaTabContent.tsx`

- [ ] **Step 1: Add imports for new tabs**

```typescript
import MarcasTabContent from './Marcas/MarcasTabContent';
import { MarcasSkeleton } from './Marcas/fallback/MarcasSkeleton';
import TiposTabContent from './Tipos/TiposTabContent';
import { TiposSkeleton } from './Tipos/fallback/TiposSkeleton';
import { Tag, Layers } from 'lucide-react';
```

- [ ] **Step 2: Add 2 tabs to the tabs array**

After the `ordenes_gomeria` tab entry, add:

```typescript
{
  value: 'marcas_cubiertas',
  label: (
    <span className="flex items-center gap-2">
      <Tag className="h-4 w-4" /> Marcas
    </span>
  ),
  moduleSlug: 'mantenimiento',
  tabSlug: 'marcas_cubiertas',
  content: (
    <Suspense fallback={<MarcasSkeleton />}>
      <MarcasTabContent searchParams={searchParams} />
    </Suspense>
  ),
},
{
  value: 'tipos_cubiertas',
  label: (
    <span className="flex items-center gap-2">
      <Layers className="h-4 w-4" /> Tipos
    </span>
  ),
  moduleSlug: 'mantenimiento',
  tabSlug: 'tipos_cubiertas',
  content: (
    <Suspense fallback={<TiposSkeleton />}>
      <TiposTabContent searchParams={searchParams} />
    </Suspense>
  ),
},
```

---

## Task 11: Remove TireBrandManager from Catálogo

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Catalogo/CatalogoTabContent.tsx`
- Delete: `src/features/Mantenimiento/Gomeria/Catalogo/components/TireBrandManager.tsx`

- [ ] **Step 1: Remove TireBrandManager from CatalogoTabContent**

Remove the import and the `<TireBrandManager companyId={companyId} />` component from the JSX. Keep only the Suspense-wrapped TiresList.

- [ ] **Step 2: Delete TireBrandManager.tsx**

Delete the file `src/features/Mantenimiento/Gomeria/Catalogo/components/TireBrandManager.tsx`.

- [ ] **Step 3: Clean up old brand functions from Catálogo actions**

In `src/features/Mantenimiento/Gomeria/Catalogo/actions/actions.server.ts`, remove the brand-specific functions that are now in Marcas tab: `getAllTireBrands`, `createTireBrand`, `updateTireBrand`, `toggleTireBrandActive`, and the `TireBrandItem` type export.

Keep `getTireBrandsForSelect()` — still needed by TireForm.

---

## Task 12: Update Catálogo — Server Actions for tire_type

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Catalogo/actions/actions.server.ts`

- [ ] **Step 1: Update TIRE_SELECT**

Replace in `TIRE_SELECT` (around lines 89-110):

- Remove: `size: true`, `tread_type: true` (these are gone from the model)
- Add: `tire_type_id: true`, `tire_type: { select: { id: true, name: true, size: true, tread_type: true } }`

The updated select should include:

```typescript
const TIRE_SELECT = {
  id: true,
  serial_number: true,
  brand_id: true,
  tire_type_id: true,
  is_new: true,
  retread_level: true,
  tread_depth: true,
  status: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  discard_photo: true,
  discard_comment: true,
  discarded_at: true,
  brand: { select: { id: true, name: true } },
  tire_type: { select: { id: true, name: true, size: true, tread_type: true } },
  vehicle_tire_positions: {
    select: { vehicle: { select: { id: true, domain: true } } },
    take: 1,
  },
} satisfies Prisma.tiresSelect;
```

- [ ] **Step 2: Update facets for size and tread_type**

In `getTireSingleFacet`, the `tread_type` and `size` facets now need to query through the `tire_type` relation:

For `tread_type`: Instead of `groupBy` on `tires.tread_type` (which no longer exists), query `tire_types` with a subquery or use Prisma's relational grouping. Simplest approach: query distinct `tire_type.tread_type` values from tires that match the where clause.

For `size`: Same approach — query distinct `tire_type.size` values.

Update the `columnId` handling in `getTireSingleFacet` to handle these as FK-derived facets.

- [ ] **Step 3: Update createTire and createTiresBulk**

In `createTire`: Replace `size`, `tread_type` params with `tire_type_id`. The create data becomes:

```typescript
data: {
  serial_number, brand_id, tire_type_id, is_new, retread_level, tread_depth, company_id,
  status: 'AVAILABLE',
}
```

In `createTiresBulk`: Same change — replace `size`, `tread_type` with `tire_type_id` in the bulk create data.

- [ ] **Step 4: Update updateTire**

Replace `size?`, `tread_type?` with `tire_type_id?` in the update data.

- [ ] **Step 5: Add getTireTypesForSelect**

Add a function to fetch tire types for the select dropdown (if not importing from Tipos actions):

```typescript
export async function getTireTypesForSelect() {
  return prisma.tire_types.findMany({
    where: { is_active: true, company_id: await getUserCompanyId() },
    select: { id: true, name: true, size: true, tread_type: true },
    orderBy: { name: 'asc' },
  });
}
```

---

## Task 13: Update Catálogo — Columns

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Catalogo/components/columns.tsx`

- [ ] **Step 1: Update size column**

Change from `accessorKey: 'size'` to:

```typescript
{
  id: 'size',
  accessorFn: (row) => row.tire_type?.size ?? '',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Medida" />,
  cell: ({ row }) => <div className="font-mono text-sm">{row.original.tire_type?.size ?? '-'}</div>,
  meta: { title: 'Medida' },
},
```

- [ ] **Step 2: Update tread_type column**

Change from `accessorKey: 'tread_type'` to:

```typescript
{
  id: 'tread_type',
  accessorFn: (row) => row.tire_type?.tread_type ?? '',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de banda" />,
  cell: ({ row }) => {
    const tt = row.original.tire_type?.tread_type;
    return <div>{tt ? tireTreadTypeLabels[tt] ?? tt : '-'}</div>;
  },
  filterFn: (row, _id, value: string[]) => {
    const val = row.original.tire_type?.tread_type;
    if (val == null) return value.includes(NULL_FILTER_VALUE);
    return value.includes(val);
  },
  meta: { title: 'Tipo de banda' },
},
```

---

## Task 14: Update Catálogo — DataTable Facets + Export

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Catalogo/components/_TiresDataTable.tsx`

- [ ] **Step 1: Update export formatters**

Replace:

- `size` formatter: `(_value, row) => row.tire_type?.size ?? '-'`
- `tread_type` formatter: `(_value, row) => row.tire_type?.tread_type ? tireTreadTypeLabels[row.tire_type.tread_type] : '-'`

- [ ] **Step 2: Verify facets work with tire_type relation**

The `tread_type` and `size` facets are handled server-side in `getTireSingleFacet`. Ensure the column IDs in `facetedFilters` still match (`tread_type`, `size`). The server action handles resolving from the `tire_type` relation.

---

## Task 15: Update TireForm — Replace size+tread_type with tire_type_id

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Catalogo/components/TireForm.tsx`

- [ ] **Step 1: Update zod schema**

Replace `size` and `tread_type` fields with `tire_type_id`:

```typescript
const tireFormSchema = z.object({
  serial_number: z.string().min(1, 'El número de serie es requerido'),
  brand_id: z.string().uuid('Seleccione una marca válida'),
  tire_type_id: z.string().uuid('Seleccione un tipo de cubierta'),
  is_new: z.boolean().default(true),
  retread_level: z.nativeEnum(TireRetreadLevel).nullable().optional(),
  tread_depth: z.coerce.number().positive('Debe ser positivo').nullable().optional(),
});
```

- [ ] **Step 2: Add query for tire types**

Add a `useQuery` for tire types (similar to the existing brands query):

```typescript
const { data: tireTypes = [] } = useQuery({
  queryKey: ['tire-types-select'],
  queryFn: () => getTireTypesForSelect(),
  enabled: open,
  staleTime: 5 * 60 * 1000,
});
```

- [ ] **Step 3: Replace form fields**

Remove the `size` Input and `tread_type` Select fields. Replace with a `tire_type_id` Select:

```tsx
<FormField
  control={form.control}
  name="tire_type_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Tipo de cubierta</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo..." />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {tireTypes.map((tt) => (
            <SelectItem key={tt.id} value={tt.id}>
              {tt.size} — {tireTreadTypeLabels[tt.tread_type] ?? tt.tread_type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

- [ ] **Step 4: Update default values and edit reset**

Default values: replace `size: ''`, `tread_type: undefined` with `tire_type_id: ''`.
Edit reset: replace `size: tire.size`, `tread_type: tire.tread_type` with `tire_type_id: tire.tire_type_id`.

---

## Task 16: Update TireBulkForm — Replace size+tread_type with tire_type_id

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Catalogo/components/TireBulkForm.tsx`

- [ ] **Step 1: Apply same changes as TireForm**

Same pattern:

1. Replace `size` + `tread_type` in zod schema with `tire_type_id: z.string().uuid()`
2. Add `useQuery` for tire types
3. Replace form fields (remove `size` Input and `tread_type` Select, add `tire_type_id` Select)
4. Update default values

---

## Task 17: Fix Permission Key Mismatch in Catálogo columns

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Catalogo/components/columns.tsx` (lines 42-43)

- [ ] **Step 1: Fix permission slug**

Change `'tire_catalog'` to `'catalogo_cubiertas'` to match `permissions-map.ts`:

```typescript
// Before:
const canUpdate = permissions.hasPermission('mantenimiento', 'tire_catalog', 'update');
const canDelete = permissions.hasPermission('mantenimiento', 'tire_catalog', 'delete');

// After:
const canUpdate = permissions.hasPermission('mantenimiento', 'catalogo_cubiertas', 'update');
const canDelete = permissions.hasPermission('mantenimiento', 'catalogo_cubiertas', 'delete');
```

---

## Task 18: Verification

- [ ] **Step 1: Run type check**

```bash
npm run check-types
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Manual verification checklist**

1. Navigate to `/dashboard/maintenance?tab=gomeria` — verify 5 tabs visible
2. Tab Marcas: CRUD completo (crear, editar, activar/desactivar), DataTable paginada, filtros, export
3. Tab Tipos: CRUD completo, DataTable paginada, filtros, export
4. Tab Catálogo: TireBrandManager eliminado, tabla funciona con tire_type relation, columnas size/tread_type resuelven datos correctos
5. Crear cubierta: select de tipo muestra "Medida — Tipo de banda"
6. Alta masiva: mismo select de tipo funciona
7. Editar cubierta existente: tire_type_id pre-seleccionado correctamente
8. Permisos: tabs nuevas visibles solo para roles con permiso
