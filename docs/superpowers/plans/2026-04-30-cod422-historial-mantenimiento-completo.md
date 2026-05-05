# COD-422 — Historial completo de mantenimiento — Plan de implementación

> **Para agentes ejecutores:** Este plan se implementa con `superpowers:subagent-driven-development` o `superpowers:executing-plans`. Steps usan checkbox (`- [ ]`).
>
> **Regla del usuario (override absoluto):** **NO commitear** después de cada tarea ni al final. El usuario commitea manualmente cuando lo pida explícitamente. Por eso las tareas NO incluyen pasos de `git add` / `git commit`. Si una skill cargada dice "commit your work", se ignora — esta regla del usuario tiene prioridad máxima.
>
> **Verificación**: este repo no tiene tests unitarios (solo Cypress E2E). La verificación de cada tarea es: `npm run check-types` + revisión manual con MCP `supabase-LOCAL` (readonly) cuando aplique.

**Goal:** Garantizar trazabilidad completa de toda solicitud de mantenimiento desde origen hasta cierre, cubriendo los huecos de logging actuales (paso 3 y paso 4 Taller, OperatorPanel) y montando el modal de historial en las tabs faltantes con soporte multi-OT.

**Architecture:** Helper compartido `logActivity` que centraliza inserciones en `maintenance_activity_log` (transaccional cuando aplica). Los `action_type` son strings constantes en un catálogo único. Las acciones de gestión batch (`saveOrderChanges`) se agrupan en un solo log con detalle estructurado en `metadata Json`. El modal `ActivityHistoryModal` se extiende para mostrar acordeones por OT cuando se abre desde una OM. Sin migración de schema.

**Tech Stack:** Next.js 16 / React 19 + Server Actions, Prisma (Supabase PostgreSQL), Zod, React Query, shadcn/ui, Tailwind, moment, Lucide.

**Spec asociada:** `docs/superpowers/specs/2026-04-30-cod422-historial-mantenimiento-completo-design.md`

---

## File Structure

### Archivos nuevos

| Archivo                                                                        | Responsabilidad                                                                                                                                |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/Mantenimiento/shared/activity-log/log-activity.ts`               | Helper `logActivity(client, entry)` — inserta una entrada en `maintenance_activity_log`. Acepta `Prisma.TransactionClient` o `prisma` directo. |
| `src/features/Mantenimiento/shared/activity-log/action-types.ts`               | Constantes de `action_type` (SOT). Evita typos en strings.                                                                                     |
| `src/features/Mantenimiento/components/ActivityHistory/WorkOrderAccordion.tsx` | Acordeón individual por OT dentro del modal.                                                                                                   |
| `src/features/Mantenimiento/components/ActivityHistory/GroupedActionItem.tsx`  | Item de timeline para `order_items_updated` (cabecera resumen + detalle expandible).                                                           |

### Archivos modificados

| Archivo                                                                              | Cambio                                                                                                                                                 |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/Mantenimiento/OrderManagement/actions/actionsServer.ts`                | Loguear 6 mutations + agrupado en `saveOrderChanges` + log de generación de OTs en `generateWorkOrdersForOrder` y `setupAndGenerateWorkOrders`         |
| `src/features/Mantenimiento/MaintenanceOrders/actions/actionsServer.ts`              | Loguear `workshopChiefReturnOrder`, `updateSectorExecutionOrder`, `completeExternalWorkOrder`. Refactor de los logs existentes para usar `logActivity` |
| `src/features/Mantenimiento/ApprovalInbox/actions/actionsServer.ts`                  | Loguear `approveTask`, `rejectTask`, `reassignTaskToSector`                                                                                            |
| `src/features/OperatorPanel/actions/actionsServer.ts`                                | Loguear 10 mutations (Prisma post-update, no-tx)                                                                                                       |
| `src/features/Mantenimiento/Operaciones/actions/actionsServer.ts`                    | Extender `getMaintenanceOrderFullActivityLog` con `workOrders[]`                                                                                       |
| `src/features/Mantenimiento/components/ActivityHistoryModal.tsx`                     | Soporte multi-OT (acordeones), nuevo `actionConfig` con 22 action_type, tipo `entry` extendido para incluir nuevos campos de metadata                  |
| `src/features/Mantenimiento/MaintenanceOrders/components/OrderDetailDialog.tsx`      | Botón "Ver historial" en header                                                                                                                        |
| `src/features/Mantenimiento/OrderManagement/components/ManageOrderDialog.tsx`        | Botón "Ver historial" en header del wizard                                                                                                             |
| `src/features/Mantenimiento/ApprovalInbox/components/_ValidationOrdersDataTable.tsx` | Botón "Historial" por fila                                                                                                                             |
| `src/features/Mantenimiento/ApprovalInbox/components/ApprovalInboxClient.tsx`        | Botón "Historial" en cards de tareas pending_approval/reassignment_requested (apunta a la WO padre)                                                    |

---

## Task 1 — Crear catálogo de `action_type`

**Files:**

- Create: `src/features/Mantenimiento/shared/activity-log/action-types.ts`

- [ ] **Step 1.1: Crear el archivo con todas las constantes**

```ts
/**
 * Catálogo único de action_type usados en maintenance_activity_log.
 * Toda mutation que loguea actividad DEBE usar una constante de aquí.
 */
export const ACTIVITY_LOG = {
  // ── Eventos existentes (no se modifican, se documentan) ──────────
  CREATED: 'created',
  SCHEDULED: 'scheduled',
  DATE_CONFIRMED: 'date_confirmed',
  DATE_REJECTED: 'date_rejected',
  WORKSHOP_ENTRY: 'workshop_entry',
  REJECTED: 'rejected',
  WORKSHOP_APPROVED: 'workshop_approved',
  OPERATIONS_APPROVED: 'operations_approved',
  WORKSHOP_ITEM_REJECTED: 'workshop_item_rejected',
  OPERATIONS_ITEM_REJECTED: 'operations_item_rejected',
  WORKSHOP_AGREED_OPS_REJECTION: 'workshop_agreed_ops_rejection',
  WORKSHOP_DISAGREED_OPS_REJECTION: 'workshop_disagreed_ops_rejection',
  WORKSHOP_REJECTED_ALL_ITEMS: 'workshop_rejected_all_items',
  WORKSHOP_RESTORED_FROM_REJECTED: 'workshop_restored_from_rejected',
  WORK_ORDER_CREATED: 'work_order_created',

  // ── OrderManagement (nuevos) ────────────────────────────────────
  ORDER_ITEMS_UPDATED: 'order_items_updated',
  ORDER_ITEMS_ASSIGNED: 'order_items_assigned',
  ORDER_ITEM_ADDED: 'order_item_added',
  ORDER_ITEM_REPAIR_TYPES_UPDATED: 'order_item_repair_types_updated',
  ORDER_ITEM_REMOVED: 'order_item_removed',
  ORDER_NUMBER_GENERATED: 'order_number_generated',
  WORK_ORDERS_GENERATED: 'work_orders_generated',

  // ── MaintenanceOrders (nuevos) ──────────────────────────────────
  WORKSHOP_RETURNED_ORDER: 'workshop_returned_order',
  SECTOR_EXECUTION_ORDER_UPDATED: 'sector_execution_order_updated',
  EXTERNAL_WO_COMPLETED: 'external_wo_completed',

  // ── ApprovalInbox (nuevos) ──────────────────────────────────────
  REPAIR_TASK_APPROVED: 'repair_task_approved',
  REPAIR_TASK_REJECTED: 'repair_task_rejected',
  REPAIR_TASK_REASSIGNED: 'repair_task_reassigned',

  // ── OperatorPanel (nuevos) ──────────────────────────────────────
  WO_STARTED: 'wo_started',
  WO_PAUSED: 'wo_paused',
  WO_RESUMED: 'wo_resumed',
  WO_CLOSED: 'wo_closed',
  REPAIR_COMPLETED: 'repair_completed',
  REPAIR_UNCOMPLETED: 'repair_uncompleted',
  REPAIR_TECHNICIAN_NOTES_UPDATED: 'repair_technician_notes_updated',
  REPAIR_RETURNED_TO_CHIEF: 'repair_returned_to_chief',
  TASK_ADDED_BY_OPERATOR: 'task_added_by_operator',
  TASK_REQUESTED_FOR_OTHER_SECTOR: 'task_requested_for_other_sector',
} as const;

export type ActivityActionType = (typeof ACTIVITY_LOG)[keyof typeof ACTIVITY_LOG];
```

- [ ] **Step 1.2: Verificar tipos**

Run: `npm run check-types`
Expected: 0 errors.

---

