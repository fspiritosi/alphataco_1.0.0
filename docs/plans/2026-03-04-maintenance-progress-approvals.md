# Mantenimiento: Progreso, Aprobaciones y Bloqueo de Tareas — Plan de Implementacion

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corregir el calculo de progreso en tablas de mantenimiento, mover validaciones al paso 4 de Taller, reestructurar el paso 4 con indicadores+modales para autorizaciones/reasignaciones, y bloquear tareas pendientes de aprobacion en el panel operario.

**Architecture:** El fix de progreso modifica `calculateProgress()` en 2 archivos de columnas para contar `work_order_item_repairs` completadas vs activas (ya viajan en las queries Prisma). La reestructuracion del paso 4 reemplaza el componente `ApprovalInboxClient` con una tabla principal de ordenes `pending_workshop_validation` + indicadores clickeables que abren modales para autorizaciones/reasignaciones. El bloqueo de tareas agrega una condicion `pending_approval` en `TaskCard.tsx` del panel operario.

**Tech Stack:** Next.js 16, React 19, Prisma, Tanstack Query, shadcn/ui, moment.js, Zustand

---

## Task 1: Fix del calculo de progreso en Taller paso 3

**Files:**

- Modify: `src/features/Mantenimiento/MaintenanceOrders/table/columns.tsx:71-78`

**Context:** La funcion `calculateProgress()` cuenta items con `assigned_sector_id` (asignacion a sector). Debe contar `work_order_item_repairs` con status `completed` vs total activas. Los datos ya viajan en la query Prisma: `maintenance_order_items → work_orders → work_order_items → work_order_item_repairs { status }`.

**Step 1: Modificar `calculateProgress()` en columns.tsx**

Reemplazar lineas 71-78 con:

```typescript
function calculateProgress(order: MaintenanceOrderListItem): { total: number; completed: number; percent: number } {
  const items = order.maintenance_order_items ?? [];
  // Recolectar TODAS las reparaciones de todas las OTs
  const allRepairs = items.flatMap((item) => {
    const woItems = item.work_orders?.work_order_items ?? [];
    return woItems.flatMap((woi) => woi.work_order_item_repairs ?? []);
  });
  // Excluir cancelled y rejected del conteo
  const activeRepairs = allRepairs.filter((r) => r.status !== 'cancelled' && r.status !== 'rejected');
  const total = activeRepairs.length;
  const completed = activeRepairs.filter((r) => r.status === 'completed').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percent };
}
```

**Step 2: Verificar tipos**

Run: `npm run check-types`
Expected: PASS — los campos `work_orders.work_order_items.work_order_item_repairs.status` ya existen en `MaintenanceOrderListItem` (definido en `table/actions.server.ts:299` desde `MAINTENANCE_ORDERS_SELECT`).

**Step 3: Commit**

```
fix: corregir calculo de progreso en tabla de ordenes de mantenimiento (taller paso 3)
```

---

## Task 2: Fix del calculo de progreso en Operaciones paso 4

**Files:**

- Modify: `src/features/Mantenimiento/WorkshopTracking/workshopTrackingColumns.tsx:266-286` (columna cell)
- Modify: `src/features/Mantenimiento/WorkshopTracking/workshopTrackingColumns.tsx:374-381` (export formatter)

**Context:** La misma formula incorrecta se replica aqui. La query `WORKSHOP_TRACKING_SELECT` en `WorkshopTracking/actions.server.ts:67-122` ya incluye `work_order_item_repairs { status }` dentro de `maintenance_order_items → work_orders → work_order_items`.

**Step 1: Extraer helper y reemplazar celda de progreso**

En `workshopTrackingColumns.tsx`, agregar helper antes de la funcion `getWorkshopTrackingColumns`:

