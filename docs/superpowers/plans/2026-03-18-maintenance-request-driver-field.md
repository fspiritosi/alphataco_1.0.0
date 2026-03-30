# Maintenance Request from Equipment — Driver Field + Wizard Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the equipment maintenance request page with the checklist wizard, add `driver_employee_id` FK to `maintenance_requests`, and update all driver-display surfaces to use the new field.

**Architecture:** Add a nullable FK column to `maintenance_requests` pointing to `employees`. Adapt the existing `NuevoPedidoChecklistForm` wizard with 3 new optional props to handle the maintenance context (auto-driver, skip supervisor question). Update all query includes and UI resolution logic to prioritize the new FK.

**Tech Stack:** Prisma (migration + queries), Next.js 16 Server Components, React 19, shadcn/ui, React Query, moment.js

**Spec:** `docs/superpowers/specs/2026-03-18-maintenance-request-driver-field-design.md`

**Verification skills:** Use `vercel-react-best-practices` for component changes. Use `chrome-devtools` for frontend verification after implementation.

---

## File Structure

| Action  | File                                                                                            | Responsibility                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| MODIFY  | `prisma/schema.prisma`                                                                          | Add `driver_employee_id` field + both sides of relation                                                    |
| CREATE  | `prisma/migrations/YYYYMMDDHHMMSS_add_driver_employee_id_to_maintenance_requests/migration.sql` | ALTER TABLE SQL                                                                                            |
| REWRITE | `src/app/maintenance/equipment/[id]/request/page.tsx`                                           | Server Component: auth + employee data + render wizard                                                     |
| MODIFY  | `src/features/Mantenimiento/NuevoPedido/components/NuevoPedidoChecklistForm.tsx`                | Add 3 props, conditional step 3, driver in step 4, pass to submit                                          |
| MODIFY  | `src/features/Mantenimiento/NuevoPedido/actions/actionsServer.ts`                               | Accept + write `driverEmployeeId` in both create functions                                                 |
| MODIFY  | `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts`                  | Accept `driverEmployeeId` in `createOrUpdateMaintenanceRequest` + add to `MAINTENANCE_REQUEST_FULL_SELECT` |
| MODIFY  | `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsTableServer.ts`             | Add `driver_employee` include to paginated queries                                                         |
| MODIFY  | `src/features/Mantenimiento/SolicitudesMantenimiento/tableColumns.tsx`                          | New driver resolution priority                                                                             |
| MODIFY  | `src/features/Mantenimiento/SolicitudesMantenimiento/components/columns.tsx`                    | New driver resolution (legacy, targeted patch)                                                             |
| MODIFY  | `src/features/Mantenimiento/SolicitudesMantenimiento/components/SolicitudDetailDialog.tsx`      | New driver resolution                                                                                      |
| MODIFY  | `src/features/Mantenimiento/Operaciones/actions/actionsServer.ts`                               | Add `driverEmployee` to `MaintenanceRequestOrigin` type + extraction                                       |
| MODIFY  | `src/features/Mantenimiento/components/ActivityHistoryModal.tsx`                                | Prioritize `driverEmployee` over `checklist.chofer`                                                        |
| MODIFY  | `src/features/Mantenimiento/utils/driverInfo.ts`                                                | Add optional `driverEmployee` param as first priority                                                      |
| MODIFY  | `src/components/maintenance/critical-deviations-repair-modal.tsx`                               | Pass `driverEmployeeId` to `createOrUpdateMaintenanceRequest`                                              |
| DELETE  | `src/app/maintenance/equipment/[id]/request/repair-entry-mobile-wrapper.tsx`                    | Dead code                                                                                                  |
| DELETE  | `src/app/maintenance/equipment/[id]/request/repair-entry-with-router.tsx`                       | Dead code                                                                                                  |

---

## Task 1: Database Migration

**Files:**

