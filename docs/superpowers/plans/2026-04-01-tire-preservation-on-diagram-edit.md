# Tire Preservation on Diagram Edit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve mounted tires when editing a vehicle's tire diagram, and prompt the user to choose a destination for tires on removed positions.

**Architecture:** Refactor both `createVehicleCustomTemplate` and `updateVehicleCustomAxles` to share a tire-preserving position rebuild. Add a `DisplacedTiresDialog` component that intercepts saves when tires would be orphaned. Thread position data from the parent into the editor.

**Tech Stack:** Prisma transactions, React state, shadcn AlertDialog + RadioGroup, existing `calculatePositions` utility.

---

## File Map

| File                                                                                      | Role                                         | Action                                                                           |
| ----------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/features/Equipos/EquipoID/components/vehicle-tires/actions.server.ts`                | Server actions for create/update template    | Modify — add `displacedTireActions` param, unify preservation logic              |
| `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-axle-editor.tsx`          | Sheet editor for axle configuration          | Modify — add `currentPositions` prop, displacement detection, dialog integration |
| `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tire-diagram-section.tsx` | Parent that renders diagram + opens editor   | Modify — pass `currentPositions` to editor                                       |
| `src/features/Equipos/EquipoID/components/vehicle-tires/DisplacedTiresDialog.tsx`         | Dialog for displaced tire destination choice | **Create**                                                                       |

---

### Task 1: Refactor server actions — unified tire preservation

**Files:**

- Modify: `src/features/Equipos/EquipoID/components/vehicle-tires/actions.server.ts`

- [ ] **Step 1: Add the `DisplacedTireAction` type and shared helper**

At the top of the file (after `AxleInput` type), add:

```ts
export type DisplacedTireAction = {
  tireId: string;
  destination: 'AVAILABLE' | 'REPAIR' | 'DISCARD';
};
```

Then add a shared helper function that both `createVehicleCustomTemplate` and `updateVehicleCustomAxles` will call inside their transactions:

```ts
/**
 * Rebuilds vehicle tire positions preserving mounted tires.
 * Tires on surviving positions (same position_number) are re-linked.
 * Displaced tires (position removed) get the status from displacedTireActions.
 */
