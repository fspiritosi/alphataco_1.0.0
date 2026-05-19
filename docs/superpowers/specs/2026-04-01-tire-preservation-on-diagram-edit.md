# Tire Preservation on Diagram Edit

## Problem

When a vehicle's tire diagram is edited (converting inherited to custom, or modifying a custom template), all mounted tires are silently lost. `updateVehicleCustomAxles` sets every tire to `AVAILABLE` unconditionally. `createVehicleCustomTemplate` preserves tires by position number but silently orphans tires on removed positions. No UI warning exists when deleting an axle that has tires.

## Requirements

1. Tires on positions that survive an edit MUST remain mounted (preserved by `position_number`).
2. Tires on positions that are removed MUST NOT be silently lost. The user MUST choose a destination: `AVAILABLE`, `REPAIR`, or `DISCARD`.
3. Converting from inherited to custom MUST produce an identical diagram with all tires in the same positions.
4. Adding a new axle MUST NOT affect existing tires on other positions.
5. Removing an axle that has tires MUST prompt the user before proceeding.

## Design

### Server-side: Unified preservation logic

Both `createVehicleCustomTemplate` and `updateVehicleCustomAxles` receive a new optional parameter:

```ts
displacedTireActions?: Array<{
  tireId: string;
  destination: 'AVAILABLE' | 'REPAIR' | 'DISCARD';
}>
```

Shared logic (applied in both functions inside the transaction):

1. Read all current `vehicle_tire_positions` with `tire_id`.
2. Build `Map<position_number, tire_id>` from old positions.
3. Delete old positions.
4. Insert new axles (create) or replace axles (update).
5. Call `calculatePositions(newAxles)` to derive new positions.
6. For each new position: if `tireByPosition.get(pos.position_number)` exists, assign that `tire_id`.
7. For displaced tires (old tire_id not matched to any new position): apply the destination from `displacedTireActions`. If destination is `AVAILABLE` set `status = 'AVAILABLE'`. If `REPAIR` set `status = 'IN_REPAIR'`. If `DISCARD` set `status = 'DISCARDED'`, `discarded_at = now()`.

### Client-side: Pre-save detection

`VehicleAxleEditor` receives a new prop: `currentPositions` — the current vehicle tire positions with tire data (position_number, tire_id, serial, brand). This data already exists in the parent component from the `getVehicleTirePositionsWithDetails` query.

Before calling the save action:

1. Compute old positions via `calculatePositions(currentAxles)`.
2. Compute new positions via `calculatePositions(editedAxles)`.
3. Find displaced tires: old positions with `tire_id` whose `position_number` does not exist in new positions.
4. If displaced tires exist: open `DisplacedTiresDialog` and wait for user input.
5. If no displaced tires: save directly.

### New component: DisplacedTiresDialog

An `AlertDialog` that shows:

- A warning message explaining that some tires will be removed from the diagram.
- A list of displaced tires, each showing: serial number, current position number, brand name.
- For each tire: a `RadioGroup` with three options matching the existing pattern in `TirePositionCard`:
  - Disponible (`AVAILABLE`)
  - Reparacion (`REPAIR`)
  - Descarte (`DISCARD`)
- A "Confirmar" button, disabled until all tires have a destination selected.
- A "Cancelar" button that closes the dialog without saving.

### Data flow

```
VehicleAxleEditor (receives currentAxles + currentPositions)
  |
  | user edits axles, clicks save
  v
calculatePositions(old) vs calculatePositions(new)
  |
  | displaced tires found?
  |--- NO ---> call server action (no displacedTireActions)
  |--- YES --> open DisplacedTiresDialog
                  |
                  | user selects destinations, confirms
                  v
               call server action (with displacedTireActions[])
```

### Files to modify

| File                                              | Change                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `vehicle-tires/actions.server.ts`                 | Add `displacedTireActions` param to both functions. Unify preservation logic.               |
| `vehicle-tires/vehicle-axle-editor.tsx`           | Add `currentPositions` prop. Pre-save displacement check. Integrate `DisplacedTiresDialog`. |
| `vehicle-tires/vehicle-tire-diagram-section.tsx`  | Pass positions data to editor as `currentPositions`.                                        |
| **New**: `vehicle-tires/DisplacedTiresDialog.tsx` | Dialog component with tire list and destination RadioGroups.                                |

### Edge cases

- **No tires mounted anywhere**: Both create and update proceed without any dialog. No displacement.
- **All positions survive** (e.g., only adding a new axle): No displaced tires. Save directly. All existing tires preserved.
- **Axle removed but had no tires**: No displaced tires for that axle. No dialog needed.
- **Changing `tires_per_side` from 1 to 2 (or vice versa)**: Position numbers are recalculated globally. Some positions may shift. Tires are matched strictly by `position_number` — if the number changes, the tire is considered displaced. This is correct behavior since the physical position layout changed.
- **Converting inherited to custom with identical axle structure**: All position numbers match 1:1. Zero displaced tires. All tires preserved seamlessly.