## Task 2 — Crear helper `logActivity`

**Files:**

- Create: `src/features/Mantenimiento/shared/activity-log/log-activity.ts`

- [ ] **Step 2.1: Crear el helper**

```ts
import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import type { ActivityActionType } from './action-types';

export interface LogActivityInput {
  maintenanceRequestId?: string | null;
  maintenanceOrderId?: string | null;
  workOrderId?: string | null;
  actionType: ActivityActionType;
  performedBy: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
  metadata?: Record<string, unknown>;
}

type PrismaLike = Prisma.TransactionClient | typeof prisma;

/**
 * Inserta una entrada en maintenance_activity_log.
 * Acepta el cliente prisma directo o un TransactionClient para usar dentro de prisma.$transaction.
 */
export async function logActivity(client: PrismaLike, entry: LogActivityInput): Promise<void> {
  await client.maintenance_activity_log.create({
    data: {
      maintenance_request_id: entry.maintenanceRequestId ?? null,
      maintenance_order_id: entry.maintenanceOrderId ?? null,
      work_order_id: entry.workOrderId ?? null,
      action_type: entry.actionType,
      performed_by: entry.performedBy,
      previous_status: entry.previousStatus ?? null,
      new_status: entry.newStatus ?? null,
      notes: entry.notes ?? null,
      rejection_reason: entry.rejectionReason ?? null,
      metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
```

- [ ] **Step 2.2: Verificar tipos**

Run: `npm run check-types`
Expected: 0 errors.

---

## Task 3 — Refactor de logs existentes para usar `logActivity`

**Files:**

- Modify: `src/features/Mantenimiento/MaintenanceOrders/actions/actionsServer.ts:476` (workshopChiefValidateOrder)
- Modify: `src/features/Mantenimiento/MaintenanceOrders/actions/actionsServer.ts:585` (operationsValidateOrder)
- Modify: `src/features/Mantenimiento/MaintenanceOrders/actions/actionsServer.ts:609` (operationsRejectOrder — buscar en archivo)
- Modify: `src/features/Mantenimiento/MaintenanceOrders/actions/actionsServer.ts:722` (workshopChiefRejectItems)
- Modify: `src/features/Mantenimiento/MaintenanceOrders/actions/actionsServer.ts:799` (operationsRejectItems)
- Modify: `src/features/Mantenimiento/MaintenanceOrders/actions/actionsServer.ts:890` (workshopChiefHandleOperationsRejection — agree)
- Modify: `src/features/Mantenimiento/MaintenanceOrders/actions/actionsServer.ts:914` (workshopChiefHandleOperationsRejection — disagree)
- Modify: `src/features/Mantenimiento/OrderManagement/actions/actionsServer.ts:854` (saveOrderChanges — workshop_rejected_all_items)
- Modify: `src/features/Mantenimiento/OrderManagement/actions/actionsServer.ts:871` (saveOrderChanges — workshop_restored_from_rejected)

- [ ] **Step 3.1: Importar el helper en MaintenanceOrders/actions/actionsServer.ts**

Agregar al bloque de imports al inicio:

```ts
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
```

- [ ] **Step 3.2: Reemplazar todas las llamadas `tx.maintenance_activity_log.create({ data: { ... } })` por `logActivity(tx, { ... })`**

Para CADA una de las 7 ocurrencias en `MaintenanceOrders`, transformar:

```ts
// ANTES
await tx.maintenance_activity_log.create({
  data: {
    maintenance_order_id: orderId,
    action_type: 'workshop_approved',
    performed_by: profile.id,
    previous_status: 'pending_workshop_validation',
    new_status: 'pending_operations_validation',
    notes: notes ?? 'Aprobado por jefe de taller',
  },
});

// DESPUÉS
await logActivity(tx, {
  maintenanceOrderId: orderId,
  actionType: ACTIVITY_LOG.WORKSHOP_APPROVED,
  performedBy: profile.id,
  previousStatus: 'pending_workshop_validation',
  newStatus: 'pending_operations_validation',
  notes: notes ?? 'Aprobado por jefe de taller',
});
```

Mapeo por línea:

- `476`: `WORKSHOP_APPROVED`
- `585`: `OPERATIONS_APPROVED`
- `722`: `WORKSHOP_ITEM_REJECTED`
- `799`: `OPERATIONS_ITEM_REJECTED`
- `890`: `WORKSHOP_AGREED_OPS_REJECTION`
- `914`: `WORKSHOP_DISAGREED_OPS_REJECTION`

Si en `operationsRejectOrder` (línea ~609) hay un log similar, también convertirlo a `OPERATIONS_REJECTED` (agregar la constante al catálogo en Task 1 si falta — verificar primero).

- [ ] **Step 3.3: Importar y reemplazar las 2 ocurrencias en OrderManagement/actions/actionsServer.ts**

Agregar imports:

```ts
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
```

Reemplazar:

- `854`: `WORKSHOP_REJECTED_ALL_ITEMS`
- `871`: `WORKSHOP_RESTORED_FROM_REJECTED`

- [ ] **Step 3.4: Buscar otros logs existentes que no se hayan listado**

Run: `grep -rn "maintenance_activity_log.create" src/features/Mantenimiento`
Para cada resultado adicional encontrado: convertirlo al helper.

- [ ] **Step 3.5: Verificar tipos**

Run: `npm run check-types`
Expected: 0 errors.

- [ ] **Step 3.6: Verificación manual con MCP supabase-LOCAL (smoke test)**

Hacer una validación cualquiera (workshop_approved) desde la UI con un usuario DEV y luego ejecutar:

```sql
SELECT id, action_type, performed_by, previous_status, new_status, notes, performed_at
FROM maintenance_activity_log
WHERE maintenance_order_id = '<orderId>'
ORDER BY performed_at DESC
LIMIT 5;
```

Expected: el log aparece con `action_type = 'workshop_approved'` y los campos correctos.

---

## Task 4 — Loguear las 3 mutations faltantes en `MaintenanceOrders`

**Files:**

- Modify: `src/features/Mantenimiento/MaintenanceOrders/actions/actionsServer.ts:500` (workshopChiefReturnOrder)
- Modify: `src/features/Mantenimiento/MaintenanceOrders/actions/actionsServer.ts:995` (updateSectorExecutionOrder)
- Modify: `src/features/Mantenimiento/MaintenanceOrders/actions/actionsServer.ts:1041` (completeExternalWorkOrder)

- [ ] **Step 4.1: `workshopChiefReturnOrder` — agregar log dentro de la transacción**

Dentro del `prisma.$transaction`, ANTES del `}` de cierre del callback, agregar:

```ts
// Audit log
await logActivity(tx, {
  maintenanceOrderId: orderId,
  actionType: ACTIVITY_LOG.WORKSHOP_RETURNED_ORDER,
  performedBy: (await requireServerAuthProfile()).id,
  previousStatus: 'pending_workshop_validation',
  newStatus: 'in_workshop',
  rejectionReason: reason,
  metadata: { reopenedWorkOrderIds: workOrders.map((wo) => wo.id) },
});
```

Nota: `workshopChiefReturnOrder` no obtiene profile actualmente. Mover `const profile = await requireServerAuthProfile();` al inicio de la función (igual que las otras), y usar `profile.id` en el log.

- [ ] **Step 4.2: `updateSectorExecutionOrder` — agregar profile + log**

Reemplazar la función entera por:

```ts
export async function updateSectorExecutionOrder(
  orderId: string,
  sectorOrders: Array<{ sectorId: string; sequenceOrder: number }>
) {
  const profile = await requireServerAuthProfile();
  logger.debug('Actualizando orden de ejecucion de sectores', { data: { orderId, sectorOrders } });

  try {
    const order = await prisma.maintenance_orders.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    if (!order) {
      throw new Error('No se encontró la orden de mantenimiento');
    }

    if (order.status !== 'in_workshop') {
      throw new Error('Solo se puede cambiar el orden cuando la OM está en taller');
    }

    await prisma.$transaction(async (tx) => {
      for (const { sectorId, sequenceOrder } of sectorOrders) {
        await tx.maintenance_order_items.updateMany({
          where: { maintenance_order_id: orderId, assigned_sector_id: sectorId },
          data: { sector_sequence_order: sequenceOrder },
        });
      }

      await logActivity(tx, {
        maintenanceOrderId: orderId,
        actionType: ACTIVITY_LOG.SECTOR_EXECUTION_ORDER_UPDATED,
        performedBy: profile.id,
        metadata: { sectorOrders },
      });
    });

    logger.info('Orden de ejecucion de sectores actualizado', { data: { orderId, sectorOrders } });
    await invalidateCacheTags(INVALIDATION_MAP.updateSectorExecutionOrder);
    revalidatePath('/dashboard/maintenance');
  } catch (error) {
    logger.error('Error al actualizar orden de sector', { data: { error, orderId } });
    throw error;
  }
}
```