```typescript
function calculateRepairProgress(items: WorkshopTrackingListItem['maintenance_order_items']): {
  total: number;
  completed: number;
  percent: number;
} {
  const allRepairs = (items ?? []).flatMap((item) => {
    const wo = item.work_orders;
    if (!wo) return [];
    const woItems = wo.work_order_items ?? [];
    return woItems.flatMap((woi) => woi.work_order_item_repairs ?? []);
  });
  const activeRepairs = allRepairs.filter((r) => r.status !== 'cancelled' && r.status !== 'rejected');
  const total = activeRepairs.length;
  const completed = activeRepairs.filter((r) => r.status === 'completed').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percent };
}
```

Reemplazar la celda de la columna `progress` (lineas ~271-283):

```typescript
cell: ({ row }) => {
  const { percent } = calculateRepairProgress(row.original.maintenance_order_items);
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <Progress value={percent} className="h-2 flex-1" />
      <span className="text-xs text-muted-foreground">{percent}%</span>
    </div>
  );
},
```

**Step 2: Actualizar export formatter**

Reemplazar lineas 374-381:

```typescript
progress: (_val: unknown, row: WorkshopTrackingListItem) => {
  const { percent } = calculateRepairProgress(row.maintenance_order_items);
  return `${percent}%`;
},
```

**Step 3: Verificar tipos**

Run: `npm run check-types`
Expected: PASS

**Step 4: Commit**

```
fix: corregir calculo de progreso en seguimiento de taller (operaciones paso 4)
```

---

## Task 3: Filtrar `pending_workshop_validation` del paso 3 de Taller

**Files:**

- Modify: `src/features/Mantenimiento/MaintenanceOrders/table/actions.server.ts:237-248`

**Context:** Actualmente el `buildWhereClause` incluye `pending_workshop_validation` en los status por defecto. Debemos excluirlo para que esas ordenes dejen de aparecer en la tabla del paso 3.

**Step 1: Remover `pending_workshop_validation` del filtro por defecto**

En `actions.server.ts`, lineas 237-248, cambiar el array de status:

```typescript
if (!statusValues?.length) {
  where.status = {
    in: [
      'in_workshop',
      // 'pending_workshop_validation' — movido al paso 4 (Aprobaciones)
      'pending_operations_validation',
      'operations_rejected',
      'workshop_rejected',
      'completed',
    ],
  };
}
```

**Step 2: Actualizar tambien el facet de status para no incluirlo**

En la misma funcion `getMaintenanceOrdersFacets`, el facet de status ya se basa en el `buildWhereClause` que ya tiene el filtro, asi que los counts se ajustan automaticamente. No se necesita cambio adicional.

**Step 3: Actualizar pipeline counts de Taller**

Modify: `src/features/Mantenimiento/Pipeline/TallerPipeline/actions/pipeline-counts.server.ts`

El count de `in_workshop` debe ahora excluir `pending_workshop_validation`. Verificar que el count del step 3 use exactamente `status = 'in_workshop'` (sin `pending_workshop_validation`). Agregar un nuevo count para el paso 4 que incluya `pending_workshop_validation`.

Cambiar el count de `approvals` para incluir tambien las ordenes en `pending_workshop_validation`:

```typescript
// approvals: ordenes pending_workshop_validation + repairs pending_approval + repairs reassignment_requested
const [validationOrders, pendingApprovalRepairs, reassignmentRepairs] = await Promise.all([
  prisma.maintenance_orders.count({
    where: { status: 'pending_workshop_validation', ...companyFilter },
  }),
  prisma.work_order_item_repairs.count({
    where: {
      status: 'pending_approval',
      work_order_items: {
        work_orders: {
          maintenance_order_items: {
            maintenance_orders: companyFilter,
          },
        },
      },
    },
  }),
  prisma.work_order_item_repairs.count({
    where: {
      status: 'reassignment_requested',
      work_order_items: {
        work_orders: {
          maintenance_order_items: {
            maintenance_orders: companyFilter,
          },
        },
      },
    },
  }),
]);

// El total del paso 4 es la suma de las 3 categorias
const approvals = validationOrders + pendingApprovalRepairs + reassignmentRepairs;
```