- Modify: `prisma/schema.prisma` (lines 1797–1830 for `maintenance_requests`, lines ~1349+ for `employees`)
- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_driver_employee_id_to_maintenance_requests/migration.sql`

- [ ] **Step 1: Add field to `maintenance_requests` model in schema**

In `prisma/schema.prisma`, inside the `maintenance_requests` model (after `engine_hours` field, around line 1813), add:

```prisma
  driver_employee_id  String?    @db.Uuid
  driver_employee     employees? @relation("maintenance_request_driver", fields: [driver_employee_id], references: [id])
```

- [ ] **Step 2: Add reverse relation to `employees` model**

In `prisma/schema.prisma`, inside the `employees` model (in the relations section), add:

```prisma
  maintenance_request_driver maintenance_requests[] @relation("maintenance_request_driver")
```

- [ ] **Step 3: Generate the migration diff**

Run: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`

Review output — take ONLY the `ALTER TABLE maintenance_requests ADD COLUMN driver_employee_id` line. Ignore any unrelated drift.

- [ ] **Step 4: Create migration folder and file**

```bash
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_add_driver_employee_id_to_maintenance_requests
```

Write `migration.sql` with only:

```sql
ALTER TABLE "public"."maintenance_requests" ADD COLUMN "driver_employee_id" UUID;

ALTER TABLE "public"."maintenance_requests"
  ADD CONSTRAINT "maintenance_requests_driver_employee_id_fkey"
  FOREIGN KEY ("driver_employee_id") REFERENCES "public"."employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 5: Apply migration**

```bash
npx prisma db execute --file prisma/migrations/YYYYMMDDHHMMSS_add_driver_employee_id_to_maintenance_requests/migration.sql
```

- [ ] **Step 6: Resolve + generate**

```bash
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_add_driver_employee_id_to_maintenance_requests
npx prisma generate
```

- [ ] **Step 7: Verify with MCP supabase-LOCAL**

Run SQL to confirm column exists:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'maintenance_requests' AND column_name = 'driver_employee_id';
```

- [ ] **Step 8: Run type check**

Run: `npm run check-types`
Expected: PASS (no errors related to the new field)

---

## Task 2: Server Actions — Writing `driver_employee_id`

**Files:**

