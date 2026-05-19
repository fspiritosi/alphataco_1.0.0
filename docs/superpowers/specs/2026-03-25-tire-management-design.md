# Tire Management Module — Design Spec

**Issue**: COD-356 — Gestión de Cubiertas
**Branch**: `feat/tire-management`
**Date**: 2026-03-25
**Phase**: 1 (core functionality)

---

## 1. Overview

Complete tire management system for Grupo Horizonte, living inside the Maintenance module. Manages tire inventory, vehicle tire layout templates, and tire shop service operations (gomería). Replaces the current paper-based RG 12-2 forms.

### Goals

- Centralized tire catalog with individual and bulk registration
- Configurable tire layout templates per vehicle (axles, positions, sizes)
- Interactive tire shop operations with visual vehicle diagrams
- Full traceability: every tire action is recorded
- Dual entry point: QR scan (field) and Maintenance dashboard (office)

### Out of Scope (Phase 2)

- PDF generation (RG 12-2 form)
- Discard approval workflow
- Digital signatures
- Reports and statistics

---

## 2. Data Model

### 2.1 New Enums

```prisma
enum TireStatus {
  AVAILABLE
  INSTALLED
  IN_REPAIR
  DISCARDED
}

enum TireRetreadLevel {
  FIRST
  SECOND
  THIRD
}

enum TireTreadType {
  SMOOTH
  MIXED
  BLOCK
}

enum TirePositionSide {
  LEFT
  RIGHT
  SPARE
}

enum TireServiceAction {
  REPLACE
  REPAIR
  CALIBRATE
}

enum TireOldDestination {
  AVAILABLE
  DISCARD
  REPAIR
}

enum TireServiceOrderStatus {
  OPEN
  CLOSED
}
```

### 2.2 New Tables

**`tire_brands`** — Tire brand catalog

| Column     | Type     | Constraints      |
| ---------- | -------- | ---------------- |
| id         | UUID     | PK, default uuid |
| name       | String   |                  |
| company_id | UUID     | FK → company     |
| is_active  | Boolean  | default true     |
| created_at | DateTime | default now()    |

Unique constraint: `(name, company_id)`

**`tires`** — Individual tires

| Column          | Type              | Constraints             |
| --------------- | ----------------- | ----------------------- |
| id              | UUID              | PK                      |
| serial_number   | String            |                         |
| brand_id        | UUID              | FK → tire_brands        |
| size            | String            | Free text (e.g., "295") |
| is_new          | Boolean           | default true            |
| retread_level   | TireRetreadLevel? | null if new             |
| tread_type      | TireTreadType     |                         |
| tread_depth     | Decimal?          | Last recorded %         |
| status          | TireStatus        | default AVAILABLE       |
| discard_photo   | String?           | URL                     |
| discard_comment | String?           |                         |
| discarded_at    | DateTime?         |                         |
| company_id      | UUID              | FK → company            |
| is_active       | Boolean           | default true            |
| created_at      | DateTime          | default now()           |
| updated_at      | DateTime          | @updatedAt              |

Unique constraint: `(serial_number, company_id)`

**Invariant**: A tire with `status = INSTALLED` MUST have exactly one `vehicle_tire_positions` row referencing it. A tire with any other status MUST NOT be referenced by any position row.

**`tire_templates`** — Tire layout templates

| Column      | Type     | Constraints   |
| ----------- | -------- | ------------- |
| id          | UUID     | PK            |
| name        | String   |               |
| description | String?  |               |
| company_id  | UUID     | FK → company  |
| is_active   | Boolean  | default true  |
| created_at  | DateTime | default now() |

**`tire_template_axles`** — Axles within a template

| Column         | Type     | Constraints                                      |
| -------------- | -------- | ------------------------------------------------ |
| id             | UUID     | PK                                               |
| template_id    | UUID     | FK → tire_templates (cascade delete)             |
| axle_number    | Int      | Sequential order                                 |
| tires_per_side | Int      | 1 (single) or 2 (dual). For spare rows: always 1 |
| tire_size      | String   | Expected tire size for this axle                 |
| is_drive_axle  | Boolean  | default false                                    |
| is_spare       | Boolean  | default false                                    |
| created_at     | DateTime | default now()                                    |

