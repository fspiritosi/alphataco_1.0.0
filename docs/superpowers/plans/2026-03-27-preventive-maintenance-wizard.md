# Preventive Maintenance Wizard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Mantenimiento Preventivo" path to the Nuevo Pedido wizard with 4 hardcoded program types, dynamic stepper, and downstream propagation.

**Architecture:** Extend the existing wizard with a type selector in step 1 that switches between checklist (current flow unchanged) and preventive (skip items step, store preventive_type). New `source='preventive'` + `preventive_type` fields on `maintenance_requests` and `maintenance_orders`. All downstream views (dialogs, tables, filters) updated to recognize the new source value.

**Tech Stack:** Next.js 16, React 19, Prisma ORM, shadcn/ui, Tailwind CSS, Lucide icons, moment.js

**Spec:** `docs/superpowers/specs/2026-03-26-preventive-maintenance-wizard-design.md`

---

## Task 1: Schema + Migration

**Files:**

- Modify: `prisma/schema.prisma` (lines ~1731 and ~1814)
- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_preventive_type/migration.sql`

- [ ] **Step 1: Add `preventive_type` to `maintenance_orders` in schema.prisma**

In `prisma/schema.prisma`, inside the `maintenance_orders` model, after the `engine_hours_at_entry` field (line ~1731), add:

```prisma
  preventive_type         String?
```

- [ ] **Step 2: Add `preventive_type` to `maintenance_requests` in schema.prisma**

In the same file, inside the `maintenance_requests` model, after the `engine_hours` field (line ~1814), add:

```prisma
  preventive_type String?
```

- [ ] **Step 3: Generate migration SQL diff**

Run:

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Expected: SQL output containing two `ALTER TABLE ... ADD COLUMN preventive_type TEXT` statements. Copy ONLY those two ALTER TABLE statements.

- [ ] **Step 4: Create migration folder and file**

```bash
mkdir -p prisma/migrations/20260327000000_add_preventive_type
```

Write `prisma/migrations/20260327000000_add_preventive_type/migration.sql`:

```sql
-- Add preventive_type field to maintenance_requests and maintenance_orders
ALTER TABLE "maintenance_requests" ADD COLUMN "preventive_type" TEXT;
ALTER TABLE "maintenance_orders" ADD COLUMN "preventive_type" TEXT;
```

- [ ] **Step 5: Apply migration and generate client**

```bash
npx prisma db execute --file prisma/migrations/20260327000000_add_preventive_type/migration.sql
npx prisma migrate resolve --applied 20260327000000_add_preventive_type
npx prisma generate
```

- [ ] **Step 6: Verify with check-types**

```bash
npm run check-types
```

Expected: PASS (no errors)

---

## Task 2: Shared Constants

**Files:**

- Create: `src/features/Mantenimiento/shared/preventive-maintenance.ts`

- [ ] **Step 1: Create the constants file**

Create `src/features/Mantenimiento/shared/preventive-maintenance.ts`:

```typescript
import { Car, Snowflake, Sun, Truck, type LucideIcon } from 'lucide-react';

export const PREVENTIVE_TYPES = {
  light_fleet: 'Mantenimiento Preventivo Flota Liviana',
  heavy_fleet: 'Mantenimiento Preventivo Flota Pesada',
  summer_program: 'Programa de Verano',
  winter_program: 'Programa de Invierno',
} as const;

export type PreventiveType = keyof typeof PREVENTIVE_TYPES;

export const PREVENTIVE_TYPE_DESCRIPTIONS: Record<PreventiveType, string> = {
  light_fleet: 'Intervalos por kilómetros',
  heavy_fleet: 'Intervalos por horas/kilómetros',
  summer_program: 'Inspección por altas temperaturas',
  winter_program: 'Inspección por bajas temperaturas',
};

export const PREVENTIVE_TYPE_ICONS: Record<PreventiveType, LucideIcon> = {
  light_fleet: Car,
  heavy_fleet: Truck,
  summer_program: Sun,
  winter_program: Snowflake,
};

