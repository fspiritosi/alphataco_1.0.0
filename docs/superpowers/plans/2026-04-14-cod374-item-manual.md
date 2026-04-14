# COD-374 — Ítem manual en pedido y solicitud de mantenimiento

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
>
> **NO COMMITS durante la ejecución**: el usuario instruyó explícitamente que no se hagan commits intermedios. Completar todas las tasks, verificar end-to-end, y recién entonces el usuario decide cuándo/cómo commitear.
>
> **Sin tests unitarios**: el proyecto usa TypeScript strict. Verificación: `npm run check-types` tras cada task + verificación manual en browser al final.

**Goal:** Permitir al usuario agregar ítems manuales (texto libre, no del catálogo) al crear pedidos/solicitudes de mantenimiento desde los 3 contenedores existentes (wizard NuevoPedido, modal crítico, modal additional).

**Architecture:** Componente aislado `ManualItemsInput` que se enchufa en cada contenedor con 1 import + 1 JSX tag. Cada ítem manual se persiste como un `checklist_deviation` con `item_code='manual'` (convención), `section_code=null`, `is_critical=false`, `item_label=<texto libre>`. Su correspondiente `maintenance_request_item` (o `maintenance_order_item`) se crea igual que los otros. Sin migración de schema. Aislado para rollback parcial o total.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma (PostgreSQL via Supabase), shadcn/ui + Tailwind, @tanstack/react-query, lucide-react, sonner.

**Spec de referencia:** `docs/superpowers/specs/2026-04-14-cod374-item-manual-design.md`

---

## Estructura de archivos

### Se crea

| Archivo                                                             | Responsabilidad                                                                                           |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/features/Mantenimiento/shared/components/ManualItemsInput.tsx` | Card con lista de ítems manuales + textarea auto-grow + botón Agregar. Estado controlado desde el parent. |

### Se modifica

| Archivo                                                                          | Cambio                                                                                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts`   | Agregar `manualItems?` a `createOrUpdateMaintenanceRequest` y a `createManualDeviationsFromChecklist`         |
| `src/features/Mantenimiento/NuevoPedido/actions/actionsServer.ts`                | Agregar `manualItems?` a `createMaintenanceRequestPendingApproval` y a `createMaintenanceOrderFromDeviations` |
| `src/features/Mantenimiento/shared/components/CriticalDeviationsRepairModal.tsx` | Integrar `ManualItemsInput` + pasar al submit                                                                 |
| `src/features/Mantenimiento/shared/components/AdditionalDeviationModal.tsx`      | Integrar `ManualItemsInput` + relajar `submitDisabled`                                                        |
| `src/features/Mantenimiento/NuevoPedido/components/NuevoPedidoChecklistForm.tsx` | Integrar `ManualItemsInput` al final del paso 2 + pasar al submit                                             |

### NO se toca

- Schema Prisma — cero migraciones.
- `NormalizedChecklistForm.tsx`.
- `AllGoodDeviationPromptDialog.tsx`.
- `ChecklistItemPicker.tsx`.
- `CreateChecklistAnswer`.
- `page.tsx` de ninguna ruta.

---

## Task 1: Componente `ManualItemsInput`

**Files:**

- Create: `src/features/Mantenimiento/shared/components/ManualItemsInput.tsx`

- [ ] **Step 1: Crear el archivo con el componente completo**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PencilLine, Plus, X } from 'lucide-react';
import { memo, useCallback, useRef, useState } from 'react';

export type ManualItem = {
  /** ID local (no persistido, solo para React key/remove) */
  localId: string;
  label: string;
};

type ManualItemsInputProps = {
  items: ManualItem[];
  onChange: (next: ManualItem[]) => void;
  disabled?: boolean;
};