Unique constraint: `(template_id, axle_number)`

**Spare position rules**: Spare positions are modeled as rows with `is_spare = true` and `tires_per_side = 1`. Each spare is a separate row. Multiple spares = multiple rows. The `axle_number` for spares continues the sequential numbering after real axles. The diagram renderer groups all `is_spare = true` rows into a separate visual section (not rendered as regular axles).

**`vehicle_tire_positions`** — Current tire assignment per vehicle position

| Column           | Type             | Constraints                                     |
| ---------------- | ---------------- | ----------------------------------------------- |
| id               | UUID             | PK                                              |
| vehicle_id       | UUID             | FK → vehicles                                   |
| template_axle_id | UUID             | FK → tire_template_axles                        |
| position_number  | Int              | Sequential (per vehicle)                        |
| axle_number      | Int              | Which axle                                      |
| side             | TirePositionSide | LEFT, RIGHT, or SPARE                           |
| tire_id          | UUID?            | FK → tires (null = empty, pending initial load) |
| created_at       | DateTime         | default now()                                   |
| updated_at       | DateTime         | @updatedAt                                      |

Unique constraint: `(vehicle_id, position_number)`

The `template_axle_id` FK links each position to its axle configuration, enabling the system to know the expected tire size and axle type for any position without requiring a join through `vehicles.tire_template_id`.

**`tire_service_orders`** — Tire shop work sessions

| Column             | Type                   | Constraints                                                         |
| ------------------ | ---------------------- | ------------------------------------------------------------------- |
| id                 | UUID                   | PK                                                                  |
| vehicle_id         | UUID                   | FK → vehicles                                                       |
| trailer_vehicle_id | UUID?                  | FK → vehicles                                                       |
| kilometer          | String?                | Km at service time (String for consistency with vehicles.kilometer) |
| service_date       | DateTime               |                                                                     |
| status             | TireServiceOrderStatus | default OPEN                                                        |
| created_by         | UUID                   | FK → profile                                                        |
| company_id         | UUID                   | FK → company                                                        |
| created_at         | DateTime               | default now()                                                       |
| closed_at          | DateTime?              |                                                                     |

**Deletion rules**: Orders with `status = CLOSED` cannot be deleted (historical records). Open orders can be cancelled, which reverses all tire status changes made during the session (INSTALLED tires from this order → AVAILABLE, IN_REPAIR tires from this order → AVAILABLE) and deletes the order. This is implemented as a `prisma.$transaction`.

**`tire_service_items`** — Individual interventions within a service order

| Column               | Type                | Constraints                                                              |
| -------------------- | ------------------- | ------------------------------------------------------------------------ |
| id                   | UUID                | PK                                                                       |
| service_order_id     | UUID                | FK → tire_service_orders (cascade delete)                                |
| position_number      | Int                 | Position intervened                                                      |
| vehicle_id           | UUID                | FK → vehicles (tractor or trailer)                                       |
| action               | TireServiceAction   | REPLACE, REPAIR, CALIBRATE                                               |
| tire_id              | UUID?               | FK → tires (tire at position before intervention, null for initial load) |
| new_tire_id          | UUID?               | FK → tires (replacement tire, for REPLACE and REPAIR)                    |
| old_tire_destination | TireOldDestination? | Only for REPLACE                                                         |
| tread_depth          | Decimal?            | Recorded tread %                                                         |
| pressure_start       | Decimal?            |                                                                          |
| pressure_end         | Decimal?            |                                                                          |
| observations         | String?             |                                                                          |
| created_at           | DateTime            | default now()                                                            |

**Position numbering**: Position numbers are sequential **per vehicle**. In a service order with tractor + trailer, positions are NOT globally sequential — each vehicle maintains its own position numbering. The `vehicle_id` field disambiguates which vehicle the position belongs to. Queries filtering by position must always include `vehicle_id`.

### 2.3 Modified Tables

**`vehicles`** — Add field:

| Column           | Type  | Constraints         |
| ---------------- | ----- | ------------------- |
| tire_template_id | UUID? | FK → tire_templates |

### 2.4 Cross-Table Transactions

The following operations require `prisma.$transaction` for atomicity:

**REPLACE action**:

1. Update old tire status (AVAILABLE, IN_REPAIR, or DISCARDED)
2. If DISCARD: set `tires.discard_photo`, `tires.discard_comment`, `tires.discarded_at`
3. Update new tire status → INSTALLED
4. Update `vehicle_tire_positions.tire_id` → new tire
5. Create `tire_service_items` record

**REPAIR action**:

1. Update current tire status → IN_REPAIR
2. Update new tire status → INSTALLED
3. Update `vehicle_tire_positions.tire_id` → new tire
4. Create `tire_service_items` record

**Template change on vehicle**:

1. Return all currently installed tires to AVAILABLE status
2. Delete all existing `vehicle_tire_positions` rows for the vehicle
3. Generate new position rows from the new template (all with `tire_id = null`)
4. Update `vehicles.tire_template_id`

**Order cancellation**:

1. For each service item: reverse tire status changes
2. Delete the order (cascades to items)

---

## 3. Architecture

### 3.1 Folder Structure

```
src/features/Mantenimiento/
├── MantenimientoComponent.tsx              # Modified: add "Gomería" tab
├── Gomeria/
│   ├── GomeriaTabContent.tsx               # Server Component — renders nested TabsManagerServer
│   │
│   ├── Catalogo/                           # Subtab: Catálogo
│   │   ├── CatalogoTabContent.tsx          # Server Component
│   │   ├── actions/
│   │   │   └── actions.server.ts           # CRUD tires + tire_brands + facets
│   │   ├── components/
│   │   │   ├── columns.tsx
│   │   │   ├── _TiresDataTable.tsx
│   │   │   ├── TireForm.tsx
│   │   │   ├── TireBulkForm.tsx
│   │   │   └── TireBrandManager.tsx
│   │   ├── fallback/
│   │   │   └── CatalogoSkeleton.tsx
│   │   └── TiresList.tsx
│   │
│   ├── Plantillas/                         # Subtab: Plantillas
│   │   ├── PlantillasTabContent.tsx
│   │   ├── actions/
│   │   │   └── actions.server.ts
│   │   ├── components/
│   │   │   ├── columns.tsx
│   │   │   ├── _TemplatesDataTable.tsx
│   │   │   ├── TemplateForm.tsx
│   │   │   ├── AxleConfigurator.tsx
│   │   │   └── TemplatePreview.tsx
│   │   ├── fallback/
│   │   │   └── PlantillasSkeleton.tsx
│   │   └── TemplatesList.tsx
│   │
│   ├── Ordenes/                            # Subtab: Órdenes
│   │   ├── OrdenesTabContent.tsx
│   │   ├── actions/
│   │   │   └── actions.server.ts
│   │   ├── components/
│   │   │   ├── columns.tsx
│   │   │   ├── _ServiceOrdersDataTable.tsx
│   │   │   ├── ServiceOrderWizard.tsx
│   │   │   ├── TireDiagram.tsx
│   │   │   ├── TirePositionCard.tsx
│   │   │   └── TireReplacePicker.tsx
│   │   ├── fallback/
│   │   │   └── OrdenesSkeleton.tsx
│   │   └── ServiceOrdersList.tsx
│   │
│   └── shared/
│       ├── TireDiagramRenderer.tsx
│       └── tire-mappers.ts
```

### 3.2 Component Architecture

Each subtab follows the 3-layer DataTable pattern:

```
page.tsx (thin)
  └── TabContent.tsx (Server Component — fetch + permissions)
        └── List.tsx (Server Component — paginated query + preferences)
              └── _DataTable.tsx (Client Component — columns, filters, interactivity)
                    └── <DataTable /> (shared component)
```

`GomeriaTabContent.tsx` renders its own `TabsManagerServer` for the 3 subtabs (nested tabs pattern). The URL param for subtab selection uses a distinct key (e.g., `gomeria_tab`) to avoid collision with the parent maintenance tab param.

### 3.3 QR Integration

**New route**: `src/app/maintenance/equipment/[id]/tire-service/page.tsx`

**Modified file**: `equipment-dashboard-client.tsx`:

- Add `tire_template_id: string | null` to the equipment props interface
- Add 4th button "Operación de Gomería" linking to `/maintenance/equipment/{id}/tire-service`
- Button only visible when `tire_template_id` is not null

