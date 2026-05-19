# Tire Management Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete tire management system (catalog, templates, service operations) inside the Maintenance module.

**Architecture:** Feature lives in `src/features/Mantenimiento/Gomeria/` with 3 subtabs (Catálogo, Plantillas, Órdenes). Uses the NEW DataTable system with Prisma, lazy-load facets, and client-side navigation. Shared `TireDiagramRenderer` component renders horizontal vehicle tire diagrams. Dual entry: QR scan + dashboard.

**Tech Stack:** Next.js 16 + React 19, Prisma ORM, shadcn/ui + Tailwind, React Hook Form + Zod, React Query, moment.js

**Spec:** `docs/superpowers/specs/2026-03-25-tire-management-design.md`

**Verification:** This project has no unit tests (E2E only). Use `npm run check-types` and `npm run lint` as gates after each task. Manual verification via browser for UI tasks.

---

## Task 1: Database Schema + Migration

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_tire_management_tables/migration.sql`

This task adds all 7 new tables, 7 new enums, and the `tire_template_id` field on `vehicles`.

- [ ] **Step 1: Add enums to Prisma schema**

Add to `prisma/schema.prisma` (before the models section, where other enums are defined):

```prisma
enum TireStatus {
  AVAILABLE
  INSTALLED
  IN_REPAIR
  DISCARDED

  @@schema("public")
}

enum TireRetreadLevel {
  FIRST
  SECOND
  THIRD

  @@schema("public")
}

enum TireTreadType {
  SMOOTH
  MIXED
  BLOCK

  @@schema("public")
}

enum TirePositionSide {
  LEFT
  RIGHT
  SPARE

  @@schema("public")
}

enum TireServiceAction {
  REPLACE
  REPAIR
  CALIBRATE

  @@schema("public")
}

enum TireOldDestination {
  AVAILABLE
  DISCARD
  REPAIR

  @@schema("public")
}

enum TireServiceOrderStatus {
  OPEN
  CLOSED

