# Maintenance Request from Equipment — Driver Field + Wizard Migration

**Date**: 2026-03-18
**Branch**: `feat/maintenance-request-from-equipment`
**Status**: Approved

## Problem

The page `/maintenance/equipment/[id]/request/` uses `NuevoPedidoForm` (a direct form without checklist). The main maintenance dashboard uses `NuevoPedidoChecklistForm` (a 5-step wizard with checklist-based deviations). These two flows are out of sync.

Additionally, when creating maintenance requests, the driver (chofer) data is not persisted as a proper FK — it lives only as a free-text string inside `checklist_answers.answer_data` (JSON). This makes it fragile and inconsistent across the maintenance flow.

## Solution

1. Replace the equipment request page with the checklist wizard, adapted for the maintenance context
2. Add `driver_employee_id` FK to `maintenance_requests` for proper driver tracking
3. Update all surfaces that display driver data to use the new field

## Design

### 1. Database Migration

Add `driver_employee_id` (UUID, nullable, FK to `employees`) to `maintenance_requests`.

```prisma
model maintenance_requests {
  // ... existing fields ...
  driver_employee_id String?    @db.Uuid
  driver_employee    employees? @relation("maintenance_request_driver", fields: [driver_employee_id], references: [id])
}

model employees {
  // ... existing relations ...
  maintenance_request_driver maintenance_requests[] @relation("maintenance_request_driver")
}
```

**Both sides of the relation must be defined** — the `employees` model needs the reverse relation array with the matching name `"maintenance_request_driver"` or `prisma generate` will fail.

Nullable because existing records stay `NULL` and solicitudes without a known driver remain valid. The existing fallbacks (`answer_data.chofer`, `employee_id`) continue working for legacy data.

Migration follows the project's manual flow: diff → create folder → write SQL → db execute → resolve → generate. Never `prisma migrate dev`.

**Migration drift risk**: The `maintenance_requests` model has `@@schema("public")` and RLS. The `migrate diff` output must be reviewed carefully — only the `ALTER TABLE maintenance_requests ADD COLUMN driver_employee_id UUID REFERENCES employees(id)` should be included. Ignore any unrelated drift.

### 2. Page Replacement

Rewrite `/maintenance/equipment/[id]/request/page.tsx` as a Server Component that:

- Authenticates via `supabaseServer().auth.getUser()` — same pattern as the checklist page at `/maintenance/equipment/[id]/checklists/[checklistId]/page.tsx` (raw Supabase auth is used in all `/maintenance/` pages for consistency)
- Extracts `employee_id` from `user.app_metadata` / `user.user_metadata`
- Queries `employees` for `id, firstname, lastname, cuil, file_number` of the logged-in user
- Loads equipment list via `fetchAllEquipmentBasicData()` filtered by company
- Renders `MaintenanceHeader` + `NuevoPedidoChecklistForm` with new props:
  - `default_equipment_id` = route param `[id]` (equipment pre-selected and locked)
  - `driverEmployeeId` = employee UUID from auth
  - `driverName` = `[file_number] Lastname Firstname` (per `employee-file-number.md` rule — file number always visible when showing employee identity)
  - `skipSupervisorQuestion` = `true`

Delete deprecated files: `repair-entry-mobile-wrapper.tsx`, `repair-entry-with-router.tsx`.

### 3. Component Changes — `NuevoPedidoChecklistForm`

New optional props:

```typescript
interface Props {
  equipment: EquipmentBasicData[];
  default_equipment_id?: string;
  onSuccess?: () => void;
  driverEmployeeId?: string; // NEW — auto-captured driver employee UUID
  driverName?: string; // NEW — display-only convenience prop, NOT persisted
  skipSupervisorQuestion?: boolean; // NEW — skip question, show selector directly
}
```

**Note**: `driverName` is a display-only prop used in the confirmation step. It is NOT persisted — only `driverEmployeeId` is written to the database. The actual driver name in queries/tables is resolved from the FK join at read time.

Behavioral changes:

- **Initialization**: When `skipSupervisorQuestion === true`, initialize `isCurrentUserSupervisor` state to `false` (not `null`) on mount. This prevents the Step 3 `canAdvanceStep` guard from blocking — the guard returns `false` when `isCurrentUserSupervisor === null`. The initialization must happen at state declaration time: `useState<boolean | null>(skipSupervisorQuestion ? false : null)`.
- **Step 3 (Supervisor)**: When `skipSupervisorQuestion === true`, skip the binary question "Are you the supervisor?" and render the supervisor selector combobox directly. The query for supervisors (`fetchSupervisorsForChecklist`) is triggered immediately. The query for the current user (`getCurrentUserForSupervisorCheck`) is still needed for the submit flow.
- **Step 4 (Confirmation)**: When `driverName` is provided, show a "Chofer: [name]" line in the summary.
- **Submit**: Pass `driverEmployeeId` to both `createMaintenanceOrderFromDeviations` and `createMaintenanceRequestPendingApproval`.

When props are not provided (dashboard context), behavior remains identical to current implementation.

### 4. Server Action Changes

#### Writing `driver_employee_id`

**`createMaintenanceOrderFromDeviations`** (NuevoPedido):

- Add `driverEmployeeId?: string` to input type
- Include `driver_employee_id: input.driverEmployeeId ?? null` in `maintenance_requests` create

**`createMaintenanceRequestPendingApproval`** (NuevoPedido):

- Same change as above

**`createOrUpdateMaintenanceRequest`** (SolicitudesMantenimiento — checklist modal):

- Add `driverEmployeeId?: string` as a **new explicit parameter** (do NOT reuse `input.employeeId`)
- The caller (`CriticalDeviationsRepairModal`) must pass the driver's employee ID separately
- **Assumption**: In the checklist flow from `/maintenance/`, the person filling the checklist IS the driver. The checklist page already has `defaultEmployeeId` (from auth metadata) — this is the value to pass as `driverEmployeeId`
- Include `driver_employee_id: input.driverEmployeeId ?? null` when creating `maintenance_requests`
- This keeps the concepts of "who submitted" (`employee_id`) and "who was driving" (`driver_employee_id`) separate, even if they happen to be the same person today

**`createMaintenanceOrderDirect`**: No changes — this flow has no driver concept.

**`engine_hours` in `createOrUpdateMaintenanceRequest`**: Intentionally not added. The checklist flow captures `engine_hours` at checklist answer time, not at deviation-to-request time.

#### Reading `driver_employee_id`

Queries to update — add `driver_employee: { select: { id: true, firstname: true, lastname: true, file_number: true } }` to the `maintenance_requests` include:

| File                                                     | Function                                                                     | Specific change                                                                                                                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `SolicitudesMantenimiento/actions/actionsTableServer.ts` | `getMaintenanceRequestsPaginated`, `getAllMaintenanceRequestsForExport`      | Add `driver_employee` to Prisma `include`                                                                                                                                                                  |
| `SolicitudesMantenimiento/actions/actionsServer.ts`      | `MAINTENANCE_REQUEST_FULL_SELECT`                                            | Add `driver_employee` to the shared select constant                                                                                                                                                        |
| `Operaciones/actions/actionsServer.ts`                   | `getMaintenanceRequestFullActivityLog`, `getMaintenanceOrderFullActivityLog` | Add `driver_employee` to the `maintenance_requests` select within these functions, and surface it in the returned `MaintenanceRequestOrigin` type as `driverEmployee: { firstname, lastname, file_number } | null` |

**Cache note**: `MAINTENANCE_REQUEST_FULL_SELECT` is used in cached functions with 15-second TTL. Existing cached entries will not contain the new field until expiry — this is acceptable and self-resolving.

### 5. UI Resolution Logic

New priority order for resolving driver name:

```
1. maintenance_requests.driver_employee.firstname + lastname  (NEW — FK directa)
2. checklist_answers.answer_data.chofer                       (legacy JSON string)
3. maintenance_requests.employees.firstname + lastname        (FK employee_id existente)
4. "No especificado"                                          (fallback final)
```

When displaying driver name with file_number available (from `driver_employee`), format as `[file_number] Lastname Firstname` per project rules.

#### Files to update