**Authentication**: The tire service route follows the same authentication pattern as other maintenance QR routes. The user is already authenticated by the time they reach the dashboard. The `created_by` field on the service order is set from the authenticated user. No additional permission check is needed at the QR route level — permissions are enforced at the server action level (same as existing maintenance flows).

Both entry points (QR and dashboard) render the same `ServiceOrderWizard` component.

---

## 4. User Flows

### 4.1 Tire Brand Management

Simple CRUD via modal/dialog from the Catálogo subtab. Fields: name only. Supports activate/deactivate.

### 4.2 Tire Catalog

**Individual creation**: Form with serial_number, brand (select), size (text), is_new, retread_level, tread_type, tread_depth. Creates with status `AVAILABLE`.

**Bulk creation**: Form with prefix + from + to (e.g., "CO" + 200 + 250 → CO200..CO250) plus shared fields (brand, size, is_new, retread_level, tread_type). Before inserting, the server action validates the entire range against existing serials. If conflicts are found, the operation is rejected and the conflicting serials are returned to the UI for the user to review. No partial inserts — the batch is all-or-nothing.

### 4.3 Template Management

1. Create template with name and description
2. Configure axles sequentially:
   - Per axle: tires_per_side (1 or 2), tire_size, is_drive_axle
   - Can add spare positions (1 or more, each as a separate row with `is_spare = true`, `tires_per_side = 1`)
   - Axles and spares are numbered sequentially (axles first, then spares)
3. Real-time horizontal preview of the diagram
4. Save

### 4.4 Template Assignment to Vehicle

- From template detail or vehicle detail
- Sets `vehicles.tire_template_id`
- Auto-generates `vehicle_tire_positions` records (all positions, tire_id = null)
- **Changing template**: If the vehicle already has a template assigned:
  1. Show confirmation dialog warning that all current tire assignments will be cleared
  2. On confirm: within a `prisma.$transaction`: return all installed tires to `AVAILABLE` status, delete old position rows, generate new position rows from the new template (all `tire_id = null`), update `vehicles.tire_template_id`
  3. On cancel: no changes

### 4.5 Tire Service Operation (Main Flow)

**Entry from QR**:

1. Scan QR → authenticate → dashboard → "Operación de Gomería"
2. Update km → optionally add trailer (search by domain)
3. If trailer is added, verify it also has `tire_template_id` assigned (show error if not)
4. Creates order (OPEN)

**Entry from Dashboard**:

1. Tab Gomería → subtab Órdenes → "Nueva Orden"
2. Select vehicle (must have `tire_template_id`) → update km → optionally add trailer
3. If trailer is added, verify it also has `tire_template_id` assigned
4. Creates order (OPEN)

**Operation** (same for both entries):

1. Interactive horizontal diagram shows all positions for the tractor
2. If trailer attached, its diagram shows below (separate section, own position numbering)
3. Each position shows: number + tire info (serial + brand) or "Vacío" (gray)
4. Touch position → card/modal with tire data + available actions

**Calibrate**: Record pressure_start, pressure_end, tread_depth, observations. Tire stays in place. Updates `tires.tread_depth` with the new reading.

**Repair**: This is an **atomic two-step action** — the operator must complete both steps before confirming:

1. Select replacement tire from available stock (filtered by axle size via `template_axle_id`)
2. Record observations
3. On confirm (single action): current tire → `IN_REPAIR`, new tire → `INSTALLED`, position updated. Both steps are required — the UI does not allow confirming with only one step done.

**Replace**: Also an **atomic action**:

1. Select new tire from available stock (filtered by axle size — exact string match on `tire_size`)
2. Choose old tire destination: Available / Discard / Repair
   - If Discard: photo + comment required before confirm
   - If Repair: old tire → `IN_REPAIR`
   - If Available: old tire → `AVAILABLE`
3. On confirm: old tire status updated, new tire → `INSTALLED`, position updated, discard fields set if applicable. All within `prisma.$transaction`.

**Initial load** (empty position): When a position has no tire (`tire_id = null`), touching it offers only one action: "Asignar cubierta". The operator selects a tire from available stock filtered by axle size. This creates a service item with `action = REPLACE`, `tire_id = null` (no previous tire), `new_tire_id` = selected tire.