- [ ] **Step 4.3: `completeExternalWorkOrder` — agregar log dentro de la transacción**

Dentro del `prisma.$transaction`, después del `tx.work_orders.update` y antes de cerrar la transacción, agregar:

```ts
await logActivity(tx, {
  workOrderId: workOrderId,
  actionType: ACTIVITY_LOG.EXTERNAL_WO_COMPLETED,
  performedBy: profileId,
  newStatus: 'completed',
  metadata: { closedAt: new Date().toISOString() },
});
```

Si más adelante en la transacción se actualiza la OM a `pending_workshop_validation`, agregar también:

```ts
await logActivity(tx, {
  maintenanceOrderId: maintenanceOrderId,
  actionType: ACTIVITY_LOG.EXTERNAL_WO_COMPLETED,
  performedBy: profileId,
  previousStatus: 'in_workshop',
  newStatus: 'pending_workshop_validation',
  metadata: { triggeredByWorkOrderId: workOrderId },
});
```

- [ ] **Step 4.4: Verificar tipos**

Run: `npm run check-types`
Expected: 0 errors.

- [ ] **Step 4.5: Verificación manual**

Como jefe de taller, devolver una orden al taller. Confirmar el log:

```sql
SELECT action_type, previous_status, new_status, rejection_reason, metadata, performed_at
FROM maintenance_activity_log
WHERE maintenance_order_id = '<orderId>'
ORDER BY performed_at DESC LIMIT 1;
```

Expected: `workshop_returned_order` con `metadata.reopenedWorkOrderIds` poblado.

---

## Task 5 — Loguear las 6 mutations sueltas + agrupado de `OrderManagement`

**Files:**

- Modify: `src/features/Mantenimiento/OrderManagement/actions/actionsServer.ts`

- [ ] **Step 5.1: `assignItemsToSectors` — agregar log al final del transaction**

Dentro de `prisma.$transaction(async (tx) => { ... })`, después del bucle `for (const assignment of assignments)`, agregar:

```ts
await logActivity(tx, {
  maintenanceOrderId,
  actionType: ACTIVITY_LOG.ORDER_ITEMS_ASSIGNED,
  performedBy: profile.id,
  metadata: {
    assignments: assignments.map((a) => ({
      itemIds: a.maintenanceOrderItemIds,
      sectorId: a.sectorId,
      sequenceOrder: a.sequenceOrder,
    })),
  },
});
```

- [ ] **Step 5.2: `addItemToOrder` — agregar profile + log**

Cambiar la firma para obtener profile y loguear dentro del transaction:

```ts
export async function addItemToOrder(
  maintenanceOrderId: string,
  data: { description: string; repairTypeIds?: string[] }
) {
  const profile = await requireServerAuthProfile();
  try {
    const newItem = await prisma.$transaction(async (tx) => {
      const item = await tx.maintenance_order_items.create({
        /* sin cambios */
      });
      if (data.repairTypeIds && data.repairTypeIds.length > 0) {
        await tx.maintenance_order_item_repair_types.createMany({
          /* sin cambios */
        });
      }
      await logActivity(tx, {
        maintenanceOrderId,
        actionType: ACTIVITY_LOG.ORDER_ITEM_ADDED,
        performedBy: profile.id,
        metadata: {
          itemId: item.id,
          description: data.description,
          repairTypeIds: data.repairTypeIds ?? [],
        },
      });
      return item;
    });
    /* sin cambios */
  } catch (error) {
    /* sin cambios */
  }
}
```

- [ ] **Step 5.3: `updateItemRepairTypes` — agregar profile + log**

Modificar para obtener profile y loguear:

```ts
export async function updateItemRepairTypes(maintenanceOrderItemId: string, repairTypeIds: string[]) {
  const profile = await requireServerAuthProfile();
  try {
    // Obtener el maintenance_order_id del item para el log
    const item = await prisma.maintenance_order_items.findUnique({
      where: { id: maintenanceOrderItemId },
      select: { maintenance_order_id: true },
    });
    if (!item?.maintenance_order_id) {
      throw new Error('Item no encontrado o sin orden asociada');
    }

    await prisma.$transaction(async (tx) => {
      /* sin cambios — los 3 statements existentes */

      await logActivity(tx, {
        maintenanceOrderId: item.maintenance_order_id,
        actionType: ACTIVITY_LOG.ORDER_ITEM_REPAIR_TYPES_UPDATED,
        performedBy: profile.id,
        metadata: { itemId: maintenanceOrderItemId, repairTypeIds },
      });
    });
    /* sin cambios */
  } catch (error) {
    /* sin cambios */
  }
}
```

- [ ] **Step 5.4: `removeManualItem` — agregar profile + log**

```ts
export async function removeManualItem(itemId: string) {
  const profile = await requireServerAuthProfile();
  try {
    const item = await prisma.maintenance_order_items.findUnique({
      where: { id: itemId },
      select: { id: true, maintenance_order_id: true, maintenance_request_item_id: true, is_diagnostico: true },
    });

    if (!item) throw new Error('Item no encontrado');
    if (item.maintenance_request_item_id && !item.is_diagnostico) {
      throw new Error('No se puede eliminar un item que proviene de una solicitud');
    }

    await prisma.$transaction(async (tx) => {
      await tx.maintenance_order_items.delete({ where: { id: itemId } });
      if (item.maintenance_order_id) {
        await logActivity(tx, {
          maintenanceOrderId: item.maintenance_order_id,
          actionType: ACTIVITY_LOG.ORDER_ITEM_REMOVED,
          performedBy: profile.id,
          metadata: { itemId },
        });
      }
    });
    /* sin cambios — logs y invalidate */
  } catch (error) {
    /* sin cambios */
  }
}
```

- [ ] **Step 5.5: `generateMaintenanceOrderNumber` — agregar profile + log**

```ts
export async function generateMaintenanceOrderNumber(orderId: string) {
  const profile = await requireServerAuthProfile();
  try {
    const existing = await prisma.maintenance_orders.findUnique({
      where: { id: orderId },
      select: { order_number: true },
    });
    if (!existing) throw new Error('Orden no encontrada');
    if (existing.order_number) return existing.order_number;

    const count = await prisma.maintenance_orders.count({ where: { order_number: { not: null } } });
    const nextSeq = count + 1;
    const orderNumber = `OM-${String(nextSeq).padStart(6, '0')}`;

    await prisma.$transaction(async (tx) => {
      await tx.maintenance_orders.update({
        where: { id: orderId },
        data: { order_number: orderNumber },
      });
      await logActivity(tx, {
        maintenanceOrderId: orderId,
        actionType: ACTIVITY_LOG.ORDER_NUMBER_GENERATED,
        performedBy: profile.id,
        metadata: { orderNumber },
      });
    });

    /* sin cambios — logs e invalidate */
    return orderNumber;
  } catch (error) {
    /* sin cambios */
  }
}
```

- [ ] **Step 5.6: `saveOrderChanges` — agregar log agrupado al final**

Dentro de `prisma.$transaction(async (tx) => { ... })`, AL FINAL del callback (después del bloque `if ((changes.rejections...) || ...)`), agregar:

```ts
// Log agrupado: una sola entrada con TODO el detalle del save
const groupedMetadata: Record<string, unknown> = {};
if (changes.deletes.length > 0) groupedMetadata.deletes = changes.deletes;
if (changes.adds.length > 0) groupedMetadata.adds = changes.adds;
if (changes.sectorAssignments.length > 0) groupedMetadata.sectorAssignments = changes.sectorAssignments;
if (changes.repairTypeUpdates.length > 0) groupedMetadata.repairTypeUpdates = changes.repairTypeUpdates;
if (changes.sequenceUpdates.length > 0) groupedMetadata.sequenceUpdates = changes.sequenceUpdates;
if (changes.descriptionUpdates.length > 0) groupedMetadata.descriptionUpdates = changes.descriptionUpdates;
if (changes.chiefCommentUpdates.length > 0) groupedMetadata.chiefCommentUpdates = changes.chiefCommentUpdates;
if (changes.workshopAssignments.length > 0) groupedMetadata.workshopAssignments = changes.workshopAssignments;
if (changes.rejections && changes.rejections.length > 0) groupedMetadata.rejections = changes.rejections;
if (changes.restorations && changes.restorations.length > 0) groupedMetadata.restorations = changes.restorations;

if (Object.keys(groupedMetadata).length > 0) {
  await logActivity(tx, {
    maintenanceOrderId: orderId,
    actionType: ACTIVITY_LOG.ORDER_ITEMS_UPDATED,
    performedBy: profile.id,
    metadata: groupedMetadata,
  });
}
```