async function rebuildPositionsPreservingTires(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  vehicleId: string,
  templateId: string,
  newAxles: AxleInput[],
  displacedTireActions: DisplacedTireAction[]
) {
  // 1. Read current positions with tire assignments
  const oldPositions = await tx.vehicle_tire_positions.findMany({
    where: { vehicle_id: vehicleId },
    select: { position_number: true, tire_id: true },
  });

  const tireByPosition = new Map<number, string>();
  for (const pos of oldPositions) {
    if (pos.tire_id) {
      tireByPosition.set(pos.position_number, pos.tire_id);
    }
  }

  // 2. Delete old positions
  await tx.vehicle_tire_positions.deleteMany({
    where: { vehicle_id: vehicleId },
  });

  // 3. Fetch new axle records to get their IDs
  const newAxleRecords = await tx.tire_template_axles.findMany({
    where: { template_id: templateId },
    orderBy: { axle_number: 'asc' },
  });

  const diagramAxles: DiagramAxle[] = newAxleRecords.map((a) => ({
    id: a.id,
    axle_number: a.axle_number,
    tires_per_side: a.tires_per_side,
    tire_size: a.tire_size,
    is_drive_axle: a.is_drive_axle,
    is_spare: a.is_spare,
  }));

  const computedPositions = calculatePositions(diagramAxles);
  const axleIdByNumber = new Map(newAxleRecords.map((a) => [a.axle_number, a.id]));

  // 4. Determine which positions survive and which tires are displaced
  const newPositionNumbers = new Set(computedPositions.map((p) => p.position_number));
  const survivingTireIds = new Set<string>();

  // 5. Insert new positions, preserving tire assignments where possible
  if (computedPositions.length > 0) {
    await tx.vehicle_tire_positions.createMany({
      data: computedPositions.map((pos) => {
        const preservedTireId = tireByPosition.get(pos.position_number) ?? null;
        if (preservedTireId) survivingTireIds.add(preservedTireId);
        return {
          vehicle_id: vehicleId,
          template_axle_id: axleIdByNumber.get(pos.axle_number)!,
          position_number: pos.position_number,
          axle_number: pos.axle_number,
          side: pos.side,
          tire_id: preservedTireId,
        };
      }),
    });
  }

  // 6. Handle displaced tires (old tire_id not in any new position)
  const displacedMap = new Map(displacedTireActions.map((a) => [a.tireId, a.destination]));

  for (const [_posNum, tireId] of tireByPosition) {
    if (survivingTireIds.has(tireId)) continue; // tire survived — skip

    const destination = displacedMap.get(tireId) ?? 'AVAILABLE'; // fallback safety

    if (destination === 'AVAILABLE') {
      await tx.tires.update({ where: { id: tireId }, data: { status: 'AVAILABLE' } });
    } else if (destination === 'REPAIR') {
      await tx.tires.update({ where: { id: tireId }, data: { status: 'IN_REPAIR' } });
    } else if (destination === 'DISCARD') {
      await tx.tires.update({
        where: { id: tireId },
        data: { status: 'DISCARDED', discarded_at: new Date() },
      });
    }
  }
}
```

- [ ] **Step 2: Refactor `createVehicleCustomTemplate` to use the helper**

Replace the position-handling section (from "Save old positions..." through position creation) with a call to `rebuildPositionsPreservingTires`. The function signature adds `displacedTireActions`:

```ts
export async function createVehicleCustomTemplate(
  vehicleId: string,
  axles: AxleInput[],
  displacedTireActions: DisplacedTireAction[] = []
) {
  // ... existing validation and template creation ...
  // ... existing axle insertion (tire_template_axles.createMany) ...
  // ... existing vehicle update (tire_template_id) ...

  // Replace the entire position handling block with:
  await rebuildPositionsPreservingTires(tx, vehicleId, template.id, axles, displacedTireActions);

  // ... existing logger.info and return ...
}
```

Key: remove the old code that built `tireByPosition`, deleted positions, fetched new axles, and created positions with `tire_id: null`. That is now inside the helper.

- [ ] **Step 3: Refactor `updateVehicleCustomAxles` to use the helper**

Replace the entire body inside the transaction (after template validation) with:

```ts
export async function updateVehicleCustomAxles(
  vehicleId: string,
  axles: AxleInput[],
  displacedTireActions: DisplacedTireAction[] = []
) {
  // ... existing validation (findUnique, check is_vehicle_override) ...

  const templateId = vehicle.tire_template_id!;

  // Delete old axles (new ones will be inserted before position rebuild)
  await tx.tire_template_axles.deleteMany({ where: { template_id: templateId } });

  // Insert new axles
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

  // Rebuild positions preserving tires
  await rebuildPositionsPreservingTires(tx, vehicleId, templateId, axles, displacedTireActions);

  // ... existing logger.info and return ...
}
```

Key: remove the old code that set all tires to `AVAILABLE`, deleted positions, deleted axles, re-inserted axles, and created positions with `tire_id: null`.

- [ ] **Step 4: Verify types compile**

Run: `npm run check-types 2>&1 | grep -E "actions.server|vehicle-tires"`
Expected: No errors in these files.

- [ ] **Step 5: Commit**

```
feat(tire-management): unified tire preservation in template create/update
```

---

### Task 2: Create DisplacedTiresDialog component

**Files:**

- Create: `src/features/Equipos/EquipoID/components/vehicle-tires/DisplacedTiresDialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { DisplacedTireAction } from './actions.server';

export interface DisplacedTireInfo {
  tireId: string;
  serial: string;
  brand: string | null;
  positionNumber: number;
}

interface DisplacedTiresDialogProps {
  open: boolean;
  tires: DisplacedTireInfo[];
  onConfirm: (actions: DisplacedTireAction[]) => void;
  onCancel: () => void;
}

type Destination = 'AVAILABLE' | 'REPAIR' | 'DISCARD';

const DESTINATION_LABELS: Record<Destination, string> = {
  AVAILABLE: 'Disponible',
  REPAIR: 'Reparación',
  DISCARD: 'Descarte',
};