| File                        | Component                | Change                                                                                                                                                                                                                                                                      |
| --------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tableColumns.tsx`          | Column "Chofer"          | New resolution priority in `accessorFn` and `cell`. The type now includes `driver_employee` from the query.                                                                                                                                                                 |
| `components/columns.tsx`    | Column "Chofer" (legacy) | Same logic. **Note**: This file uses the deprecated `BaseDataTable` system. This change is a targeted patch — the full table migration to the new DataTable system is a separate task.                                                                                      |
| `SolicitudDetailDialog.tsx` | Field "Chofer:"          | Same resolution logic                                                                                                                                                                                                                                                       |
| `ActivityHistoryModal.tsx`  | Origin "Chofer:"         | Read `driverEmployee` from the updated `MaintenanceRequestOrigin` type, prioritize over `checklist.chofer`                                                                                                                                                                  |
| `driverInfo.ts`             | `getDriverName()`        | Add optional `driverEmployee?: { firstname, lastname }` parameter. Callers that have access to the parent `maintenance_request` (e.g., detail dialogs) pass it explicitly. The existing deep traversal path remains as fallback for callers that only have item-level data. |

**`getDriverName()` call shape**: The current function receives a `maintenance_request_item` and traverses `deviations → answers → employees`. The new `driver_employee` lives on `maintenance_requests` (parent level). Two options: (a) add an optional param for callers that have the parent data, (b) extend the item type to include the parent's `driver_employee`. Option (a) is simpler and avoids query changes on item-level fetches.

Files that do NOT change (only show labels/comments, not the driver name):

- `SolicitudApprovalDialog.tsx` — label "Comentario del chofer"
- `equipment-order-detail-dialog.tsx` — `driver_comment` label
- `ItemComments.tsx` — uses `driverInfo.ts` which gets updated automatically

### 6. Error Handling & Data Refresh

Existing patterns maintained without changes:

- **Client validation**: equipment selected, deviations > 0, supervisor selected, km >= current
- **try/catch** in `handleSubmit` with `toast.error()` to user
- **Prisma $transaction** for atomic writes with auto-rollback
- **Vehicle km/hours update** outside transaction with separate try/catch (non-critical)
- **Post-submit refresh**: `invalidateAllMaintenanceQueries(queryClient)` + `invalidateCacheTags(...)` + `router.refresh()` + wizard reset

Additional for the equipment route: `onSuccess` callback redirects to `/maintenance/equipment/[id]` after successful creation.

### 7. Files Summary

| Action    | File                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------ |
| MIGRATION | `prisma/schema.prisma` — add field + relation (both sides)                                             |
| MIGRATION | `prisma/migrations/xxx/migration.sql` — ALTER TABLE                                                    |
| REWRITE   | `src/app/maintenance/equipment/[id]/request/page.tsx`                                                  |
| MODIFY    | `src/features/Mantenimiento/NuevoPedido/components/NuevoPedidoChecklistForm.tsx`                       |
| MODIFY    | `src/features/Mantenimiento/NuevoPedido/actions/actionsServer.ts`                                      |
| MODIFY    | `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts`                         |
| MODIFY    | `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsTableServer.ts`                    |
| MODIFY    | `src/features/Mantenimiento/SolicitudesMantenimiento/tableColumns.tsx`                                 |
| MODIFY    | `src/features/Mantenimiento/SolicitudesMantenimiento/components/columns.tsx` (legacy — targeted patch) |
| MODIFY    | `src/features/Mantenimiento/SolicitudesMantenimiento/components/SolicitudDetailDialog.tsx`             |
| MODIFY    | `src/features/Mantenimiento/Operaciones/actions/actionsServer.ts`                                      |
| MODIFY    | `src/features/Mantenimiento/components/ActivityHistoryModal.tsx`                                       |
| MODIFY    | `src/features/Mantenimiento/utils/driverInfo.ts`                                                       |
| MODIFY    | `src/components/maintenance/critical-deviations-repair-modal.tsx` (pass driverEmployeeId)              |
| DELETE    | `src/app/maintenance/equipment/[id]/request/repair-entry-mobile-wrapper.tsx`                           |
| DELETE    | `src/app/maintenance/equipment/[id]/request/repair-entry-with-router.tsx`                              |
