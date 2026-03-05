# Mantenimiento: Progreso, Aprobaciones y Bloqueo de Tareas

**Fecha**: 2026-03-04
**Estado**: Aprobado

## Contexto

El modulo de mantenimiento tiene dos pipelines principales (Operaciones y Taller), cada uno con 4 pasos. Este diseno cubre 4 areas de mejora:

1. Fix del calculo de progreso (Taller paso 3 + Operaciones paso 4)
2. Mover validaciones de ordenes del paso 3 al paso 4 de Taller
3. Reestructurar paso 4 de Taller para unificar aprobaciones
4. Bloquear tareas pendientes de autorizacion en el panel operario

## 1. Fix del Calculo de Progreso

### Problema

`calculateProgress()` en `columns.tsx` cuenta items con `assigned_sector_id` (asignacion a sector), no completitud real de reparaciones. Muestra 100% cuando todos los items tienen sector asignado, aunque las reparaciones esten a medio completar.

### Solucion

Reemplazar por calculo basado en `work_order_item_repairs.status`:

```
progreso = reparaciones_completadas / total_reparaciones_activas * 100
```

- **Completadas**: `status = 'completed'`
- **Activas** (denominador): todas excepto `cancelled` y `rejected`
- Datos vienen de: `work_orders -> work_order_items -> work_order_item_repairs`

### Archivos afectados

| Archivo                                                    | Cambio                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `MaintenanceOrders/table/columns.tsx`                      | Nueva formula `calculateProgress()`                                  |
| `MaintenanceOrders/actions/actionsServer.ts`               | Asegurar que la query Prisma traiga `work_order_item_repairs.status` |
| `WorkshopTracking/_WorkshopTrackingDataTable.tsx`          | Misma formula de progreso                                            |
| `WorkshopTracking/actions` (server action correspondiente) | Asegurar que la query Prisma traiga los datos necesarios             |

### Ejemplo

Orden con 2 OTs:

- OT Sector A: 2 reparaciones (1 completa, 1 pendiente)
- OT Sector B: 1 reparacion (completa)
- Progreso = 2/3 = 67%

## 2. Mover Validaciones del Paso 3 al Paso 4 de Taller

### Cambio

Las ordenes con `status = 'pending_workshop_validation'` dejan de mostrarse en paso 3 ("En Taller") y se mueven al paso 4 ("Aprobaciones").

### Paso 3 — Filtrado

La query del paso 3 filtra: `status IN ('in_workshop', 'workshop_rejected')`, excluyendo `pending_workshop_validation`.

### Paso 4 — Nueva tabla principal

La tabla principal del paso 4 muestra ordenes en `pending_workshop_validation`. Acciones disponibles:

- **Validar**: Asignar supervisor de operaciones y enviar a validacion de ops
- **Devolver a taller**: Reabrir OTs y devolver la orden al taller
- **Rechazar items**: Rechazar reparaciones especificas

## 3. Reestructuracion del Paso 4 de Taller

### Layout

```
+----------------------------------------------------+
|  [Autorizaciones (3)]  [Reasignaciones (1)]        |  <- indicadores clickeables con badge
+----------------------------------------------------+
|                                                    |
|  TABLA: Ordenes pendientes de validacion           |
|  (ordenes con status pending_workshop_validation)  |
|  Columnas: N Orden, Equipo, Sectores, Acciones     |
|                                                    |
+----------------------------------------------------+

Click en [Autorizaciones]:
  -> Modal con lista de work_order_item_repairs en pending_approval
  -> Acciones: Aprobar (-> pending) o Rechazar (-> rejected)

Click en [Reasignaciones]:
  -> Modal con lista de work_order_item_repairs en reassignment_requested
  -> Accion: Reasignar a otro sector (-> pending)
```

### Componentes

- **Tabla principal**: Nueva tabla Prisma con ordenes `pending_workshop_validation`
- **Indicadores**: Badges clickeables con contadores server-side
- **Modal Autorizaciones**: Lista de tareas `pending_approval` con acciones aprobar/rechazar
- **Modal Reasignaciones**: Lista de tareas `reassignment_requested` con accion reasignar

### Counter del paso 4

Suma de: ordenes en `pending_workshop_validation` + repairs en `pending_approval` + repairs en `reassignment_requested`.

## 4. Bloqueo de Tareas Pendientes de Autorizacion

### Problema

Cuando un operario agrega una tarea con tipo de reparacion `autorizable=true`, la tarea queda disponible inmediatamente para ejecutar, sin esperar aprobacion del jefe de taller.

### Solucion

#### Creacion

Al agregar tarea desde `AddTaskDialog` en panel operador:

- Si `type_of_repair.autorizable = true` -> crear `work_order_item_repair` con `status = 'pending_approval'`
- Si `type_of_repair.autorizable = false` -> crear con `status = 'pending'` (comportamiento actual)

#### Vista del operario

En `WorkOrderDetail` del panel operador:

- Tareas con `status = 'pending_approval'` se muestran con badge "Pendiente de aprobacion" y candado
- Botones de accion (iniciar, completar, devolver) DESHABILITADOS
- El operario ve la tarea pero no puede interactuar hasta aprobacion

#### Flujo de aprobacion

1. Operario agrega tarea autorizable -> `status = 'pending_approval'`
2. Jefe de taller ve en paso 4, indicador "Autorizaciones"
3. Aprueba -> `status = 'pending'` -> operario puede ejecutar
4. Rechaza -> `status = 'rejected'` -> tarea sale del flujo

### Archivos afectados

| Archivo                                        | Cambio                                      |
| ---------------------------------------------- | ------------------------------------------- |
| `OperatorPanel/actions/actionsServer.ts`       | Crear con `pending_approval` si autorizable |
| `OperatorPanel/components/AddTaskDialog.tsx`   | Consultar `autorizable` del repair type     |
| `OperatorPanel/components/WorkOrderDetail.tsx` | Deshabilitar acciones si `pending_approval` |

## 5. Cache Invalidation

### Al aprobar/rechazar en paso 4 (Taller)

Invalidar:

- `['operator-work-order-detail', workOrderId]` — panel operario
- `['taller-pipeline-counts']` — badges de pasos
- `['approval-inbox']` — propio paso 4

### Al agregar tarea autorizable desde panel operario

Invalidar:

- `['approval-inbox']` o query de pending-approval-tasks — paso 4 de taller
- `['taller-pipeline-counts']` — actualizar contador

### Al devolver tarea (reasignacion)

Invalidar:

- `['approval-inbox']` — paso 4 de taller
- `['taller-pipeline-counts']` — actualizar contador

## 6. Reglas Tecnicas

- **Prisma** para TODAS las queries (NO Supabase directo)
- **Logger** en lugar de console.\*
- **Tipos inferidos** con `Awaited<ReturnType<typeof fn>>`
- **moment.js** para fechas
- **PermissionGuard** en botones de accion
- **useQuery** para fetching client-side con invalidacion