export function DisplacedTiresDialog({ open, tires, onConfirm, onCancel }: DisplacedTiresDialogProps) {
  const [destinations, setDestinations] = useState<Record<string, Destination>>({});

  const allSelected = tires.every((t) => destinations[t.tireId]);

  const handleConfirm = () => {
    const actions: DisplacedTireAction[] = tires.map((t) => ({
      tireId: t.tireId,
      destination: destinations[t.tireId],
    }));
    onConfirm(actions);
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Cubiertas en posiciones eliminadas
          </AlertDialogTitle>
          <AlertDialogDescription>
            Al modificar el diagrama,{' '}
            {tires.length === 1 ? 'una cubierta quedará' : `${tires.length} cubiertas quedarán`} sin posición.
            Seleccione qué hacer con cada una.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className={tires.length > 3 ? 'h-[300px]' : ''}>
          <div className="space-y-4 py-2">
            {tires.map((tire) => (
              <div key={tire.tireId} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-medium text-sm">{tire.serial}</span>
                    {tire.brand && <span className="text-xs text-muted-foreground ml-2">{tire.brand}</span>}
                  </div>
                  <Badge variant="outline">Posición {tire.positionNumber}</Badge>
                </div>
                <RadioGroup
                  value={destinations[tire.tireId] ?? ''}
                  onValueChange={(v) => setDestinations((prev) => ({ ...prev, [tire.tireId]: v as Destination }))}
                  className="flex gap-4"
                >
                  {(['AVAILABLE', 'REPAIR', 'DISCARD'] as Destination[]).map((dest) => (
                    <div key={dest} className="flex items-center space-x-2">
                      <RadioGroupItem value={dest} id={`${tire.tireId}-${dest}`} />
                      <Label htmlFor={`${tire.tireId}-${dest}`} className="text-sm cursor-pointer">
                        {DESTINATION_LABELS[dest]}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={!allSelected}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run check-types 2>&1 | grep "DisplacedTiresDialog"`
Expected: No errors.

- [ ] **Step 3: Commit**

```
feat(tire-management): add DisplacedTiresDialog component
```

---

### Task 3: Wire displacement detection into VehicleAxleEditor

**Files:**

- Modify: `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-axle-editor.tsx`

- [ ] **Step 1: Add `currentPositions` prop and imports**

Add a new prop type and import the dialog + `calculatePositions`:

```ts
import { calculatePositions, type DiagramAxle } from '@/features/Mantenimiento/Gomeria/shared/tire-diagram-utils';
import { DisplacedTiresDialog, type DisplacedTireInfo } from './DisplacedTiresDialog';
import type { AxleInput, DisplacedTireAction } from './actions.server';

export interface TirePositionSummary {
  position_number: number;
  tire_id: string | null;
  tire_serial?: string;
  tire_brand?: string;
}

interface VehicleAxleEditorProps {
  vehicleId: string;
  currentAxles: AxleInput[];
  currentPositions: TirePositionSummary[]; // NEW
  isNewConfig: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}
```

- [ ] **Step 2: Add displacement detection and dialog state**

Inside the component, after the existing state declarations, add:

```ts
const [displacedTires, setDisplacedTires] = useState<DisplacedTireInfo[]>([]);
const [showDisplacedDialog, setShowDisplacedDialog] = useState(false);
```

- [ ] **Step 3: Refactor `handleSave` to detect displaced tires**

Replace the existing `handleSave` with logic that checks for displaced tires before saving:

```ts
function computeDisplacedTires(): DisplacedTireInfo[] {
  // Build DiagramAxle[] from currentAxles to compute old position numbers
  const oldDiagramAxles: DiagramAxle[] = currentAxles.map((a, i) => ({
    id: `old-${i}`,
    axle_number: a.axle_number,
    tires_per_side: a.tires_per_side,
    tire_size: a.tire_size,
    is_drive_axle: a.is_drive_axle,
    is_spare: a.is_spare,
  }));

  const newDiagramAxles: DiagramAxle[] = axles.map((a, i) => ({
    id: `new-${i}`,
    axle_number: a.axle_number,
    tires_per_side: a.tires_per_side,
    tire_size: a.tire_size,
    is_drive_axle: a.is_drive_axle,
    is_spare: a.is_spare,
  }));

  const newPositions = calculatePositions(newDiagramAxles);
  const newPositionNumbers = new Set(newPositions.map((p) => p.position_number));

  // Find tires on positions that won't exist in the new layout
  return currentPositions
    .filter((p) => p.tire_id && !newPositionNumbers.has(p.position_number))
    .map((p) => ({
      tireId: p.tire_id!,
      serial: p.tire_serial ?? 'Sin serial',
      brand: p.tire_brand ?? null,
      positionNumber: p.position_number,
    }));
}

async function handleSave(displacedTireActions: DisplacedTireAction[] = []) {
  const error = validate();
  if (error) {
    toast.error(error);
    return;
  }

  setIsSaving(true);
  try {
    const payload = axles.map(fromPlantillasAxle);

    if (isNewConfig) {
      await createVehicleCustomTemplate(vehicleId, payload, displacedTireActions);
      toast.success('Configuración creada correctamente');
    } else {
      await updateVehicleCustomAxles(vehicleId, payload, displacedTireActions);
      toast.success('Configuración actualizada correctamente');
    }

    onSave();
    onOpenChange(false);
  } catch (err) {
    toast.error(isNewConfig ? 'Error al crear la configuración' : 'Error al actualizar la configuración');
  } finally {
    setIsSaving(false);
  }
}

function handleSaveClick() {
  const displaced = computeDisplacedTires();
  if (displaced.length > 0) {
    setDisplacedTires(displaced);
    setShowDisplacedDialog(true);
  } else {
    void handleSave();
  }
}
```

- [ ] **Step 4: Update the save button to use `handleSaveClick`**

Change the Button's `onClick` from `() => void handleSave()` to `handleSaveClick`.

- [ ] **Step 5: Render the DisplacedTiresDialog**

Add after the `</Sheet>` closing tag (or inside the Sheet, after SheetFooter):

```tsx
<DisplacedTiresDialog
  open={showDisplacedDialog}
  tires={displacedTires}
  onConfirm={(actions) => {
    setShowDisplacedDialog(false);
    void handleSave(actions);
  }}
  onCancel={() => setShowDisplacedDialog(false)}
/>
```

- [ ] **Step 6: Verify types compile**

Run: `npm run check-types 2>&1 | grep -E "vehicle-axle-editor|DisplacedTires"`
Expected: No errors.

- [ ] **Step 7: Commit**

```
feat(tire-management): wire displacement detection into VehicleAxleEditor
```

---

### Task 4: Pass currentPositions from parent to editor

**Files:**

- Modify: `src/features/Equipos/EquipoID/components/vehicle-tires/vehicle-tire-diagram-section.tsx`

- [ ] **Step 1: Build `currentPositions` array from existing `positions` query**

After the existing `currentAxles` derivation (around line 127), add:

```ts
import type { TirePositionSummary } from './vehicle-axle-editor';

// ... existing code ...

const currentPositionsForEditor: TirePositionSummary[] = (positions ?? []).map((p) => ({
  position_number: p.position_number,
  tire_id: p.tire_id,
  tire_serial: p.tire?.serial_number,
  tire_brand: p.tire?.brand?.name,
}));
```

- [ ] **Step 2: Pass the prop to VehicleAxleEditor**

Update the `<VehicleAxleEditor>` JSX to include the new prop:

```tsx
<VehicleAxleEditor
  vehicleId={vehicleId}
  currentAxles={currentAxles}
  currentPositions={currentPositionsForEditor}
  isNewConfig={!isCustom}
  open={editorOpen}
  onOpenChange={setEditorOpen}
  onSave={handleEditorSave}
/>
```

Also update the "no template" branch editor (around line 202) to pass empty positions:

```tsx
<VehicleAxleEditor
  vehicleId={vehicleId}
  currentAxles={[]}
  currentPositions={[]}
  isNewConfig={true}
  open={editorOpen}
  onOpenChange={setEditorOpen}
  onSave={handleEditorSave}
/>
```

- [ ] **Step 3: Verify types compile**

Run: `npm run check-types 2>&1 | grep "vehicle-tire"`
Expected: No errors.

- [ ] **Step 4: Full type check**

Run: `npm run check-types`
Expected: Only pre-existing errors (not in our files).

- [ ] **Step 5: Commit**

```
feat(tire-management): pass currentPositions to VehicleAxleEditor from parent
```

---

### Task 5: Manual integration test

- [ ] **Step 1: Test — Convert inherited to custom (no axle changes)**

Navigate to a vehicle with an inherited template that has tires. Click "Editar" → confirm the inheritance warning → the editor should show the same axles pre-populated. Click "Crear configuración" without changes. Verify:

- No `DisplacedTiresDialog` appears (all positions survive).
- The diagram shows the same tires in the same positions.
- The badge now says "Personalizada".

- [ ] **Step 2: Test — Add a new axle to custom**

Edit the custom diagram, add a new axle at the end. Save. Verify:

- No dialog appears (no positions were removed).
- The new axle appears in the diagram.
- All existing tires are still in their positions.

- [ ] **Step 3: Test — Remove an axle that has tires**

Edit the diagram and remove an axle that has at least one tire mounted. Click save. Verify:

- `DisplacedTiresDialog` appears showing the affected tires.
- Select "Disponible" for each tire and confirm.
- The diagram updates without those positions.
- Check the tire catalog to verify those tires are now `AVAILABLE`.

- [ ] **Step 4: Test — Remove an axle with no tires**

Edit the diagram and remove an axle that has no tires. Save. Verify:

- No dialog appears.
- Diagram updates correctly.

- [ ] **Step 5: Commit all verified changes**

```
test(tire-management): verify tire preservation flows manually
```