  @@schema("public")
}
```

- [ ] **Step 2: Add tire_brands model**

```prisma
model tire_brands {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name       String
  company_id String   @db.Uuid
  is_active  Boolean  @default(true)
  created_at DateTime @default(now()) @db.Timestamptz(6)

  company Company @relation(fields: [company_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  tires   tires[]

  @@unique([name, company_id])
  @@schema("public")
}
```

- [ ] **Step 3: Add tires model**

```prisma
model tires {
  id              String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  serial_number   String
  brand_id        String            @db.Uuid
  size            String
  is_new          Boolean           @default(true)
  retread_level   TireRetreadLevel?
  tread_type      TireTreadType
  tread_depth     Decimal?          @db.Decimal(5, 2)
  status          TireStatus        @default(AVAILABLE)
  discard_photo   String?
  discard_comment String?
  discarded_at    DateTime?         @db.Timestamptz(6)
  company_id      String            @db.Uuid
  is_active       Boolean           @default(true)
  created_at      DateTime          @default(now()) @db.Timestamptz(6)
  updated_at      DateTime          @updatedAt @db.Timestamptz(6)

  brand                        tire_brands              @relation(fields: [brand_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  company                      Company                  @relation(fields: [company_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  vehicle_tire_positions       vehicle_tire_positions[]
  tire_service_items_current   tire_service_items[]      @relation("tire_at_position")
  tire_service_items_new       tire_service_items[]      @relation("replacement_tire")

  @@unique([serial_number, company_id])
  @@schema("public")
}
```

- [ ] **Step 4: Add tire_templates and tire_template_axles models**

```prisma
model tire_templates {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String
  description String?
  company_id  String   @db.Uuid
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now()) @db.Timestamptz(6)

  company                Company                  @relation(fields: [company_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  axles                  tire_template_axles[]
  vehicles               vehicles[]
  vehicle_tire_positions vehicle_tire_positions[]

  @@schema("public")
}

model tire_template_axles {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  template_id   String   @db.Uuid
  axle_number   Int
  tires_per_side Int
  tire_size     String
  is_drive_axle Boolean  @default(false)
  is_spare      Boolean  @default(false)
  created_at    DateTime @default(now()) @db.Timestamptz(6)

  template               tire_templates           @relation(fields: [template_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  vehicle_tire_positions vehicle_tire_positions[]

  @@unique([template_id, axle_number])
  @@schema("public")
}
```

- [ ] **Step 5: Add vehicle_tire_positions model**

```prisma
model vehicle_tire_positions {
  id               String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  vehicle_id       String           @db.Uuid
  template_axle_id String           @db.Uuid
  position_number  Int
  axle_number      Int
  side             TirePositionSide
  tire_id          String?          @db.Uuid
  created_at       DateTime         @default(now()) @db.Timestamptz(6)
  updated_at       DateTime         @updatedAt @db.Timestamptz(6)

  vehicle       vehicles             @relation(fields: [vehicle_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  template_axle tire_template_axles   @relation(fields: [template_axle_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  tire          tires?               @relation(fields: [tire_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@unique([vehicle_id, position_number])
  @@schema("public")
}
```

- [ ] **Step 6: Add tire_service_orders model**

```prisma
model tire_service_orders {
  id                  String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  vehicle_id          String                 @db.Uuid
  trailer_vehicle_id  String?                @db.Uuid
  kilometer           String?
  service_date        DateTime               @db.Timestamptz(6)
  status              TireServiceOrderStatus @default(OPEN)
  created_by          String                 @db.Uuid
  company_id          String                 @db.Uuid
  created_at          DateTime               @default(now()) @db.Timestamptz(6)
  closed_at           DateTime?              @db.Timestamptz(6)

  vehicle  vehicles            @relation("tire_service_vehicle", fields: [vehicle_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  trailer  vehicles?           @relation("tire_service_trailer", fields: [trailer_vehicle_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  creator  profile             @relation(fields: [created_by], references: [id], onDelete: NoAction, onUpdate: NoAction)
  company  Company             @relation(fields: [company_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  items    tire_service_items[]

  @@schema("public")
}
```

- [ ] **Step 7: Add tire_service_items model**

```prisma
model tire_service_items {
  id                  String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  service_order_id    String              @db.Uuid
  position_number     Int
  vehicle_id          String              @db.Uuid
  action              TireServiceAction
  tire_id             String?             @db.Uuid
  new_tire_id         String?             @db.Uuid
  old_tire_destination TireOldDestination?
  tread_depth         Decimal?            @db.Decimal(5, 2)
  pressure_start      Decimal?            @db.Decimal(5, 1)
  pressure_end        Decimal?            @db.Decimal(5, 1)
  observations        String?
  created_at          DateTime            @default(now()) @db.Timestamptz(6)

  service_order tire_service_orders @relation(fields: [service_order_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  vehicle       vehicles            @relation(fields: [vehicle_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  tire          tires?              @relation("tire_at_position", fields: [tire_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  new_tire      tires?              @relation("replacement_tire", fields: [new_tire_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@schema("public")
}
```

- [ ] **Step 8: Add tire_template_id to vehicles model**

In the existing `vehicles` model, add:

```prisma
tire_template_id String? @db.Uuid
```

And the relation:

```prisma
tire_template tire_templates? @relation(fields: [tire_template_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
```

Also add reverse relations to `vehicles` model:

```prisma
vehicle_tire_positions  vehicle_tire_positions[]
tire_service_orders_vehicle tire_service_orders[] @relation("tire_service_vehicle")
tire_service_orders_trailer tire_service_orders[] @relation("tire_service_trailer")
tire_service_items      tire_service_items[]
```

Add reverse relations to `Company` model:

```prisma
tire_brands          tire_brands[]
tires                tires[]
tire_templates       tire_templates[]
tire_service_orders  tire_service_orders[]
```

Add reverse relation to `profile` model:

```prisma
tire_service_orders tire_service_orders[]
```

- [ ] **Step 9: Generate migration SQL**

Run: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`

Review the output. Only take the CREATE TABLE, CREATE TYPE (enums), and ALTER TABLE statements for our new tables/fields. Ignore any drift-related changes.

- [ ] **Step 10: Create migration folder and SQL file**

Create `prisma/migrations/YYYYMMDDHHMMSS_add_tire_management_tables/migration.sql` with only the relevant SQL from Step 9.

- [ ] **Step 11: Apply migration**

```bash
npx prisma db execute --file prisma/migrations/YYYYMMDDHHMMSS_add_tire_management_tables/migration.sql
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_add_tire_management_tables
npx prisma generate
```

- [ ] **Step 12: Verify migration**

Use MCP supabase-LOCAL to verify tables and columns exist:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND (table_name LIKE 'tire%' OR table_name = 'vehicle_tire_positions')
ORDER BY table_name;
```

- [ ] **Step 13: Run check-types**

Run: `npm run check-types`
Expected: PASS (no type errors)

---

## Task 2: Shared Utilities + Permissions

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/shared/tire-mappers.ts`
- Modify: `src/features/Permissions/permissions-map.ts`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_tire_management_permissions/migration.sql`

- [ ] **Step 1: Create tire-mappers.ts**

```typescript
// src/features/Mantenimiento/Gomeria/shared/tire-mappers.ts
import type { BadgeProps } from '@/components/ui/badge';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

// TireStatus
export const tireStatusLabels: Record<string, string> = {
  AVAILABLE: 'Disponible',
  INSTALLED: 'Instalada',
  IN_REPAIR: 'En reparación',
  DISCARDED: 'Descartada',
};

export const tireStatusBadges: Record<string, BadgeVariant> = {
  AVAILABLE: 'success',
  INSTALLED: 'default',
  IN_REPAIR: 'yellow',
  DISCARDED: 'destructive',
};

// TireRetreadLevel
export const tireRetreadLabels: Record<string, string> = {
  FIRST: '1° Precurado',
  SECOND: '2° Precurado',
  THIRD: '3° Precurado',
};

// TireTreadType
export const tireTreadTypeLabels: Record<string, string> = {
  SMOOTH: 'Liso',
  MIXED: 'Mixto',
  BLOCK: 'Taco',
};

// TireServiceAction
export const tireServiceActionLabels: Record<string, string> = {
  REPLACE: 'Reemplazo',
  REPAIR: 'Reparación',
  CALIBRATE: 'Calibración',
};

export const tireServiceActionBadges: Record<string, BadgeVariant> = {
  REPLACE: 'default',
  REPAIR: 'yellow',
  CALIBRATE: 'outline',
};

// TireOldDestination
export const tireOldDestinationLabels: Record<string, string> = {
  AVAILABLE: 'Disponible',
  DISCARD: 'Descarte',
  REPAIR: 'Reparación',
};

// TireServiceOrderStatus
export const tireServiceOrderStatusLabels: Record<string, string> = {
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
};

export const tireServiceOrderStatusBadges: Record<string, BadgeVariant> = {
  OPEN: 'yellow',
  CLOSED: 'success',
};

// TirePositionSide
export const tirePositionSideLabels: Record<string, string> = {
  LEFT: 'Izquierda',
  RIGHT: 'Derecha',
  SPARE: 'Auxilio',
};
```

- [ ] **Step 2: Generate tab UUIDs**

Generate 4 UUIDs for the new tabs. Use format `60000000-0000-0000-0000-0000000000XX` where XX follows the existing pattern (50 is the last used for `maint_configuracion`). New tabs:

```
gomeria:              60000000-0000-0000-0000-000000000060
catalogo_cubiertas:   60000000-0000-0000-0000-000000000061
plantillas_cubiertas: 60000000-0000-0000-0000-000000000062
ordenes_gomeria:      60000000-0000-0000-0000-000000000063
```

- [ ] **Step 3: Update permissions-map.ts**

Add the `gomeria` entry inside the `mantenimiento.tabs` object in `src/features/Permissions/permissions-map.ts`:

```typescript
gomeria: {
  slug: 'gomeria',
  tabId: '60000000-0000-0000-0000-000000000060',
  parent: null,
  allowedActions: ['view'],
  subtabs: {
    catalogo_cubiertas: {
      slug: 'catalogo_cubiertas',
      tabId: '60000000-0000-0000-0000-000000000061',
      allowedActions: ['view', 'create', 'update', 'delete'],
    },
    plantillas_cubiertas: {
      slug: 'plantillas_cubiertas',
      tabId: '60000000-0000-0000-0000-000000000062',
      allowedActions: ['view', 'create', 'update'],
    },
    ordenes_gomeria: {
      slug: 'ordenes_gomeria',
      tabId: '60000000-0000-0000-0000-000000000063',
      allowedActions: ['view', 'create', 'update'],
    },
  },
},
```

- [ ] **Step 4: Create permissions migration SQL**

Create `prisma/migrations/YYYYMMDDHHMMSS_add_tire_management_permissions/migration.sql`:

```sql
-- Insert tabs for Gomería module
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
  ('60000000-0000-0000-0000-000000000060', '421e96da-5235-4857-bf81-e63336447f13', 'gomeria', 'Gomería', 'Gestión de cubiertas neumáticas', 7, NULL),
  ('60000000-0000-0000-0000-000000000061', '421e96da-5235-4857-bf81-e63336447f13', 'catalogo_cubiertas', 'Catálogo de Cubiertas', 'CRUD de cubiertas', 1, '60000000-0000-0000-0000-000000000060'),
  ('60000000-0000-0000-0000-000000000062', '421e96da-5235-4857-bf81-e63336447f13', 'plantillas_cubiertas', 'Plantillas de Cubiertas', 'Plantillas de distribución', 2, '60000000-0000-0000-0000-000000000060'),
  ('60000000-0000-0000-0000-000000000063', '421e96da-5235-4857-bf81-e63336447f13', 'ordenes_gomeria', 'Órdenes de Gomería', 'Órdenes de servicio de gomería', 3, '60000000-0000-0000-0000-000000000060')
ON CONFLICT (id) DO NOTHING;

-- Assign permissions to admin, administrador, and full-access-provisional
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM roles r
CROSS JOIN (
  SELECT id, slug FROM tabs WHERE id IN (
    '60000000-0000-0000-0000-000000000060',
    '60000000-0000-0000-0000-000000000061',
    '60000000-0000-0000-0000-000000000062',
    '60000000-0000-0000-0000-000000000063'
  )
) t
CROSS JOIN actions a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND (
    (t.slug = 'gomeria' AND a.slug = 'view')
    OR (t.slug = 'catalogo_cubiertas' AND a.slug IN ('view', 'create', 'update', 'delete'))
    OR (t.slug = 'plantillas_cubiertas' AND a.slug IN ('view', 'create', 'update'))
    OR (t.slug = 'ordenes_gomeria' AND a.slug IN ('view', 'create', 'update'))
  )
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
```

- [ ] **Step 5: Apply permissions migration**

```bash
npx prisma db execute --file prisma/migrations/YYYYMMDDHHMMSS_add_tire_management_permissions/migration.sql
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_add_tire_management_permissions
```

- [ ] **Step 6: Verify permissions with MCP**

```sql
SELECT t.slug, t.name, t.parent_tab_id FROM tabs t
WHERE t.id LIKE '60000000-0000-0000-0000-00000000006%'
ORDER BY t.order_index;
```

- [ ] **Step 7: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 3: Tab Wiring + Skeletons

**Files:**

- Modify: `src/features/Mantenimiento/MantenimientoComponent.tsx`
- Create: `src/features/Mantenimiento/Gomeria/GomeriaTabContent.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Catalogo/CatalogoTabContent.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Plantillas/PlantillasTabContent.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Ordenes/OrdenesTabContent.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Catalogo/fallback/CatalogoSkeleton.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Plantillas/fallback/PlantillasSkeleton.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Ordenes/fallback/OrdenesSkeleton.tsx`

- [ ] **Step 1: Create skeleton components**

Create 3 skeleton files. Each follows the same pattern — example for `CatalogoSkeleton.tsx`:

```tsx
// src/features/Mantenimiento/Gomeria/Catalogo/fallback/CatalogoSkeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';

export function CatalogoSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-md" />
    </div>
  );
}
```

Repeat the same pattern for `PlantillasSkeleton.tsx` and `OrdenesSkeleton.tsx`.

- [ ] **Step 2: Create placeholder tab contents**

Create `CatalogoTabContent.tsx`, `PlantillasTabContent.tsx`, `OrdenesTabContent.tsx` as simple Server Components with placeholder content:

```tsx
// src/features/Mantenimiento/Gomeria/Catalogo/CatalogoTabContent.tsx
export default async function CatalogoTabContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return <div>Catálogo de Cubiertas — En construcción</div>;
}
```

Same pattern for the other two.

- [ ] **Step 3: Create GomeriaTabContent with nested TabsManagerServer**

```tsx
// src/features/Mantenimiento/Gomeria/GomeriaTabContent.tsx
import { Suspense } from 'react';
import { Package, LayoutTemplate, Wrench } from 'lucide-react';
import TabsManagerServer from '@/shared/components/common/TabsManagerServer/TabsManagerServer';
import type { UserPermissions } from '@/features/Permissions/types';
import CatalogoTabContent from './Catalogo/CatalogoTabContent';
import PlantillasTabContent from './Plantillas/PlantillasTabContent';
import OrdenesTabContent from './Ordenes/OrdenesTabContent';
import { CatalogoSkeleton } from './Catalogo/fallback/CatalogoSkeleton';
import { PlantillasSkeleton } from './Plantillas/fallback/PlantillasSkeleton';
import { OrdenesSkeleton } from './Ordenes/fallback/OrdenesSkeleton';

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: UserPermissions;
}

export default async function GomeriaTabContent({ searchParams, permissions }: Props) {
  return (
    <TabsManagerServer
      paramName="gomeria_tab"
      searchParams={searchParams}
      defaultTab="catalogo_cubiertas"
      permissions={permissions}
      tabs={[
        {
          value: 'catalogo_cubiertas',
          label: (
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Catálogo
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'catalogo_cubiertas',
          content: (
            <Suspense fallback={<CatalogoSkeleton />}>
              <CatalogoTabContent searchParams={searchParams} />
            </Suspense>
          ),
        },
        {
          value: 'plantillas_cubiertas',
          label: (
            <span className="flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4" /> Plantillas
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'plantillas_cubiertas',
          content: (
            <Suspense fallback={<PlantillasSkeleton />}>
              <PlantillasTabContent searchParams={searchParams} />
            </Suspense>
          ),
        },
        {
          value: 'ordenes_gomeria',
          label: (
            <span className="flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Órdenes
            </span>
          ),
          moduleSlug: 'mantenimiento',
          tabSlug: 'ordenes_gomeria',
          content: (
            <Suspense fallback={<OrdenesSkeleton />}>
              <OrdenesTabContent searchParams={searchParams} />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
```

- [ ] **Step 4: Add Gomería tab to MantenimientoComponent**

In `src/features/Mantenimiento/MantenimientoComponent.tsx`, add the new tab to the `tabs` array in `TabsManagerServer`. Add it before `maint_configuracion`:

```tsx
{
  value: 'gomeria',
  label: (
    <span className="flex items-center gap-2">
      <CircleDot className="h-4 w-4" /> Gomería
    </span>
  ),
  moduleSlug: 'mantenimiento',
  tabSlug: 'gomeria',
  content: (
    <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
      <GomeriaTabContent searchParams={searchParams} permissions={permissions} />
    </Suspense>
  ),
},
```

Add the import at the top:

```tsx
import { CircleDot } from 'lucide-react';
import GomeriaTabContent from './Gomeria/GomeriaTabContent';
```

- [ ] **Step 5: Run check-types + lint**

```bash
npm run check-types && npm run lint
```

Expected: PASS. The Gomería tab should now be visible in the maintenance module with 3 placeholder subtabs.

---

## Task 4: Tire Brands CRUD

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/Catalogo/actions/actions.server.ts`
- Create: `src/features/Mantenimiento/Gomeria/Catalogo/components/TireBrandManager.tsx`

- [ ] **Step 1: Create server actions for tire brands**

In `actions.server.ts`, implement:

- `getAllTireBrands(companyId: string)` — returns all active brands ordered by name
- `createTireBrand(data: { name: string; company_id: string })` — creates brand, checks duplicate
- `updateTireBrand(id: string, data: { name: string })` — updates name
- `toggleTireBrandActive(id: string, isActive: boolean)` — soft delete/restore

All with `'use server'`, Prisma, Logger, try-catch, exported types via `Awaited<ReturnType<>>`.

- [ ] **Step 2: Create TireBrandManager component**

A `'use client'` component that shows:

- A table/list of brands with name + active status
- "Nueva Marca" button that opens a Dialog with a Form (shadcn Form + Zod: `z.object({ name: z.string().min(1) })`)
- Edit button per row → same Dialog in edit mode
- Activate/deactivate toggle per row
- Uses `useQuery` for fetching brands, `useMutation` for create/update/toggle with invalidation

- [ ] **Step 3: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 5: Tires Catalog — Server Actions + DataTable + Forms

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Catalogo/actions/actions.server.ts` (add tire CRUD + paginated + facets)
- Create: `src/features/Mantenimiento/Gomeria/Catalogo/TiresList.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Catalogo/components/_TiresDataTable.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Catalogo/components/columns.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Catalogo/components/TireForm.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Catalogo/components/TireBulkForm.tsx`
- Modify: `src/features/Mantenimiento/Gomeria/Catalogo/CatalogoTabContent.tsx`

- [ ] **Step 1: Add tire server actions**

Add to `actions.server.ts`:

- `getTiresPaginated(searchParams, companyId)` — paginated query with Prisma following the employee pattern. Include `tire_brands` for brand name. Include `vehicle_tire_positions` → `vehicles` for vehicle domain.
  - `buildWhereClause()` internal helper shared with export and facets
  - `VALID_SORT_FIELDS`, `FK_SORT_MAP` (brand → `tire_brands.name`)
  - `TEXT_FILTER_COLUMNS`: `['serial_number', 'size']`
  - `DATE_RANGE_COLUMNS`: `['created_at']`
  - Multi-sort with `state.sorting` array
- `getTiresForExport(searchParams, companyId)` — same where, no skip/take
- `getTireSingleFacet(columnId, companyId, searchParams)` — lazy-load facet per column with `crossWhere(excludeColumn)`. Columns: brand_id (FK UUID), status (enum), is_new (boolean), retread_level (enum nullable), tread_type (enum), vehicle (derived via subquery on `vehicle_tire_positions` → `vehicles.domain` — use `groupBy` on `vehicle_tire_positions.vehicle_id`, resolve vehicle domain via Prisma include, include null count for tires with no position row)
- `createTire(data)` — create single tire as AVAILABLE
- `createTiresBulk(data)` — validate range for collisions, create N tires or reject with conflicting serials
- `updateTire(id, data)` — update tire fields
- `updateTireStatus(id, status)` — change status (for marking as repaired → AVAILABLE)
- `deleteTire(id)` — soft delete (is_active = false)

Export types: `TireListItem`, `TiresData`

- [ ] **Step 2: Create columns.tsx**

Follow the employees columns pattern exactly:

- `select` column with checkbox
- `serial_number` — text, meta title "Número", filterable
- `brand` — FK via `accessorFn: (row) => row.tire_brands?.name`, id: 'brand_id', faceted filter with `NULL_FILTER_VALUE`
- `size` — text, meta title "Medida"
- `is_new` — boolean badge (Nueva/Usada), faceted filter
- `retread_level` — enum nullable, faceted with "Sin asignar" for null
- `tread_type` — enum, faceted
- `tread_depth` — number display with "%", text filter
- `status` — enum badge with variant colors, faceted
- `vehicle` — derived from `vehicle_tire_positions`, show domain or "Sin asignar"
- `created_at` — date with moment format
- `actions` — view/edit/delete buttons with permission guards

Each column: `meta: { title: 'X' }`, `filterFn` for faceted columns, `enableSorting` appropriate.

- [ ] **Step 3: Create \_TiresDataTable.tsx**

Client component following the employee DataTable pattern:

- `buildEnumFacetResult`, `buildFkFacetResult` helpers
- `currentParams` state + `handleStateChange` + `tableQueryFn` with `useCallback`
- `makeEnumFetchFacet`, `makeFkFetchFacet` factories
- `facetedFilters` with `fetchFacet` for each filterable column (brand_id, status, is_new, retread_level, tread_type, vehicle)
- `DEFAULT_VISIBLE_FILTERS` = first 3 (status, brand, tread_type)
- `exportConfig` with formatters: status → `tireStatusLabels`, retread_level → `tireRetreadLabels`, tread_type → `tireTreadTypeLabels`, is_new → `val ? 'Sí' : 'No'`, tread_depth → `val + '%'`, created_at → `moment(val).format('DD/MM/YYYY')`, vehicle → already resolved as string
- `<DataTable>` with `queryFn`, `queryKey`, `onStateChange`, `paramNamespace`, `tableId`, `searchPlaceholder`, `showFilterToggle`, `emptyMessage`

- [ ] **Step 4: Create TiresList.tsx**

Server component:

- `TABLE_ID = 'tires-catalog'`
- `stripPrefixFromSearchParams`
- Load paginated data + table preferences + permissions in `Promise.all`:
  ```typescript
  const [{ data, total }, preferences] = await Promise.all([
    getTiresPaginated(tableParams, companyId),
    getTablePreferences(TABLE_ID),
  ]);
  ```
- Receive `permissionsMap` as prop from `CatalogoTabContent` (loaded server-side via `getUserPermissionsMapServer()`)
- Pass `permissionsMap` to `_TiresDataTable`
- Render `<Card><CardContent className="pt-6"><_TiresDataTable /></CardContent></Card>`

- [ ] **Step 5: Create TireForm.tsx**

Client component with shadcn Form + Zod:

- Schema: serial_number (required), brand_id (required, select), size (required), is_new (boolean), retread_level (optional enum), tread_type (required enum), tread_depth (optional number)
- Dialog-based form that receives optional `tire` prop for edit mode
- On submit: call `createTire` or `updateTire` server action
- Invalidate query on success

- [ ] **Step 6: Create TireBulkForm.tsx**

Client component:

- Schema: prefix (required), range_from (required number), range_to (required number), brand_id, size, is_new, retread_level, tread_type
- Validation: range_to >= range_from, max 500 items
- Preview of how many tires will be created
- On submit: call `createTiresBulk`, handle error response showing conflicting serials
- Dialog-based

- [ ] **Step 7: Update CatalogoTabContent**

Replace placeholder with actual content:

- Load permissions server-side
- Render `TireBrandManager` + `TiresList` + create buttons with `PermissionGuard`
- Wrap `TiresList` in `Suspense` with `CatalogoSkeleton`

- [ ] **Step 8: Run check-types + lint**

```bash
npm run check-types && npm run lint
```

Expected: PASS

---

## Task 6: Templates Management

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/Plantillas/actions/actions.server.ts`
- Create: `src/features/Mantenimiento/Gomeria/Plantillas/TemplatesList.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Plantillas/components/_TemplatesDataTable.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Plantillas/components/columns.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Plantillas/components/TemplateForm.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Plantillas/components/AxleConfigurator.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Plantillas/components/TemplatePreview.tsx`
- Modify: `src/features/Mantenimiento/Gomeria/Plantillas/PlantillasTabContent.tsx`

- [ ] **Step 1: Create server actions**

- `getTemplatesPaginated(searchParams, companyId)` — include `_count: { select: { axles: true } }` and `axles` for position count calculation
- `getTemplatesForExport(searchParams, companyId)`
- `getTemplateSingleFacet(columnId, companyId, searchParams)` — minimal facets (mostly text filters)
- `createTemplate(data)` — create template + axles in transaction
- `updateTemplate(id, data)` — update template + replace axles in transaction
- `deleteTemplate(id)` — soft delete. Before deactivating, check if any vehicle has `tire_template_id` pointing to this template. If vehicles exist, return error with list of vehicle domains — the template cannot be deleted while assigned to vehicles. The user must first change or remove the template from those vehicles.
- `getTemplateById(id)` — for edit form, include axles ordered by axle_number
- `assignTemplateToVehicle(vehicleId, templateId)` — transaction: return old tires to AVAILABLE, delete old positions, generate new positions, update vehicle
- `getVehiclesWithoutTemplate(companyId)` — for assignment picker

- [ ] **Step 2: Create columns.tsx**

- `name` — text, filterable
- `description` — text, filterable
- `axle_count` — virtual from `_count.axles`, not sortable
- `position_count` — virtual computed from axles data, not sortable
- `created_at` — date
- `actions` — edit/delete

- [ ] **Step 3: Create \_TemplatesDataTable.tsx + TemplatesList.tsx**

Same 3-layer pattern as tires. `TABLE_ID = 'tire-templates'`. Simpler since fewer filterable columns. `TemplatesList` receives `permissionsMap` as prop from `PlantillasTabContent` (loaded via `getUserPermissionsMapServer()`).

- [ ] **Step 4: Create AxleConfigurator.tsx**

Client component for configuring template axles:

- Dynamic list of axle rows
- Each row: axle number (auto), tires per side (1 or 2 select), tire size (text input), is drive axle (checkbox), is spare (checkbox)
- Add axle button, remove axle button
- When is_spare is checked: tires_per_side locked to 1, is_drive_axle disabled
- Axle numbers auto-recalculate on add/remove
- Exposes value via `onChange` callback with array of axle configs

- [ ] **Step 5: Create TemplatePreview.tsx**

Read-only wrapper around `TireDiagramRenderer` (Task 7, already completed at this point). Shows horizontal preview of the template being configured. Receives axles array as prop and renders the diagram in non-interactive mode.

- [ ] **Step 6: Create TemplateForm.tsx**

Dialog/sheet form:

- Schema: name (required), description (optional), axles (array via AxleConfigurator)
- Includes TemplatePreview showing live diagram as user configures axles
- Edit mode: loads existing template with axles
- On submit: `createTemplate` or `updateTemplate`

- [ ] **Step 7: Update PlantillasTabContent**

Replace placeholder. Render `TemplatesList` with permissions and create button.

- [ ] **Step 8: Run check-types + lint**

```bash
npm run check-types && npm run lint
```

---

## Task 7: Tire Diagram Renderer

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/shared/TireDiagramRenderer.tsx`

This is the shared visual component used by template preview, service operations, and vehicle detail.

- [ ] **Step 1: Define types**

```typescript
export interface DiagramAxle {
  id: string;
  axle_number: number;
  tires_per_side: number;
  tire_size: string;
  is_drive_axle: boolean;
  is_spare: boolean;
}

export interface DiagramPosition {
  position_number: number;
  axle_number: number;
  side: 'LEFT' | 'RIGHT' | 'SPARE';
  tire_id: string | null;
  tire_serial?: string;
  tire_brand?: string;
}

export interface TireDiagramRendererProps {
  axles: DiagramAxle[];
  positions?: DiagramPosition[];
  interactive?: boolean;
  onPositionClick?: (positionNumber: number) => void;
  highlightedPositions?: number[];
  label?: string;
}
```

- [ ] **Step 2: Implement position calculation logic**

Pure function that takes axles and returns computed positions:

- Iterate axles sorted by axle_number
- Separate regular axles (is_spare=false) from spares (is_spare=true)
- Regular axle: tires_per_side=1 → 2 positions (LEFT, RIGHT); tires_per_side=2 → 4 positions (LEFT×2, RIGHT×2)
- Spare: 1 position (SPARE)
- Sequential numbering

- [ ] **Step 3: Implement horizontal rendering**

Client component (`'use client'`):

- Horizontal layout using CSS flexbox/grid
- Vehicle body as a rounded container
- Axles rendered left-to-right inside the body
- Each tire position as a rounded-rectangle button/div
- Tires above the body = LEFT side, below = RIGHT side
- Spares grouped to the right of the vehicle body
- Scrollable container for overflow (many axles)

- [ ] **Step 4: Implement color coding and interactivity**

- Green background: `tire_id !== null` (has tire)
- Gray background: `tire_id === null` (empty)
- Yellow background: position in `highlightedPositions` array
- If `interactive=true`: positions are clickable, cursor pointer, hover effect
- On click: call `onPositionClick(positionNumber)`
- Show tire serial number inside each position (or position number if empty)
- Tooltip on hover: brand, size, serial

- [ ] **Step 5: Update TemplatePreview to use TireDiagramRenderer**

Replace placeholder in `TemplatePreview.tsx` with the actual `TireDiagramRenderer` component in read-only mode (interactive=false).

- [ ] **Step 6: Run check-types**

```bash
npm run check-types
```

---

## Task 8: Template Assignment to Vehicle

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Plantillas/actions/actions.server.ts` (already has `assignTemplateToVehicle`)
- Create: `src/features/Mantenimiento/Gomeria/Plantillas/components/TemplateAssignDialog.tsx`

- [ ] **Step 1: Create TemplateAssignDialog**

Client component:

- Dialog that shows a combobox to search/select vehicles without template (or with different template)
- Shows warning if vehicle already has a template with installed tires
- Confirmation step before assigning
- Calls `assignTemplateToVehicle` server action
- Invalidates relevant queries

- [ ] **Step 2: Add "Asignar a Vehículo" button to template actions**

In the templates DataTable actions column or detail view, add a button that opens `TemplateAssignDialog` with the selected template.

- [ ] **Step 3: Run check-types**

```bash
npm run check-types
```

---

## Task 9: Service Orders — Server Actions + DataTable

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/Ordenes/actions/actions.server.ts`
- Create: `src/features/Mantenimiento/Gomeria/Ordenes/ServiceOrdersList.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Ordenes/components/_ServiceOrdersDataTable.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Ordenes/components/columns.tsx`
- Modify: `src/features/Mantenimiento/Gomeria/Ordenes/OrdenesTabContent.tsx`

- [ ] **Step 1: Create server actions**

- `getServiceOrdersPaginated(searchParams, companyId)` — include vehicle (domain), trailer (domain), creator (firstname/lastname), `_count.items`
  - `buildWhereClause`, `VALID_SORT_FIELDS`, `FK_SORT_MAP` (vehicle → `vehicles.domain`)
  - `TEXT_FILTER_COLUMNS`: `['kilometer']`
  - `DATE_RANGE_COLUMNS`: `['service_date', 'created_at']`
- `getServiceOrdersForExport(searchParams, companyId)`
- `getServiceOrderSingleFacet(columnId, companyId, searchParams)` — facets for: vehicle_id, trailer_vehicle_id, status, created_by
- `getServiceOrderById(id)` — full detail with items, each item includes tire info
- `createServiceOrder(data)` — create order as OPEN
- `closeServiceOrder(id)` — set status CLOSED, closed_at
- `cancelServiceOrder(id)` — reverse all tire changes within a `prisma.$transaction`:
  1. Fetch all service items for the order
  2. For each item, reverse in reverse chronological order:
     - **CALIBRATE**: no tire status to reverse (tread_depth update is not reversed — it was a real measurement)
     - **REPLACE**: new_tire → `AVAILABLE`, restore position to old tire_id. If `old_tire_destination = DISCARD`: **block cancellation** — return error "Cannot cancel: order contains discarded tires". If `old_tire_destination = AVAILABLE` or `REPAIR`: reverse old tire back to `INSTALLED`
     - **REPAIR**: new_tire → `AVAILABLE`, old tire → `INSTALLED`, restore position to old tire_id
     - **Initial assign** (tire_id = null): new_tire → `AVAILABLE`, position.tire_id → null
  3. Delete the order (cascades to items)
     **Rule**: If ANY item has `old_tire_destination = DISCARD`, the order CANNOT be cancelled. Return error to user.

Export types.

- [ ] **Step 2: Create columns.tsx**

- `service_date` — date with moment, dateRange filter
- `vehicle` — FK accessor to `vehicles.domain`, faceted
- `trailer` — FK nullable to trailer domain, faceted with "Sin asignar"
- `kilometer` — text
- `interventions` — virtual `_count.items`, not sortable
- `status` — enum badge, faceted
- `created_by` — FK to profile, faceted
- `created_at` — date, dateRange
- `actions` — view detail, close order, cancel order (with permission guards)

- [ ] **Step 3: Create \_ServiceOrdersDataTable.tsx + ServiceOrdersList.tsx**

3-layer pattern. `TABLE_ID = 'tire-service-orders'`. `ServiceOrdersList` receives `permissionsMap` as prop from `OrdenesTabContent` (loaded via `getUserPermissionsMapServer()`). Include "Nueva Orden" button with PermissionGuard. Clicking a row opens `ServiceOrderDetailView` (created in Task 10, Step 6) — wire the row click action in the `actions` column as a "Ver detalle" link/button.

- [ ] **Step 4: Update OrdenesTabContent**

Replace placeholder. Load permissions, render ServiceOrdersList.

- [ ] **Step 5: Run check-types + lint**

```bash
npm run check-types && npm run lint
```

---

## Task 10: Service Order Wizard

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/Ordenes/components/ServiceOrderWizard.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Ordenes/components/TireDiagram.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Ordenes/components/TirePositionCard.tsx`
- Create: `src/features/Mantenimiento/Gomeria/Ordenes/components/TireReplacePicker.tsx`
- Modify: `src/features/Mantenimiento/Gomeria/Ordenes/actions/actions.server.ts` (add intervention actions)

This is the main operational flow — the most complex task.

- [ ] **Step 1: Add intervention server actions**

**Invariant enforcement**: Every transaction that changes tire status or position must assert preconditions:

- Before setting a tire to `INSTALLED`: verify it is currently `AVAILABLE` (not `IN_REPAIR`, `DISCARDED`, or already `INSTALLED`)
- Before removing a tire from a position: verify the position's `tire_id` matches the expected tire
- If a precondition fails, throw an error with a descriptive message (e.g., "Tire {serial} is not available for installation")

Add to `actions.server.ts`:

- `getVehicleTirePositions(vehicleId)` — all positions with tire info (serial, brand, size, status, tread_depth) and axle info (via template_axle_id)
- `getAvailableTiresForAxle(companyId, tireSize)` — tires with status AVAILABLE filtered by exact size match
- `performCalibration(data)` — create service item, update tire tread_depth. Data: `{ serviceOrderId, positionNumber, vehicleId, tireId, treadDepth, pressureStart, pressureEnd, observations }`
- `performRepair(data)` — transaction: old tire → IN_REPAIR, new tire → INSTALLED, update position, create service item. Data: `{ serviceOrderId, positionNumber, vehicleId, tireId, newTireId, observations }`
- `performReplace(data)` — transaction: handle old tire destination, new tire → INSTALLED, update position, create service item. Data: `{ serviceOrderId, positionNumber, vehicleId, tireId, newTireId, oldDestination, discardPhotoUrl?, discardComment?, treadDepth?, pressureStart?, pressureEnd?, observations? }`. Note: the `discardPhotoUrl` is already a URL string — the photo upload to Supabase Storage happens BEFORE calling this action (client-side upload via `supabaseBrowser().storage.from('tire-discards').upload(...)`, which returns the public URL passed here)
- `uploadDiscardPhoto(file: File)` — client-side utility (NOT a server action) that uploads to Supabase Storage bucket `tire-discards` and returns the public URL. Uses `supabaseBrowser().storage.from('tire-discards').upload(path, file)`. The bucket must be created in Supabase (add to migration or manually)
- `performInitialAssign(data)` — transaction: tire → INSTALLED, update position, create service item with tire_id=null. Data: `{ serviceOrderId, positionNumber, vehicleId, newTireId }`
- `searchVehicleByDomain(domain, companyId)` — for trailer search

- [ ] **Step 2: Create ServiceOrderWizard.tsx**

Client component with multi-step wizard:

**Step 1 — Vehicle Selection** (if not from QR):

- Combobox to search vehicle by domain
- Must have `tire_template_id`
- Show vehicle info (domain, brand, model)

**Step 2 — Order Setup**:

- Current km (editable input, pre-filled from vehicle)
- "Agregar Enganche" toggle → shows combobox to search trailer by domain
- Trailer must also have `tire_template_id`
- "Iniciar Operación" button → creates order via `createServiceOrder`

**Step 3 — Operation**:

- Renders `TireDiagram` component with vehicle positions
- If trailer: renders second `TireDiagram` below with separator
- Shows list of interventions performed in current session
- "Cerrar Orden" button → calls `closeServiceOrder`

- [ ] **Step 3: Create TireDiagram.tsx**

Wrapper around `TireDiagramRenderer`:

- Fetches positions for a vehicle via `useQuery` + `getVehicleTirePositions`
- Passes data to `TireDiagramRenderer` with `interactive=true`
- On position click: opens `TirePositionCard` modal/sheet
- Tracks highlighted positions (interventions in current session)

- [ ] **Step 4: Create TirePositionCard.tsx**

Client component — modal/sheet that opens when a position is clicked:

**If position has tire (tire_id !== null)**:

- Shows tire info: serial, brand, size, is_new/retread, tread_type, tread_depth %
- 3 action buttons: Calibrar / Reparar / Reemplazar

**If position is empty (tire_id === null)**:

- Shows "Posición vacía — primera asignación"
- Single button: "Asignar Cubierta"
- Opens `TireReplacePicker` directly

**Calibrar form**:

- Fields: tread_depth (%), pressure_start, pressure_end, observations
- Submit → `performCalibration`, invalidate positions query, close card

**Reparar form** (atomic two-step):

- Opens `TireReplacePicker` to select replacement
- Plus observations field
- Both required before submit → `performRepair`

**Reemplazar form** (atomic):

- Opens `TireReplacePicker` to select replacement
- Radio group for old tire destination: Disponible / Descarte / Reparación
- If Descarte: shows photo upload + comment (required)
- Fields: tread_depth, pressure_start, pressure_end, observations
- Submit → `performReplace`

- [ ] **Step 5: Create TireReplacePicker.tsx**

Client component:

- Receives `tireSize` filter prop
- Fetches available tires via `useQuery` + `getAvailableTiresForAxle`
- Searchable list/table showing: serial, brand, size, is_new/retread
- Selection callback `onSelect(tire)`

- [ ] **Step 6: Create ServiceOrderDetailView.tsx**

Read-only detail view of a closed order:

- Header: vehicle info, trailer, km, date, status, created by
- Diagram showing positions at time of service (read-only)
- Table of all interventions: position, action, tire serial, new tire serial, destination, observations

This component is used when clicking a row in the ServiceOrders DataTable.

- [ ] **Step 7: Run check-types + lint**

```bash
npm run check-types && npm run lint
```

---

## Task 11: QR Integration

**Files:**

- Modify: `src/app/maintenance/equipment/[id]/equipment-dashboard-client.tsx`
- Modify: `src/app/maintenance/equipment/[id]/page.tsx` (add tire_template_id to query)
- Create: `src/app/maintenance/equipment/[id]/tire-service/page.tsx`

- [ ] **Step 1: Update equipment page to include tire_template_id**

In the page server component that fetches equipment data, add `tire_template_id` to the select/query so it's available as a prop.

- [ ] **Step 2: Add 4th button to dashboard**

In `equipment-dashboard-client.tsx`:

- Add `tire_template_id` to the equipment interface/props
- Add new `ActionButton` after the existing 3:

```tsx
{
  equipment.tire_template_id && (
    <ActionButton
      icon={<CircleDot className="h-6 w-6" />}
      title="Operación de Gomería"
      description="Gestionar cubiertas del equipo"
      href={`/maintenance/equipment/${id}/tire-service`}
    />
  );
}
```

- [ ] **Step 3: Create tire-service page**

```tsx
// src/app/maintenance/equipment/[id]/tire-service/page.tsx
import ServiceOrderWizard from '@/features/Mantenimiento/Gomeria/Ordenes/components/ServiceOrderWizard';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TireServicePage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="container mx-auto p-4">
      <ServiceOrderWizard vehicleId={id} mode="qr" />
    </div>
  );
}
```

The `ServiceOrderWizard` in `mode="qr"` skips vehicle selection (already known from URL).

**Note**: This page intentionally has no `PermissionGuard` — it follows the same pattern as other QR maintenance pages (`/maintenance/equipment/[id]/request`, etc.) where the user is already authenticated via the QR flow and permissions are enforced at the server action level.

- [ ] **Step 4: Run check-types**

```bash
npm run check-types
```

---

## Task 12: Final Verification + Cleanup

- [ ] **Step 1: Run full type check**

```bash
npm run check-types
```

Fix any remaining type errors.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Fix any linting issues.

- [ ] **Step 3: Run format**

```bash
npm run format
```

- [ ] **Step 4: Verify no console.\* usage**

Search all new files for `console.` and replace with logger.

- [ ] **Step 5: Verify no :any usage**

Search all new files for `: any` and fix with proper types.

- [ ] **Step 6: Review all new files against project rules**

Check:

- All server actions use `'use server'` + Prisma + Logger
- All DataTables follow 3-layer architecture
- All forms use shadcn Form + Zod
- All dates use moment.js
- All fetch use React Query (no useEffect+useState)
- All text filters, faceted filters, dateRange filters per datatable-filters.md rules
- paramNamespace on all DataTables
- PermissionGuard on all create/edit/delete buttons
- Skeletons in fallback/ folders used in Suspense

- [ ] **Step 7: Manual browser verification**

Navigate to `/dashboard/maintenance` → Gomería tab. Verify:

1. Three subtabs visible (Catálogo, Plantillas, Órdenes)
2. Catálogo: can create/edit/bulk-create tires, DataTable loads with filters
3. Plantillas: can create template with axles, diagram preview works
4. Can assign template to a vehicle
5. Órdenes: can create service order, diagram interactive, can perform actions
6. QR flow: scan QR → dashboard → Gomería button appears → wizard works

---

## Dependency Graph

```
Task 1 (Schema) → Task 2 (Mappers + Permissions) → Task 3 (Tab Wiring)
                                                          ↓
                                                    Task 4 (Brands)
                                                          ↓
                                                    Task 5 (Tires Catalog)
                                                          ↓
                                                    Task 7 (Diagram Renderer)
                                                          ↓
                                                    Task 6 (Templates — uses Diagram)
                                                          ↓
                                                    Task 8 (Template Assignment)
                                                          ↓
                                                    Task 9 (Service Orders DataTable)
                                                          ↓
                                                    Task 10 (Service Order Wizard — uses Diagram)
                                                          ↓
                                                    Task 11 (QR Integration)
                                                          ↓
                                                    Task 12 (Verification)
```

Tasks 1–3 are sequential prerequisites. Task 7 (Diagram Renderer) must be completed before Task 6 (Templates use it for preview). All other tasks are sequential.