export const SOURCE_LABELS_EXTENDED: Record<string, string> = {
  checklist: 'Checklist',
  manual: 'Manual',
  preventive: 'Preventivo',
};
```

- [ ] **Step 2: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 3: Server Actions — Extend for Preventive

**Files:**

- Modify: `src/features/Mantenimiento/NuevoPedido/actions/actionsServer.ts`

- [ ] **Step 1: Add import of PreventiveType**

At the top of `actionsServer.ts`, add import:

```typescript
import type { PreventiveType } from '@/features/Mantenimiento/shared/preventive-maintenance';
```

- [ ] **Step 2: Extend `createMaintenanceOrderFromDeviations` input type**

Change the input parameter type from:

```typescript
export async function createMaintenanceOrderFromDeviations(input: {
  equipmentId: string;
  supervisorId: string;
  kilometer?: string;
  engine_hours?: string;
  deviations: CreateDeviationFromNuevoPedido[];
}) {
```

To:

```typescript
export async function createMaintenanceOrderFromDeviations(input: {
  equipmentId: string;
  supervisorId: string;
  kilometer?: string;
  engine_hours?: string;
  deviations?: CreateDeviationFromNuevoPedido[];
  source?: 'preventive';
  preventiveType?: PreventiveType;
}) {
```

- [ ] **Step 3: Add preventive branch inside `createMaintenanceOrderFromDeviations`**

Inside the function, right after `const profile = await requireServerAuthProfile();` (line ~298), add the preventive branch. The entire `$transaction` block needs to be wrapped in a conditional:

```typescript
const profile = await requireServerAuthProfile();
const isPreventive = input.source === 'preventive' && input.preventiveType;

if (isPreventive) {
  // PREVENTIVE FLOW: request + order only, no deviations/items
  const { request, order } = await prisma.$transaction(async (tx) => {
    const request = await tx.maintenance_requests.create({
      data: {
        equipment_id: input.equipmentId,
        supervisor_id: input.supervisorId,
        status: 'approved',
        approved_by: profile.id,
        approved_at: new Date(),
        user_id: profile.id,
        kilometer: input.kilometer ?? null,
        source: 'preventive',
        preventive_type: input.preventiveType!,
      },
    });

    const order = await tx.maintenance_orders.create({
      data: {
        equipment_id: input.equipmentId,
        maintenance_request_id: request.id,
        status: 'pending_scheduling',
        kilometer_at_entry: input.kilometer ?? null,
        source: 'preventive',
        preventive_type: input.preventiveType!,
      },
    });

    await tx.maintenance_activity_log.create({
      data: {
        maintenance_request_id: request.id,
        maintenance_order_id: order.id,
        action_type: 'created',
        performed_by: profile.id,
        notes: `Pedido de mantenimiento preventivo creado: ${input.preventiveType}`,
        metadata: {
          source: 'preventive',
          preventive_type: input.preventiveType,
          supervisor_id: input.supervisorId,
        },
      },
    });

    return { request, order };
  });

  // Update vehicle km/hours (same logic as existing)
  if (input.kilometer || input.engine_hours) {
    try {
      const currentVehicle = await prisma.vehicles.findUnique({
        where: { id: input.equipmentId },
        select: { kilometer: true, engine_hours: true },
      });
      const updateData: Record<string, unknown> = {};
      if (input.kilometer) {
        const currentKm = Number(currentVehicle?.kilometer) || 0;
        if (Number(input.kilometer) >= currentKm) updateData.kilometer = input.kilometer;
      }
      if (input.engine_hours) {
        const currentHours = Number(currentVehicle?.engine_hours) || 0;
        if (Number(input.engine_hours) >= currentHours) updateData.engine_hours = input.engine_hours;
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.vehicles.update({ where: { id: input.equipmentId }, data: updateData });
      }
    } catch (vehicleError) {
      serverLogger.warn('No se pudo actualizar datos del vehículo', { data: { error: vehicleError } });
    }
  }

  serverLogger.info('Pedido preventivo creado exitosamente', {
    data: { requestId: request.id, orderId: order.id, preventiveType: input.preventiveType },
  });

  await invalidateCacheTags(INVALIDATION_MAP.createMaintenanceOrderFromDeviations);
  return { request, order };
}

// EXISTING CHECKLIST FLOW (unchanged from here) ...
```

The existing checklist flow code remains exactly as-is after the `if (isPreventive)` block. Just add a check at the start of the existing flow:

```typescript
const deviations = input.deviations ?? [];
if (deviations.length === 0 && !isPreventive) {
  throw new Error('Deviations are required for checklist flow');
}
```

Then replace all references to `input.deviations` with `deviations` in the existing block.

- [ ] **Step 4: Extend `createMaintenanceRequestPendingApproval` similarly**

Same pattern. Change input type to accept optional `source` and `preventiveType`. Add preventive branch before existing code:

```typescript
export async function createMaintenanceRequestPendingApproval(input: {
  equipmentId: string;
  supervisorId: string;
  kilometer?: string;
  engine_hours?: string;
  deviations?: CreateDeviationFromNuevoPedido[];
  source?: 'preventive';
  preventiveType?: PreventiveType;
}) {
```

Preventive branch (after `requireServerAuthProfile()`):

```typescript
const isPreventive = input.source === 'preventive' && input.preventiveType;

if (isPreventive) {
  const { request } = await prisma.$transaction(async (tx) => {
    const request = await tx.maintenance_requests.create({
      data: {
        equipment_id: input.equipmentId,
        supervisor_id: input.supervisorId,
        status: 'pending_approval',
        user_id: profile.id,
        kilometer: input.kilometer ?? null,
        source: 'preventive',
        preventive_type: input.preventiveType!,
      },
    });

    await tx.maintenance_activity_log.create({
      data: {
        maintenance_request_id: request.id,
        action_type: 'created',
        performed_by: profile.id,
        notes: `Solicitud de mantenimiento preventivo creada: ${input.preventiveType} - Pendiente de aprobación`,
        metadata: {
          source: 'preventive',
          preventive_type: input.preventiveType,
          supervisor_id: input.supervisorId,
          requires_approval: true,
        },
      },
    });

    return { request };
  });

  // Update vehicle km/hours (same pattern as existing)
  // ... (same try/catch block as createMaintenanceOrderFromDeviations)

  serverLogger.info('Solicitud preventiva creada - Pendiente de aprobación', {
    data: { requestId: request.id, preventiveType: input.preventiveType },
  });

  await invalidateCacheTags(INVALIDATION_MAP.createMaintenanceRequestPendingApproval);
  return { request, requestItems: [] };
}

// EXISTING CHECKLIST FLOW (unchanged) ...
```

- [ ] **Step 5: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 4: Queries — Add `preventive_type` to Selects

**Files:**

- Modify: `src/features/Mantenimiento/PedidosMantenimiento/actions/actionsServer.ts` (~4 queries)
- Modify: `src/features/Mantenimiento/MaintenanceOrders/actions/actionsServer.ts` (~2 queries)
- Modify: `src/features/Mantenimiento/Operaciones/actions/actionsServer.ts` (~2 queries)
- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts` (shared select object)
- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsTableServer.ts` (~1 query)

The change is mechanical: everywhere there is `source: true` inside a `maintenance_requests` or `maintenance_orders` select block, add `preventive_type: true` on the next line.

- [ ] **Step 1: PedidosMantenimiento/actions/actionsServer.ts**

Add `preventive_type: true` after each `source: true` occurrence in the `maintenance_requests: { select: { ... } }` blocks at lines ~170, ~273, ~366, ~444. Also add `preventive_type: true` at the `maintenance_orders` top-level select in each query (alongside `source: true` if present, or alongside `status`).

Pattern for each query:

```typescript
maintenance_requests: {
  select: {
    // ... existing fields ...
    source: true,
    preventive_type: true,  // ADD THIS LINE
    // ...
  },
},
```

Also at the top-level `maintenance_orders` select, add:

```typescript
preventive_type: true,
```

- [ ] **Step 2: MaintenanceOrders/actions/actionsServer.ts**

Same pattern at lines ~83 and ~281.

- [ ] **Step 3: Operaciones/actions/actionsServer.ts**

Same pattern at lines ~199 and ~295.

- [ ] **Step 4: SolicitudesMantenimiento/actions/actionsServer.ts**

The shared `MAINTENANCE_REQUEST_FULL_SELECT` object at line ~36 has `source: true`. Add `preventive_type: true` right after it. This propagates to all queries using this object.

- [ ] **Step 5: SolicitudesMantenimiento/actions/actionsTableServer.ts**

At line ~120, add `preventive_type: true` after `source: true`.

- [ ] **Step 6: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 5: Wizard UI — Dynamic Stepper + Type Selector

**Files:**

- Modify: `src/features/Mantenimiento/NuevoPedido/components/NuevoPedidoChecklistForm.tsx`

This is the largest task. All changes are in the single wizard file.

- [ ] **Step 1: Add imports**

Add to the imports section:

```typescript
import { Separator } from '@/components/ui/separator';
import { Car, Snowflake, Sun, Wrench } from 'lucide-react';
import {
  PREVENTIVE_TYPES,
  PREVENTIVE_TYPE_DESCRIPTIONS,
  PREVENTIVE_TYPE_ICONS,
  type PreventiveType,
} from '@/features/Mantenimiento/shared/preventive-maintenance';
```

Note: `Separator` is already imported — verify before adding. `Wrench` may or may not be imported — verify. `Car`, `Snowflake`, `Sun` are new.

- [ ] **Step 2: Add new state variables**

After the existing state declarations (around line ~93), add:

```typescript
// Tipo de pedido: checklist o preventivo
const [requestType, setRequestType] = useState<'checklist' | 'preventive'>('checklist');
const [selectedPreventiveType, setSelectedPreventiveType] = useState<PreventiveType | ''>('');
```

- [ ] **Step 3: Define step keys and dynamic steps arrays**

Replace the existing `steps` array (lines ~337-343):

```typescript
// OLD:
const steps = [
  { title: 'Equipo', icon: Truck },
  { title: 'Checklist', icon: ClipboardList },
  { title: 'Items', icon: AlertTriangle },
  { title: 'Supervisor', icon: User },
  { title: 'Confirmar', icon: CheckCircle },
];
```

With:

```typescript
type StepKey = 'equipment' | 'type' | 'items' | 'supervisor' | 'confirm';

const CHECKLIST_STEPS: { key: StepKey; title: string; icon: typeof Truck }[] = [
  { key: 'equipment', title: 'Equipo', icon: Truck },
  { key: 'type', title: 'Checklist', icon: ClipboardList },
  { key: 'items', title: 'Items', icon: AlertTriangle },
  { key: 'supervisor', title: 'Supervisor', icon: User },
  { key: 'confirm', title: 'Confirmar', icon: CheckCircle },
];

const PREVENTIVE_STEPS: { key: StepKey; title: string; icon: typeof Truck }[] = [
  { key: 'equipment', title: 'Equipo', icon: Truck },
  { key: 'type', title: 'Preventivo', icon: Wrench },
  { key: 'supervisor', title: 'Supervisor', icon: User },
  { key: 'confirm', title: 'Confirmar', icon: CheckCircle },
];

const steps = requestType === 'preventive' ? PREVENTIVE_STEPS : CHECKLIST_STEPS;
const currentStepKey = steps[currentStep]?.key;
```

- [ ] **Step 4: Add `handleChangeRequestType` handler**

After `handleUpdateComment` (line ~217):

```typescript
const handleChangeRequestType = useCallback(
  (type: 'checklist' | 'preventive') => {
    if (type === requestType) return;
    setRequestType(type);
    // Reset downstream selections
    setSelectedTemplateId('');
    setSelectedPreventiveType('');
    setSelectedDeviations([]);
    setDeviationComments({});
    setSelectedSupervisorId('');
    setIsCurrentUserSupervisor(null);
  },
  [requestType]
);
```

- [ ] **Step 5: Update `canAdvanceStep` to use step keys**

Replace the entire `canAdvanceStep` useMemo (lines ~311-335):

```typescript
const canAdvanceStep = useMemo(() => {
  switch (currentStepKey) {
    case 'equipment':
      return !!selectedEquipmentId;
    case 'type':
      if (requestType === 'checklist') return !!selectedTemplateId;
      return !!selectedPreventiveType;
    case 'items':
      return selectedDeviations.length > 0;
    case 'supervisor':
      if (isCurrentUserSupervisor === null) return false;
      if (isCurrentUserSupervisor) return true;
      return !!selectedSupervisorId;
    case 'confirm':
      return false;
    default:
      return false;
  }
}, [
  currentStepKey,
  requestType,
  selectedEquipmentId,
  selectedTemplateId,
  selectedPreventiveType,
  selectedDeviations,
  selectedSupervisorId,
  isCurrentUserSupervisor,
]);
```

- [ ] **Step 6: Create `renderStep1Type` (replaces `renderStep1Checklist`)**

Replace `renderStep1Checklist` (lines ~465-505) with the new combined step:

```typescript
  const renderStep1Type = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Tipo de pedido</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Card
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50',
              requestType === 'checklist' && 'border-primary bg-primary/5'
            )}
            onClick={() => handleChangeRequestType('checklist')}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <ClipboardList className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Checklist</p>
                <p className="text-xs text-muted-foreground">Desde desvíos de inspección</p>
              </div>
              {requestType === 'checklist' && <Check className="h-4 w-4 ml-auto text-primary" />}
            </CardContent>
          </Card>
          <Card
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50',
              requestType === 'preventive' && 'border-primary bg-primary/5'
            )}
            onClick={() => handleChangeRequestType('preventive')}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <Wrench className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Mant. Preventivo</p>
                <p className="text-xs text-muted-foreground">Programa planificado de mantenimiento</p>
              </div>
              {requestType === 'preventive' && <Check className="h-4 w-4 ml-auto text-primary" />}
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {requestType === 'checklist' ? (
        <div className="space-y-4">
          <Label>Selecciona el checklist base</Label>
          {isLoadingTemplates ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : templatesError ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">Error al cargar los checklists</div>
          ) : templates && templates.length > 0 ? (
            <div className="space-y-2">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    selectedTemplateId === template.id && 'border-primary bg-primary/5'
                  )}
                  onClick={() => handleSelectTemplate(template.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.checklist_template_sections?.length || 0} secciones
                      </p>
                    </div>
                    {selectedTemplateId === template.id && <Check className="h-5 w-5 text-primary" />}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-muted text-center rounded-lg">
              No hay checklists disponibles para este tipo de equipo
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Label>Selecciona el programa</Label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(PREVENTIVE_TYPES) as [PreventiveType, string][]).map(([key, label]) => {
              const Icon = PREVENTIVE_TYPE_ICONS[key];
              return (
                <Card
                  key={key}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    selectedPreventiveType === key && 'border-primary bg-primary/5'
                  )}
                  onClick={() => setSelectedPreventiveType(key)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{PREVENTIVE_TYPE_DESCRIPTIONS[key]}</p>
                    </div>
                    {selectedPreventiveType === key && <Check className="h-4 w-4 text-primary" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
```

- [ ] **Step 7: Create `renderStepConfirm` (replaces `renderStep4Confirm`)**

The confirmation step needs to handle both flows. Find the existing `renderStep4Confirm` and wrap the items section in a conditional:

Where it currently renders items list, add:

```typescript
{requestType === 'preventive' ? (
  <div className="space-y-2">
    <h4 className="font-medium text-sm">Tipo de mantenimiento</h4>
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="gap-1">
        <Wrench className="h-3 w-3" />
        Mantenimiento Preventivo
      </Badge>
    </div>
    {selectedPreventiveType && (
      <Card className="mt-2">
        <CardContent className="p-3 flex items-center gap-3">
          {(() => {
            const Icon = PREVENTIVE_TYPE_ICONS[selectedPreventiveType as PreventiveType];
            return <Icon className="h-6 w-6 text-muted-foreground" />;
          })()}
          <div>
            <p className="font-medium text-sm">
              {PREVENTIVE_TYPES[selectedPreventiveType as PreventiveType]}
            </p>
            <p className="text-xs text-muted-foreground">
              {PREVENTIVE_TYPE_DESCRIPTIONS[selectedPreventiveType as PreventiveType]}
            </p>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
) : (
  /* existing items summary render — unchanged */
)}
```

- [ ] **Step 8: Update `handleSubmit` for preventive flow**

In `handleSubmit`, change the validation at the top:

```typescript
// OLD:
if (!selectedEquipmentId || selectedDeviations.length === 0) {
  toast.error('Faltan datos requeridos');
  return;
}

// NEW:
if (!selectedEquipmentId) {
  toast.error('Faltan datos requeridos');
  return;
}
if (requestType === 'checklist' && selectedDeviations.length === 0) {
  toast.error('Debes seleccionar al menos un desvío');
  return;
}
if (requestType === 'preventive' && !selectedPreventiveType) {
  toast.error('Debes seleccionar un programa de mantenimiento preventivo');
  return;
}
```

Then in the submit logic, wrap the existing calls:

```typescript
if (isCurrentUserSupervisor) {
  if (requestType === 'preventive') {
    await createMaintenanceOrderFromDeviations({
      equipmentId: selectedEquipmentId,
      supervisorId,
      kilometer: kilometer || undefined,
      engine_hours: engineHours || undefined,
      source: 'preventive',
      preventiveType: selectedPreventiveType as PreventiveType,
    });
  } else {
    // Existing checklist call — unchanged
    await createMaintenanceOrderFromDeviations({
      equipmentId: selectedEquipmentId,
      supervisorId,
      kilometer: kilometer || undefined,
      engine_hours: engineHours || undefined,
      deviations: deviationsToSend,
    });
  }
  toast.success('Pedido de mantenimiento creado exitosamente');
} else {
  if (requestType === 'preventive') {
    await createMaintenanceRequestPendingApproval({
      equipmentId: selectedEquipmentId,
      supervisorId,
      kilometer: kilometer || undefined,
      engine_hours: engineHours || undefined,
      source: 'preventive',
      preventiveType: selectedPreventiveType as PreventiveType,
    });
  } else {
    // Existing checklist call — unchanged
    await createMaintenanceRequestPendingApproval({
      equipmentId: selectedEquipmentId,
      supervisorId,
      kilometer: kilometer || undefined,
      engine_hours: engineHours || undefined,
      deviations: deviationsToSend,
    });
  }
  toast.success('Solicitud enviada. El supervisor debe aprobarla antes de que pase a Pedidos.');
}
```

Also add `setSelectedPreventiveType('');` to the reset block, and `setRequestType('checklist');`.

- [ ] **Step 9: Update render switch to use step keys**

Find the main render section (where it switches on `currentStep` to render different step content). Replace the switch with:

```typescript
const renderCurrentStep = () => {
  switch (currentStepKey) {
    case 'equipment':
      return renderStep0Equipment();
    case 'type':
      return renderStep1Type();
    case 'items':
      return renderStep2Items();
    case 'supervisor':
      return renderStep3Supervisor();
    case 'confirm':
      return renderStepConfirm();
    default:
      return null;
  }
};
```

Update the JSX to use `{renderCurrentStep()}` instead of the old conditional/switch.

- [ ] **Step 10: Update stepper sidebar references**

In the stepper sidebar (left panel), where it currently maps `steps` — ensure it uses the dynamic `steps` array (which already switches based on `requestType`). The `steps.map((step, index) => ...)` pattern should work as-is since `steps` is now reactive.

- [ ] **Step 11: Fix `currentStep` bounds check**

In any `handleNext` / `handleBack` navigation, ensure `currentStep` doesn't exceed `steps.length - 1`. The existing navigation likely already uses `steps.length`, but verify and fix if it uses hardcoded `4`.

- [ ] **Step 12: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 6: Labels, Filters, and Source Display

**Files:**

- Modify: `src/features/Mantenimiento/PedidosMantenimiento/Confirmados/columns.tsx` (lines ~23-31)
- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/tableColumns.tsx` (lines ~33-36)
- Modify: `src/features/Mantenimiento/MaintenanceOrders/components/OrderDetailDialog.tsx` (line ~1001)
- Modify: `src/features/Equipos/EquipoID/components/equipment-order-detail-dialog.tsx` (line ~593)

- [ ] **Step 1: Update `SOURCE_LABELS` and `SOURCE_ICONS` in Confirmados columns**

In `PedidosMantenimiento/Confirmados/columns.tsx`:

```typescript
// OLD (lines 23-31):
export const SOURCE_LABELS: Record<string, string> = {
  checklist: 'Checklist',
  manual: 'Manual',
};

export const SOURCE_ICONS: Record<string, LucideIcon> = {
  checklist: ClipboardList,
  manual: Wrench,
};

// NEW:
export const SOURCE_LABELS: Record<string, string> = {
  checklist: 'Checklist',
  manual: 'Manual',
  preventive: 'Preventivo',
};

export const SOURCE_ICONS: Record<string, LucideIcon> = {
  checklist: ClipboardList,
  manual: Wrench,
  preventive: Shield,
};
```

Add `Shield` to the lucide-react imports.

- [ ] **Step 2: Update `SOURCE_LABELS` in SolicitudesMantenimiento tableColumns**

In `SolicitudesMantenimiento/tableColumns.tsx`:

```typescript
// OLD (lines 33-36):
export const SOURCE_LABELS: Record<string, string> = {
  checklist: 'Checklist',
  manual: 'Manual',
};

// NEW:
export const SOURCE_LABELS: Record<string, string> = {
  checklist: 'Checklist',
  manual: 'Manual',
  preventive: 'Preventivo',
};
```

- [ ] **Step 3: Update "Origen" display in OrderDetailDialog**

In `MaintenanceOrders/components/OrderDetailDialog.tsx` line ~1001:

```typescript
// OLD:
{
  order.source === 'checklist' ? 'Checklist' : 'Manual';
}

// NEW:
{
  order.source === 'checklist' ? 'Checklist' : order.source === 'preventive' ? 'Preventivo' : 'Manual';
}
```

- [ ] **Step 4: Update "Fuente" display in equipment-order-detail-dialog**

In `equipment-order-detail-dialog.tsx` line ~593:

```typescript
// OLD:
<span className="font-medium capitalize">{order.maintenance_requests?.source || '-'}</span>

// NEW:
<span className="font-medium capitalize">
  {order.maintenance_requests?.source === 'preventive'
    ? 'Preventivo'
    : order.maintenance_requests?.source || '-'}
</span>
```

- [ ] **Step 5: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 7: Detail Dialogs — Preventive Type Display

**Files:**

- Modify: `src/features/Mantenimiento/PedidosMantenimiento/components/PedidoDetailDialog.tsx`
- Modify: `src/features/Mantenimiento/Operaciones/components/OperacionDetailDialog.tsx`
- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/components/SolicitudDetailDialog.tsx`

In each dialog, wrap the items iteration with a preventive conditional. Import the shared constants at the top of each file:

```typescript
import { PREVENTIVE_TYPES, type PreventiveType } from '@/features/Mantenimiento/shared/preventive-maintenance';
```

- [ ] **Step 1: PedidoDetailDialog.tsx**

Before the items loop (line ~137: `{order.maintenance_order_items?.map(...)`), add:

```typescript
{order.maintenance_requests?.source === 'preventive' ? (
  <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
    <h4 className="font-medium text-sm">Mantenimiento Preventivo</h4>
    <Badge variant="secondary">
      {PREVENTIVE_TYPES[order.maintenance_requests?.preventive_type as PreventiveType] ??
        order.maintenance_requests?.preventive_type}
    </Badge>
  </div>
) : (
  /* existing items loop — wrap in fragment */
)}
```

- [ ] **Step 2: OperacionDetailDialog.tsx**

Same pattern before line ~78 (`{operation.maintenance_order_items?.map(...)`):

```typescript
{operation.maintenance_requests?.source === 'preventive' ? (
  <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
    <h4 className="font-medium text-sm">Mantenimiento Preventivo</h4>
    <Badge variant="secondary">
      {PREVENTIVE_TYPES[operation.maintenance_requests?.preventive_type as PreventiveType] ??
        operation.maintenance_requests?.preventive_type}
    </Badge>
  </div>
) : (
  /* existing items loop */
)}
```

Also update the items count header (line ~73) to handle zero items gracefully for preventive.

- [ ] **Step 3: SolicitudDetailDialog.tsx**

Same pattern before line ~115 (`{request.maintenance_request_items?.map(...)`):

```typescript
{request.source === 'preventive' ? (
  <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
    <h4 className="font-medium text-sm">Mantenimiento Preventivo</h4>
    <Badge variant="secondary">
      {PREVENTIVE_TYPES[request.preventive_type as PreventiveType] ?? request.preventive_type}
    </Badge>
  </div>
) : (
  /* existing items loop */
)}
```

- [ ] **Step 4: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 8: OrderManagement — Handle Preventive Orders

**Files:**

- Modify: `src/features/Mantenimiento/OrderManagement/components/wizard/Step1Tasks.tsx`
- Modify: `src/features/Mantenimiento/OrderManagement/components/ManageOrderDialog.tsx`

- [ ] **Step 1: Pass `preventive_type` and `source` through ManageOrderDialog**

In `ManageOrderDialog.tsx`, the order data already flows to the wizard via props. Verify that `order.source` and `order.preventive_type` are accessible in the component (they come from the query in `MaintenanceOrders/actions/actionsServer.ts` which we updated in Task 4).

No code change needed if `source` and `preventive_type` are already on the `OrderManagementItem` type (since we added them to the select). Verify the type is inferred correctly.

- [ ] **Step 2: Handle empty items in Step1Tasks**

In `Step1Tasks.tsx`, add a check at the top of the render before the items loop:

```typescript
import { PREVENTIVE_TYPES, type PreventiveType } from '@/features/Mantenimiento/shared/preventive-maintenance';
```

Before the `regularItems.map(...)` loop (line ~99), add:

```typescript
{regularItems.length === 0 && order.source === 'preventive' ? (
  <Card className="border-dashed">
    <CardContent className="p-6 text-center space-y-2">
      <Wrench className="h-8 w-8 mx-auto text-muted-foreground" />
      <h4 className="font-medium">Mantenimiento Preventivo</h4>
      <Badge variant="secondary">
        {PREVENTIVE_TYPES[order.preventive_type as PreventiveType] ?? order.preventive_type}
      </Badge>
      <p className="text-sm text-muted-foreground">
        Este pedido es de mantenimiento preventivo. Puede agregar ítems manualmente si es necesario.
      </p>
    </CardContent>
  </Card>
) : (
  /* existing regularItems.map(...) */
)}
```

Add `Wrench` to lucide-react imports.

- [ ] **Step 3: Verify**

```bash
npm run check-types
```

Expected: PASS

---

## Task 9: Final Verification

- [ ] **Step 1: Run full check-types**

```bash
npm run check-types
```

Expected: PASS with 0 errors

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: PASS (or only pre-existing warnings)

- [ ] **Step 3: Run format**

```bash
npm run format
```

- [ ] **Step 4: Manual browser test**

Navigate to `http://localhost:3000/dashboard/maintenance?tab=nuevo_pedido` and verify:

1. Step 0: Select equipment — works as before
2. Step 1: Two cards at top (Checklist / Mant. Preventivo)
3. Click "Checklist" → template list appears (existing behavior)
4. Click "Mant. Preventivo" → 4 cards appear (Flota Liviana, Flota Pesada, Verano, Invierno)
5. Stepper changes: checklist shows 5 steps, preventive shows 4 steps
6. Select a preventive type → advance to Supervisor step (items step skipped)
7. Complete the wizard → pedido created
8. Check the pedido in "Pedidos de Mantenimiento" → shows "Preventivo" badge
9. Check the order detail → shows preventive type instead of items

- [ ] **Step 5: Verify existing checklist flow unchanged**

Repeat the full wizard with "Checklist" selected — all 5 steps, items selection, confirmation. Everything works as before.