- Modify: `src/features/Mantenimiento/NuevoPedido/actions/actionsServer.ts` (lines 283, 320–331, 465, 502–510)
- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts` (lines 519–656)
- Modify: `src/components/maintenance/critical-deviations-repair-modal.tsx` (lines 43–57, 164–172)

- [ ] **Step 1: Add `driverEmployeeId` to `createMaintenanceOrderFromDeviations` input**

In `NuevoPedido/actions/actionsServer.ts`, find the function input (around line 283). The function receives an object — add `driverEmployeeId?: string` to it.

In the `maintenance_requests.create` call (lines 320–331), add:

```typescript
driver_employee_id: input.driverEmployeeId ?? null,
```

- [ ] **Step 2: Add `driverEmployeeId` to `createMaintenanceRequestPendingApproval` input**

Same file, function around line 465. Add `driverEmployeeId?: string` to the input.

In the `maintenance_requests.create` call (lines 502–510), add:

```typescript
driver_employee_id: input.driverEmployeeId ?? null,
```

- [ ] **Step 3: Add `driverEmployeeId` to `createOrUpdateMaintenanceRequest`**

In `SolicitudesMantenimiento/actions/actionsServer.ts`, function at line 519. Add `driverEmployeeId?: string` to the input type.

In the `maintenance_requests.create` call inside this function, add:

```typescript
driver_employee_id: input.driverEmployeeId ?? null,
```

- [ ] **Step 4: Update `CriticalDeviationsRepairModal` to pass `driverEmployeeId`**

In `src/components/maintenance/critical-deviations-repair-modal.tsx`:

Add `driverEmployeeId?: string` to the `CriticalDeviationsRepairModalProps` interface (line 43).

In the call to `createOrUpdateMaintenanceRequest` (lines 164–172), add:

```typescript
driverEmployeeId: driverEmployeeId,  // new prop, maps directly
```

**Note:** The modal is called from `NormalizedChecklistForm.tsx` which has `defaultEmployeeId` prop. The caller must pass it as the new `driverEmployeeId` prop. Find where `<CriticalDeviationsRepairModal` is rendered in `NormalizedChecklistForm.tsx` and add `driverEmployeeId={defaultEmployeeId}`.

- [ ] **Step 5: Run type check**

Run: `npm run check-types`
Expected: PASS

---

## Task 3: Server Actions — Reading `driver_employee_id` (Queries)

**Files:**

- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsTableServer.ts` (lines 117–168)
- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts` (lines 19–109)
- Modify: `src/features/Mantenimiento/Operaciones/actions/actionsServer.ts` (lines 373–396, 466–470, 584–589)

- [ ] **Step 1: Add `driver_employee` to paginated table queries**

In `actionsTableServer.ts`, find the Prisma `select` for `maintenance_requests` (around lines 117–168). Add alongside the existing `employees` include:

```typescript
driver_employee: {
  select: {
    id: true,
    firstname: true,
    lastname: true,
    file: true,
  },
},
```

Do this in BOTH `getMaintenanceRequestsPaginated` and `getAllMaintenanceRequestsForExport` (they share the same select or each has their own — add to both).

- [ ] **Step 2: Add `driver_employee` to `MAINTENANCE_REQUEST_FULL_SELECT`**

In `SolicitudesMantenimiento/actions/actionsServer.ts`, find the `MAINTENANCE_REQUEST_FULL_SELECT` constant (lines 19–109). Add to the top-level include:

```typescript
driver_employee: {
  select: {
    id: true,
    firstname: true,
    lastname: true,
    file: true,
  },
},
```

Also, add `file: true` to the **existing** `employees` select inside `MAINTENANCE_REQUEST_FULL_SELECT` if it's not already there (currently only has `id, firstname, lastname`). This ensures the `resolveDriverName` Priority 3 fallback can display the file number.

- [ ] **Step 3: Update `MaintenanceRequestOrigin` type and extraction in Operaciones**

In `Operaciones/actions/actionsServer.ts`:

Update `MaintenanceRequestOrigin` type (lines 373–396) — add a new top-level field:

```typescript
export type MaintenanceRequestOrigin = {
  type: 'checklist' | 'manual';
  driverEmployee?: {
    firstname: string;
    lastname: string;
    file: string | null;
  } | null;  // NEW
  checklist?: { ... };  // existing
  manualCreator?: { ... };  // existing
  createdAt: string | null;
};
```

In `getMaintenanceRequestFullActivityLog` (around line 403), update the `maintenance_requests` include to add `driver_employee: { select: { id: true, firstname: true, lastname: true, file: true } }`.

Where the origin object is built (around lines 466–480), add:

```typescript
driverEmployee: request.driver_employee ?? null,
```

Do the same in `getMaintenanceOrderFullActivityLog` (around line 507, extraction around lines 584–599).

- [ ] **Step 4: Run type check**

Run: `npm run check-types`
Expected: May show errors in UI files that now receive the new type but don't use it yet — that's OK, they'll be fixed in Task 4.

---

## Task 4: UI — Driver Resolution Logic

**Files:**

- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/tableColumns.tsx` (lines 164–195)
- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/components/columns.tsx` (lines 72–89)
- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/components/SolicitudDetailDialog.tsx` (lines 71–77)
- Modify: `src/features/Mantenimiento/components/ActivityHistoryModal.tsx` (lines 323–330)
- Modify: `src/features/Mantenimiento/utils/driverInfo.ts`

- [ ] **Step 1: Create a shared driver resolution helper**

In `src/features/Mantenimiento/utils/driverInfo.ts`, add a new exported function at the top of the file:

```typescript
/**
 * Resolve driver display name from a maintenance request.
 * Priority: driver_employee (new FK) → answer_data.chofer (legacy) → employees (old FK) → fallback
 */
export function resolveDriverName(request: {
  driver_employee?: { firstname: string; lastname: string; file?: string | null } | null;
  checklist_answers?: { answer_data: unknown } | null;
  employees?: { firstname: string; lastname: string; file?: string | null } | null;
}): string {
  // Priority 1: New FK — driver_employee
  if (request.driver_employee) {
    const { firstname, lastname, file } = request.driver_employee;
    const name = `${lastname} ${firstname}`.trim();
    return file ? `[${file}] ${name}` : name;
  }

  // Priority 2: Legacy JSON — checklist_answers.answer_data.chofer
  const answerData = request.checklist_answers?.answer_data as { chofer?: string } | null;
  if (answerData?.chofer) return answerData.chofer;

  // Priority 3: Old FK — employees (employee_id)
  if (request.employees) {
    const { firstname, lastname, file } = request.employees;
    const name = `${lastname} ${firstname}`.trim();
    return file ? `[${file}] ${name}` : name;
  }

  return 'No especificado';
}
```

- [ ] **Step 2: Update `tableColumns.tsx` — driver column (new system)**

In `tableColumns.tsx` (lines 164–195), replace the `accessorFn` and `cell` of the driver column to use `resolveDriverName`:

```typescript
import { resolveDriverName } from '@/features/Mantenimiento/utils/driverInfo';

// In the column definition:
{
  id: 'driver',
  accessorFn: (row) => resolveDriverName(row),
  meta: { title: 'Chofer' },
  cell: ({ row }) => {
    const name = resolveDriverName(row.original);
    return <div className="min-w-[120px]">{name || '-'}</div>;
  },
  enableSorting: false,
},
```

- [ ] **Step 3: Update `columns.tsx` — driver column (legacy system)**

In `columns.tsx` (lines 72–89), update the cell to use `resolveDriverName`:

```typescript
import { resolveDriverName } from '@/features/Mantenimiento/utils/driverInfo';

// In the column cell:
cell: ({ row }) => {
  const name = resolveDriverName(row.original);
  return name ? <span>{name}</span> : <span className="text-muted-foreground">-</span>;
},
```

- [ ] **Step 4: Update `SolicitudDetailDialog.tsx` — Chofer field**

In `SolicitudDetailDialog.tsx` (lines 71–77), replace the inline resolution with:

```typescript
import { resolveDriverName } from '@/features/Mantenimiento/utils/driverInfo';

// Replace the chofer display:
<div>
  <span className="text-sm text-muted-foreground">Chofer:</span>
  <p className="font-medium">{resolveDriverName(request)}</p>
</div>
```

- [ ] **Step 5: Update `ActivityHistoryModal.tsx` — origin chofer**

In `ActivityHistoryModal.tsx` (lines 323–330), update the `OriginItem` rendering to prioritize `driverEmployee`:

```typescript
// Replace the chofer block:
{(origin.driverEmployee || origin.checklist?.chofer) && (
  <p className="flex items-center gap-1 text-blue-800 dark:text-blue-200">
    <User className="h-3 w-3" />
    <span className="font-medium">Chofer:</span>{' '}
    {origin.driverEmployee
      ? `${origin.driverEmployee.file ? `[${origin.driverEmployee.file}] ` : ''}${origin.driverEmployee.lastname} ${origin.driverEmployee.firstname}`.trim()
      : origin.checklist?.chofer}
  </p>
)}
```

- [ ] **Step 6: Update `getDriverName()` in `driverInfo.ts`**

Add an optional `driverEmployee` parameter to `getDriverName`:

```typescript
export function getDriverName(
  item: MaintenanceRequestItemWithRelations,
  driverEmployee?: { firstname: string; lastname: string } | null
): string | null {
  // Priority 0: Explicit driver_employee from parent request
  if (driverEmployee) {
    return `${driverEmployee.firstname} ${driverEmployee.lastname}`.trim() || null;
  }

  // ... existing traversal logic stays unchanged ...
}
```

Callers that have access to the parent `maintenance_request` (detail dialogs) pass it; callers with only item-level data leave it undefined (existing behavior preserved).

- [ ] **Step 7: Run type check + lint**

Run: `npm run check-types && npm run lint`
Expected: PASS

---

## Task 5: Component Changes — `NuevoPedidoChecklistForm`

**Files:**

- Modify: `src/features/Mantenimiento/NuevoPedido/components/NuevoPedidoChecklistForm.tsx` (lines 57–61, 71–93, 219–306, 319–324, 590–743, 745–854)

