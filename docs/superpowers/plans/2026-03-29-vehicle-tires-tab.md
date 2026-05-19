# Vehicle Tires Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Cubiertas" tab (#8) to the vehicle detail page showing the tire diagram with current state, an axle editor for per-vehicle customization, and a history table of tire service orders.

**Architecture:** Schema migration adds `tire_template_id` to vehicles (override) and `is_vehicle_override`/`source_template_id` to tire_templates (traceability). A centralized helper resolves the effective template (vehicle override > sub-type inheritance). 7 existing files are updated to use this resolution. New tab uses Client Components with useQuery (since it lives inside a Client Component parent), reusing `TireDiagramRenderer`, `AxleConfigurator`, and `ServiceOrderDetailView`.

**Tech Stack:** Next.js 16, React 19, Prisma, React Query, shadcn/ui, moment.js, Zod

**Spec:** `docs/superpowers/specs/2026-03-29-vehicle-tires-tab-design.md`

---

## File Map

### New Files (9)

| File                                                                                                         | Responsibility                                                         |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `prisma/migrations/<timestamp>_add_vehicle_tire_template_override/migration.sql`                             | Schema migration: fields + tab + permissions                           |
| `src/features/Mantenimiento/Gomeria/shared/resolve-template.ts`                                              | Pure helper: `resolveVehicleTireTemplateId()`                          |
| `src/features/Equipos/EquipoID/components/vehicle-tires/actions.server.ts`                                   | Server actions: positions, template info, CRUD axles, orders DataTable |
| `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tires-tab.tsx`                               | Tab container: diagram section + orders table                          |
| `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tire-diagram-section.tsx`                    | Diagram with current tire state + edit button                          |
| `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-axle-editor.tsx`                             | Sheet for adding/removing axles per vehicle                            |
| `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tire-orders/_VehicleTireOrdersDataTable.tsx` | Client DataTable for service orders                                    |
| `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tire-orders/columns.tsx`                     | Column definitions                                                     |
| `src/features/Equipos/EquipoID/components/vehicle-tires/fallback/VehicleTiresSkeleton.tsx`                   | Skeleton fallback                                                      |

### Modified Files (8)

| File                                                                      | Change                                        |
| ------------------------------------------------------------------------- | --------------------------------------------- |
| `prisma/schema.prisma`                                                    | Add fields to `vehicles` and `tire_templates` |
| `src/features/Mantenimiento/Gomeria/Ordenes/actions/actions.server.ts`    | 3 functions use resolve helper                |
| `src/features/Mantenimiento/Gomeria/Plantillas/actions/actions.server.ts` | `deleteTemplate` guard checks vehicles too    |
| `src/app/maintenance/equipment/[id]/tire-service/page.tsx`                | QR gate uses resolved template                |
| `src/app/maintenance/equipment/[id]/page.tsx`                             | Select includes vehicle `tire_template_id`    |
| `src/features/Equipos/EquipoID/components/vehicle-tabs.tsx`               | Add tab #8 + grid-cols-8                      |
| `src/features/Equipos/EquipoID/components/vehicle-form.tsx`               | Accept `tiresComponent` slot                  |
| `src/features/Permissions/permissions-map.ts`                             | Add `cubiertas-equipo` subtab                 |

---