**Tire picker filter**: The replacement tire picker shows only tires with `status = AVAILABLE`. Tires with `IN_REPAIR` status are NOT shown — they must first be returned to AVAILABLE (via the catalog or when marked as repaired).

**Close**: Order status → `CLOSED`, `closed_at` set. All interventions are finalized.

### 4.6 Returning a Tire from Repair

From the Catálogo subtab, a tire with status `IN_REPAIR` can be marked as "Reparada" which sets its status back to `AVAILABLE`. This is a simple status update action on the tire record. The tire then becomes available for selection in future service operations.

### 4.7 Service Order History

DataTable listing all orders. Click to view detail with all interventions.

---

## 5. Visual Diagram

### 5.1 Rendering Logic

1. Read `tire_template_axles` ordered by `axle_number`
2. Separate into two groups: regular axles (`is_spare = false`) and spares (`is_spare = true`)
3. Calculate positions sequentially per vehicle:
   - Regular axle with tires_per_side=1 → 2 positions (left + right)
   - Regular axle with tires_per_side=2 → 4 positions (2 left + 2 right)
   - Spare → 1 position each
4. Render horizontally (direction of travel: left → right)
5. Regular axles render as part of the vehicle body; spares render in a separate group to the right

### 5.2 Layout

```
Direction of travel →

                Axle 1        Axle 2          Axle 3
              (steering)    (drive)          (load)         Spare

                [1]         [3] [4]         [7] [8]
  ┌──────────── | ───────── | ── | ──────── | ── | ────────── (11) ──┐
  │             |           |    |          |    |                   │
  └──────────── | ───────── | ── | ──────── | ── | ─────────────────┘
                [2]         [5] [6]         [9] [10]

── Hitch ─────────────────────────────────────────────────────────────

              Axle 1           Axle 2
             (load)           (load)           Spare

            [12] [13]        [16] [17]
  ┌──────── | ── | ────────── | ── | ────────── (20) ──┐
  │         |    |            |    |                    │
  └──────── | ── | ────────── | ── | ───────────────────┘
            [14] [15]        [18] [19]
```

### 5.3 Color Coding

- **Green**: Position with assigned tire
- **Gray**: Empty position (pending initial load)
- **Yellow**: Position intervened in current session

### 5.4 Overflow Handling

For vehicles with many axles, the diagram container is horizontally scrollable. The component auto-sizes based on the number of axles. Typical max is 6-8 axles per unit.

### 5.5 Shared Component

`TireDiagramRenderer` is used in:

- Template preview (read-only)
- Service operation (interactive, with click handlers)
- Vehicle detail (read-only, shows current state)

```typescript
interface TireDiagramRendererProps {
  axles: TemplateAxle[];
  positions?: VehicleTirePosition[];
  interactive?: boolean;
  onPositionClick?: (position: number) => void;
  highlightedPositions?: number[];
}
```

---

## 6. DataTables

All tables use the NEW DataTable system: Prisma, 3-layer architecture, lazy-load facets, client-side navigation, paramNamespace.

### 6.1 Tires Catalog Table

| Column                   | Type          | Filter                                                  |
| ------------------------ | ------------- | ------------------------------------------------------- |
| serial_number            | text          | text                                                    |
| brand (FK → tire_brands) | FK            | faceted                                                 |
| size                     | text          | text                                                    |
| is_new                   | boolean       | faceted (Sí/No)                                         |
| retread_level            | enum nullable | faceted (1°/2°/3°/Sin asignar)                          |
| tread_type               | enum          | faceted (Liso/Mixto/Taco)                               |
| tread_depth              | number        | text                                                    |
| status                   | enum          | faceted (Disponible/Instalada/En reparación/Descartada) |
| vehicle (from positions) | FK nullable   | faceted                                                 |
| created_at               | date          | dateRange                                               |
| actions                  | —             | —                                                       |

The "vehicle" column is derived via `vehicle_tire_positions` join — not a direct FK on `tires`. The server action uses `include: { vehicle_tire_positions: { include: { vehicles: { select: { domain: true } } } } }` to resolve the vehicle domain. A tire with no position row shows "Sin asignar". The interventions count uses `include: { _count: { select: { tire_service_items: true } } }` from Prisma.