- [ ] **Step 1: Add new props to the interface**

In the Props interface (lines 57–61), add:

```typescript
interface NuevoPedidoChecklistFormProps {
  equipment: Awaited<ReturnType<typeof fetchAllEquipmentBasicData>>;
  default_equipment_id?: string;
  onSuccess?: () => void;
  driverEmployeeId?: string;
  driverName?: string;
  skipSupervisorQuestion?: boolean;
  successRedirectUrl?: string; // NEW — redirect URL after success (for Server Component callers)
}
```

Destructure in the component function signature (**note: this is a named export, NOT default**):

```typescript
export function NuevoPedidoChecklistForm({
  equipment,
  default_equipment_id,
  onSuccess,
  driverEmployeeId,
  driverName,
  skipSupervisorQuestion = false,
  successRedirectUrl,
}: NuevoPedidoChecklistFormProps) {
```

- [ ] **Step 2: Initialize `isCurrentUserSupervisor` conditionally**

Find the state declaration (around line 88):

```typescript
// BEFORE:
const [isCurrentUserSupervisor, setIsCurrentUserSupervisor] = useState<boolean | null>(null);

// AFTER:
const [isCurrentUserSupervisor, setIsCurrentUserSupervisor] = useState<boolean | null>(
  skipSupervisorQuestion ? false : null
);
```

This prevents the `canAdvanceStep` guard from blocking on step 3 when `skipSupervisorQuestion` is true.

- [ ] **Step 3: Modify step 3 rendering to skip supervisor question**

Find `renderStep3Supervisor` (around line 590). At the beginning of the function, add the conditional:

```typescript
const renderStep3Supervisor = () => {
  // When skipSupervisorQuestion is true, skip the binary question
  // and render the supervisor selector directly
  if (skipSupervisorQuestion) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Seleccionar Supervisor</h3>
        <p className="text-sm text-muted-foreground">
          Seleccione el supervisor que aprobara esta solicitud.
        </p>
        {/* Render ONLY the supervisor combobox section from the existing "no" branch */}
        {/* Copy the Popover with supervisor search from the isCurrentUserSupervisor === false branch */}
      </div>
    );
  }

  // ... existing code with the binary question ...
};
```

The supervisor combobox code already exists in the `isCurrentUserSupervisor === false` branch of step 3 (around lines 650–740). Extract it or conditionally render it.

- [ ] **Step 4: Add driver info to step 4 confirmation**

Find `renderStep4Confirm` (around line 745). In the summary Card, after the equipment info section and before the deviations list, add:

```typescript
{driverName && (
  <div className="flex items-center gap-2">
    <User className="h-4 w-4 text-muted-foreground" />
    <span className="text-sm text-muted-foreground">Chofer:</span>
    <span className="font-medium">{driverName}</span>
  </div>
)}
```

Import `User` from `lucide-react` if not already imported.

- [ ] **Step 5: Pass `driverEmployeeId` in `handleSubmit`**

Find `handleSubmit` (around line 219). In both branches:

**Branch 1 — isCurrentUserSupervisor === true** (calls `createMaintenanceOrderFromDeviations`):

```typescript
await createMaintenanceOrderFromDeviations({
  equipmentId: selectedEquipmentId!,
  supervisorId: currentUser!.id,
  kilometer,
  engine_hours: engineHours,
  deviations: deviationsPayload,
  driverEmployeeId, // NEW
});
```

**Branch 2 — isCurrentUserSupervisor === false** (calls `createMaintenanceRequestPendingApproval`):

```typescript
await createMaintenanceRequestPendingApproval({
  equipmentId: selectedEquipmentId!,
  supervisorId: selectedSupervisorId!,
  kilometer,
  engine_hours: engineHours,
  deviations: deviationsPayload,
  driverEmployeeId, // NEW
});
```

- [ ] **Step 6: Fix form reset to preserve `skipSupervisorQuestion` state**

In `handleSubmit`, find the success block where state is reset (around line 293). The existing code resets `isCurrentUserSupervisor` to `null`:

```typescript
setIsCurrentUserSupervisor(null);
```

Change to:

```typescript
setIsCurrentUserSupervisor(skipSupervisorQuestion ? false : null);
```

This prevents step 3 from blocking on a second submission when `skipSupervisorQuestion` is true.

- [ ] **Step 7: Add redirect on success via `successRedirectUrl`**

In `handleSubmit`, after the existing success block (after `onSuccess?.()` call), add:

```typescript
if (successRedirectUrl) {
  router.push(successRedirectUrl);
}
```

This allows Server Component callers (like the equipment request page) to specify a redirect URL without needing a client-side callback.

- [ ] **Step 8: Run type check**

Run: `npm run check-types`
Expected: PASS

---

## Task 6: Page Rewrite + Cleanup

**Files:**

- Rewrite: `src/app/maintenance/equipment/[id]/request/page.tsx`
- Delete: `src/app/maintenance/equipment/[id]/request/repair-entry-mobile-wrapper.tsx`
- Delete: `src/app/maintenance/equipment/[id]/request/repair-entry-with-router.tsx`

- [ ] **Step 1: Rewrite the page**

Replace `src/app/maintenance/equipment/[id]/request/page.tsx` with:

```typescript
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { fetchAllEquipmentBasicData } from '@/app/server/GET/actions';
import { MaintenanceHeader } from '@/components/maintenance/maintenance-header';
import { NuevoPedidoChecklistForm } from '@/features/Mantenimiento/NuevoPedido/components/NuevoPedidoChecklistForm';
import TanstackQueryInicializador from '@/shared/components/common/TanstackQueryInicializador';

export default async function MaintenanceEquipmentRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await supabaseServer();

  // 1. Auth — same pattern as checklist page
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/maintenance');
  }

  const employeeId =
    ((user.app_metadata as Record<string, unknown>)?.employee_id as string | undefined) ??
    ((user.user_metadata as Record<string, unknown>)?.employee_id as string | undefined);

  // 2. Get equipment company_id
  const { data: equipmentData } = await supabase
    .from('vehicles')
    .select('company_id')
    .eq('id', resolvedParams.id)
    .single();

  if (!equipmentData?.company_id) {
    redirect('/maintenance?error=equipment_not_found');
  }

  // 3. Parallel fetches: employee data + equipment list
  const [employeeData, allEquipment] = await Promise.all([
    employeeId
      ? supabase
          .from('employees')
          .select('id, firstname, lastname, cuil, file')
          .eq('id', employeeId)
          .eq('company_id', equipmentData.company_id)
          .single()
          .then((res) => res.data)
      : null,
    fetchAllEquipmentBasicData(),
  ]);

  // 4. Filter equipment by company
  const equipment = allEquipment.filter(
    (e) => e.company_id === equipmentData.company_id
  );

  // 5. Build driver display name with file number
  const driverName = employeeData
    ? `[${employeeData.file || ''}] ${employeeData.lastname} ${employeeData.firstname}`.trim()
    : undefined;

  return (
    <TanstackQueryInicializador>
      <div className="flex min-h-screen flex-col">
        <MaintenanceHeader
          employeeName={
            employeeData ? `${employeeData.firstname} ${employeeData.lastname}` : undefined
          }
          employeeCuil={employeeData?.cuil ?? undefined}
        />
        <main className="flex-1 p-4">
          <NuevoPedidoChecklistForm
            equipment={equipment}
            default_equipment_id={resolvedParams.id}
            driverEmployeeId={employeeData?.id}
            driverName={driverName}
            skipSupervisorQuestion={true}
            successRedirectUrl={`/maintenance/equipment/${resolvedParams.id}`}
          />
        </main>
      </div>
    </TanstackQueryInicializador>
  );
}
```

- [ ] **Step 2: Delete deprecated files**

```bash
rm src/app/maintenance/equipment/[id]/request/repair-entry-mobile-wrapper.tsx
rm src/app/maintenance/equipment/[id]/request/repair-entry-with-router.tsx
```

- [ ] **Step 3: Run type check + lint**

