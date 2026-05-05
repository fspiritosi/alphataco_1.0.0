# COD-422 — Historial completo de mantenimiento (paso 3, paso 4 y operario)

**Fecha**: 2026-04-30
**Linear**: [COD-422](https://linear.app/codecontrol-sas/issue/COD-422/mantenimiento)
**Branch**: `refactor-operations-detail-prisma` (continuar trabajo aquí o crear feature branch nuevo a definir en el plan)

## 1. Problema

El sistema de mantenimiento debe mantener trazabilidad completa de la solicitud (quién la cargó, quién la aprobó, quién fue cambiando cada paso). Hoy esa trazabilidad existe en los pasos 1 y 2 del pipeline de Taller y en todo el pipeline de Operaciones, pero hay tres huecos graves:

1. **Paso 4 Taller (Aprobaciones / `ApprovalInbox`)**: las 3 mutations (`approveTask`, `rejectTask`, `reassignTaskToSector`) no escriben en `maintenance_activity_log`. El modal de historial tampoco está montado en esa tab.
2. **Paso 3 Taller (En Taller / `MaintenanceOrders` + `OrderManagement`)**: la mayoría de las acciones de gestión (asignar items a sectores, agregar/quitar items, generar OTs, devolver al taller, completar OT externa, etc.) no se loguean. Solo loguean las validaciones jefe→ops y los rechazos. El modal de historial tampoco está montado.
3. **`/operator` (panel del operario)**: ninguna mutation escribe historial. Toda la actividad del operario (iniciar/pausar/reanudar OT, completar reparaciones, agregar tareas, devolver tareas, etc.) se pierde. El modal define `action_type` para estas acciones (`started`, `paused`, etc.) pero nunca se insertan.

Resultado: una OM puede completarse sin que quede registrado quién generó las OTs, qué operario hizo qué reparación, ni cuándo se ingresaron/pausaron/reanudaron las OTs.

## 2. Objetivo

Cubrir esos tres huecos garantizando:

- Toda mutation relevante deja una entrada en `maintenance_activity_log` con `performed_by` y timestamp.
- El timeline cronológico de cambios de **estado** se mantiene granular (1 log = 1 transición).
- Las acciones de **gestión** del jefe de taller (que pueden ser muchas en un solo "Guardar") se agrupan en un único log por sesión de guardado, con detalle estructurado en `metadata`.
- El modal `ActivityHistoryModal` está disponible en las dos tabs faltantes (paso 3 y paso 4 Taller) y soporta la vista multi-OT cuando se abre desde una OM.
- El fetch del historial ocurre **al abrir el modal**, nunca antes.

## 3. Decisiones de diseño

### 3.1. Sin migración de schema

`maintenance_activity_log` ya tiene los campos suficientes:

- `maintenance_request_id` / `maintenance_order_id` / `work_order_id` (los 3 niveles).
- `metadata Json` para detalle granular de acciones agrupadas.
- `action_type` es string libre, no enum, así que solo se agregan strings nuevos al mapeo del modal.

### 3.2. Estrategia de agrupamiento

| Tipo de acción                                                                       | Estrategia                                     |
| ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Cambio de estado / paso (validaciones, ingreso a taller, generación de OTs, etc.)    | 1 log = 1 evento, timeline normal              |
| Acciones de gestión disparadas desde un único "Guardar cambios" (`saveOrderChanges`) | 1 log agrupado por save, detalle en `metadata` |
| Acciones del operario (atómicas, intencionales)                                      | 1 log por acción                               |

### 3.3. UI multi-OT

Cuando el modal se abre desde una OM (paso 3 Taller), una OM puede tener múltiples OTs hijas (una por sector). El modal divide la vista en:

```
┌─ Historial de OM-000123 ────────────────────────────┐
│  Origen (solicitud / checklist)                      │
│  Eventos a nivel OM (timeline cronológico):          │
│   • Pedido aprobado                                  │
│   • Ingreso a taller                                 │
│   • Gestión de items (colapsado, X cambios)          │
│   • Generación de OTs (3 OTs creadas)                │
│   • Validación jefe / operaciones                    │
│  ─────────────────────────────────────               │
│  Órdenes de Trabajo                                  │
│   ▼ OT-AC976XW-MOTOR-000045  [En progreso]           │
│       • Iniciada por Juan                            │
│       • Reparación X completada                      │
│       • Pausada (motivo: ...)                        │
│       • Reanudada                                    │
│   ▶ OT-AC976XW-CHASIS-000046 [Pendiente]  (colapsada)│
│   ▶ OT-AC976XW-EXTERNO-000047 [Completada](colapsada)│
└─────────────────────────────────────────────────────┘
```

Cuando el modal se abre desde una OT individual (paso 4 Taller, OperatorPanel) muestra solo el timeline de esa OT más el origen (igual que hoy).

### 3.4. Fetch on-demand

El `useQuery` que carga el historial mantiene `enabled: open`, así que el fetch se dispara solo al abrir el modal. Para el caso multi-OT (vista desde OM), se hace **una sola query** que trae OM + todas sus OTs con sus eventos. Los acordeones expanden visualmente sin nuevas requests.

## 4. Componentes

### 4.1. Helper compartido `logActivity`

`src/features/Mantenimiento/shared/activity-log/log-activity.ts`

```ts
import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';

export interface LogActivityInput {
  maintenanceRequestId?: string;
  maintenanceOrderId?: string;
  workOrderId?: string;
  actionType: string;
  performedBy: string | null;
  previousStatus?: string;
  newStatus?: string;
  notes?: string;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(
  client: Prisma.TransactionClient | typeof prisma,
  entry: LogActivityInput
): Promise<void> {
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
      metadata: entry.metadata ?? {},
    },
  });
}
```

Las mutations existentes que ya insertan a `maintenance_activity_log` directamente con `tx.maintenance_activity_log.create({...})` se migran a usar este helper para uniformidad. Esto NO cambia comportamiento, solo el callsite.

### 4.2. Catálogo completo de `action_type`

#### Nuevos en `OrderManagement` (paso 3)

| `action_type`                     | Mutation                                                    | Nivel | Metadata                                                                                                                                                                                       |
| --------------------------------- | ----------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order_items_updated`             | `saveOrderChanges` (1 log por save)                         | OM    | `{ adds, deletes, sectorAssignments, repairTypeUpdates, sequenceUpdates, descriptionUpdates, chiefCommentUpdates, workshopAssignments, rejections, restorations }` (solo claves con elementos) |
| `order_items_assigned`            | `assignItemsToSectors` invocada suelta                      | OM    | `{ assignments: [{ itemIds, sectorId, sequenceOrder }] }`                                                                                                                                      |
| `order_item_added`                | `addItemToOrder`                                            | OM    | `{ itemId, description, repairTypeIds }`                                                                                                                                                       |
| `order_item_repair_types_updated` | `updateItemRepairTypes`                                     | OM    | `{ itemId, repairTypeIds }`                                                                                                                                                                    |
| `order_item_removed`              | `removeManualItem`                                          | OM    | `{ itemId }`                                                                                                                                                                                   |
| `order_number_generated`          | `generateMaintenanceOrderNumber`                            | OM    | `{ orderNumber }`                                                                                                                                                                              |
| `work_orders_generated`           | `generateWorkOrdersForOrder` / `setupAndGenerateWorkOrders` | OM    | `{ workOrders: [{ id, orderNumber, sectorName, itemCount, isExternal }] }`                                                                                                                     |
| `work_order_created`              | dentro del mismo flujo, una entrada por cada WO nueva       | WO    | `{ orderNumber, sectorName, plannedStartDate, plannedEndDate }`                                                                                                                                |

#### Nuevos en `MaintenanceOrders` (paso 3, complemento)

| `action_type`                    | Mutation                     | Nivel | Metadata                                                                           |
| -------------------------------- | ---------------------------- | ----- | ---------------------------------------------------------------------------------- |
| `workshop_returned_order`        | `workshopChiefReturnOrder`   | OM    | `{ reason, reopenedWorkOrders: [...ids] }`                                         |
| `sector_execution_order_updated` | `updateSectorExecutionOrder` | OM    | `{ sectorOrders: [{ sectorId, sequenceOrder }] }`                                  |
| `external_wo_completed`          | `completeExternalWorkOrder`  | WO    | `{ closedAt }` (+ entrada paralela en OM si dispara `pending_workshop_validation`) |

#### Nuevos en `ApprovalInbox` (paso 4)

Las 3 mutations operan sobre `work_order_item_repairs`. Como la tabla `maintenance_activity_log` no tiene columna `work_order_item_repair_id`, se loguea a nivel WO y se guarda el `repairId` y datos relacionados en `metadata` para mostrarlos en el timeline.

| `action_type`            | Mutation               | Nivel | Metadata                                             |
| ------------------------ | ---------------------- | ----- | ---------------------------------------------------- |
| `repair_task_approved`   | `approveTask`          | WO    | `{ repairId, repairTypeName, sectorName }`           |
| `repair_task_rejected`   | `rejectTask`           | WO    | `{ repairId, repairTypeName, sectorName, reason }`   |
| `repair_task_reassigned` | `reassignTaskToSector` | WO    | `{ repairId, repairTypeName, fromSector, toSector }` |

Para llenar `metadata` el helper resuelve `repair → work_order_items → maintenance_order_items → workshop_sectors` y `repair → types_of_repairs.name` con un `select` enriquecido antes/dentro de la transacción.

#### Nuevos en `OperatorPanel`

| `action_type`                     | Mutation                    | Nivel | Metadata                                                 |
| --------------------------------- | --------------------------- | ----- | -------------------------------------------------------- |
| `wo_started`                      | `startWorkOrder`            | WO    | `{ kilometerAtStart?, engineHoursAtStart? }` (si aplica) |
| `wo_paused`                       | `pauseWorkOrder`            | WO    | `{ pause_reason }`                                       |
| `wo_resumed`                      | `resumeWorkOrder`           | WO    | `{ total_paused_time }`                                  |
| `wo_closed`                       | `closeWorkOrder`            | WO    | `{ status: 'completed' \| 'completed_partial', notes? }` |
| `repair_completed`                | `completeRepair`            | WO    | `{ repairId, repairTypeName }`                           |
| `repair_uncompleted`              | `uncompleteRepair`          | WO    | `{ repairId, repairTypeName }`                           |
| `repair_technician_notes_updated` | `updateTechnicianNotes`     | WO    | `{ repairId, notesPreview }` (truncado a 100 chars)      |
| `repair_returned_to_chief`        | `returnTask`                | WO    | `{ repairId, repairTypeName, return_reason }`            |
| `task_added_by_operator`          | `addTaskToOwnWorkOrder`     | WO    | `{ description, repairTypeId }`                          |
| `task_requested_for_other_sector` | `requestTaskForOtherSector` | OM    | `{ description, repairTypeId, requestedFromSectorId }`   |

### 4.3. Server action extendida

`getMaintenanceOrderFullActivityLog(orderId, requestId?)` en `Operaciones/actions/actionsServer.ts` se extiende para que el retorno incluya, además del origen y el log de la OM, el detalle de cada OT hija:

```ts
{
  origin: MaintenanceRequestOrigin | null,
  history: ActivityLogEntry[],   // eventos a nivel OM (los actuales)
  workOrders: Array<{            // NUEVO
    id: string,
    orderNumber: string,
    status: string,
    sectorName: string | null,
    isExternal: boolean,
    plannedStartDate: Date | null,
    plannedEndDate: Date | null,
    history: ActivityLogEntry[], // eventos a nivel WO
  }>,
}
```

La query usa un `findFirst` sobre `maintenance_orders` con `include` para `maintenance_order_items.work_orders.maintenance_activity_log`, ordenando los logs por `performed_at desc`. Una sola roundtrip a la BD.

### 4.4. Modal `ActivityHistoryModal`

Se agrega soporte para vista "OM con OTs hijas":

- Cuando recibe `maintenanceOrderId` y la query devuelve `workOrders.length > 0`, renderiza:
  1. `OriginItem` arriba (si hay).
  2. Timeline de eventos a nivel OM (los del array `history` raíz).
  3. `<Separator />` con título "Órdenes de Trabajo".
  4. Lista de acordeones (uno por WO). El primero arrancará expandido si solo hay uno; si hay varios, todos colapsados por defecto.
- Cuando recibe `workOrderId` (no cambia respecto a hoy), se mantiene la vista actual de timeline plano.

#### Nuevo componente: `WorkOrderAccordion`

`src/features/Mantenimiento/components/ActivityHistory/WorkOrderAccordion.tsx`

Recibe `{ workOrder, defaultOpen }`. Cabecera: `OT-XXXX [estado]`. Contenido: timeline interno (los `TimelineItem` actuales) + chips de `kilometerAtEntry` / `engineHoursAtEntry` si aplica, sin volver a fetchear (datos ya en memoria).

#### Nuevo componente: `GroupedActionItem`

`src/features/Mantenimiento/components/ActivityHistory/GroupedActionItem.tsx`

Específico para el `action_type` `order_items_updated`. Cabecera con resumen ("Yordani actualizó la gestión de la OM (3 items agregados, 2 sectores asignados, 1 rechazo)") y al expandir muestra cada cambio listado por sección (Adds / Deletes / Sectores / Repair types / etc.). El conteo se calcula a partir de `metadata`.

#### Mapeo visual extendido

`actionConfig` en el modal se extiende con los 22 nuevos `action_type` (label, icono, color). Mantiene el formato actual.

### 4.5. Montaje del modal en las tabs faltantes

#### Paso 3 Taller — `MaintenanceOrders`

`src/features/Mantenimiento/MaintenanceOrders/components/OrderDetailDialog.tsx`: agregar botón "Ver historial" en el header del dialog que abre `ActivityHistoryModal` con el `maintenance_order_id`.

`src/features/Mantenimiento/OrderManagement/components/ManageOrderDialog.tsx`: ídem (el wizard también es paso 3, conviene tener el acceso desde ambos diálogos).

#### Paso 4 Taller — `ApprovalInbox`

`src/features/Mantenimiento/ApprovalInbox/components/_ValidationOrdersDataTable.tsx`: agregar columna o botón "Historial" en cada fila de OM pendiente de validación. Las tablas de `pending_approval` / `reassignment_requested` (que muestran tareas, no OMs) reciben el mismo botón pero abren el modal a nivel WO (extrayendo `work_order_id` desde la tarea).

#### `/operator`

Se posterga: el operario ve solo su OT actual. Si en el futuro se quiere mostrar el historial allí, se monta el modal con el `workOrderId` actual. **No se incluye en COD-422** salvo que el usuario lo pida explícitamente.

## 5. Reglas y convenciones

- Toda inserción de log se hace dentro del mismo `prisma.$transaction` que el cambio que la origina. Si la transacción falla, no queda log huérfano.
- `performed_by` siempre es `profile.id` obtenido por `requireServerAuthProfile()`. Para acciones del operario `OperatorPanel` se obtiene por su sesión específica (`getOperatorContext`).
- Las mutations existentes que YA loguean correctamente (validaciones, rechazos por item, etc.) se mantienen. Solo se refactorizan opcionalmente para usar el helper `logActivity` (consistencia, pero sin cambiar contrato).
- Los `action_type` son strings libres. La SOT del catálogo es el archivo `src/features/Mantenimiento/shared/activity-log/action-types.ts` que exporta constantes (`ACTIVITY_LOG.WO_STARTED = 'wo_started'`, etc.) para evitar typos.
- Los textos en español de cada `action_type` viven en el `actionConfig` del modal (no en BD).

## 6. Out of scope

- **No se cambia** el schema (`maintenance_activity_log` ya tiene todo lo necesario).
- **No se migran** los logs históricos (los registros existentes con `action_type` actuales siguen mostrándose igual).
- **No se agrega** historial dentro de la página `/operator`.
- **No se cubren** `getValidationHistory` ni la lógica de presentación que ya funciona.
- **No se reescriben** las mutations existentes que ya loguean (solo refactor opcional al helper).

## 7. Plan de verificación

Como no hay tests unitarios en el repo:

- `npm run check-types` debe pasar limpio.
- Verificación manual con el MCP `supabase-LOCAL` (readonly) tras cada batch de cambios: ejecutar la mutation desde la UI, consultar `SELECT * FROM maintenance_activity_log WHERE maintenance_order_id = '...' ORDER BY performed_at DESC LIMIT 10` y confirmar que el log apareció con los campos esperados.
- Verificación manual de la UI con datos reales (login DEV) para los flujos:
  - Crear OM → asignar items a sectores → generar OTs → ver historial desde OM (tres entradas + acordeones por OT).
  - Como operario: iniciar OT → completar 2 reparaciones → pausar → reanudar → cerrar. Abrir historial desde la OT y confirmar 6 entradas.
  - Aprobar/rechazar/reasignar tarea desde paso 4. Confirmar que el log se ve al abrir historial desde la OT padre.
- Cypress: si hay tiempo, agregar un E2E sobre el flujo completo (no obligatorio).

## 8. Trabajo en orden

1. Crear `shared/activity-log/log-activity.ts` y `shared/activity-log/action-types.ts`.
2. Migrar las mutations existentes (que ya loguean) al helper. Cero cambios funcionales.
3. Cubrir `OrderManagement` (las 8 mutations + agrupado en `saveOrderChanges`).
4. Cubrir `MaintenanceOrders` (las 3 que faltan).
5. Cubrir `ApprovalInbox` (las 3 mutations).
6. Cubrir `OperatorPanel` (las 10 mutations).
7. Extender `getMaintenanceOrderFullActivityLog` con el detalle de OTs hijas.
8. Crear `WorkOrderAccordion` y `GroupedActionItem`.
9. Extender `actionConfig` del modal con los 22 nuevos labels/iconos.
10. Montar `ActivityHistoryModal` en `OrderDetailDialog`, `ManageOrderDialog` y `_ValidationOrdersDataTable`.
11. Verificación E2E manual.

El plan detallado de implementación con archivos concretos se redacta a continuación con `superpowers:writing-plans`.