Importante: este log **convive** con los logs de `WORKSHOP_REJECTED_ALL_ITEMS` y `WORKSHOP_RESTORED_FROM_REJECTED` que ya están en la función. Esos quedan como están porque registran transiciones de estado de la OM, no la gestión.

- [ ] **Step 5.7: `generateWorkOrdersForOrder` — log a nivel OM + 1 log por WO creada**

Buscar en la función el bloque donde se crean las OTs. Dentro del `prisma.$transaction(async (tx) => { ... })` por sector, después de `const wo = await tx.work_orders.create({...})`, agregar:

```ts
await logActivity(tx, {
  workOrderId: wo.id,
  maintenanceOrderId: orderId,
  actionType: ACTIVITY_LOG.WORK_ORDER_CREATED,
  performedBy: profile.id,
  newStatus: 'pending',
  metadata: {
    orderNumber: wo.order_number,
    sectorName: sector.sectorName,
    plannedStartDate: dates.plannedStartDate,
    plannedEndDate: dates.plannedEndDate,
    isExternal: sector.isExternal,
  },
});
```

Al final de la función (después del `for (const sector of preview.sectors)`), agregar un log resumen a nivel OM:

```ts
await prisma.$transaction(async (tx) => {
  await logActivity(tx, {
    maintenanceOrderId: orderId,
    actionType: ACTIVITY_LOG.WORK_ORDERS_GENERATED,
    performedBy: profile.id,
    metadata: {
      workOrders: createdOrders.map((co) => ({
        orderNumber: co.orderNumber,
        sectorName: co.sectorName,
        itemCount: co.itemCount,
      })),
    },
  });
});
```

- [ ] **Step 5.8: `setupAndGenerateWorkOrders` — verificar si llama a `generateWorkOrdersForOrder`**

Si `setupAndGenerateWorkOrders` simplemente delega a `generateWorkOrdersForOrder`, NO duplicar el log. Si hace lógica propia adicional, agregar el mismo log de `WORK_ORDERS_GENERATED` siguiendo el patrón anterior.

Run: `grep -n "generateWorkOrdersForOrder\|WORK_ORDERS_GENERATED" src/features/Mantenimiento/OrderManagement/actions/actionsServer.ts`
Inspect resultado y decidir.

- [ ] **Step 5.9: Verificar tipos**

Run: `npm run check-types`
Expected: 0 errors.

- [ ] **Step 5.10: Verificación manual**

Hacer un save desde el wizard de gestión con varias acciones (2 adds, 1 delete, 1 sector assignment) y consultar:

```sql
SELECT action_type, metadata, performed_at
FROM maintenance_activity_log
WHERE maintenance_order_id = '<orderId>'
ORDER BY performed_at DESC LIMIT 5;
```

Expected: 1 fila `order_items_updated` con `metadata` que tiene las 3 claves (`adds`, `deletes`, `sectorAssignments`) y los datos correctos.

Generar OTs desde el wizard. Confirmar:

- N filas `work_order_created` (1 por OT) con `metadata.orderNumber`.
- 1 fila `work_orders_generated` con `metadata.workOrders` (array).

---

## Task 6 — Loguear las 3 mutations de `ApprovalInbox`

**Files:**

- Modify: `src/features/Mantenimiento/ApprovalInbox/actions/actionsServer.ts`

- [ ] **Step 6.1: Importar helper y resolver work_order_id desde el repair**

Agregar al bloque de imports:

```ts
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
```

Agregar helper privado al final del archivo:

```ts
/**
 * Resuelve el work_order_id, repair_type_name y sector_name desde un repair.
 * Usado para enriquecer metadata de los logs.
 */
async function resolveRepairContext(repairId: string) {
  const repair = await prisma.work_order_item_repairs.findUnique({
    where: { id: repairId },
    select: {
      types_of_repairs: { select: { name: true } },
      workshop_sectors: { select: { name: true } },
      work_order_items: {
        select: {
          work_order_id: true,
          maintenance_order_items: {
            select: {
              workshop_sectors: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return {
    workOrderId: repair?.work_order_items?.work_order_id ?? null,
    repairTypeName: repair?.types_of_repairs?.name ?? null,
    originalSectorName: repair?.workshop_sectors?.name ?? null,
    currentSectorName: repair?.work_order_items?.maintenance_order_items?.workshop_sectors?.name ?? null,
  };
}
```

- [ ] **Step 6.2: `approveTask` — convertir a transaction + log**

Reemplazar el cuerpo:

```ts
export async function approveTask(taskId: string) {
  const profile = await requireServerAuthProfile();
  logger.debug('Aprobando tarea', { data: { taskId, approvedBy: profile.id } });

  try {
    const ctx = await resolveRepairContext(taskId);

    await prisma.$transaction(async (tx) => {
      await tx.work_order_item_repairs.update({
        where: { id: taskId },
        data: { status: 'pending', approved_by: profile.id, approved_at: new Date() },
      });

      if (ctx.workOrderId) {
        await logActivity(tx, {
          workOrderId: ctx.workOrderId,
          actionType: ACTIVITY_LOG.REPAIR_TASK_APPROVED,
          performedBy: profile.id,
          previousStatus: 'pending_approval',
          newStatus: 'pending',
          metadata: {
            repairId: taskId,
            repairTypeName: ctx.repairTypeName,
            sectorName: ctx.currentSectorName,
          },
        });
      }
    });
  } catch (error) {
    logger.error('Error al aprobar tarea', { data: { error, taskId } });
    throw new Error(`Error al aprobar tarea: ${error instanceof Error ? error.message : String(error)}`);
  }

  await invalidateCacheTags(INVALIDATION_MAP.approveTask);
  logger.info('Tarea aprobada', { data: { taskId } });
}
```

- [ ] **Step 6.3: `rejectTask` — convertir a transaction + log**

```ts
export async function rejectTask(taskId: string, reason: string) {
  const profile = await requireServerAuthProfile();
  logger.debug('Rechazando tarea', { data: { taskId, rejectedBy: profile.id } });

  try {
    const ctx = await resolveRepairContext(taskId);

    await prisma.$transaction(async (tx) => {
      await tx.work_order_item_repairs.update({
        where: { id: taskId },
        data: {
          status: 'rejected',
          rejection_reason: reason,
          approved_by: profile.id,
          approved_at: new Date(),
        },
      });

      if (ctx.workOrderId) {
        await logActivity(tx, {
          workOrderId: ctx.workOrderId,
          actionType: ACTIVITY_LOG.REPAIR_TASK_REJECTED,
          performedBy: profile.id,
          previousStatus: 'pending_approval',
          newStatus: 'rejected',
          rejectionReason: reason,
          metadata: {
            repairId: taskId,
            repairTypeName: ctx.repairTypeName,
            sectorName: ctx.currentSectorName,
            reason,
          },
        });
      }
    });
  } catch (error) {
    logger.error('Error al rechazar tarea', { data: { error, taskId } });
    throw new Error(`Error al rechazar tarea: ${error instanceof Error ? error.message : String(error)}`);
  }

  await invalidateCacheTags(INVALIDATION_MAP.rejectTask);
  logger.info('Tarea rechazada', { data: { taskId, reason } });
}
```

- [ ] **Step 6.4: `reassignTaskToSector` — convertir a transaction + log**

```ts
export async function reassignTaskToSector(taskId: string, newSectorId: string) {
  const profile = await requireServerAuthProfile();
  logger.debug('Reasignando tarea a nuevo sector', { data: { taskId, newSectorId } });

  try {
    const repair = await prisma.work_order_item_repairs.findUnique({
      where: { id: taskId },
      select: { work_order_items: { select: { maintenance_order_item_id: true } } },
    });
    if (!repair) throw new Error('Tarea no encontrada');

    const ctx = await resolveRepairContext(taskId);
    const newSector = await prisma.workshop_sectors.findUnique({
      where: { id: newSectorId },
      select: { name: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.work_order_item_repairs.update({
        where: { id: taskId },
        data: { status: 'pending' },
      });

      const moItemId = repair.work_order_items?.maintenance_order_item_id;
      if (moItemId) {
        await tx.maintenance_order_items.update({
          where: { id: moItemId },
          data: { assigned_sector_id: newSectorId },
        });
      }

      if (ctx.workOrderId) {
        await logActivity(tx, {
          workOrderId: ctx.workOrderId,
          actionType: ACTIVITY_LOG.REPAIR_TASK_REASSIGNED,
          performedBy: profile.id,
          previousStatus: 'reassignment_requested',
          newStatus: 'pending',
          metadata: {
            repairId: taskId,
            repairTypeName: ctx.repairTypeName,
            fromSector: ctx.currentSectorName,
            toSector: newSector?.name ?? null,
          },
        });
      }
    });
  } catch (error) {
    logger.error('Error al reasignar tarea', { data: { error, taskId, newSectorId } });
    throw new Error(`Error al reasignar: ${error instanceof Error ? error.message : String(error)}`);
  }

  await invalidateCacheTags(INVALIDATION_MAP.reassignTaskToSector);
  logger.info('Tarea reasignada a nuevo sector', { data: { taskId, newSectorId } });
}
```