**Step 4: Verificar tipos**

Run: `npm run check-types`

**Step 5: Commit**

```
refactor: mover ordenes pending_workshop_validation del paso 3 al paso 4 de taller
```

---

## Task 4: Crear server actions para el nuevo paso 4

**Files:**

- Modify: `src/features/Mantenimiento/ApprovalInbox/actions/actionsServer.ts`

**Context:** Necesitamos una nueva query para obtener las ordenes en `pending_workshop_validation` para la tabla principal del paso 4. Las queries existentes de `getPendingApprovalTasks()` y `getReturnedTasks()` siguen siendo necesarias para los modales.

**Step 1: Agregar query de ordenes pendientes de validacion**

Al final de `actionsServer.ts`, agregar:

```typescript
/**
 * Obtiene ordenes de mantenimiento pendientes de validacion del jefe de taller.
 * Estas son ordenes donde todas las OTs fueron completadas y necesitan revision.
 */
export async function getOrdersPendingValidation() {
  logger.debug('Obteniendo ordenes pendientes de validacion');

  try {
    const orders = await prisma.maintenance_orders.findMany({
      where: { status: 'pending_workshop_validation' },
      orderBy: { updated_at: 'desc' },
      select: {
        id: true,
        order_number: true,
        status: true,
        workshop_entry_date: true,
        updated_at: true,
        equipment_id: true,
        vehicles: {
          select: {
            id: true,
            domain: true,
            intern_number: true,
            serie: true,
          },
        },
        maintenance_order_items: {
          select: {
            id: true,
            is_diagnostico: true,
            assigned_sector_id: true,
            workshop_sectors: { select: { id: true, name: true } },
            work_orders: {
              select: {
                id: true,
                order_number: true,
                status: true,
                work_order_items: {
                  select: {
                    id: true,
                    work_order_item_repairs: {
                      select: { id: true, status: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return orders;
  } catch (error) {
    logger.error('Error al obtener ordenes pendientes de validacion', { data: { error } });
    throw error;
  }
}

export type ValidationOrdersData = Awaited<ReturnType<typeof getOrdersPendingValidation>>;
export type ValidationOrderItem = ValidationOrdersData[number];
```

**Step 2: Verificar tipos**

Run: `npm run check-types`

**Step 3: Commit**

```
feat: agregar query de ordenes pendientes de validacion para paso 4
```

---

## Task 5: Reestructurar componente del paso 4 de Taller

**Files:**

- Modify: `src/features/Mantenimiento/ApprovalInbox/ApprovalInboxTabContent.tsx`
- Create: `src/features/Mantenimiento/ApprovalInbox/components/ValidationOrdersTable.tsx`
- Create: `src/features/Mantenimiento/ApprovalInbox/components/PendingApprovalsIndicator.tsx`
- Create: `src/features/Mantenimiento/ApprovalInbox/components/ReassignmentIndicator.tsx`
- Modify: `src/features/Mantenimiento/ApprovalInbox/components/ApprovalInboxClient.tsx` (refactor completo)
- Modify: `src/features/Mantenimiento/ApprovalInbox/hooks/useApprovalInbox.ts`

**Context:** El paso 4 pasa de tener 2 sub-tabs (Pendientes/Reasignacion) a tener: una tabla principal de ordenes `pending_workshop_validation` + 2 indicadores clickeables que abren modales. Las acciones de validar orden se mueven desde `MaintenanceOrders/actions/actionsServer.ts` (ya existen: `workshopChiefValidateOrder`, `workshopChiefReturnOrder`, `workshopChiefRejectItems`).

**Step 1: Actualizar ApprovalInboxTabContent.tsx (Server Component)**

Agregar `getOrdersPendingValidation()` al Promise.all:

```typescript
import { getActiveWorkshopSectors } from '../../OrderManagement/actions/actionsServer';
import { getOrdersPendingValidation, getPendingApprovalTasks, getReturnedTasks } from './actions/actionsServer';
import { ApprovalInboxClient } from './components/ApprovalInboxClient';

export async function ApprovalInboxTabContent() {
  const [validationOrders, pendingTasks, returnedTasks, sectorsData] = await Promise.all([
    getOrdersPendingValidation(),
    getPendingApprovalTasks(),
    getReturnedTasks(),
    getActiveWorkshopSectors(),
  ]);

  const sectors = sectorsData.map((s) => ({ id: s.id, name: s.name }));

  return (
    <ApprovalInboxClient
      initialValidationOrders={validationOrders}
      initialPendingTasks={pendingTasks}
      initialReturnedTasks={returnedTasks}
      sectors={sectors}
    />
  );
}
```

**Step 2: Crear ValidationOrdersTable.tsx**

Componente que renderiza la tabla de ordenes `pending_workshop_validation`. Cada fila muestra: N orden, equipo (dominio), sectores completados, fecha de ingreso. Acciones: Validar (abre dialog para elegir supervisor de ops), Devolver a taller, Rechazar items. Usa las acciones existentes de `MaintenanceOrders/actions/actionsServer.ts`.

**Step 3: Crear PendingApprovalsIndicator.tsx**

Badge clickeable que muestra el count de tareas `pending_approval`. Al hacer click abre un `Dialog` con la lista actual de tareas (migrada desde el tab "pendientes" del componente viejo). Acciones: Aprobar, Rechazar con razon.

**Step 4: Crear ReassignmentIndicator.tsx**

Badge clickeable con count de tareas `reassignment_requested`. Al hacer click abre un `Dialog` con la lista de tareas devueltas. Accion: Reasignar a otro sector.

**Step 5: Refactorizar ApprovalInboxClient.tsx**

Reemplazar el layout de tabs por:

1. Header con los 2 indicadores (PendingApprovalsIndicator + ReassignmentIndicator)
2. Tabla principal (ValidationOrdersTable)
3. Modales de validacion/rechazo/devolucion de ordenes

**Step 6: Actualizar hooks/useApprovalInbox.ts**

Agregar query key para validation orders:

```typescript
export const APPROVAL_INBOX_QUERY_KEY = ['maintenance', 'approval-inbox'] as const;
export const VALIDATION_ORDERS_KEY = [...APPROVAL_INBOX_QUERY_KEY, 'validation-orders'] as const;
export const PENDING_TASKS_KEY = [...APPROVAL_INBOX_QUERY_KEY, 'pending'] as const;
export const RETURNED_TASKS_KEY = [...APPROVAL_INBOX_QUERY_KEY, 'returned'] as const;
```

**Step 7: Verificar tipos y test visual**

Run: `npm run check-types`
Verificar en browser que el paso 4 muestra la tabla + indicadores correctamente.

**Step 8: Commit**

```
feat: reestructurar paso 4 de taller con tabla de validaciones e indicadores para aprobaciones/reasignaciones
```

---

## Task 6: Bloquear tareas `pending_approval` en el panel operario

**Files:**

- Modify: `src/features/OperatorPanel/components/WorkOrderDetail/TaskCard.tsx:60-85`
- Modify: `src/features/OperatorPanel/components/WorkOrderDetail/TaskList.tsx:72-80`

**Context:** `TaskCard.tsx` ya tiene logica de bloqueo (`isBlockedByDiag`, `isBlockedByPending`, `isReassignmentRequested`). Solo falta agregar `isPendingApproval` como otra condicion de bloqueo. El status `pending_approval` ya viene en los datos de `work_order_item_repairs`.

**Step 1: Agregar condicion `isPendingApproval` en TaskCard.tsx**

En linea ~60, agregar:

```typescript
const isPendingApproval = repair.status === 'pending_approval';
```

En la logica de `borderColor` (lineas 65-71), agregar caso para `pending_approval`:

```typescript
const borderColor = isCompleted
  ? 'border-l-emerald-400'
  : isRejected
    ? 'border-l-red-500'
    : isReassignmentRequested
      ? 'border-l-orange-400'
      : isPendingApproval
        ? 'border-l-amber-400'
        : 'border-l-slate-300 dark:border-l-slate-600';
```