### 6.2 Templates Table

| Column         | Type               | Filter    |
| -------------- | ------------------ | --------- |
| name           | text               | text      |
| description    | text               | text      |
| axle count     | virtual (\_count)  | —         |
| position count | virtual (computed) | —         |
| created_at     | date               | dateRange |
| actions        | —                  | —         |

### 6.3 Service Orders Table

| Column                    | Type        | Filter                    |
| ------------------------- | ----------- | ------------------------- |
| service_date              | date        | dateRange                 |
| vehicle (FK, domain)      | FK          | faceted                   |
| trailer (FK, domain)      | FK nullable | faceted                   |
| kilometer                 | text        | text                      |
| interventions (\_count)   | virtual     | —                         |
| status                    | enum        | faceted (Abierta/Cerrada) |
| created_by (FK → profile) | FK          | faceted                   |
| created_at                | date        | dateRange                 |
| actions                   | —           | —                         |

---

## 7. Permissions

### 7.1 New Tabs

| slug                 | name                    | parent  | allowedActions               |
| -------------------- | ----------------------- | ------- | ---------------------------- |
| gomeria              | Gomería                 | null    | view                         |
| catalogo_cubiertas   | Catálogo de Cubiertas   | gomeria | view, create, update, delete |
| plantillas_cubiertas | Plantillas de Cubiertas | gomeria | view, create, update         |
| ordenes_gomeria      | Órdenes de Gomería      | gomeria | view, create, update         |

Module: `mantenimiento` (`421e96da-5235-4857-bf81-e63336447f13`)

### 7.2 Role Assignment

Roles receiving full permissions: `admin`, `administrador`, `full-access-provisional`.

### 7.3 permissions-map.ts

Add `gomeria` entry with 3 subtabs under the `mantenimiento` module.

---

## 8. Decisions Log

| Decision               | Choice                                                     | Rationale                                                         |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Module location        | Inside Mantenimiento/Gomeria/                              | Follows existing tab-as-folder pattern                            |
| Tab level              | New top-level tab "Gomería" with 3 subtabs                 | Keeps it organized, doesn't clutter existing tabs                 |
| Tire brands            | Separate `tire_brands` table                               | Clean separation from vehicle brands                              |
| Template scope         | Per individual unit                                        | Flexible: same trailer can attach to different tractors           |
| Tire type per axle     | Size (free text, exact string match)                       | Simple and matches current paper process                          |
| Tire lifecycle         | AVAILABLE → INSTALLED → IN_REPAIR/DISCARDED                | All enter as AVAILABLE, return from repair manually via catalog   |
| Retread/Tread          | Tire attributes, updatable in operations                   | Reflects physical reality: properties change when retreaded       |
| Diagram orientation    | Horizontal (left → right)                                  | Matches paper diagrams currently in use                           |
| Entry points           | QR + Dashboard (both)                                      | Field workers use QR, office users use dashboard                  |
| Empty positions        | Not allowed (except initial load)                          | Every position must have a tire assigned                          |
| Discard approval       | Direct for now, extendable later                           | Phase 2 will add optional approval workflow                       |
| Phase 1 scope          | Core CRUD + operations + QR                                | PDF, signatures, reports deferred to Phase 2                      |
| Position numbering     | Per vehicle (not global)                                   | Each vehicle has its own 1..N numbering; vehicle_id disambiguates |
| Spare modeling         | Separate rows with is_spare=true, tires_per_side=1         | Allows multiple spares; diagram renders them in separate group    |
| Bulk creation          | All-or-nothing with pre-validation                         | Prevents partial inserts and data inconsistency                   |
| Template change        | Confirm → return tires to AVAILABLE → regenerate positions | Prevents orphaned INSTALLED tires with no position reference      |
| REPAIR/REPLACE         | Atomic actions (all steps required before confirm)         | Prevents empty positions mid-operation                            |
| Service order deletion | Closed = immutable; Open = cancel with reversal            | Preserves historical integrity while allowing corrections         |
| km field type          | String (matches vehicles.kilometer)                        | Consistency with existing codebase pattern                        |
| QR auth                | Same pattern as existing maintenance QR flows              | No new auth mechanism needed                                      |