- [ ] **Step 6.5: Verificar tipos**

Run: `npm run check-types`
Expected: 0 errors.

- [ ] **Step 6.6: Verificación manual**

Aprobar una tarea desde el inbox. Confirmar:

```sql
SELECT action_type, metadata, previous_status, new_status, performed_at
FROM maintenance_activity_log
WHERE work_order_id = '<workOrderId>'
ORDER BY performed_at DESC LIMIT 1;
```

Expected: `repair_task_approved` con `metadata.repairId`, `metadata.repairTypeName`, `metadata.sectorName`.

Repetir para rechazar y reasignar.

---

## Task 7 — Loguear las 10 mutations de `OperatorPanel`

**Files:**

- Modify: `src/features/OperatorPanel/actions/actionsServer.ts`

> **Nota**: Este archivo usa Supabase client. Para no migrarlo a Prisma (fuera de scope COD-422), los logs se hacen con Prisma **post-update**, no transaccional con Supabase. Si la inserción del log falla, el update de Supabase no se revierte, pero al menos se loguea el error. Aceptable para audit trail.

- [ ] **Step 7.1: Importar helper y prisma**

Agregar a los imports:

```ts
import { prisma } from '@/shared/lib/prisma';
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
```

- [ ] **Step 7.2: `startWorkOrder` — agregar log post-update**

Después de `if (error) { ... throw error; }` y antes de `revalidatePath`, agregar:

```ts
try {
  await logActivity(prisma, {
    workOrderId,
    actionType: ACTIVITY_LOG.WO_STARTED,
    performedBy: user?.id ?? null,
    previousStatus: 'pending',
    newStatus: 'in_progress',
    metadata: {},
  });
} catch (logErr) {
  logger.error('Error logging wo_started', { data: { logErr } });
}
```

- [ ] **Step 7.3: `pauseWorkOrder` — agregar log post-update**

La función actual no recibe `pause_reason`. Si el dialog lo pide, pasarlo como segundo argumento. Si no, loguear con metadata vacía:

```ts
// Post-update (al final de la función, antes de revalidatePath)
const {
  data: { user: pauseUser },
} = await supabase.auth.getUser();
try {
  await logActivity(prisma, {
    workOrderId,
    actionType: ACTIVITY_LOG.WO_PAUSED,
    performedBy: pauseUser?.id ?? null,
    previousStatus: 'in_progress',
    newStatus: 'paused',
    metadata: {},
  });
} catch (logErr) {
  logger.error('Error logging wo_paused', { data: { logErr } });
}
```

> Si el codebase ya tiene un mecanismo para `pause_reason` (revisar antes — el modal lo pinta como `pauseReason` desde metadata), extender la firma. Sino, queda con metadata vacía.

- [ ] **Step 7.4: `resumeWorkOrder` — agregar log**

Mismo patrón, con `WO_RESUMED`, `previousStatus: 'paused'`, `newStatus: 'in_progress'`.

- [ ] **Step 7.5: `closeWorkOrder` — agregar log**

Después del bloque que actualiza la OM padre, agregar:

```ts
try {
  await logActivity(prisma, {
    workOrderId,
    actionType: ACTIVITY_LOG.WO_CLOSED,
    performedBy: user?.id ?? null,
    previousStatus: woData?.status ?? null,
    newStatus: finalStatus,
    notes: notes ?? null,
    metadata: { status: finalStatus },
  });
} catch (logErr) {
  logger.error('Error logging wo_closed', { data: { logErr } });
}
```

- [ ] **Step 7.6: `completeRepair` — agregar log**

Después del update exitoso, resolver el `work_order_id` y los nombres:

```ts
try {
  const ctx = await prisma.work_order_item_repairs.findUnique({
    where: { id: repairId },
    select: {
      types_of_repairs: { select: { name: true } },
      work_order_items: { select: { work_order_id: true } },
    },
  });
  if (ctx?.work_order_items?.work_order_id) {
    await logActivity(prisma, {
      workOrderId: ctx.work_order_items.work_order_id,
      actionType: ACTIVITY_LOG.REPAIR_COMPLETED,
      performedBy: user?.id ?? null,
      metadata: { repairId, repairTypeName: ctx.types_of_repairs?.name ?? null },
    });
  }
} catch (logErr) {
  logger.error('Error logging repair_completed', { data: { logErr } });
}
```

- [ ] **Step 7.7: `uncompleteRepair` — agregar log**

Mismo patrón con `REPAIR_UNCOMPLETED`. La función actual no obtiene `user`; agregarlo:

```ts
const {
  data: { user },
} = await supabase.auth.getUser();
// ... update ...
// log con user?.id
```

- [ ] **Step 7.8: `updateTechnicianNotes` — agregar log**

```ts
try {
  const ctx = await prisma.work_order_item_repairs.findUnique({
    where: { id: repairId },
    select: {
      types_of_repairs: { select: { name: true } },
      work_order_items: { select: { work_order_id: true } },
    },
  });
  if (ctx?.work_order_items?.work_order_id) {
    await logActivity(prisma, {
      workOrderId: ctx.work_order_items.work_order_id,
      actionType: ACTIVITY_LOG.REPAIR_TECHNICIAN_NOTES_UPDATED,
      performedBy: user?.id ?? null,
      metadata: {
        repairId,
        repairTypeName: ctx.types_of_repairs?.name ?? null,
        notesPreview: notes.slice(0, 100),
      },
    });
  }
} catch (logErr) {
  logger.error('Error logging repair_technician_notes_updated', { data: { logErr } });
}
```

- [ ] **Step 7.9: `returnTask` — agregar log**

Mismo patrón con `REPAIR_RETURNED_TO_CHIEF`, agregando `metadata.return_reason: returnReason`. La función actual no obtiene user; agregarlo igual que Step 7.7.

- [ ] **Step 7.10: `addTaskToOwnWorkOrder` — agregar log**

Inspeccionar la firma exacta. Agregar log al final, identificando `workOrderId` desde el primer argumento o resolviéndolo:

```ts
try {
  await logActivity(prisma, {
    workOrderId, // del argumento
    actionType: ACTIVITY_LOG.TASK_ADDED_BY_OPERATOR,
    performedBy: user?.id ?? null,
    metadata: { description, repairTypeId },
  });
} catch (logErr) {
  logger.error('Error logging task_added_by_operator', { data: { logErr } });
}
```

- [ ] **Step 7.11: `requestTaskForOtherSector` — agregar log a nivel OM**

```ts
try {
  await logActivity(prisma, {
    maintenanceOrderId, // del argumento
    actionType: ACTIVITY_LOG.TASK_REQUESTED_FOR_OTHER_SECTOR,
    performedBy: user?.id ?? null,
    metadata: { description, repairTypeId },
  });
} catch (logErr) {
  logger.error('Error logging task_requested_for_other_sector', { data: { logErr } });
}
```

- [ ] **Step 7.12: Verificar tipos**

Run: `npm run check-types`
Expected: 0 errors.

- [ ] **Step 7.13: Verificación manual**

Como operario: iniciar OT → completar 1 reparación → pausar → reanudar → cerrar. Confirmar 5 entradas:

```sql
SELECT action_type, metadata, previous_status, new_status, performed_by, performed_at
FROM maintenance_activity_log
WHERE work_order_id = '<workOrderId>'
ORDER BY performed_at ASC;
```

Expected: `wo_started`, `repair_completed`, `wo_paused`, `wo_resumed`, `wo_closed`.

---

## Task 8 — Extender `getMaintenanceOrderFullActivityLog` con detalle de OTs hijas

**Files:**

- Modify: `src/features/Mantenimiento/Operaciones/actions/actionsServer.ts:521`

- [ ] **Step 8.1: Reemplazar la función para incluir `workOrders`**