En la clase del contenedor (linea 77), agregar `isPendingApproval`:

```typescript
} ${isBlockedByDiag || isBlockedByPending || isPendingApproval ? 'opacity-30 pointer-events-none' : ''}`}
```

En el checkbox disabled (linea 85), agregar `isPendingApproval`:

```typescript
disabled={isBlockedByDiag || isBlockedByPending || isReassignmentRequested || isPendingApproval || isMutating}
```

**Step 2: Agregar badge visual de "Pendiente de aprobacion"**

Despues de los badges existentes de criticidad (linea ~109), agregar:

```typescript
{isPendingApproval && (
  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600">
    <Lock className="h-2.5 w-2.5 mr-0.5" />
    Pend. aprobacion
  </Badge>
)}
```

Importar `Lock` de `lucide-react`.

**Step 3: Bloquear boton "Devolver" para tareas pending_approval**

En TaskCard.tsx, el boton de "Devolver tarea" no debe estar disponible si la tarea esta en `pending_approval`. Verificar y agregar condicion.

**Step 4: Verificar tipos**

Run: `npm run check-types`

**Step 5: Commit**

```
fix: bloquear tareas pendientes de aprobacion en panel operario
```

---

## Task 7: Cache invalidation cruzada

**Files:**

- Modify: `src/features/Mantenimiento/ApprovalInbox/components/ApprovalInboxClient.tsx` (o los nuevos componentes del paso 4)
- Modify: `src/features/OperatorPanel/components/AddTaskDialog.tsx`
- Verify: `src/features/Mantenimiento/utils/queryInvalidation.ts`

**Context:** Cuando el jefe de taller aprueba/rechaza una tarea en paso 4, el panel operario debe reflejarlo. Cuando un operario agrega una tarea autorizable, el paso 4 debe reflejarlo.

**Step 1: En ApprovalInboxClient (paso 4) — al aprobar/rechazar**

Despues de cada mutation exitosa (approveTask, rejectTask, reassignTask, validateOrder, returnOrder, rejectItems), llamar `invalidateAllMaintenanceQueries(queryClient)` (ya se hace actualmente — verificar que se mantenga).

**Step 2: En AddTaskDialog — al agregar tarea autorizable**

Despues de la mutation exitosa, verificar que se invalida `invalidateAllMaintenanceQueries(queryClient)`. Actualmente ya se hace en lineas 122-123. Verificar que esto cubra las query keys del ApprovalInbox.

**Step 3: Verificar query keys en queryInvalidation.ts**

Leer `src/features/Mantenimiento/utils/queryInvalidation.ts` y verificar que `invalidateAllMaintenanceQueries` invalida las keys de ApprovalInbox (`['maintenance', 'approval-inbox']`).

**Step 4: Commit si hay cambios**

```
fix: asegurar invalidacion de cache cruzada entre panel operario y aprobaciones de taller
```

---

## Task 8: Verificacion final y cleanup

**Files:** Todos los modificados

**Step 1: Verificar tipos**

Run: `npm run check-types`
Expected: PASS sin errores

**Step 2: Verificar lint**

Run: `npm run lint`
Expected: PASS (o warnings preexistentes)

**Step 3: Test manual en browser**

Verificar:

1. Taller paso 3: progreso correcto (basado en reparaciones)
2. Operaciones paso 4: progreso correcto (misma formula)
3. Taller paso 3: ordenes `pending_workshop_validation` NO aparecen
4. Taller paso 4: tabla de validaciones con acciones
5. Taller paso 4: indicadores de autorizaciones y reasignaciones funcionales
6. Panel operario: tarea autorizable bloqueada con badge
7. Cache: al aprobar tarea en paso 4, se refleja en panel operario

**Step 4: Commit final si hay ajustes**

```
chore: ajustes finales de la reestructuracion de aprobaciones
```