export const ManualItemsInput = memo(function ManualItemsInput({
  items,
  onChange,
  disabled = false,
}: ManualItemsInputProps) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canAdd = draft.trim().length > 0 && !disabled;

  const handleAdd = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    const newItem: ManualItem = {
      localId:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      label: trimmed,
    };
    onChange([...items, newItem]);
    setDraft('');
    // Mantener el foco para seguir agregando
    textareaRef.current?.focus();
  }, [draft, disabled, items, onChange]);

  const handleRemove = useCallback(
    (localId: string) => {
      if (disabled) return;
      onChange(items.filter((it) => it.localId !== localId));
    },
    [disabled, items, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl + Enter → agregar. Enter solo = nueva línea.
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3">
        <div className="flex items-center gap-2">
          <PencilLine className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Otros ítems (no listados en el checklist)</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 flex flex-col gap-3">
        {items.length > 0 && (
          <ul role="list" className="flex flex-col divide-y rounded-md border">
            {items.map((item) => (
              <li
                key={item.localId}
                role="listitem"
                className={cn(
                  'flex items-start gap-3 py-2.5 px-3 transition-colors',
                  !disabled && 'hover:bg-accent/30'
                )}
              >
                <PencilLine className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="flex-1 text-sm whitespace-pre-wrap break-words">{item.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(item.localId)}
                  disabled={disabled}
                  aria-label="Quitar ítem manual"
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                    'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                    'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
                    'transition-colors'
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describí el problema..."
            rows={2}
            disabled={disabled}
            aria-label="Describir ítem manual"
            className="field-sizing-content resize-none min-h-[4rem] max-h-[12rem]"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAdd}
            disabled={!canAdd}
            className="w-full sm:w-auto sm:self-end"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
```

- [ ] **Step 2: Type-check**

Run: `npm run check-types`
Expected: **PASS**.

Si falla:

- `field-sizing-content` no reconocido por Tailwind → es una utility class estándar en Tailwind 4+, pero si el proyecto usa Tailwind 3, reemplazar por omitirla (el componente seguirá funcionando, solo no habrá auto-grow). Verificar versión con `npm ls tailwindcss`.
- `PencilLine` / `Plus` / `X` no en lucide → confirmar con Grep en `node_modules/lucide-react/dist/lucide-react.d.ts`.

---

## Task 2: `createOrUpdateMaintenanceRequest` acepta `manualItems`

**Files:**

- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts`

**Contexto:** función existente en línea ~572. Actualmente crea `maintenance_request` + `maintenance_request_items` a partir de `deviations` (array de IDs de `checklist_deviations` ya creados).

- [ ] **Step 1: Agregar parámetro `manualItems` a la signature**

Ubicar la signature del input (línea 572 aprox):

```ts
export async function createOrUpdateMaintenanceRequest(input: {
  equipmentId: string;
  supervisorId: string;
  deviations: Array<{
    deviationId: string;
    comment?: string;
  }>;
  /** Requerido si se va a crear una nueva solicitud */
  checklistAnswerId?: string;
  employeeId?: string;
  userId?: string;
  kilometer?: string;
  driverEmployeeId?: string;
}): Promise<...>
```

Agregar el parámetro nuevo al final:

```ts
  driverEmployeeId?: string;
  /** Ítems manuales (texto libre, no del template) */
  manualItems?: Array<{ label: string }>;
}): Promise<...>
```

- [ ] **Step 2: Agregar la inserción de ítems manuales dentro de la transacción "nueva solicitud"**

Dentro del bloque `const newRequest = await prisma.$transaction(async (tx) => { ... })` (alrededor de línea 662 en adelante), justo **antes** del `return request;` al final de la transacción, agregar:

```ts
// Crear ítems manuales (texto libre, no del template)
if (input.manualItems && input.manualItems.length > 0) {
  const manualDevs = await Promise.all(
    input.manualItems
      .filter((m) => m.label.trim().length > 0)
      .map((m) =>
        tx.checklist_deviations.create({
          data: {
            checklist_answer_id: checklistAnswerId!,
            equipment_id: input.equipmentId,
            item_code: 'manual',
            item_label: m.label.trim(),
            section_code: null,
            is_critical: false,
            created_by_user_id: profile.id,
          },
          select: { id: true },
        })
      )
  );

  if (manualDevs.length > 0) {
    await tx.maintenance_request_items.createMany({
      data: manualDevs.map((d) => ({
        maintenance_request_id: request.id,
        checklist_deviation_id: d.id,
        repair_type_id: null,
        driver_comment: null,
        status: 'pending',
      })),
    });
  }
}
```

Dejarlo justo **antes** del `return request;`.

- [ ] **Step 3: También agregar al bloque de "actualizar solicitud existente"**

Esto es para el caso donde la solicitud ya existe (el modal se reabre). Ubicar el bloque `if (existingItems.length > 0) { ... await prisma.$transaction(async (tx) => { ... }) ... }` (alrededor de línea 606).

Dentro de esa transacción (después del `for (const deviation of input.deviations)` y antes del cierre), agregar la misma lógica de inserción de manuales. El `request.id` aquí es `requestId`. Usar el mismo bloque de código del Step 2 pero reemplazando `request.id` por `requestId` y asegurándose de que `checklistAnswerId` existe (si no, obtenerlo del primer deviation existente como ya hace la función — o saltar la inserción manual si no está disponible para no romper):

```ts
// Crear ítems manuales si se incluyeron
if (input.manualItems && input.manualItems.length > 0) {
  // Obtener checklist_answer_id del request existente
  const existingRequest = await tx.maintenance_requests.findUnique({
    where: { id: requestId },
    select: { checklist_answer_id: true },
  });

  if (existingRequest?.checklist_answer_id) {
    const manualDevs = await Promise.all(
      input.manualItems
        .filter((m) => m.label.trim().length > 0)
        .map((m) =>
          tx.checklist_deviations.create({
            data: {
              checklist_answer_id: existingRequest.checklist_answer_id!,
              equipment_id: input.equipmentId,
              item_code: 'manual',
              item_label: m.label.trim(),
              section_code: null,
              is_critical: false,
              created_by_user_id: profile.id,
            },
            select: { id: true },
          })
        )
    );

    if (manualDevs.length > 0) {
      await tx.maintenance_request_items.createMany({
        data: manualDevs.map((d) => ({
          maintenance_request_id: requestId,
          checklist_deviation_id: d.id,
          repair_type_id: null,
          driver_comment: null,
          status: 'pending',
        })),
      });
    }
  }
}
```

- [ ] **Step 4: Agregar log debug al inicio cuando hay manuales**

Justo después del `serverLogger.info('createOrUpdateMaintenanceRequest - Iniciando', ...)` inicial, agregar:

```ts
if (input.manualItems && input.manualItems.length > 0) {
  serverLogger.debug('Se incluyeron ítems manuales', {
    data: { count: input.manualItems.length },
  });
}
```

- [ ] **Step 5: Type-check**

Run: `npm run check-types`
Expected: **PASS**.

---

## Task 3: `createManualDeviationsFromChecklist` acepta `manualItems`

**Files:**

- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts`

**Contexto:** función agregada en la parte 3 (COD-374), al final del archivo. Actualmente crea `checklist_deviations` + `maintenance_request` + `maintenance_request_items` a partir de `items` (array seleccionado del template).

- [ ] **Step 1: Agregar parámetro `manualItems` a la signature**

Ubicar la signature de `createManualDeviationsFromChecklist(input: { ... })` al final del archivo. Agregar al final del input type:

```ts
  items: Array<{
    templateItemId: string;
    itemCode: string;
    itemLabel: string;
    sectionCode: string;
    isCritical: boolean;
    comment?: string;
  }>;
  /** Ítems manuales (texto libre, no del template) */
  manualItems?: Array<{ label: string }>;
}): Promise<...>
```

- [ ] **Step 2: Relajar la validación inicial**

Ubicar el bloque:

```ts
if (input.items.length === 0) {
  return { ok: false, error: 'Debe seleccionar al menos un ítem' };
}
```

Reemplazarlo por:

```ts
const manualCount = (input.manualItems ?? []).filter((m) => m.label.trim().length > 0).length;
if (input.items.length === 0 && manualCount === 0) {
  return { ok: false, error: 'Debe agregar al menos un ítem' };
}
```

Así se permite enviar solo ítems manuales (sin elegir ninguno del template).

- [ ] **Step 3: Agregar inserción dentro de la transacción**

Ubicar el bloque `await prisma.$transaction(async (tx) => { ... })`. Dentro, justo **antes** del `return { requestId: request.id, deviationIds };` al final, agregar:

```ts
// Crear ítems manuales (texto libre, no del template)
if (input.manualItems && input.manualItems.length > 0) {
  const manualDevs = await Promise.all(
    input.manualItems
      .filter((m) => m.label.trim().length > 0)
      .map((m) =>
        tx.checklist_deviations.create({
          data: {
            checklist_answer_id: input.checklistAnswerId,
            equipment_id: input.equipmentId,
            item_code: 'manual',
            item_label: m.label.trim(),
            section_code: null,
            is_critical: false,
            created_by_user_id: profile.id,
          },
          select: { id: true },
        })
      )
  );

  if (manualDevs.length > 0) {
    await tx.maintenance_request_items.createMany({
      data: manualDevs.map((d) => ({
        maintenance_request_id: request.id,
        checklist_deviation_id: d.id,
        repair_type_id: null,
        driver_comment: null,
        status: 'pending',
      })),
    });
    deviationIds.push(...manualDevs.map((d) => d.id));
  }
}
```

**Nota**: `deviationIds` ya existe en el scope (se declaró antes con los IDs de los deviations del template). Se agregan los manuales para que el return final los incluya.

- [ ] **Step 4: Log debug**

Justo después del `serverLogger.info('createManualDeviationsFromChecklist - Iniciando', ...)`, agregar:

```ts
if (input.manualItems && input.manualItems.length > 0) {
  serverLogger.debug('Se incluyeron ítems manuales', {
    data: { count: input.manualItems.length },
  });
}
```

- [ ] **Step 5: Type-check**

Run: `npm run check-types`
Expected: **PASS**.

---

## Task 4: `createMaintenanceRequestPendingApproval` y `createMaintenanceOrderFromDeviations` aceptan `manualItems`

**Files:**

- Modify: `src/features/Mantenimiento/NuevoPedido/actions/actionsServer.ts`

**Contexto:** dos funciones del wizard NuevoPedido.

- `createMaintenanceOrderFromDeviations` (línea ~284): crea `maintenance_request` + `maintenance_request_items` + `maintenance_order` + `maintenance_order_items`. Desvíos son "huérfanos" de checklist (`checklist_answer_id = null`).
- `createMaintenanceRequestPendingApproval` (línea ~582): solo crea hasta `maintenance_request` + `maintenance_request_items` (sin orden). También `checklist_answer_id = null`.

Ambas usan el tipo `CreateDeviationFromNuevoPedido` (línea ~262) para los ítems del template.

- [ ] **Step 1: Leer completo cada función para ver dónde están las inserts**

Run: `Read` sobre el archivo en los rangos:

- 284-500 (para `createMaintenanceOrderFromDeviations`)
- 582-800 (para `createMaintenanceRequestPendingApproval`)

Identificar:

- La transacción Prisma de cada función.
- Dónde se insertan los `checklist_deviations`.
- Dónde se insertan los `maintenance_request_items`.
- Dónde se insertan los `maintenance_order_items` (solo en la primera).

Anotar los números de línea exactos antes de editar.

- [ ] **Step 2: Agregar `manualItems` a la signature de `createMaintenanceOrderFromDeviations`**

Al final del input type (línea ~293 actual):

```ts
  driverEmployeeId?: string;
  /** Ítems manuales (texto libre, no del template) */
  manualItems?: Array<{ label: string }>;
}) {
```

- [ ] **Step 3: Insertar ítems manuales en la transacción de `createMaintenanceOrderFromDeviations`**

Dentro de la transacción, ubicar el punto **después** de que se insertaron los `checklist_deviations`, `maintenance_request_items` Y `maintenance_order_items` de los ítems del template, pero **antes** del return de la transacción. Agregar:

```ts
// Crear ítems manuales (texto libre, no del template)
if (input.manualItems && input.manualItems.length > 0) {
  const manualDevs = await Promise.all(
    input.manualItems
      .filter((m) => m.label.trim().length > 0)
      .map((m) =>
        tx.checklist_deviations.create({
          data: {
            checklist_answer_id: null,
            equipment_id: input.equipmentId,
            item_code: 'manual',
            item_label: m.label.trim(),
            section_code: null,
            is_critical: false,
            created_by_user_id: profile.id,
          },
          select: { id: true },
        })
      )
  );

  if (manualDevs.length > 0) {
    // 1. Crear maintenance_request_items para los manuales (Promise.all para obtener IDs)
    const manualRequestItems = await Promise.all(
      manualDevs.map((d) =>
        tx.maintenance_request_items.create({
          data: {
            maintenance_request_id: request.id,
            checklist_deviation_id: d.id,
            repair_type_id: null,
            driver_comment: null,
            status: 'pending',
          },
          select: { id: true },
        })
      )
    );

    // 2. Crear maintenance_order_items vinculados a los request_items manuales
    await tx.maintenance_order_items.createMany({
      data: manualRequestItems.map((ri) => ({
        maintenance_order_id: order.id,
        maintenance_request_item_id: ri.id,
        description: null,
        repair_type_id: null,
        status: 'pending',
      })),
    });
  }
}
```

**IMPORTANTE**: los nombres exactos de variables (`request.id`, `order.id`) dependen del código existente en esta función. Si los nombres son distintos (ej: `newRequest.id`, `newOrder.id`), ajustarlos antes de guardar. Verificarlos en el Step 1.

**También**: el shape de `maintenance_order_items.createMany` depende de las columnas reales. Si el Prisma schema tiene columnas distintas o requeridas adicionales (por ej. `order_index`), ajustarlo. Verificar con Grep `model maintenance_order_items` en `prisma/schema.prisma`.

- [ ] **Step 4: Agregar `manualItems` a la signature de `createMaintenanceRequestPendingApproval`**

Al final del input type (línea ~591 actual):

```ts
  driverEmployeeId?: string;
  /** Ítems manuales (texto libre, no del template) */
  manualItems?: Array<{ label: string }>;
}) {
```

- [ ] **Step 5: Insertar ítems manuales en la transacción de `createMaintenanceRequestPendingApproval`**

Similar al Step 3 pero sin `maintenance_order_items` (esta función no crea orden). Dentro de la transacción, antes del return:

```ts
// Crear ítems manuales (texto libre, no del template)
if (input.manualItems && input.manualItems.length > 0) {
  const manualDevs = await Promise.all(
    input.manualItems
      .filter((m) => m.label.trim().length > 0)
      .map((m) =>
        tx.checklist_deviations.create({
          data: {
            checklist_answer_id: null,
            equipment_id: input.equipmentId,
            item_code: 'manual',
            item_label: m.label.trim(),
            section_code: null,
            is_critical: false,
            created_by_user_id: profile.id,
          },
          select: { id: true },
        })
      )
  );

  if (manualDevs.length > 0) {
    await tx.maintenance_request_items.createMany({
      data: manualDevs.map((d) => ({
        maintenance_request_id: request.id,
        checklist_deviation_id: d.id,
        repair_type_id: null,
        driver_comment: null,
        status: 'pending',
      })),
    });
  }
}
```

- [ ] **Step 6: Log debug en ambas**

Al inicio de cada función (después del `serverLogger.info(...)` existente):

```ts
if (input.manualItems && input.manualItems.length > 0) {
  serverLogger.debug('Se incluyeron ítems manuales', {
    data: { count: input.manualItems.length },
  });
}
```

- [ ] **Step 7: Type-check**

Run: `npm run check-types`
Expected: **PASS**.

---

## Task 5: Integrar `ManualItemsInput` en `AdditionalDeviationModal`

**Files:**

- Modify: `src/features/Mantenimiento/shared/components/AdditionalDeviationModal.tsx`

- [ ] **Step 1: Agregar imports**

Agregar al top del archivo:

```tsx
import { ManualItemsInput, type ManualItem } from './ManualItemsInput';
```

- [ ] **Step 2: Agregar estado para ítems manuales**

Cerca de donde viven los otros `useState` (después de `selectedItems`):

```tsx
const [manualItems, setManualItems] = useState<ManualItem[]>([]);
```

- [ ] **Step 3: Reset en el `useEffect` de apertura**

Ubicar el `useEffect` existente que resetea estados cuando `isOpen: true`. Agregar:

```tsx
useEffect(() => {
  if (isOpen) {
    setSelectedSupervisorId('');
    setSelectedItems([]);
    setManualItems([]); // <-- nuevo
    setIsSubmitting(false);
    submitSuccessRef.current = false;
    explicitCloseRef.current = false;
  }
}, [isOpen]);
```

- [ ] **Step 4: Relajar `submitDisabled` para aceptar solo manuales**

Ubicar el `submitDisabled`:

```tsx
const submitDisabled = isSubmitting || !selectedSupervisorId || selectedItems.length === 0;
```

Reemplazar por:

```tsx
const submitDisabled =
  isSubmitting || !selectedSupervisorId || (selectedItems.length === 0 && manualItems.length === 0);
```

- [ ] **Step 5: Actualizar el `submitLabel` para reflejar el total**

Ubicar `submitLabel`:

```tsx
const submitLabel =
  selectedItems.length === 0
    ? 'Registrar desvíos'
    : `Registrar ${selectedItems.length} desvío${selectedItems.length > 1 ? 's' : ''}`;
```

Reemplazar por:

```tsx
const totalItems = selectedItems.length + manualItems.length;
const submitLabel =
  totalItems === 0 ? 'Registrar desvíos' : `Registrar ${totalItems} desvío${totalItems > 1 ? 's' : ''}`;
```

- [ ] **Step 6: Pasar `manualItems` al server action en `handleSubmit`**

Ubicar la llamada a `createManualDeviationsFromChecklist`. Agregar al payload:

```tsx
const result = await createManualDeviationsFromChecklist({
  checklistAnswerId,
  equipmentId,
  supervisorId: selectedSupervisorId,
  driverEmployeeId,
  employeeId,
  userId,
  kilometer,
  items: selectedItems.map((s) => ({ ... })),
  manualItems: manualItems.map((m) => ({ label: m.label })), // <-- nuevo
});
```

Limpiar `manualItems` junto con los otros resets tras success:

```tsx
submitSuccessRef.current = true;
explicitCloseRef.current = true;
setSelectedSupervisorId('');
setSelectedItems([]);
setManualItems([]); // <-- nuevo
setIsSubmitting(false);
onSuccess();
```

Actualizar la descripción del toast de éxito para contar el total:

```tsx
toast.success('Solicitud de mantenimiento creada', {
  description: `Se registraron ${totalItems} desvío(s) para revisión del supervisor.`,
});
```

- [ ] **Step 7: Renderizar `<ManualItemsInput />` en el JSX**

Ubicar el `<ChecklistItemPicker ... />` dentro del body scrollable. Agregar el nuevo componente **debajo** (después de cerrar el tag del picker):

```tsx
<ChecklistItemPicker
  sections={sections}
  selectedItems={selectedItems}
  onChange={setSelectedItems}
  disabled={isSubmitting}
/>
<ManualItemsInput
  items={manualItems}
  onChange={setManualItems}
  disabled={isSubmitting}
/>
```

- [ ] **Step 8: Type-check**

Run: `npm run check-types`
Expected: **PASS**.

---

## Task 6: Integrar `ManualItemsInput` en `CriticalDeviationsRepairModal`

**Files:**

- Modify: `src/features/Mantenimiento/shared/components/critical-deviations-repair-modal.tsx`

- [ ] **Step 1: Agregar imports**

```tsx
import { ManualItemsInput, type ManualItem } from './ManualItemsInput';
```

- [ ] **Step 2: Agregar estado + reset**

Cerca de `deviationComments` y `showCommentField`:

```tsx
const [manualItems, setManualItems] = useState<ManualItem[]>([]);
```

En el `useEffect` que corre al abrir el modal:

```tsx
useEffect(() => {
  if (isOpen) {
    setSelectedSupervisorId('');
    setDeviationComments({});
    setShowCommentField({});
    setManualItems([]); // <-- nuevo
    setIsSubmitting(false);
    submitSuccessRef.current = false;
  }
}, [isOpen]);
```

- [ ] **Step 3: Pasar `manualItems` al server action en `handleSubmit`**

Ubicar la llamada a `createOrUpdateMaintenanceRequest`. Agregar al payload:

```tsx
const result = await createOrUpdateMaintenanceRequest({
  equipmentId,
  supervisorId: selectedSupervisorId,
  deviations: deviationsWithComments,
  checklistAnswerId,
  employeeId,
  userId,
  kilometer,
  driverEmployeeId,
  manualItems: manualItems.map((m) => ({ label: m.label })), // <-- nuevo
});
```

Agregar `setManualItems([])` al bloque de resets post-success:

```tsx
setSelectedSupervisorId('');
setDeviationComments({});
setManualItems([]); // <-- nuevo
setIsSubmitting(false);
```

Actualizar la descripción del toast con el total:

```tsx
const totalDeviations = deviations.length + manualItems.length;
toast.success(message, {
  description: `Se registraron ${totalDeviations} desvío(s) para revisión del supervisor.`,
});
```

- [ ] **Step 4: Renderizar `<ManualItemsInput />` en el JSX**

Ubicar el final del listado de desvíos (después de que se renderizan `criticalDeviations` y `nonCriticalDeviations`). Agregar el componente **justo después** del último grupo de desvíos, dentro del mismo scroll container. Si no está claro, buscar el componente `<Separator />` que suele dividir secciones y agregarlo después.

```tsx
{
  /* Listado de desvíos ya renderizado arriba... */
}
<ManualItemsInput items={manualItems} onChange={setManualItems} disabled={isSubmitting} />;
```

El punto exacto de inserción puede variar según el layout del modal; probar distintas ubicaciones y confirmar que visualmente quede coherente (después de todos los desvíos y antes del selector de supervisor, o después del selector — evaluar cuál queda mejor).

- [ ] **Step 5: Type-check**

Run: `npm run check-types`
Expected: **PASS**.

---

## Task 7: Integrar `ManualItemsInput` en `NuevoPedidoChecklistForm` (wizard)

**Files:**

- Modify: `src/features/Mantenimiento/NuevoPedido/components/NuevoPedidoChecklistForm.tsx`

**Contexto:** el wizard tiene un paso 2 (`renderStep2Items`, líneas ~679–760) donde el usuario elige ítems del template. Este wizard llama a `createMaintenanceRequestPendingApproval` o `createMaintenanceOrderFromDeviations` según el flujo.

- [ ] **Step 1: Leer el file para encontrar el submit handler y el paso 2**

Run: `Grep` con `pattern="createMaintenanceRequestPendingApproval|createMaintenanceOrderFromDeviations|renderStep2Items"` con `-n`. Identificar:

- Dónde está declarado el state de `selectedDeviations` (cerca del top).
- Dónde está `renderStep2Items`.
- Dónde se llaman las dos server actions.
- Dónde se resetea el state al cerrar/cambiar equipo.

- [ ] **Step 2: Agregar imports**

```tsx
import { ManualItemsInput, type ManualItem } from '@/features/Mantenimiento/shared/components/ManualItemsInput';
```

- [ ] **Step 3: Agregar estado**

Cerca de `selectedDeviations`:

```tsx
const [manualItems, setManualItems] = useState<ManualItem[]>([]);
```

- [ ] **Step 4: Relajar validación para avanzar del paso 2**

Si existe algún `canProceedToStep3` o similar que requiere `selectedDeviations.length > 0`, ajustarlo para permitir también `manualItems.length > 0`:

```tsx
const canProceedToStep3 = selectedDeviations.length > 0 || manualItems.length > 0;
```

- [ ] **Step 5: Renderizar `<ManualItemsInput />` al final de `renderStep2Items`**

Ubicar el `return (...)` de `renderStep2Items`. Al final del JSX devuelto, después de todas las Cards de secciones del template:

```tsx
{
  /* Cards de secciones del template ya renderizadas arriba... */
}
<ManualItemsInput
  items={manualItems}
  onChange={setManualItems}
  disabled={isSubmitting /* o el equivalente del wizard */}
/>;
```

Si el wizard no tiene `isSubmitting` accesible en ese scope, usar el flag equivalente (`isCreatingRequest`, `isPending`, etc.). Si ninguno, omitir el prop `disabled` — tendrá el default `false`.

- [ ] **Step 6: Pasar `manualItems` a AMBAS server actions**

Ubicar todas las llamadas a `createMaintenanceRequestPendingApproval` y `createMaintenanceOrderFromDeviations`. Agregar al payload:

```tsx
const result = await createMaintenanceRequestPendingApproval({
  equipmentId: ...,
  supervisorId: ...,
  kilometer: ...,
  engine_hours: ...,
  deviations: ...,
  driverEmployeeId: ...,
  manualItems: manualItems.map((m) => ({ label: m.label })), // <-- nuevo
});
```

Igual para `createMaintenanceOrderFromDeviations`.

- [ ] **Step 7: Reset `manualItems` cuando corresponda**

Buscar los lugares donde se resetea `setSelectedDeviations([])` (al cambiar de equipo, al cerrar el wizard, tras submit exitoso). Agregar `setManualItems([])` junto a cada uno.

- [ ] **Step 8: Type-check**

Run: `npm run check-types`
Expected: **PASS**.

---

## Task 8: Verificación manual end-to-end

- [ ] **Step 1: Arrancar dev server**

Run: `npm run dev` en background.

- [ ] **Step 2: Login**

Credenciales:

- Email: `yordanpz@hotmail.com`
- Password: `Yoselania23.`

- [ ] **Step 3: Probar flujo 1 — Modal crítico (checklist con fallos)**

1. Navegar a `/dashboard/forms/[id]/new` y responder un checklist con al menos 1 ítem en "Mal".
2. Submit → aparece `CriticalDeviationsRepairModal`.
3. Verificar que aparece la Card "Otros ítems (no listados en el checklist)".
4. Agregar 2 ítems manuales.
5. Elegir supervisor y submit.
6. **Verificar en BD**:
   ```sql
   SELECT mr.id, count(mri.id) as items_count
   FROM maintenance_requests mr
   LEFT JOIN maintenance_request_items mri ON mri.maintenance_request_id = mr.id
   WHERE mr.created_at > NOW() - INTERVAL '5 minutes'
   GROUP BY mr.id;
   ```
   Debería haber 1 request con `items_count = <desvíos detectados> + 2 (manuales)`.
7. **Verificar los deviations manuales**:
   ```sql
   SELECT id, item_code, item_label, section_code, is_critical
   FROM checklist_deviations
   WHERE item_code = 'manual'
     AND created_at > NOW() - INTERVAL '5 minutes';
   ```
   Debería haber 2 filas con `item_code='manual'`, `section_code=null`, `is_critical=false`, `item_label=<texto que escribiste>`.

- [ ] **Step 4: Probar flujo 2 — Modal additional (checklist 100% OK)**

1. Navegar a `/dashboard/forms/[id]/new` y responder un checklist sin ningún "Mal".
2. Submit → aparece el prompt → "Sí, registrar desvío".
3. En el modal: **no** elegir ningún ítem del template, **solo** agregar 3 ítems manuales.
4. Elegir supervisor y submit.
5. **Verificar en BD** que se creó un request con 3 items manuales.

- [ ] **Step 5: Probar flujo 3 — Wizard NuevoPedido**

1. Navegar a la página de NuevoPedido del wizard.
2. Completar paso 1 (equipo, km, etc.).
3. En paso 2: **no** elegir ítems del template, **solo** agregar 2 ítems manuales.
4. Submit el wizard.
5. **Verificar en BD** que se creó un request (y orden si aplica según el flujo) con 2 items manuales. Los deviations tendrán `checklist_answer_id = null`, `item_code = 'manual'`.

- [ ] **Step 6: Regresión**

1. Repetir cada flujo **sin agregar ningún ítem manual** — comportamiento debe ser idéntico al anterior a esta feature.
2. Repetir cada flujo **agregando ítems manuales Y del template** — deben persistirse ambos tipos, todos vinculados al mismo request.

- [ ] **Step 7: UX checks**

1. Auto-grow del textarea cuando se escriben varias líneas.
2. Cmd/Ctrl + Enter agrega el ítem.
3. Botón "Agregar" deshabilitado cuando el textarea está vacío o solo con espacios.
4. X remueve un ítem agregado por error.
5. Al cerrar/cancelar el modal, los manuales se descartan (no se persisten si hubo cancelación).

---

## Self-Review

**Spec coverage**:

- §3.1 componente → Task 1.
- §3.2 cambios en server actions (4 funciones) → Tasks 2, 3, 4.
- §3.3 cambios en contenedores (3) → Tasks 5, 6, 7.
- §4 UI → Task 1.
- §5 lógica de inserción → Tasks 2, 3, 4.
- §6 cambios por contenedor → Tasks 5, 6, 7.
- §7 casos edge → cubiertos en la verificación Task 8.

**Placeholder scan**: sin TBDs. Las notas de "verificar nombres de variables" y "ubicar el punto de inserción" son inspecciones obligatorias con instrucciones concretas de cómo resolver.

**Type consistency**: tipo `ManualItem` (con `localId`, `label`) se exporta desde `ManualItemsInput.tsx` y se usa en los 3 contenedores. El payload al server es siempre `Array<{ label: string }>` (sin `localId` — ese es solo para React key). Coherente en todas las tasks.

---

## Execution Handoff

Plan completo en `docs/superpowers/plans/2026-04-14-cod374-item-manual.md`.

Dos opciones:

**1. Subagent-Driven (recomendado)** — despacho un subagente fresco por task, reviso entre tasks.

**2. Inline** — ejecuto en esta sesión con checkpoints.

¿Cuál preferís?