```ts
export async function getMaintenanceOrderFullActivityLog(orderId: string, requestId?: string) {
  'use cache';
  cacheTag(CACHE_TAGS.MAINTENANCE_ORDERS);
  cacheLife({ revalidate: CACHE_TTL.PAGINATED_LIST });

  serverLogger.debug('Obteniendo historial completo de pedido', { data: { orderId, requestId } });

  try {
    // Resolver el requestId si no viene
    let maintenanceRequestId = requestId;
    if (!maintenanceRequestId) {
      const order = await prisma.maintenance_orders.findUnique({
        where: { id: orderId },
        select: { maintenance_request_id: true },
      });
      maintenanceRequestId = order?.maintenance_request_id ?? undefined;
    }

    // Resolver work_orders hijas de la OM con sus logs
    const workOrdersData = await prisma.work_orders.findMany({
      where: {
        maintenance_order_items: {
          some: { maintenance_order_id: orderId },
        },
      },
      select: {
        id: true,
        order_number: true,
        status: true,
        planned_start_date: true,
        planned_end_date: true,
        sector_id: true,
        workshop_id: true,
        workshop_sectors: { select: { id: true, name: true } },
        workshops: { select: { id: true, name: true, type: true } },
      },
      orderBy: { sequence_number: 'asc' },
    });

    const workOrderIds = workOrdersData.map((wo) => wo.id);

    const [requestData, requestLogsRaw, orderLogsRaw, workOrderLogsRaw] = await Promise.all([
      maintenanceRequestId
        ? prisma.maintenance_requests.findUnique({
            where: { id: maintenanceRequestId },
            select: {
              /* ...select existente sin cambios... */
            },
          })
        : Promise.resolve(null),
      maintenanceRequestId
        ? prisma.maintenance_activity_log.findMany({
            where: { maintenance_request_id: maintenanceRequestId },
            select: ACTIVITY_LOG_SELECT,
            orderBy: { performed_at: 'asc' },
          })
        : Promise.resolve([]),
      prisma.maintenance_activity_log.findMany({
        where: { maintenance_order_id: orderId },
        select: ACTIVITY_LOG_SELECT,
        orderBy: { performed_at: 'asc' },
      }),
      workOrderIds.length > 0
        ? prisma.maintenance_activity_log.findMany({
            where: { work_order_id: { in: workOrderIds } },
            select: ACTIVITY_LOG_SELECT,
            orderBy: { performed_at: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    // Construir origen — sin cambios respecto al código actual
    let origin: MaintenanceRequestOrigin | null = null;
    /* ...código existente sin cambios... */

    // Combinar logs OM-level (request + order)
    const requestLogs = requestLogsRaw.map(mapActivityLogEntry);
    const orderLogs = orderLogsRaw.map(mapActivityLogEntry);
    const workOrderLogs = workOrderLogsRaw.map(mapActivityLogEntry);

    const omLogsMap = new Map<string, MappedActivityLogEntry>();
    for (const log of requestLogs) omLogsMap.set(log.id, log);
    for (const log of orderLogs) {
      if (!omLogsMap.has(log.id)) omLogsMap.set(log.id, log);
    }
    const omHistory = Array.from(omLogsMap.values()).sort(
      (a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime()
    );

    // Agrupar logs de WO por work_order_id
    const woHistoryByWoId = new Map<string, MappedActivityLogEntry[]>();
    for (const log of workOrderLogs) {
      if (!log.work_order_id) continue;
      const arr = woHistoryByWoId.get(log.work_order_id) ?? [];
      arr.push(log);
      woHistoryByWoId.set(log.work_order_id, arr);
    }

    const workOrders = workOrdersData.map((wo) => ({
      id: wo.id,
      orderNumber: wo.order_number,
      status: wo.status,
      plannedStartDate: wo.planned_start_date,
      plannedEndDate: wo.planned_end_date,
      sectorName: wo.workshop_sectors?.name ?? null,
      workshopName: wo.workshops?.name ?? null,
      isExternal: wo.workshops?.type === 'external',
      history: woHistoryByWoId.get(wo.id) ?? [],
    }));

    return { origin, history: omHistory, workOrders };
  } catch (error) {
    serverLogger.error('Error al obtener historial completo de pedido', { data: { error, orderId } });
    throw error;
  }
}
```

- [ ] **Step 8.2: Verificar tipos**

Run: `npm run check-types`
Expected: 0 errors. Si hay errors por el cambio de shape (`MaintenanceOrderFullActivityLog`), serán visibles ya que el modal consume ese tipo. Eso es bueno — los arreglamos en Task 9.

---

## Task 9 — Extender `ActivityHistoryModal` para multi-OT

**Files:**

- Modify: `src/features/Mantenimiento/components/ActivityHistoryModal.tsx`
- Create: `src/features/Mantenimiento/components/ActivityHistory/WorkOrderAccordion.tsx`
- Create: `src/features/Mantenimiento/components/ActivityHistory/GroupedActionItem.tsx`

- [ ] **Step 9.1: Crear `GroupedActionItem.tsx` para `order_items_updated`**

```tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/features/Mantenimiento/utils/dateFormat';

type GroupedMetadata = Partial<{
  adds: Array<{ description: string; repairTypeIds: string[] }>;
  deletes: string[];
  sectorAssignments: Array<{ itemIds: string[]; sectorId: string; sequenceOrder: number }>;
  repairTypeUpdates: Array<{ itemId: string; repairTypeIds: string[] }>;
  sequenceUpdates: Array<{ itemId: string; sequenceOrder: number }>;
  descriptionUpdates: Array<{ itemId: string; description: string }>;
  chiefCommentUpdates: Array<{ itemId: string; comment: string }>;
  workshopAssignments: Array<{ itemIds: string[]; workshopId: string }>;
  rejections: Array<{ itemId: string; reason: string }>;
  restorations: string[];
}>;

interface GroupedActionItemProps {
  performedAt: string | Date;
  performerName: string | null;
  metadata: GroupedMetadata | null;
  isLast: boolean;
}

const SECTION_LABELS: Record<keyof GroupedMetadata, string> = {
  adds: 'items agregados',
  deletes: 'items eliminados',
  sectorAssignments: 'sectores asignados',
  repairTypeUpdates: 'tipos de reparación actualizados',
  sequenceUpdates: 'secuencias actualizadas',
  descriptionUpdates: 'descripciones editadas',
  chiefCommentUpdates: 'comentarios del jefe agregados',
  workshopAssignments: 'asignaciones a taller externo',
  rejections: 'items rechazados',
  restorations: 'items restaurados',
};

export function GroupedActionItem({ performedAt, performerName, metadata, isLast }: GroupedActionItemProps) {
  const [open, setOpen] = useState(false);
  const meta = metadata ?? {};

  const summary = (Object.entries(meta) as Array<[keyof GroupedMetadata, unknown]>)
    .filter(([, value]) => Array.isArray(value) && value.length > 0)
    .map(([key, value]) => `${(value as unknown[]).length} ${SECTION_LABELS[key]}`)
    .join(', ');

  return (
    <div className="relative flex items-start gap-3 pl-1">
      {!isLast && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-muted" />}
      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-slate-50 border-slate-600">
        <Settings className="h-4 w-4 text-slate-600" />
      </div>

      <div className="flex-1 pt-0.5 pb-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-left hover:underline"
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium text-sm">Gestión de items actualizada</span>
          <Badge variant="outline" className="text-xs ml-1">
            {summary || 'sin cambios'}
          </Badge>
        </button>

        {performerName && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <User className="h-3 w-3" />
            {performerName}
          </p>
        )}

        {open && (
          <div className={cn('mt-2 space-y-1 text-xs text-muted-foreground border-l-2 border-muted pl-3')}>
            {meta.adds && meta.adds.length > 0 && (
              <div>
                <span className="font-medium">Agregados ({meta.adds.length}):</span>
                <ul className="list-disc pl-4">
                  {meta.adds.map((a, i) => (
                    <li key={i}>{a.description}</li>
                  ))}
                </ul>
              </div>
            )}
            {meta.deletes && meta.deletes.length > 0 && (
              <p>
                <span className="font-medium">Eliminados:</span> {meta.deletes.length} item(s)
              </p>
            )}
            {meta.sectorAssignments && meta.sectorAssignments.length > 0 && (
              <p>
                <span className="font-medium">Sectores asignados:</span> {meta.sectorAssignments.length}
              </p>
            )}
            {meta.repairTypeUpdates && meta.repairTypeUpdates.length > 0 && (
              <p>
                <span className="font-medium">Tipos de reparación cambiados:</span> {meta.repairTypeUpdates.length}
              </p>
            )}
            {meta.descriptionUpdates && meta.descriptionUpdates.length > 0 && (
              <p>
                <span className="font-medium">Descripciones editadas:</span> {meta.descriptionUpdates.length}
              </p>
            )}
            {meta.chiefCommentUpdates && meta.chiefCommentUpdates.length > 0 && (
              <p>
                <span className="font-medium">Comentarios del jefe agregados:</span> {meta.chiefCommentUpdates.length}
              </p>
            )}
            {meta.workshopAssignments && meta.workshopAssignments.length > 0 && (
              <p>
                <span className="font-medium">Asignaciones a taller externo:</span> {meta.workshopAssignments.length}
              </p>
            )}
            {meta.rejections && meta.rejections.length > 0 && (
              <div>
                <span className="font-medium">Rechazados ({meta.rejections.length}):</span>
                <ul className="list-disc pl-4">
                  {meta.rejections.map((r, i) => (
                    <li key={i}>{r.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {meta.restorations && meta.restorations.length > 0 && (
              <p>
                <span className="font-medium">Restaurados:</span> {meta.restorations.length} item(s)
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(performedAt)}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 9.2: Crear `WorkOrderAccordion.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkOrderAccordionProps {
  workOrder: {
    id: string;
    orderNumber: string;
    status: string;
    sectorName: string | null;
    isExternal: boolean;
  };
  defaultOpen: boolean;
  children: React.ReactNode;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  paused: 'Pausada',
  completed: 'Completada',
  completed_partial: 'Completada parcialmente',
  cancelled: 'Cancelada',
};