## Task 1: Schema Migration

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_vehicle_tire_template_override/migration.sql`

- [ ] **Step 1: Update Prisma schema — vehicles**

Add to the `vehicles` model (after `subType` field, around line 2598):

```prisma
  tire_template_id             String?                        @db.Uuid
  tire_template                tire_templates?                @relation("vehicle_tire_template", fields: [tire_template_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
```

- [ ] **Step 2: Update Prisma schema — tire_templates**

Add to the `tire_templates` model (after `description` field, around line 2667):

```prisma
  is_vehicle_override Boolean  @default(false)
  source_template_id  String?  @db.Uuid
  source_template     tire_templates?  @relation("template_source", fields: [source_template_id], references: [id], onDelete: SetNull, onUpdate: NoAction)
  derived_templates   tire_templates[] @relation("template_source")
```

Add the back-relation in vehicles model:

```prisma
  // Inside tire_templates, ensure it has:
  vehicles_override  vehicles[] @relation("vehicle_tire_template")
```

- [ ] **Step 3: Generate migration diff**

Run: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`

Review the output and take ONLY the `ALTER TABLE` statements for `vehicles` and `tire_templates`. Ignore any drift.

- [ ] **Step 4: Create migration folder and SQL file**

Create directory: `prisma/migrations/<YYYYMMDDHHMMSS>_add_vehicle_tire_template_override/`

Write `migration.sql` with:

```sql
-- 1. Add tire_template_id override to vehicles
ALTER TABLE "public"."vehicles"
ADD COLUMN "tire_template_id" UUID;

ALTER TABLE "public"."vehicles"
ADD CONSTRAINT "vehicles_tire_template_id_fkey"
FOREIGN KEY ("tire_template_id") REFERENCES "public"."tire_templates"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 2. Add is_vehicle_override and source_template_id to tire_templates
ALTER TABLE "public"."tire_templates"
ADD COLUMN "is_vehicle_override" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."tire_templates"
ADD COLUMN "source_template_id" UUID;

ALTER TABLE "public"."tire_templates"
ADD CONSTRAINT "tire_templates_source_template_id_fkey"
FOREIGN KEY ("source_template_id") REFERENCES "public"."tire_templates"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

-- 3. Insert tab for cubiertas-equipo
-- First get the detalle-equipo tab id
-- Module equipos: 34d7f9e5-7c01-4def-9446-6b3f52d761a0
-- detalle-equipo tabId: 30000000-0000-0000-0000-000000000005

INSERT INTO "public"."tabs" (id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES (
  '30000000-0000-0000-0000-000000000057',
  '34d7f9e5-7c01-4def-9446-6b3f52d761a0',
  'cubiertas-equipo',
  'Cubiertas',
  'Diagrama de cubiertas y historial de intervenciones del equipo',
  7,
  '30000000-0000-0000-0000-000000000005'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Assign view + update permissions to admin, administrador, full-access-provisional
INSERT INTO "public"."role_permissions" (role_id, tab_id, action_id)
SELECT r.id, '30000000-0000-0000-0000-000000000057', a.id
FROM "public"."roles" r, "public"."actions" a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
AND a.slug IN ('view', 'update')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
```

**Note:** Verify the `detalle-equipo` tab id matches `30000000-0000-0000-0000-000000000005` by querying: `SELECT id FROM tabs WHERE slug = 'detalle-equipo'` via MCP supabase-LOCAL before applying. Adjust the UUID `000000000057` if it conflicts — generate a new one with `gen_random_uuid()` if needed.

- [ ] **Step 5: Apply migration**

```bash
npx prisma db execute --file prisma/migrations/<TIMESTAMP>_add_vehicle_tire_template_override/migration.sql
npx prisma migrate resolve --applied <TIMESTAMP>_add_vehicle_tire_template_override
npx prisma generate
```

- [ ] **Step 6: Verify migration via MCP supabase-LOCAL**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicles' AND column_name = 'tire_template_id';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tire_templates' AND column_name IN ('is_vehicle_override', 'source_template_id');

SELECT id, slug, name, parent_tab_id FROM tabs WHERE slug = 'cubiertas-equipo';
```

- [ ] **Step 7: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 2: Resolve Template Helper

**Files:**

- Create: `src/features/Mantenimiento/Gomeria/shared/resolve-template.ts`

- [ ] **Step 1: Create the helper**

```typescript
/**
 * Resolves the effective tire_template_id for a vehicle.
 * Priority: vehicle override > sub-type inheritance.
 */
export function resolveVehicleTireTemplateId(vehicle: {
  tire_template_id?: string | null;
  sub_type?: { tire_template_id?: string | null } | null;
}): string | null {
  return vehicle.tire_template_id ?? vehicle.sub_type?.tire_template_id ?? null;
}
```

- [ ] **Step 2: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 3: Update Existing Code — searchVehicleByDomain

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Ordenes/actions/actions.server.ts:905-941`

- [ ] **Step 1: Add import**

At the top of the file, add:

```typescript
import { resolveVehicleTireTemplateId } from '@/features/Mantenimiento/Gomeria/shared/resolve-template';
```

- [ ] **Step 2: Update select to include vehicle's tire_template_id**

In `searchVehicleByDomain`, update the `select` to also include the vehicle's own `tire_template_id`:

```typescript
select: {
  id: true,
  domain: true,
  intern_number: true,
  tire_template_id: true, // ← ADD THIS
  type: true,
  sub_type: {
    select: {
      id: true,
      tire_template_id: true,
    },
  },
},
```

- [ ] **Step 3: Update return mapping**

Replace `tire_template_id: v.sub_type?.tire_template_id ?? null` with:

```typescript
tire_template_id: resolveVehicleTireTemplateId(v),
```

- [ ] **Step 4: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 4: Update Existing Code — searchCompatibleHitchVehicles

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Ordenes/actions/actions.server.ts:984-1048`

- [ ] **Step 1: Update select in the hitch search query (step 3 of the function)**

Add `tire_template_id: true` to the vehicle select:

```typescript
select: {
  id: true,
  domain: true,
  intern_number: true,
  tire_template_id: true, // ← ADD THIS
  type: true,
  sub_type: {
    select: {
      id: true,
      tire_template_id: true,
    },
  },
},
```

- [ ] **Step 2: Update return mapping**

Replace `tire_template_id: v.sub_type?.tire_template_id ?? null` with:

```typescript
tire_template_id: resolveVehicleTireTemplateId(v),
```

- [ ] **Step 3: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 5: Update Existing Code — ensureVehicleTirePositions

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Ordenes/actions/actions.server.ts:1060-1195`

- [ ] **Step 1: Update vehicle select to include tire_template_id**

In `ensureVehicleTirePositions`, update the vehicle query (around line 1099) to also select the vehicle's own `tire_template_id`:

```typescript
const vehicle = await prisma.vehicles.findUnique({
  where: { id: vehicleId },
  select: {
    id: true,
    tire_template_id: true, // ← ADD THIS
    sub_type: {
      select: {
        id: true,
        tire_template_id: true,
      },
    },
  },
});
```

- [ ] **Step 2: Use resolve helper**

Replace the template resolution (lines 1112-1116):

```typescript
// BEFORE:
if (!vehicle?.sub_type?.tire_template_id) {
  throw new Error('El subtipo de este equipo no tiene plantilla de cubiertas asignada');
}
const templateId = vehicle.sub_type.tire_template_id;

// AFTER:
const templateId = vehicle ? resolveVehicleTireTemplateId(vehicle) : null;
if (!templateId) {
  throw new Error('Este equipo no tiene configuración de cubiertas asignada');
}
```

- [ ] **Step 3: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 6: Update Existing Code — deleteTemplate Guard

**Files:**

- Modify: `src/features/Mantenimiento/Gomeria/Plantillas/actions/actions.server.ts:325-348`

- [ ] **Step 1: Add vehicle check to deleteTemplate**

After the existing sub_type check (line 337), add a check for vehicles using this template as override:

```typescript
export async function deleteTemplate(id: string) {
  logger.debug('Soft-deleting tire template', { data: { id } });
  try {
    // Check if any active sub_type uses this template
    const subTypesWithTemplate = await prisma.sub_type.findMany({
      where: { tire_template_id: id, is_active: true },
      select: { id: true, name: true },
    });

    if (subTypesWithTemplate.length > 0) {
      const names = subTypesWithTemplate.map((s) => s.name).join(', ');
      throw new Error(`No se puede eliminar la plantilla porque está asignada a los siguientes subtipos: ${names}`);
    }

    // Check if any active vehicle uses this template as override
    const vehiclesWithTemplate = await prisma.vehicles.findMany({
      where: { tire_template_id: id, is_active: true },
      select: { id: true, domain: true },
    });

    if (vehiclesWithTemplate.length > 0) {
      const domains = vehiclesWithTemplate.map((v) => v.domain ?? 'Sin dominio').join(', ');
      throw new Error(
        `No se puede eliminar la plantilla porque está asignada como personalizada a los siguientes equipos: ${domains}`
      );
    }

    const template = await prisma.tire_templates.update({
      where: { id },
      data: { is_active: false },
    });
    return template;
  } catch (error) {
    logger.error('Error deleting tire template', { data: { error, id } });
    throw error;
  }
}
```

- [ ] **Step 2: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 7: Update Existing Code — QR Gate & Equipment Dashboard

**Files:**

- Modify: `src/app/maintenance/equipment/[id]/tire-service/page.tsx`
- Modify: `src/app/maintenance/equipment/[id]/page.tsx`

- [ ] **Step 1: Update tire-service/page.tsx QR gate**

The Supabase query needs to also select the vehicle's `tire_template_id`:

```typescript
const { data: equipmentData } = await supabase
  .from('vehicles')
  .select('company_id, tire_template_id, sub_type:subType(tire_template_id)')
  .eq('id', id)
  .single();
```

Update the resolution logic:

```typescript
// BEFORE:
const subTypeTireTemplateId = (equipmentData.sub_type as { tire_template_id: string | null } | null)?.tire_template_id;
if (!subTypeTireTemplateId) {
  redirect(`/maintenance/equipment/${id}`);
}

// AFTER:
const vehicleTireTemplateId = equipmentData.tire_template_id as string | null;
const subTypeTireTemplateId = (equipmentData.sub_type as { tire_template_id: string | null } | null)?.tire_template_id;
const effectiveTemplateId = vehicleTireTemplateId ?? subTypeTireTemplateId;
if (!effectiveTemplateId) {
  redirect(`/maintenance/equipment/${id}`);
}
```

- [ ] **Step 2: Update equipment/[id]/page.tsx dashboard**

In the Supabase select, add `tire_template_id` at the vehicle level (it may already be in the select string as `*` or needs explicit addition). Update the resolution:

```typescript
// BEFORE:
tire_template_id:
  (equipmentData.sub_type as unknown as { tire_template_id: string | null } | null)
    ?.tire_template_id ?? null,

// AFTER:
tire_template_id:
  (equipmentData.tire_template_id as string | null) ??
  (equipmentData.sub_type as unknown as { tire_template_id: string | null } | null)
    ?.tire_template_id ?? null,
```

- [ ] **Step 3: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 8: Server Actions — Positions & Template Info

**Files:**

- Create: `src/features/Equipos/EquipoID/components/vehicle-tires/actions.server.ts`

- [ ] **Step 1: Create file with imports and logger**

```typescript
'use server';

import { Logger } from '@/lib/logger';
import { resolveVehicleTireTemplateId } from '@/features/Mantenimiento/Gomeria/shared/resolve-template';
import { calculatePositions } from '@/features/Mantenimiento/Gomeria/shared/tire-diagram-utils';
import type { DiagramAxle } from '@/features/Mantenimiento/Gomeria/shared/tire-diagram-utils';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';
import { TireServiceOrderStatus } from '@prisma/client';

const logger = new Logger('features/Equipos/VehicleTires');
```

- [ ] **Step 2: Add getVehicleTirePositionsWithDetails**

```typescript
export async function getVehicleTirePositionsWithDetails(vehicleId: string) {
  logger.debug('Getting vehicle tire positions with details', { data: { vehicleId } });

  try {
    const positions = await prisma.vehicle_tire_positions.findMany({
      where: { vehicle_id: vehicleId },
      include: {
        tire: {
          select: {
            id: true,
            serial_number: true,
            status: true,
            tread_depth: true,
            is_new: true,
            retread_level: true,
            brand: { select: { id: true, name: true } },
            tire_type: { select: { id: true, size: true, tread_type: true } },
          },
        },
        template_axle: {
          select: {
            id: true,
            axle_number: true,
            tires_per_side: true,
            tire_size: true,
            is_drive_axle: true,
            is_spare: true,
          },
        },
      },
      orderBy: { position_number: 'asc' },
    });

    return positions;
  } catch (error) {
    logger.error('Error getting vehicle tire positions', { data: { error, vehicleId } });
    throw error;
  }
}

export type VehicleTirePositionWithDetails = Awaited<ReturnType<typeof getVehicleTirePositionsWithDetails>>[number];
```

- [ ] **Step 3: Add getVehicleTemplateInfo**

```typescript
export async function getVehicleTemplateInfo(vehicleId: string) {
  logger.debug('Getting vehicle template info', { data: { vehicleId } });

  try {
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: vehicleId },
      select: {
        tire_template_id: true,
        tire_template: { select: { id: true, name: true, is_vehicle_override: true, source_template_id: true } },
        sub_type: {
          select: {
            id: true,
            name: true,
            tire_template_id: true,
            tire_template: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!vehicle) throw new Error('Vehículo no encontrado');

    const hasOverride = !!vehicle.tire_template_id;
    const effectiveTemplateId = resolveVehicleTireTemplateId(vehicle);

    if (!effectiveTemplateId) {
      return {
        hasOverride: false,
        templateId: null,
        templateName: null,
        sourceType: 'none' as const,
        subTypeName: vehicle.sub_type?.name ?? null,
        subTypeHasTemplate: !!vehicle.sub_type?.tire_template_id,
      };
    }

    return {
      hasOverride,
      templateId: effectiveTemplateId,
      templateName: hasOverride
        ? vehicle.tire_template?.name ?? 'Personalizada'
        : vehicle.sub_type?.tire_template?.name ?? null,
      sourceType: hasOverride ? ('vehicle' as const) : ('sub_type' as const),
      subTypeName: vehicle.sub_type?.name ?? null,
      subTypeHasTemplate: !!vehicle.sub_type?.tire_template_id,
    };
  } catch (error) {
    logger.error('Error getting vehicle template info', { data: { error, vehicleId } });
    throw error;
  }
}

export type VehicleTemplateInfo = Awaited<ReturnType<typeof getVehicleTemplateInfo>>;
```

- [ ] **Step 4: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 9: Server Actions — Custom Template CRUD

**Files:**

- Modify: `src/features/Equipos/EquipoID/components/vehicle-tires/actions.server.ts`

- [ ] **Step 1: Define AxleInput type**

```typescript
export type AxleInput = {
  axle_number: number;
  tires_per_side: number;
  tire_size: string;
  is_drive_axle: boolean;
  is_spare: boolean;
};
```

- [ ] **Step 2: Add createVehicleCustomTemplate**

```typescript
export async function createVehicleCustomTemplate(vehicleId: string, axles: AxleInput[]) {
  logger.debug('Creating custom tire template for vehicle', { data: { vehicleId, axleCount: axles.length } });

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Get vehicle with current template info
      const vehicle = await tx.vehicles.findUnique({
        where: { id: vehicleId },
        select: {
          id: true,
          domain: true,
          company_id: true,
          tire_template_id: true,
          sub_type: { select: { tire_template_id: true } },
        },
      });

      if (!vehicle) throw new Error('Vehículo no encontrado');
      if (vehicle.tire_template_id) throw new Error('El vehículo ya tiene una plantilla personalizada');

      const sourceTemplateId = vehicle.sub_type?.tire_template_id ?? null;

      // 2. Create custom template
      const template = await tx.tire_templates.create({
        data: {
          name: `Custom - ${vehicle.domain ?? vehicleId}`,
          company_id: vehicle.company_id!,
          is_vehicle_override: true,
          source_template_id: sourceTemplateId,
        },
      });

      // 3. Create axles
      if (axles.length > 0) {
        await tx.tire_template_axles.createMany({
          data: axles.map((axle) => ({
            template_id: template.id,
            axle_number: axle.axle_number,
            tires_per_side: axle.tires_per_side,
            tire_size: axle.tire_size,
            is_drive_axle: axle.is_drive_axle,
            is_spare: axle.is_spare,
          })),
        });
      }

      // 4. Assign template to vehicle
      await tx.vehicles.update({
        where: { id: vehicleId },
        data: { tire_template_id: template.id },
      });

      // 5. Delete old positions (they belong to the sub-type's template)
      // First, uninstall any tires from those positions
      const oldPositions = await tx.vehicle_tire_positions.findMany({
        where: { vehicle_id: vehicleId, tire_id: { not: null } },
        select: { tire_id: true },
      });

      if (oldPositions.length > 0) {
        const tireIds = oldPositions.map((p) => p.tire_id!);
        await tx.tires.updateMany({
          where: { id: { in: tireIds } },
          data: { status: 'AVAILABLE' },
        });
      }

      await tx.vehicle_tire_positions.deleteMany({
        where: { vehicle_id: vehicleId },
      });

      // 6. Generate new positions from the new axles
      const newAxles = await tx.tire_template_axles.findMany({
        where: { template_id: template.id },
        orderBy: { axle_number: 'asc' },
      });

      const diagramAxles: DiagramAxle[] = newAxles.map((a) => ({
        id: a.id,
        axle_number: a.axle_number,
        tires_per_side: a.tires_per_side,
        tire_size: a.tire_size,
        is_drive_axle: a.is_drive_axle,
        is_spare: a.is_spare,
      }));

      const computedPositions = calculatePositions(diagramAxles);
      const axleIdByNumber = new Map(newAxles.map((a) => [a.axle_number, a.id]));

      if (computedPositions.length > 0) {
        await tx.vehicle_tire_positions.createMany({
          data: computedPositions.map((pos) => ({
            vehicle_id: vehicleId,
            template_axle_id: axleIdByNumber.get(pos.axle_number)!,
            position_number: pos.position_number,
            axle_number: pos.axle_number,
            side: pos.side,
            tire_id: null,
          })),
        });
      }

      logger.info('Created custom template for vehicle', {
        data: { vehicleId, templateId: template.id, positions: computedPositions.length },
      });

      return template;
    });
  } catch (error) {
    logger.error('Error creating custom template for vehicle', { data: { error, vehicleId } });
    throw error;
  }
}
```

- [ ] **Step 3: Add updateVehicleCustomAxles**

```typescript
export async function updateVehicleCustomAxles(vehicleId: string, axles: AxleInput[]) {
  logger.debug('Updating custom axles for vehicle', { data: { vehicleId, axleCount: axles.length } });

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify vehicle has an override template
      const vehicle = await tx.vehicles.findUnique({
        where: { id: vehicleId },
        select: { tire_template_id: true, tire_template: { select: { is_vehicle_override: true } } },
      });

      if (!vehicle?.tire_template_id || !vehicle.tire_template?.is_vehicle_override) {
        throw new Error('El vehículo no tiene una plantilla personalizada para editar');
      }

      const templateId = vehicle.tire_template_id;

      // 2. Uninstall all tires from current positions
      const currentPositions = await tx.vehicle_tire_positions.findMany({
        where: { vehicle_id: vehicleId, tire_id: { not: null } },
        select: { tire_id: true },
      });

      if (currentPositions.length > 0) {
        const tireIds = currentPositions.map((p) => p.tire_id!);
        await tx.tires.updateMany({
          where: { id: { in: tireIds } },
          data: { status: 'AVAILABLE' },
        });
      }

      // 3. Delete all current positions
      await tx.vehicle_tire_positions.deleteMany({
        where: { vehicle_id: vehicleId },
      });

      // 4. Delete all current axles of the template
      await tx.tire_template_axles.deleteMany({
        where: { template_id: templateId },
      });

      // 5. Create new axles
      if (axles.length > 0) {
        await tx.tire_template_axles.createMany({
          data: axles.map((axle) => ({
            template_id: templateId,
            axle_number: axle.axle_number,
            tires_per_side: axle.tires_per_side,
            tire_size: axle.tire_size,
            is_drive_axle: axle.is_drive_axle,
            is_spare: axle.is_spare,
          })),
        });
      }

      // 6. Generate new positions
      const newAxles = await tx.tire_template_axles.findMany({
        where: { template_id: templateId },
        orderBy: { axle_number: 'asc' },
      });

      const diagramAxles: DiagramAxle[] = newAxles.map((a) => ({
        id: a.id,
        axle_number: a.axle_number,
        tires_per_side: a.tires_per_side,
        tire_size: a.tire_size,
        is_drive_axle: a.is_drive_axle,
        is_spare: a.is_spare,
      }));

      const computedPositions = calculatePositions(diagramAxles);
      const axleIdByNumber = new Map(newAxles.map((a) => [a.axle_number, a.id]));

      if (computedPositions.length > 0) {
        await tx.vehicle_tire_positions.createMany({
          data: computedPositions.map((pos) => ({
            vehicle_id: vehicleId,
            template_axle_id: axleIdByNumber.get(pos.axle_number)!,
            position_number: pos.position_number,
            axle_number: pos.axle_number,
            side: pos.side,
            tire_id: null,
          })),
        });
      }

      logger.info('Updated custom axles for vehicle', {
        data: { vehicleId, templateId, positions: computedPositions.length },
      });
    });
  } catch (error) {
    logger.error('Error updating custom axles', { data: { error, vehicleId } });
    throw error;
  }
}
```

- [ ] **Step 4: Add resetVehicleToSubTypeTemplate**

```typescript
export async function resetVehicleToSubTypeTemplate(vehicleId: string) {
  logger.debug('Resetting vehicle to sub-type template', { data: { vehicleId } });

  try {
    return await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicles.findUnique({
        where: { id: vehicleId },
        select: {
          tire_template_id: true,
          tire_template: { select: { is_vehicle_override: true } },
          sub_type: { select: { tire_template_id: true } },
        },
      });

      if (!vehicle?.tire_template_id || !vehicle.tire_template?.is_vehicle_override) {
        throw new Error('El vehículo no tiene una plantilla personalizada para restablecer');
      }

      const customTemplateId = vehicle.tire_template_id;

      // 1. Uninstall all tires
      const positions = await tx.vehicle_tire_positions.findMany({
        where: { vehicle_id: vehicleId, tire_id: { not: null } },
        select: { tire_id: true },
      });

      if (positions.length > 0) {
        const tireIds = positions.map((p) => p.tire_id!);
        await tx.tires.updateMany({
          where: { id: { in: tireIds } },
          data: { status: 'AVAILABLE' },
        });
      }

      // 2. Delete positions
      await tx.vehicle_tire_positions.deleteMany({ where: { vehicle_id: vehicleId } });

      // 3. Remove override from vehicle
      await tx.vehicles.update({
        where: { id: vehicleId },
        data: { tire_template_id: null },
      });

      // 4. Soft-delete the custom template if no other vehicle uses it
      const otherVehicles = await tx.vehicles.count({
        where: { tire_template_id: customTemplateId, id: { not: vehicleId } },
      });

      if (otherVehicles === 0) {
        await tx.tire_templates.update({
          where: { id: customTemplateId },
          data: { is_active: false },
        });
      }

      logger.info('Reset vehicle to sub-type template', { data: { vehicleId } });
    });
  } catch (error) {
    logger.error('Error resetting vehicle template', { data: { error, vehicleId } });
    throw error;
  }
}
```

- [ ] **Step 5: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 10: Server Actions — Orders DataTable

**Files:**

- Modify: `src/features/Equipos/EquipoID/components/vehicle-tires/actions.server.ts`

- [ ] **Step 1: Add getVehicleTireOrdersPaginated**

```typescript
export async function getVehicleTireOrdersPaginated(vehicleId: string, searchParams: DataTableSearchParams) {
  logger.debug('Getting paginated tire orders for vehicle', { data: { vehicleId } });

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    const baseWhere = {
      OR: [{ vehicle_id: vehicleId }, { trailer_vehicle_id: vehicleId }],
    };

    const searchWhere = buildSearchWhere(state, ['kilometer']);
    const filtersWhere = buildFiltersWhere(state, {
      status: 'status',
      creator: 'created_by',
    });
    const dateRangeWhere = buildDateRangeFiltersWhere(state, ['service_date', 'closed_at']);
    const textWhere = buildTextFiltersWhere(state, ['kilometer'], ['status', 'creator']);

    const where = {
      AND: [baseWhere, searchWhere, filtersWhere, dateRangeWhere, textWhere].filter((w) => Object.keys(w).length > 0),
    };

    // Sorting
    const VALID_SORT_FIELDS = ['service_date', 'status', 'kilometer', 'closed_at', 'created_at'];
    const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
      creator: (dir) => ({ creator: { lastname: dir } }),
    };

    let orderBy: Record<string, unknown>[] = [];
    if (state.sorting && state.sorting.length > 0) {
      for (const sort of state.sorting) {
        const fkMapper = FK_SORT_MAP[sort.id];
        if (fkMapper) {
          orderBy.push(fkMapper(sort.desc ? 'desc' : 'asc'));
        } else if (VALID_SORT_FIELDS.includes(sort.id)) {
          orderBy.push({ [sort.id]: sort.desc ? 'desc' : 'asc' });
        }
      }
    }
    if (orderBy.length === 0) {
      orderBy = [{ service_date: 'desc' }];
    }

    const [data, total] = await Promise.all([
      prisma.tire_service_orders.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          service_date: true,
          kilometer: true,
          status: true,
          closed_at: true,
          created_at: true,
          created_by: true,
          vehicle_id: true,
          trailer_vehicle_id: true,
          creator: { select: { id: true, firstname: true, lastname: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.tire_service_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error getting tire orders for vehicle', { data: { error, vehicleId } });
    throw error;
  }
}

export type VehicleTireOrderItem = Awaited<ReturnType<typeof getVehicleTireOrdersPaginated>>['data'][number];
```

- [ ] **Step 2: Add getVehicleTireOrdersForExport**

```typescript
export async function getVehicleTireOrdersForExport(vehicleId: string, searchParams: DataTableSearchParams) {
  logger.debug('Getting tire orders for export', { data: { vehicleId } });

  try {
    const state = parseSearchParams(searchParams);

    const baseWhere = {
      OR: [{ vehicle_id: vehicleId }, { trailer_vehicle_id: vehicleId }],
    };

    const searchWhere = buildSearchWhere(state, ['kilometer']);
    const filtersWhere = buildFiltersWhere(state, {
      status: 'status',
      creator: 'created_by',
    });
    const dateRangeWhere = buildDateRangeFiltersWhere(state, ['service_date', 'closed_at']);
    const textWhere = buildTextFiltersWhere(state, ['kilometer'], ['status', 'creator']);

    const where = {
      AND: [baseWhere, searchWhere, filtersWhere, dateRangeWhere, textWhere].filter((w) => Object.keys(w).length > 0),
    };

    const data = await prisma.tire_service_orders.findMany({
      where,
      orderBy: { service_date: 'desc' },
      select: {
        id: true,
        service_date: true,
        kilometer: true,
        status: true,
        closed_at: true,
        created_at: true,
        created_by: true,
        creator: { select: { firstname: true, lastname: true } },
        _count: { select: { items: true } },
      },
    });

    return data;
  } catch (error) {
    logger.error('Error exporting tire orders', { data: { error, vehicleId } });
    throw error;
  }
}
```

- [ ] **Step 3: Add getVehicleTireOrderSingleFacet**

```typescript
export async function getVehicleTireOrderSingleFacet(
  vehicleId: string,
  columnId: string,
  searchParams: DataTableSearchParams
) {
  logger.debug('Getting single facet for vehicle tire orders', { data: { vehicleId, columnId } });

  try {
    const state = parseSearchParams(searchParams);

    const baseWhere = {
      OR: [{ vehicle_id: vehicleId }, { trailer_vehicle_id: vehicleId }],
    };

    // Cross-filter: apply all filters EXCEPT the one being faceted
    const crossFiltersWhere = buildFiltersWhere(
      state,
      {
        status: 'status',
        creator: 'created_by',
      },
      columnId
    ); // exclude current column
    const searchWhere = buildSearchWhere(state, ['kilometer']);
    const dateRangeWhere = buildDateRangeFiltersWhere(state, ['service_date', 'closed_at']);
    const textWhere = buildTextFiltersWhere(state, ['kilometer'], ['status', 'creator']);

    const where = {
      AND: [baseWhere, searchWhere, crossFiltersWhere, dateRangeWhere, textWhere].filter(
        (w) => Object.keys(w).length > 0
      ),
    };

    if (columnId === 'status') {
      const groups = await prisma.tire_service_orders.groupBy({
        by: ['status'],
        where,
        _count: true,
      });

      const counts = new Map(groups.map((g) => [g.status, g._count]));
      return { counts };
    }

    if (columnId === 'creator') {
      const groups = await prisma.tire_service_orders.groupBy({
        by: ['created_by'],
        where,
        _count: true,
      });

      const creatorIds = groups.map((g) => g.created_by);
      const creators = await prisma.profile.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, firstname: true, lastname: true },
      });

      const counts = new Map(groups.map((g) => [g.created_by, g._count]));
      const resolvedOptions = creators.map((c) => ({
        value: c.id,
        label: `${c.lastname ?? ''} ${c.firstname ?? ''}`.trim(),
      }));

      return { counts, resolvedOptions };
    }

    return { counts: new Map() };
  } catch (error) {
    logger.error('Error getting tire order facet', { data: { error, vehicleId, columnId } });
    throw error;
  }
}
```

- [ ] **Step 4: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 11: Columns Definition

**Files:**

- Create: `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tire-orders/columns.tsx`

- [ ] **Step 1: Create columns file**

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable/DataTableColumnHeader';
import {
  tireServiceOrderStatusBadges,
  tireServiceOrderStatusLabels,
} from '@/features/Mantenimiento/Gomeria/shared/tire-mappers';
import type { ColumnDef } from '@tanstack/react-table';
import type { VehicleTireOrderItem } from '../actions.server';
import moment from 'moment';
import type { BadgeProps } from '@/components/ui/badge';

export function getColumns(): ColumnDef<VehicleTireOrderItem>[] {
  return [
    {
      id: 'service_date',
      accessorKey: 'service_date',
      meta: { title: 'Fecha de Servicio' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Servicio" />,
      cell: ({ row }) => (
        <div>{row.original.service_date ? moment(row.original.service_date).format('DD/MM/YYYY') : '-'}</div>
      ),
    },
    {
      id: 'kilometer',
      accessorKey: 'kilometer',
      meta: { title: 'Kilómetro' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kilómetro" />,
      cell: ({ row }) => <div>{row.original.kilometer ?? '-'}</div>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
        const label = tireServiceOrderStatusLabels[status] ?? status;
        const variant = (tireServiceOrderStatusBadges[status] ?? 'default') as NonNullable<BadgeProps['variant']>;
        return <Badge variant={variant}>{label}</Badge>;
      },
      filterFn: (row, id, value: string[]) => {
        return value.includes(row.getValue(id) as string);
      },
    },
    {
      id: 'interventions',
      accessorFn: (row) => row._count.items,
      meta: { title: 'Intervenciones' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Intervenciones" />,
      cell: ({ row }) => <div className="text-center">{row.original._count.items}</div>,
      enableSorting: false,
    },
    {
      id: 'creator',
      accessorFn: (row) => `${row.creator?.lastname ?? ''} ${row.creator?.firstname ?? ''}`.trim(),
      meta: { title: 'Creado por' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Creado por" />,
      cell: ({ row }) => {
        const creator = row.original.creator;
        return <div>{creator ? `${creator.lastname ?? ''} ${creator.firstname ?? ''}`.trim() : '-'}</div>;
      },
      filterFn: (row, _id, value: string[]) => {
        const creatorId = row.original.created_by;
        return value.includes(creatorId);
      },
    },
    {
      id: 'closed_at',
      accessorKey: 'closed_at',
      meta: { title: 'Fecha de Cierre' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Cierre" />,
      cell: ({ row }) => (
        <div>{row.original.closed_at ? moment(row.original.closed_at).format('DD/MM/YYYY') : '-'}</div>
      ),
    },
  ];
}
```

- [ ] **Step 2: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 12: DataTable Client Component

**Files:**

- Create: `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tire-orders/_VehicleTireOrdersDataTable.tsx`

- [ ] **Step 1: Create the DataTable client component**

```typescript
'use client';

import { useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/shared/components/common/DataTable';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import type { FacetResult } from '@/shared/components/common/DataTable/types';
import { TireServiceOrderStatus } from '@prisma/client';
import {
  tireServiceOrderStatusLabels,
  tireServiceOrderStatusBadges,
} from '@/features/Mantenimiento/Gomeria/shared/tire-mappers';
import { ServiceOrderDetailView } from '@/features/Mantenimiento/Gomeria/Ordenes/components/ServiceOrderDetailView';
import {
  getVehicleTireOrdersPaginated,
  getVehicleTireOrdersForExport,
  getVehicleTireOrderSingleFacet,
} from '../actions.server';
import type { VehicleTireOrderItem } from '../actions.server';
import { getColumns } from './columns';
import moment from 'moment';

const TABLE_ID = 'vehicle-tire-orders';

interface VehicleTireOrdersDataTableProps {
  vehicleId: string;
}

export function VehicleTireOrdersDataTable({ vehicleId }: VehicleTireOrdersDataTableProps) {
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  const tableQueryFn = useCallback(
    (params: DataTableSearchParams) => getVehicleTireOrdersPaginated(vehicleId, params),
    [vehicleId]
  );

  const columns = useMemo(() => getColumns(), []);

  // ── Lazy-load facets ──
  const makeEnumFetchFacet = useCallback(
    (columnId: string, enumValues: string[], labels: Record<string, string>) => {
      return async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getVehicleTireOrderSingleFacet(vehicleId, columnId, params);
        if (!result) return { options: [], counts: new Map() };
        const options = enumValues.map((v) => ({
          value: v,
          label: labels[v] ?? v,
        }));
        return { options, counts: result.counts };
      };
    },
    [vehicleId]
  );

  const makeFkFetchFacet = useCallback(
    (columnId: string) => {
      return async (params: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getVehicleTireOrderSingleFacet(vehicleId, columnId, params);
        if (!result) return { options: [], counts: new Map() };
        return {
          options: result.resolvedOptions ?? [],
          counts: result.counts,
        };
      };
    },
    [vehicleId]
  );

  const facetedFilters = useMemo(
    () => [
      {
        columnId: 'status',
        title: 'Estado',
        fetchFacet: makeEnumFetchFacet(
          'status',
          Object.values(TireServiceOrderStatus),
          tireServiceOrderStatusLabels
        ),
      },
      {
        columnId: 'creator',
        title: 'Creado por',
        fetchFacet: makeFkFetchFacet('creator'),
      },
    ],
    [makeEnumFetchFacet, makeFkFetchFacet]
  );

  const exportConfig = useMemo(
    () => ({
      fileName: 'ordenes-gomeria-equipo',
      fetchAllData: () => getVehicleTireOrdersForExport(vehicleId, currentParams),
      columns: [
        { header: 'Fecha de Servicio', accessorKey: 'service_date' as const, formatter: (val: unknown) => val ? moment(val as string).format('DD/MM/YYYY') : '-' },
        { header: 'Kilómetro', accessorKey: 'kilometer' as const },
        { header: 'Estado', accessorKey: 'status' as const, formatter: (val: unknown) => tireServiceOrderStatusLabels[val as TireServiceOrderStatus] ?? String(val) },
        { header: 'Creado por', accessorKey: 'creator' as const, formatter: (_val: unknown, row: Record<string, unknown>) => {
          const creator = row.creator as { firstname?: string; lastname?: string } | null;
          return creator ? `${creator.lastname ?? ''} ${creator.firstname ?? ''}`.trim() : '-';
        }},
        { header: 'Fecha de Cierre', accessorKey: 'closed_at' as const, formatter: (val: unknown) => val ? moment(val as string).format('DD/MM/YYYY') : '-' },
      ],
    }),
    [vehicleId, currentParams]
  );

  return (
    <>
      <DataTable<VehicleTireOrderItem>
        columns={columns}
        queryFn={tableQueryFn}
        queryKey={['vehicle-tire-orders', vehicleId]}
        onStateChange={handleStateChange}
        facetedFilters={facetedFilters}
        exportConfig={exportConfig}
        tableId={TABLE_ID}
        paramNamespace={TABLE_ID}
        searchPlaceholder="Buscar por kilómetro..."
        showFilterToggle={true}
        emptyMessage="No hay órdenes de gomería para este equipo"
        onRowClick={(row) => setSelectedOrderId(row.id)}
      />

      {selectedOrderId && (
        <ServiceOrderDetailView
          orderId={selectedOrderId}
          open={!!selectedOrderId}
          onOpenChange={(open) => {
            if (!open) setSelectedOrderId(null);
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Run check-types**

Run: `npm run check-types`
Expected: PASS (may need minor type adjustments — fix any issues)

---

## Task 13: Diagram Section Component

**Files:**

- Create: `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tire-diagram-section.tsx`

- [ ] **Step 1: Create the diagram section**

```typescript
'use client';

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, RotateCcw, PlusCircle, ExternalLink } from 'lucide-react';
import { TireDiagramRenderer } from '@/features/Mantenimiento/Gomeria/shared/TireDiagramRenderer';
import type { DiagramAxle, DiagramPosition } from '@/features/Mantenimiento/Gomeria/shared/tire-diagram-utils';
import {
  getVehicleTirePositionsWithDetails,
  getVehicleTemplateInfo,
  resetVehicleToSubTypeTemplate,
} from './actions.server';
import { VehicleAxleEditor } from './vehicle-axle-editor';
import { toast } from 'sonner';
import Link from 'next/link';

interface VehicleTireDiagramSectionProps {
  vehicleId: string;
  canUpdate: boolean;
}

export function VehicleTireDiagramSection({ vehicleId, canUpdate }: VehicleTireDiagramSectionProps) {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCloneWarning, setShowCloneWarning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { data: templateInfo, isLoading: isLoadingInfo } = useQuery({
    queryKey: ['vehicle-template-info', vehicleId],
    queryFn: () => getVehicleTemplateInfo(vehicleId),
  });

  const { data: positions, isLoading: isLoadingPositions } = useQuery({
    queryKey: ['vehicle-tire-positions', vehicleId],
    queryFn: () => getVehicleTirePositionsWithDetails(vehicleId),
    enabled: templateInfo?.templateId != null,
  });

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-template-info', vehicleId] });
    queryClient.invalidateQueries({ queryKey: ['vehicle-tire-positions', vehicleId] });
  }, [queryClient, vehicleId]);

  const handleEditClick = () => {
    if (templateInfo?.sourceType === 'sub_type') {
      setShowCloneWarning(true);
    } else {
      setEditorOpen(true);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetVehicleToSubTypeTemplate(vehicleId);
      toast.success('Configuración restablecida a la plantilla del sub-tipo');
      invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al restablecer');
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  // Build diagram data from positions
  const diagramAxles: DiagramAxle[] = [];
  const diagramPositions: DiagramPosition[] = [];

  if (positions && positions.length > 0) {
    const axleMap = new Map<number, DiagramAxle>();
    for (const pos of positions) {
      if (!axleMap.has(pos.template_axle.axle_number)) {
        axleMap.set(pos.template_axle.axle_number, {
          id: pos.template_axle.id,
          axle_number: pos.template_axle.axle_number,
          tires_per_side: pos.template_axle.tires_per_side,
          tire_size: pos.template_axle.tire_size,
          is_drive_axle: pos.template_axle.is_drive_axle,
          is_spare: pos.template_axle.is_spare,
        });
      }

      diagramPositions.push({
        position_number: pos.position_number,
        axle_number: pos.axle_number,
        side: pos.side as 'LEFT' | 'RIGHT' | 'SPARE',
        tire_id: pos.tire?.id ?? null,
        tire_serial: pos.tire?.serial_number ?? undefined,
        tire_brand: pos.tire?.brand?.name ?? undefined,
        tire_size: pos.tire?.tire_type?.size ?? undefined,
      });
    }
    diagramAxles.push(...Array.from(axleMap.values()).sort((a, b) => a.axle_number - b.axle_number));
  }

  // Current axles for the editor
  const currentAxles =
    positions && positions.length > 0
      ? Array.from(
          new Map(
            positions.map((p) => [
              p.template_axle.axle_number,
              {
                axle_number: p.template_axle.axle_number,
                tires_per_side: p.template_axle.tires_per_side,
                tire_size: p.template_axle.tire_size,
                is_drive_axle: p.template_axle.is_drive_axle,
                is_spare: p.template_axle.is_spare,
              },
            ])
          ).values()
        )
      : [];

  if (isLoadingInfo) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No template state
  if (templateInfo?.sourceType === 'none') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="text-muted-foreground text-center">
            <p className="text-lg font-medium">Este equipo no tiene configuración de cubiertas</p>
            <p className="text-sm mt-1">
              Puede crear una configuración personalizada o asignar una plantilla desde Gomería.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canUpdate && (
              <Button onClick={() => setEditorOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear configuración personalizada
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/dashboard/maintenance?tab=gomeria&subtab=plantillas">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ir a Plantillas
              </Link>
            </Button>
          </div>

          {canUpdate && (
            <VehicleAxleEditor
              vehicleId={vehicleId}
              currentAxles={[]}
              isNewConfig={true}
              open={editorOpen}
              onOpenChange={setEditorOpen}
              onSave={invalidateQueries}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Diagrama de Cubiertas</CardTitle>
          <Badge variant={templateInfo?.hasOverride ? 'default' : 'secondary'}>
            {templateInfo?.hasOverride ? 'Personalizada' : `Heredada de ${templateInfo?.subTypeName ?? 'sub-tipo'}`}
          </Badge>
        </div>
        {canUpdate && (
          <div className="flex items-center gap-2">
            {templateInfo?.hasOverride && templateInfo?.subTypeHasTemplate && (
              <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)} disabled={isResetting}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Restablecer
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleEditClick}>
              <Settings className="mr-2 h-3.5 w-3.5" />
              Editar configuración
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoadingPositions ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <TireDiagramRenderer
            axles={diagramAxles}
            positions={diagramPositions}
            interactive={false}
            label={templateInfo?.templateName ?? undefined}
          />
        )}
      </CardContent>

      {/* Clone warning dialog */}
      <AlertDialog open={showCloneWarning} onOpenChange={setShowCloneWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Crear configuración personalizada</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará una configuración personalizada para este equipo. Los demás equipos del mismo sub-tipo no se
              verán afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCloneWarning(false);
                setEditorOpen(true);
              }}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restablecer plantilla original</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la configuración personalizada y se volverá a usar la plantilla del sub-tipo. Las cubiertas
              instaladas se desinstalarán automáticamente y quedarán disponibles en el catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={isResetting}>
              {isResetting ? 'Restableciendo...' : 'Restablecer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Axle editor */}
      {canUpdate && (
        <VehicleAxleEditor
          vehicleId={vehicleId}
          currentAxles={currentAxles}
          isNewConfig={!templateInfo?.hasOverride}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          onSave={invalidateQueries}
        />
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 14: Axle Editor Component

**Files:**

- Create: `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-axle-editor.tsx`

- [ ] **Step 1: Create the axle editor**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AxleConfigurator } from '@/features/Mantenimiento/Gomeria/Plantillas/components/AxleConfigurator';
import { TireDiagramRenderer } from '@/features/Mantenimiento/Gomeria/shared/TireDiagramRenderer';
import { calculatePositions } from '@/features/Mantenimiento/Gomeria/shared/tire-diagram-utils';
import type { DiagramAxle } from '@/features/Mantenimiento/Gomeria/shared/tire-diagram-utils';
import { createVehicleCustomTemplate, updateVehicleCustomAxles } from './actions.server';
import type { AxleInput } from './actions.server';
import { toast } from 'sonner';

interface VehicleAxleEditorProps {
  vehicleId: string;
  currentAxles: AxleInput[];
  isNewConfig: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function VehicleAxleEditor({
  vehicleId,
  currentAxles,
  isNewConfig,
  open,
  onOpenChange,
  onSave,
}: VehicleAxleEditorProps) {
  const [axles, setAxles] = useState<AxleInput[]>(currentAxles);
  const [isSaving, setIsSaving] = useState(false);
  const [showTireWarning, setShowTireWarning] = useState(false);

  // Reset state when opening
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setAxles(currentAxles);
    }
    onOpenChange(newOpen);
  };

  // Build preview diagram
  const previewAxles: DiagramAxle[] = axles.map((a, i) => ({
    id: `preview-${i}`,
    axle_number: a.axle_number,
    tires_per_side: a.tires_per_side,
    tire_size: a.tire_size,
    is_drive_axle: a.is_drive_axle,
    is_spare: a.is_spare,
  }));

  const previewPositions = calculatePositions(previewAxles);

  const handleSave = async () => {
    if (axles.length === 0) {
      toast.error('Debe configurar al menos un eje');
      return;
    }

    const hasEmptySize = axles.some((a) => !a.tire_size.trim());
    if (hasEmptySize) {
      toast.error('Todas las medidas de neumáticos son requeridas');
      return;
    }

    setIsSaving(true);
    try {
      if (isNewConfig) {
        await createVehicleCustomTemplate(vehicleId, axles);
        toast.success('Configuración personalizada creada exitosamente');
      } else {
        await updateVehicleCustomAxles(vehicleId, axles);
        toast.success('Configuración actualizada exitosamente');
      }
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isNewConfig ? 'Crear configuración de ejes' : 'Editar configuración de ejes'}</SheetTitle>
            <SheetDescription>
              {isNewConfig
                ? 'Configure los ejes para este equipo. Esta configuración será exclusiva de este vehículo.'
                : 'Modifique los ejes de este equipo. Las cubiertas instaladas en ejes eliminados se desinstalarán automáticamente.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-4">
            <AxleConfigurator value={axles} onChange={setAxles} />

            {axles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Vista previa</p>
                <div className="border rounded-lg p-4 bg-muted/30">
                  <TireDiagramRenderer axles={previewAxles} interactive={false} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {previewPositions.length} posiciones totales
                </p>
              </div>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || axles.length === 0}>
              {isSaving ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Warning for tires being uninstalled */}
      <AlertDialog open={showTireWarning} onOpenChange={setShowTireWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cubiertas instaladas</AlertDialogTitle>
            <AlertDialogDescription>
              Al guardar esta configuración, las cubiertas instaladas se desinstalarán automáticamente y quedarán
              disponibles en el catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 2: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 15: Tab Container & Skeleton

**Files:**

- Create: `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tires-tab.tsx`
- Create: `src/features/Equipos/EquipoID/components/vehicle-tires/fallback/VehicleTiresSkeleton.tsx`

- [ ] **Step 1: Create the tab container**

```typescript
'use client';

import { useMemo } from 'react';
import { VehicleTireDiagramSection } from './vehicle-tire-diagram-section';
import { VehicleTireOrdersDataTable } from './vehicle-tire-orders/_VehicleTireOrdersDataTable';

interface VehicleTiresTabProps {
  vehicleId: string;
  permissionsMap: Record<string, boolean>;
}

export function VehicleTiresTab({ vehicleId, permissionsMap }: VehicleTiresTabProps) {
  const canUpdate = useMemo(
    () => permissionsMap['equipos:cubiertas-equipo:update'] === true,
    [permissionsMap]
  );

  return (
    <div className="space-y-6">
      <VehicleTireDiagramSection vehicleId={vehicleId} canUpdate={canUpdate} />

      <div>
        <h3 className="text-base font-semibold mb-3">Historial de Órdenes de Gomería</h3>
        <VehicleTireOrdersDataTable vehicleId={vehicleId} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the skeleton**

```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function VehicleTiresSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
      <div>
        <Skeleton className="h-5 w-64 mb-3" />
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 16: Integration — Add Tab to Vehicle Detail

**Files:**

- Modify: `src/features/Equipos/EquipoID/components/vehicle-tabs.tsx`
- Modify: `src/features/Equipos/EquipoID/components/vehicle-form.tsx`
- Modify: `src/app/dashboard/equipment/action/page.tsx`
- Modify: `src/features/Permissions/permissions-map.ts`

- [ ] **Step 1: Update permissions-map.ts**

In the `detalle-equipo` subtabs object, add:

```typescript
'cubiertas-equipo': {
  slug: 'cubiertas-equipo',
  name: 'Cubiertas',
  tabId: '30000000-0000-0000-0000-000000000057',
  parent: 'detalle-equipo',
  allowedActions: ['view', 'update'],
  subtabs: {},
},
```

- [ ] **Step 2: Update vehicle-form.tsx props**

Add `tiresComponent?: React.ReactNode;` to the `VehicleFormProps` interface, and pass it down to `VehicleTabs`:

```typescript
// In VehicleFormProps interface, add:
tiresComponent?: React.ReactNode;

// In the VehicleTabs usage, add:
tiresComponent={props.tiresComponent}
```

- [ ] **Step 3: Update vehicle-tabs.tsx**

Add to `VehicleTabsProps`:

```typescript
tiresComponent?: React.ReactNode;
```

Add tab #8 to the tabs array (after `checklists`):

```typescript
{
  value: 'tires',
  label: 'Cubiertas',
  moduleSlug: 'equipos',
  tabSlug: 'cubiertas-equipo',
  disabled: mode === 'new',
  content: tiresComponent ?? <div />,
},
```

Update the grid class from `grid-cols-7` to `grid-cols-8`:

```typescript
listClassName = 'grid w-full grid-cols-8';
```

- [ ] **Step 4: Update page.tsx to pass the tires component**

In `src/app/dashboard/equipment/action/page.tsx`, import and render the tires tab:

```typescript
import { VehicleTiresTab } from '@/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tires-tab';
import { getUserPermissionsMapServer } from '@/features/Permissions';
```

In the Server Component, load `permissionsMap` (it may already be loaded for repairs):

```typescript
const permissionsMap = await getUserPermissionsMapServer();
```

Pass the tires component as a slot:

```typescript
tiresComponent={
  vehicle?.id ? (
    <VehicleTiresTab vehicleId={vehicle.id} permissionsMap={permissionsMap} />
  ) : undefined
}
```

- [ ] **Step 5: Run check-types**

Run: `npm run check-types`
Expected: PASS

---

## Task 17: Final Verification

- [ ] **Step 1: Run check-types**

Run: `npm run check-types`
Expected: PASS with no errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (fix any issues)

- [ ] **Step 3: Run format**

Run: `npm run format`

- [ ] **Step 4: Manual verification in browser**

1. Navigate to `/dashboard/equipment/action?action=view&id=<vehicle-id>&tab=tires`
2. Verify:
   - Tab "Cubiertas" visible and selectable
   - Diagram renders correctly (if vehicle has template)
   - Empty state shows correctly (if no template)
   - "Editar configuración" button works (if has update permission)
   - Orders table loads with data
   - Click on order row opens ServiceOrderDetailView
3. Test edit flow:
   - For vehicle inheriting template → warning dialog appears → editor opens
   - Add/remove axles → preview updates
   - Save → diagram updates with new config
   - "Restablecer" button → returns to inherited template
4. Test QR route still works: `/maintenance/equipment/<id>/tire-service`
5. Test Gomería → Órdenes wizard still works correctly