Run: `npm run check-types && npm run lint`
Expected: PASS

---

## Task 7: Update `CriticalDeviationsRepairModal` caller in `NormalizedChecklistForm`

**Files:**

- Modify: `src/components/CheckList/NormalizedChecklistForm.tsx` (where `<CriticalDeviationsRepairModal>` is rendered)

- [ ] **Step 1: Pass `driverEmployeeId` to the modal**

Find where `<CriticalDeviationsRepairModal` is rendered in `NormalizedChecklistForm.tsx`. Add the `driverEmployeeId` prop:

```typescript
<CriticalDeviationsRepairModal
  equipmentId={currentEquipmentId}
  deviations={pendingDeviations.map(...)}
  isOpen={showDeviationsModal}
  checklistAnswerId={checklistAnswerId}
  employeeId={defaultEmployeeId}
  userId={userId}
  kilometer={kilometer}
  driverEmployeeId={defaultEmployeeId}  // NEW — the driver is the person filling the checklist
  onClose={...}
  onComplete={...}
/>
```

**Note:** `defaultEmployeeId` is already a prop of `NormalizedChecklistForm` — it's the employee UUID from auth metadata. In the maintenance context, this IS the driver.

- [ ] **Step 2: Run type check**

Run: `npm run check-types`
Expected: PASS

---

## Task 8: Verification — Type Check + Lint + Format

- [ ] **Step 1: Full type check**

Run: `npm run check-types`
Expected: 0 errors

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: No new warnings/errors

- [ ] **Step 3: Format**

Run: `npm run format`

---

## Task 9: Frontend Verification with Chrome DevTools

Use `chrome-devtools` MCP for all browser testing. Test credentials: `yordanpz@hotmail.com` / `Yoselania23.`

- [ ] **Step 1: Verify the new request page loads**

Navigate to `/maintenance/equipment/{some-equipment-id}/request/`. Verify:

- MaintenanceHeader shows the logged-in employee name/CUIL
- The 5-step wizard renders (not the old direct form)
- Equipment is pre-selected and locked (cannot change)
- Step 0 shows km/horometro pre-filled from the equipment

- [ ] **Step 2: Walk through the wizard**

1. Step 0 → select/confirm equipment (should be locked) → Next
2. Step 1 → checklist templates load → select one → Next
3. Step 2 → items render → select at least one deviation → add comment → Next
4. Step 3 → supervisor question is SKIPPED → supervisor combobox shows directly → select supervisor → Next
5. Step 4 → confirmation shows: equipment, deviations, supervisor, **chofer name with file number**, status "Pendiente de Aprobacion"

- [ ] **Step 3: Submit and verify data creation**

Click submit. Verify:

- Success toast appears
- No error toasts
- Wizard resets to step 0
- Check in the maintenance dashboard (`/dashboard/maintenance?tab=solicitudes`) that the new request appears with the correct chofer name

- [ ] **Step 4: Verify chofer displays in existing UI surfaces**

1. **Solicitudes table**: The "Chofer" column shows the driver name from the new request (from `driver_employee` FK, not `answer_data.chofer`)
2. **Solicitud detail dialog**: Click on the request → "Chofer:" shows the correct name
3. **Activity history**: Open the activity log for the request → "Chofer:" shows in the origin section

- [ ] **Step 5: Verify the dashboard wizard still works unchanged**

Navigate to `/dashboard/maintenance?tab=nuevo_pedido`. Verify:

- The supervisor question still appears (binary yes/no)
- No chofer line in the confirmation step (props not passed)
- Submit works as before

---

## Task 10: Final Review

- [ ] **Step 1: Review diff against spec**

Compare all changes against the spec at `docs/superpowers/specs/2026-03-18-maintenance-request-driver-field-design.md`. Verify every file listed in Section 7 was addressed.

- [ ] **Step 2: Check for console.\* violations**

Run: `grep -r "console\." --include="*.tsx" --include="*.ts"` on modified files. Replace any `console.*` with logger.

- [ ] **Step 3: Check for `:any` violations**

Review modified files for any `:any` types introduced. Replace with proper types.