export function WorkOrderAccordion({ workOrder, defaultOpen, children }: WorkOrderAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left bg-muted/40 hover:bg-muted/60 transition-colors'
        )}
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <GitBranch className="h-4 w-4 shrink-0" />
        <span className="font-mono text-sm font-medium truncate flex-1">{workOrder.orderNumber}</span>
        {workOrder.sectorName && (
          <Badge variant="secondary" className="text-xs">
            {workOrder.sectorName}
          </Badge>
        )}
        {workOrder.isExternal && (
          <Badge variant="outline" className="text-xs">
            Externo
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          {statusLabels[workOrder.status] ?? workOrder.status}
        </Badge>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 9.3: Extender `actionConfig` en `ActivityHistoryModal.tsx`**

Localizar el objeto `actionConfig` (línea ~65) y agregar entradas para los 22 nuevos `action_type`. Ejemplo:

```ts
// Mantener todas las entradas existentes
// ...

// Agregar:
order_items_updated: { label: 'Gestión de items actualizada', icon: Settings, color: 'text-slate-600', bgColor: 'bg-slate-50' },
order_items_assigned: { label: 'Items asignados a sectores', icon: Layers, color: 'text-blue-600', bgColor: 'bg-blue-50' },
order_item_added: { label: 'Item agregado', icon: Plus, color: 'text-green-600', bgColor: 'bg-green-50' },
order_item_repair_types_updated: { label: 'Tipos de reparación actualizados', icon: Wrench, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
order_item_removed: { label: 'Item eliminado', icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-50' },
order_number_generated: { label: 'Número de OM generado', icon: Hash, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
work_orders_generated: { label: 'OTs generadas', icon: GitBranch, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },

workshop_returned_order: { label: 'OM devuelta al taller', icon: Undo2, color: 'text-orange-600', bgColor: 'bg-orange-50' },
sector_execution_order_updated: { label: 'Orden de sectores actualizado', icon: ArrowUpDown, color: 'text-slate-600', bgColor: 'bg-slate-50' },
external_wo_completed: { label: 'OT externa completada', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },

repair_task_approved: { label: 'Tarea aprobada', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
repair_task_rejected: { label: 'Tarea rechazada', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
repair_task_reassigned: { label: 'Tarea reasignada a otro sector', icon: ArrowRight, color: 'text-blue-600', bgColor: 'bg-blue-50' },

wo_started: { label: 'OT iniciada', icon: Play, color: 'text-blue-600', bgColor: 'bg-blue-50' },
wo_paused: { label: 'OT pausada', icon: Pause, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
wo_resumed: { label: 'OT reanudada', icon: Play, color: 'text-blue-600', bgColor: 'bg-blue-50' },
wo_closed: { label: 'OT cerrada', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
repair_completed: { label: 'Reparación completada', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
repair_uncompleted: { label: 'Reparación reabierta', icon: Undo2, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
repair_technician_notes_updated: { label: 'Notas del técnico actualizadas', icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50' },
repair_returned_to_chief: { label: 'Tarea devuelta al jefe', icon: Undo2, color: 'text-orange-600', bgColor: 'bg-orange-50' },
task_added_by_operator: { label: 'Tarea agregada por operario', icon: Plus, color: 'text-green-600', bgColor: 'bg-green-50' },
task_requested_for_other_sector: { label: 'Tarea solicitada a otro sector', icon: ArrowRight, color: 'text-purple-600', bgColor: 'bg-purple-50' },
```

Agregar imports faltantes de `lucide-react`: `Settings`, `Layers`, `Plus`, `Wrench`, `Trash2`, `Hash`, `Undo2`, `ArrowUpDown`, `ArrowRight`.

- [ ] **Step 9.4: Renderizar `GroupedActionItem` en lugar de `TimelineItem` para `order_items_updated`**

En el bloque que mapea `activityLog.map(...)`, antes de retornar `<TimelineItem ... />`, agregar branch:

```tsx
{
  activityLog.map((entry, index) => {
    if (entry.action_type === 'order_items_updated') {
      return (
        <GroupedActionItem
          key={entry.id}
          performedAt={entry.performed_at}
          performerName={getPerformerName(entry.performer ?? null)}
          metadata={entry.metadata as Parameters<typeof GroupedActionItem>[0]['metadata']}
          isLast={index === activityLog.length - 1}
        />
      );
    }
    return (
      <TimelineItem
        key={entry.id}
        entry={entry as Parameters<typeof TimelineItem>[0]['entry']}
        isLast={index === activityLog.length - 1}
        showSource={isWorkOrderView}
      />
    );
  });
}
```

Importar `GroupedActionItem` al inicio del archivo.

- [ ] **Step 9.5: Renderizar acordeones de OTs cuando es vista OM**

Agregar al final del timeline OM, antes del cierre de `<ScrollArea>`:

```tsx
{
  isOrderView && fullOrderLog?.workOrders && fullOrderLog.workOrders.length > 0 && (
    <>
      <Separator className="my-4" />
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Órdenes de Trabajo ({fullOrderLog.workOrders.length})
        </h4>
        {fullOrderLog.workOrders.map((wo, idx) => (
          <WorkOrderAccordion
            key={wo.id}
            workOrder={{
              id: wo.id,
              orderNumber: wo.orderNumber,
              status: wo.status,
              sectorName: wo.sectorName,
              isExternal: wo.isExternal,
            }}
            defaultOpen={fullOrderLog.workOrders.length === 1 || idx === 0}
          >
            {wo.history.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Sin actividad registrada en esta OT.</p>
            ) : (
              <div className="relative">
                {wo.history.map((entry, i) => (
                  <TimelineItem
                    key={entry.id}
                    entry={entry as Parameters<typeof TimelineItem>[0]['entry']}
                    isLast={i === wo.history.length - 1}
                  />
                ))}
              </div>
            )}
          </WorkOrderAccordion>
        ))}
      </div>
    </>
  );
}
```

Importar `WorkOrderAccordion` al inicio.

- [ ] **Step 9.6: Verificar tipos**

Run: `npm run check-types`
Expected: 0 errors. Si hay error porque `MaintenanceOrderFullActivityLog` ya no tiene la shape esperada, ajustar destructurings.

- [ ] **Step 9.7: Verificación visual manual**

Abrir el modal desde una OM existente con varias OTs hijas. Confirmar:

- Timeline OM con eventos cronológicos.
- `GroupedActionItem` colapsado para `order_items_updated`, expande con detalle.
- Acordeón por OT abajo (1 expandida si solo hay 1, todas colapsadas si hay varias).
- Cada acordeón muestra los eventos de su OT al expandirse.

---

## Task 10 — Montar `ActivityHistoryModal` en paso 3 Taller

**Files:**

- Modify: `src/features/Mantenimiento/MaintenanceOrders/components/OrderDetailDialog.tsx`
- Modify: `src/features/Mantenimiento/OrderManagement/components/ManageOrderDialog.tsx`

- [ ] **Step 10.1: Inspeccionar `OrderDetailDialog` para ver su estructura**

Run: `Read src/features/Mantenimiento/MaintenanceOrders/components/OrderDetailDialog.tsx`

Identificar el header del Dialog (`<DialogHeader>`) y el `maintenance_order_id` que se pasa como prop o queda en el contexto.

- [ ] **Step 10.2: Agregar botón "Ver historial" en `OrderDetailDialog`**

En el header agregar:

```tsx
const [historyOpen, setHistoryOpen] = useState(false);

// En el header, junto al título:
<Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
  <Clock className="h-4 w-4 mr-1" />
  Ver historial
</Button>

// Antes del cierre del componente:
<ActivityHistoryModal
  open={historyOpen}
  onClose={() => setHistoryOpen(false)}
  maintenanceOrderId={order?.id ?? null}
  maintenanceRequestId={order?.maintenance_request_id ?? null}
  title={`Historial de OM ${order?.order_number ?? ''}`}
/>
```

Importar `ActivityHistoryModal`, `Button`, `Clock`, `useState`.

- [ ] **Step 10.3: Repetir el patrón en `ManageOrderDialog.tsx`**

Mismo botón en el header del wizard, mismo `ActivityHistoryModal` con el `maintenanceOrderId` activo.

- [ ] **Step 10.4: Verificar tipos**

Run: `npm run check-types`
Expected: 0 errors.

- [ ] **Step 10.5: Verificación manual**

Abrir el dialog de detalle de una OM en el paso 3, hacer clic en "Ver historial" y confirmar que el modal abre con datos correctos. Verificar que el modal NO hace fetch hasta que se abre (DevTools → Network).

---

## Task 11 — Montar `ActivityHistoryModal` en paso 4 Taller

**Files:**

- Modify: `src/features/Mantenimiento/ApprovalInbox/components/_ValidationOrdersDataTable.tsx`
- Modify: `src/features/Mantenimiento/ApprovalInbox/components/ApprovalInboxClient.tsx`

- [ ] **Step 11.1: Inspeccionar el shape del DataTable de validaciones**

Run: `Read src/features/Mantenimiento/ApprovalInbox/components/_ValidationOrdersDataTable.tsx`

Identificar la columna `actions` (si existe) o cómo se renderizan las filas.

- [ ] **Step 11.2: Agregar columna "Historial" en la DataTable de OMs pendientes de validación**

```tsx
// En el array de columnas, agregar:
{
  id: 'history',
  header: '',
  enableSorting: false,
  enableHiding: false,
  meta: { excludeFromExport: true, title: '' },
  cell: ({ row }) => <HistoryButton maintenanceOrderId={row.original.id} orderNumber={row.original.order_number} />,
}
```

Y declarar `HistoryButton` en el mismo archivo (o extraer a `ApprovalInbox/components/HistoryButton.tsx`):

```tsx
function HistoryButton({
  maintenanceOrderId,
  orderNumber,
}: {
  maintenanceOrderId: string;
  orderNumber: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Ver historial">
        <Clock className="h-4 w-4" />
      </Button>
      <ActivityHistoryModal
        open={open}
        onClose={() => setOpen(false)}
        maintenanceOrderId={maintenanceOrderId}
        title={`Historial de OM ${orderNumber ?? ''}`}
      />
    </>
  );
}
```

- [ ] **Step 11.3: Agregar botón "Historial" en cards de tareas pending_approval / reassignment_requested**

Inspeccionar `ApprovalInboxClient.tsx`. Para cada card de tarea, identificar el `work_order_id` (resolver desde `task.work_order_items.maintenance_order_items.maintenance_orders.id` si solo tenés OM) — idealmente expandir la query del action `getPendingApprovalTasks` para que devuelva el `work_order_id` directo.

Si hace falta cambiar el shape de retorno, agregar al `select`:

```ts
work_order_items: {
  select: {
    work_order_id: true, // ← agregar
    /* ...resto sin cambios... */
  },
},
```

Renderizar botón:

```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => setHistoryWoId(task.work_order_items?.work_order_id ?? null)}
  title="Ver historial"
>
  <Clock className="h-4 w-4" />
</Button>
```

Y un `<ActivityHistoryModal workOrderId={historyWoId} ... />` controlado por estado local.

- [ ] **Step 11.4: Verificar tipos**

Run: `npm run check-types`
Expected: 0 errors.

- [ ] **Step 11.5: Verificación manual**

En el paso 4, hacer clic en "Historial" de una OM pendiente. Confirmar que el modal abre con OM + acordeones de OTs. Hacer clic en "Historial" de una tarea individual; confirmar que abre con la WO específica.

---

## Task 12 — Verificación E2E completa

**Files:** N/A (solo verificación)

- [ ] **Step 12.1: `npm run check-types` final**

Run: `npm run check-types`
Expected: 0 errors.

- [ ] **Step 12.2: Smoke test de flujo completo (paso 1 → paso 4)**

Como usuario DEV (`yordani12yorda@gmail.com`):

1. Crear nueva solicitud manual.
2. Aprobarla como Operaciones.
3. Como Taller: programar fecha → confirmar fecha (Operaciones) → ingresar al taller.
4. En paso 3 (En Taller): abrir gestión, asignar items a 2 sectores, agregar 1 item manual, generar OTs.
5. Como operario: abrir 1 OT → iniciar → completar 2 reparaciones → pausar → reanudar → cerrar.
6. Como otro operario: abrir la otra OT → completar → cerrar.
7. Como jefe de taller: validar OM → enviarla a Operaciones.
8. Como Operaciones: rechazar 1 item → como jefe: aceptar el rechazo.

Para cada paso anterior, abrir el modal de historial desde:

- Tabla de Operaciones (paso 1, 2, 3, 4) — debería verse como hoy + nuevas entradas.
- Detalle de OM (paso 3 Taller) — modal con timeline OM + acordeones de las 2 OTs.
- Tabla de aprobaciones (paso 4 Taller) — modal con historial completo.

Verificar:

- Cada acción dejó su log correspondiente.
- El log agrupado de gestión aparece como UN solo item con detalle expandible.
- Los acordeones de OT muestran los eventos del operario (start/pause/resume/complete + repair_completed).
- `performed_by` está correctamente poblado (no hay null).
- Los timestamps son razonables.

- [ ] **Step 12.3: Query de auditoría final**

```sql
SELECT action_type, COUNT(*) as count
FROM maintenance_activity_log
WHERE performed_at > NOW() - INTERVAL '1 day'
GROUP BY action_type
ORDER BY count DESC;
```

Expected: aparecen al menos los nuevos action_type del flujo recorrido.

```sql
SELECT id, action_type, performed_at
FROM maintenance_activity_log
WHERE performed_by IS NULL
  AND performed_at > NOW() - INTERVAL '1 day';
```

Expected: 0 filas (todo log debe tener performer salvo casos edge documentados como `completeExternalWorkOrder` cuando no hay sesión).

---

## Resumen de criterios de aceptación

- [ ] `npm run check-types` pasa limpio.
- [ ] Las 22 nuevas action_type están en el catálogo y se insertan correctamente en cada disparador.
- [ ] El modal `ActivityHistoryModal` está montado en `OrderDetailDialog`, `ManageOrderDialog` (paso 3) y en `_ValidationOrdersDataTable` + `ApprovalInboxClient` (paso 4).
- [ ] El modal muestra acordeones por OT cuando se abre desde una OM con OTs hijas.
- [ ] El log agrupado de `saveOrderChanges` aparece como una sola entrada de timeline con detalle expandible.
- [ ] El fetch del historial se dispara solo al abrir el modal (verificable en DevTools → Network).
- [ ] El usuario revisa el flujo completo y confirma que toda acción queda registrada.
- [ ] **No** se hicieron commits automáticos. El usuario commitea manualmente cuando lo solicite.

---

## Notas de implementación

- **OperatorPanel sigue con Supabase**: por scope, los logs se hacen con Prisma post-update. Migración a Prisma queda fuera de COD-422.
- **Cache invalidation**: las invalidaciones existentes (`INVALIDATION_MAP.*`) ya cubren los nuevos logs porque usan los mismos `CACHE_TAGS.MAINTENANCE_ORDERS` / `CACHE_TAGS.WORK_ORDER_REPAIRS`. No hace falta agregar tags nuevos.
- **Reglas globales del usuario aplicables**: `code-language.md` (código en inglés, UI en español), `typescript-types.md` (no `:any`), `logger.md` (no `console.*`), `git-rules.md` (sin `Co-Authored-By`, sin commit automático).
- **Si la sesión de implementación necesita interrumpirse**: cada Task es self-contained — se puede pausar entre tareas. Solo hay dependencia hacia adelante: Task 1 y 2 son requisito de todas las demás; Task 8 es requisito de Task 9; Task 9 es requisito de Tasks 10 y 11.
