# Preventive Maintenance — Views Adaptation Design

> Adaptaciones en las tabs Operaciones y Taller del modulo Mantenimiento para manejar correctamente ordenes de tipo `source='preventive'` que NO tienen items/desvios tradicionales.

**Prerequisito:** Plan `2026-03-27-preventive-maintenance-wizard.md` implementado (campos `source`, `preventive_type` en `maintenance_requests` y `maintenance_orders`, constantes en `shared/preventive-maintenance.ts`).

---

## Problema

Las ordenes de mantenimiento preventivo se crean sin `maintenance_request_items` ni `maintenance_order_items` (0 items). A lo largo de las 2 tabs (Operaciones y Taller), cada paso tiene tablas con columna "Items" y modales que listan desvios/items. Cuando llega una orden preventiva, esas secciones quedan vacias o muestran "0 items" sin contexto, generando confusion.

## Principio de diseno

- **Donde hoy se muestra una lista de items vacia**, reemplazar con una card informativa del tipo de mantenimiento preventivo.
- **Donde hoy se opera por item** (aprobar/rechazar individualmente), operar sobre la solicitud/pedido completo como unidad.
- **En columnas de tabla**, mostrar badge "Preventivo" con tooltip que muestra el tipo completo.
- **Si el usuario agrego items manualmente** (en el wizard de gestion, Step 1), mostrar AMBOS: la card preventiva + la lista de items.

---

## Componente reutilizable: PreventiveInfoCard

Crear un componente compartido que se use en todos los modales donde se necesite mostrar la info preventiva en lugar de la lista de items.

### Ubicacion

`src/features/Mantenimiento/components/PreventiveInfoCard.tsx`

### Props

```typescript
interface PreventiveInfoCardProps {
  preventiveType: string; // key del tipo (ej: 'light_fleet')
  className?: string;
  showDescription?: boolean; // default: true
}
```

### UI

```
┌─────────────────────────────────────────────────────┐
│  🛡  Mantenimiento Preventivo                       │
│                                                     │
│  [Badge: icono + nombre completo del tipo]          │
│  Descripcion del tipo (si showDescription=true)     │
└─────────────────────────────────────────────────────┘
```

- Fondo: `bg-muted/50`, bordes redondeados, padding `p-4`
- Titulo: "Mantenimiento Preventivo" con icono `Shield`
- Badge: `variant="secondary"` con el icono del tipo (`PREVENTIVE_TYPE_ICONS`) + label completo (`PREVENTIVE_TYPES`)
- Descripcion: texto `text-muted-foreground text-sm` con `PREVENTIVE_TYPE_DESCRIPTIONS`

### Logica adicional para items manuales

En los modales donde ya existan items (agregados manualmente en el wizard), mostrar la `PreventiveInfoCard` ARRIBA de la lista de items. Es decir, ambos coexisten: card preventiva + items agregados.

Condicion: `source === 'preventive' && items.length > 0` → mostrar card + lista de items.
Condicion: `source === 'preventive' && items.length === 0` → mostrar solo card.

---

## Componente reutilizable: PreventiveItemsBadge (columna de tabla)

Para estandarizar el badge + tooltip en todas las columnas "Items" de las tablas.

### Ubicacion

`src/features/Mantenimiento/components/PreventiveItemsBadge.tsx`

### Props

```typescript
interface PreventiveItemsBadgeProps {
  preventiveType: string; // key del tipo (ej: 'light_fleet')
}
```

### UI

```
┌──────────────┐
│ 🛡 Preventivo │  ← Badge variant="outline"
└──────┬───────┘
       │ hover
       ▼
┌─────────────────────────────────────┐
│ Mantenimiento Preventivo            │  ← titulo
│ Flota Liviana                       │  ← PREVENTIVE_TYPES[key]
│ Intervalos por kilometros           │  ← PREVENTIVE_TYPE_DESCRIPTIONS[key]
└─────────────────────────────────────┘
```

- Badge: `variant="outline"` con icono `Shield` + texto "Preventivo"
- Tooltip: `TooltipProvider > Tooltip > TooltipTrigger` envolviendo el badge
- TooltipContent: titulo bold + nombre del tipo + descripcion en `text-xs text-muted-foreground`

---

## Tab OPERACIONES — 4 Pasos

### Step 1: Validar Solicitud

#### Columna "Items" — `SolicitudesMantenimiento/components/columns.tsx`

- **Hoy:** `{items.length} desvio(s)` sin check preventivo
- **Cambio:** Si `request.source === 'preventive'` y `items.length === 0`, renderizar `<PreventiveItemsBadge preventiveType={request.preventive_type} />`
- **Dato disponible:** `request.source` y `request.preventive_type` deben estar en la query. Verificar que el select en el server action incluya estos campos.

#### SolicitudApprovalDialog — CAMBIO MAYOR

- **Hoy:** Workflow por item: divide items en criticos/no-criticos, cada uno con Aprobar/Rechazar/Cambiar + comment + rejection reason. Boton "Procesar Solicitud" al final.
- **Cambio para preventivo:** Cuando `request.source === 'preventive'`:
  1. En lugar de la lista de items, mostrar `<PreventiveInfoCard>` con el tipo.
  2. Debajo de la card: dos opciones claras:
     - "Aprobar Solicitud" (boton verde) — aprueba la solicitud completa
     - "Rechazar Solicitud" (boton rojo) — muestra textarea de motivo obligatorio, luego rechaza
  3. Textarea opcional de "Comentario del validador" (misma que existe hoy por item, pero ahora a nivel solicitud).
  4. **Server action:** Reutilizar `useApproveMaintenanceRequestItems` pasando `approvedItems: []` y `rejectedItems: []` con un nuevo campo `preventiveApproval: true` en el payload. El server action detecta este flag y actualiza el status de la request completa a `approved` sin iterar items. Si se rechaza, pasar `preventiveRejection: true` con `reason`. Esto evita crear server actions nuevos y mantiene el flujo unificado.

#### SolicitudRejectDialog — CAMBIO MAYOR

- **Hoy:** Checkbox list de items pendientes + motivo compartido + boton "Rechazar (N)".
- **Cambio para preventivo:** Cuando `request.source === 'preventive'`:
  1. En lugar de la lista de checkboxes, mostrar `<PreventiveInfoCard>`.
  2. Textarea de motivo de rechazo (obligatorio, mismo que hoy).
  3. Boton "Rechazar Solicitud" (sin count, ya que no hay items individuales).
  4. **Server action:** Reutilizar `useRejectMaintenanceRequestItems` pasando `itemIds: []` y `preventiveRejection: true` con `reason`. El server action detecta el flag y rechaza la request completa.

#### Modales sin cambio

- `SolicitudDetailDialog` — YA maneja preventivo
- `ReassignSupervisorDialog` — No involucra items
- `ActivityHistoryModal` — No involucra items

---

### Step 2: Aprobar Fecha

#### Columna "Items" — `PendientesEjecutar/columns.tsx`

- **Hoy:** `{items.length} item(s)` sin check preventivo
- **Cambio:** Si `order.source === 'preventive'` (o `order.maintenance_requests?.source === 'preventive'`) y `items.length === 0`, renderizar `<PreventiveItemsBadge>`.
- **Dato disponible:** Verificar que la query del server action incluya `source` y `preventive_type` en la orden o en la request asociada.

#### PendienteDetailDialog — CAMBIO MEDIANO

- **Hoy:** Muestra lista de desvios con repair type badges y ItemComments.
- **Cambio:** Si `source === 'preventive'`:
  - Reemplazar seccion "Desvios del Pedido (N)" por `<PreventiveInfoCard>`.
  - Si hay items manuales (`items.length > 0`), mostrar AMBOS: card + lista.

#### AprobarFechaDialog — CAMBIO MEDIANO

- **Hoy:** Muestra equipo + fecha + lista de items agrupados por tipo de reparacion + boton "Aprobar Fecha".
- **Cambio:** Si `source === 'preventive'`:
  - Reemplazar seccion "Items a Reparar" por `<PreventiveInfoCard>`.
  - Si hay items manuales, mostrar AMBOS: card + lista.
  - El boton "Aprobar Fecha" y su server action NO cambian — la fecha se aprueba igual.

#### RechazarFechaDialog — CAMBIO MEDIANO

- **Hoy:** Muestra equipo + fecha + lista de items + textarea motivo + boton "Rechazar Fecha".
- **Cambio:** Si `source === 'preventive'`:
  - Reemplazar lista de items por `<PreventiveInfoCard>`.
  - Si hay items manuales, mostrar AMBOS.
  - El textarea de motivo y el boton "Rechazar Fecha" NO cambian.

---

### Step 3: Para Taller

#### Columna "Items" — `Operaciones/ParaTaller/columns.tsx`

- **Hoy:** `{count} item(s)` sin check preventivo
- **Cambio:** Si `source === 'preventive'` y `count === 0`, renderizar `<PreventiveItemsBadge>`.

#### Modales sin cambio

- `ParaTallerDetailDialog` — YA maneja preventivo
- `ActivityHistoryModal` — No involucra items

---

### Step 4: Seguimiento

#### Sin columna "Items" — Tiene columnas Progress y Sector Journey. Sin cambio en columnas.

#### OrderDetailDialog (context="operations") — CAMBIO MENOR

- **Hoy:** En la grilla de info del vehiculo, muestra "Origen: Preventivo" como texto plano.
- **Cambio:** Cuando `source === 'preventive'`:
  - Junto a "Origen: Preventivo", agregar badge con el tipo preventivo: `<Badge variant="secondary">{icon} {PREVENTIVE_TYPES[preventive_type]}</Badge>`
  - Opcionalmente, si no hay sectors/work orders aun, mostrar `<PreventiveInfoCard>` debajo de la grilla de info (en lugar de las SectorCards vacias).

---

## Tab TALLER — 4 Pasos

### Step 1: Por Programar

#### Columna "Items" (activa) — `PedidosMantenimiento/Pendientes/columns.tsx`

- **Hoy:** YA muestra `<Badge>Preventivo</Badge>` cuando count=0 y source='preventive'. PERO sin tooltip.
- **Cambio:** Reemplazar el badge actual por `<PreventiveItemsBadge>` para agregar tooltip con tipo completo.

#### Columna "Items" (legacy) — `PedidosMantenimiento/Pendientes/components/columns.tsx`

- **Hoy:** Sin check preventivo.
- **Cambio:** Agregar misma logica: si count=0 y source='preventive', renderizar `<PreventiveItemsBadge>`.

#### PlanificarPedidoDialog — CAMBIO MEDIANO

- **Hoy:** Muestra equipo + km/horometro + date input + lista de items agrupados por tipo de reparacion + boton "Confirmar Planificacion".
- **Cambio:** Si `source === 'preventive'`:
  - Reemplazar seccion "Items a reparar (N)" por `<PreventiveInfoCard>`.
  - Si hay items manuales, mostrar AMBOS: card + lista.
  - El date input y el boton "Confirmar Planificacion" NO cambian.

#### Modales sin cambio

- `PedidoDetailDialog` — YA maneja preventivo
- `ActivityHistoryModal` — No involucra items

---

### Step 2: Confirmados

#### Columna "Items" (activa) — `PedidosMantenimiento/Confirmados/columns.tsx`

- **Hoy:** YA muestra `<Badge>Preventivo</Badge>` cuando items.length=0 y source='preventive'. PERO sin tooltip.
- **Cambio:** Reemplazar por `<PreventiveItemsBadge>`.

#### Columna "Items" (legacy) — `PedidosMantenimiento/Confirmados/components/columns.tsx`

- **Hoy:** Sin check preventivo.
- **Cambio:** Agregar logica: si count=0 y source='preventive', renderizar `<PreventiveItemsBadge>`.

#### EntradaTallerDialog — CAMBIO MEDIANO

- **Hoy:** Muestra advertencia + info actual + lista de items + inputs km/horometro + boton "Confirmar Entrada".
- **Cambio:** Si `source === 'preventive'`:
  - Reemplazar lista "Items a Reparar" por `<PreventiveInfoCard>`.
  - El "Items a reparar" count en la info panel muestra "Preventivo" en lugar de "0".
  - Si hay items manuales, mostrar AMBOS: card + lista.
  - Los inputs de km/horometro y el boton "Confirmar Entrada" NO cambian.

#### Modales sin cambio

- `PedidoDetailDialog` — YA maneja preventivo (compartido)
- `ActivityHistoryModal` — No involucra items

---

### Step 3: En Taller

#### Sin columna "Items" — Tiene Progress y Sector Actual.

#### OrderDetailDialog (context="workshop") — CAMBIO MENOR

- Mismo cambio que Operaciones Step 4: badge preventive_type junto al origen.

#### ManageOrderWizard

- Step 1 — YA maneja preventivo (card informativa + "Puede agregar items manualmente").
- Steps 2-4 — Flujo normal si se agregaron items manualmente. Sin cambio.

---

### Step 4: Aprobaciones

#### Sin columna "Items" — Tiene Progress y Sectores.

#### OrderDetailDialog (context="workshop") — Mismo cambio menor.

#### Modales de Autorizaciones/Reasignaciones — Sin cambio (trabajan sobre tasks individuales de work orders, no sobre items de la orden).

---

## Datos necesarios en queries

Para que los cambios funcionen, las queries de cada server action deben incluir los campos `source` y `preventive_type`. Verificar en cada server action:

| Server Action                                   | Campos necesarios                                                                | Verificar        |
| ----------------------------------------------- | -------------------------------------------------------------------------------- | ---------------- |
| `getMaintenanceRequests` (Solicitudes)          | `source`, `preventive_type` en `maintenance_requests`                            | query select     |
| `getPendingExecutionOrders` (Aprobar Fecha)     | `source`, `preventive_type` en `maintenance_orders` o via `maintenance_requests` | query include    |
| `getForWorkshopOrders` (Para Taller)            | `source`, `preventive_type` en `maintenance_orders` o via `maintenance_requests` | query include    |
| `getWorkshopTrackingOrders` (Seguimiento)       | `source`, `preventive_type` en `maintenance_orders`                              | query include    |
| `getPendingOrders` (Por Programar)              | `source`, `preventive_type` — YA incluidos en la query activa                    | verificar legacy |
| `getConfirmedOrders` (Confirmados)              | `source`, `preventive_type` — verificar ambas queries                            | verificar legacy |
| `getMaintenanceOrderDetail` (OrderDetailDialog) | `source`, `preventive_type` en `maintenance_orders`                              | query include    |

---

## Resumen de archivos

### Crear (2 archivos nuevos)

| Archivo                                                          | Descripcion                                |
| ---------------------------------------------------------------- | ------------------------------------------ |
| `src/features/Mantenimiento/components/PreventiveInfoCard.tsx`   | Card informativa reutilizable              |
| `src/features/Mantenimiento/components/PreventiveItemsBadge.tsx` | Badge + tooltip reutilizable para columnas |

### Modificar — Columnas de tabla (7 archivos)

| Archivo                                                   | Cambio                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| `SolicitudesMantenimiento/components/columns.tsx`         | Agregar PreventiveItemsBadge                               |
| `PendientesEjecutar/columns.tsx`                          | Agregar PreventiveItemsBadge                               |
| `Operaciones/ParaTaller/columns.tsx`                      | Agregar PreventiveItemsBadge                               |
| `PedidosMantenimiento/Pendientes/columns.tsx`             | Reemplazar badge actual por PreventiveItemsBadge (tooltip) |
| `PedidosMantenimiento/Pendientes/components/columns.tsx`  | Agregar PreventiveItemsBadge (legacy)                      |
| `PedidosMantenimiento/Confirmados/columns.tsx`            | Reemplazar badge actual por PreventiveItemsBadge (tooltip) |
| `PedidosMantenimiento/Confirmados/components/columns.tsx` | Agregar PreventiveItemsBadge (legacy)                      |

### Modificar — Modales con cambio mayor (2 archivos)

| Archivo                                                           | Cambio                                  |
| ----------------------------------------------------------------- | --------------------------------------- |
| `SolicitudesMantenimiento/components/SolicitudApprovalDialog.tsx` | Branch preventivo: aprobar como unidad  |
| `SolicitudesMantenimiento/components/SolicitudRejectDialog.tsx`   | Branch preventivo: rechazar como unidad |

### Modificar — Modales con cambio mediano (5 archivos)

| Archivo                                                      | Cambio                               |
| ------------------------------------------------------------ | ------------------------------------ |
| `PendientesEjecutar/components/PendienteDetailDialog.tsx`    | PreventiveInfoCard en lugar de items |
| `PendientesEjecutar/components/AprobarFechaDialog.tsx`       | PreventiveInfoCard en lugar de items |
| `PendientesEjecutar/components/RechazarFechaDialog.tsx`      | PreventiveInfoCard en lugar de items |
| `PedidosMantenimiento/components/PlanificarPedidoDialog.tsx` | PreventiveInfoCard en lugar de items |
| `PedidosMantenimiento/components/EntradaTallerDialog.tsx`    | PreventiveInfoCard en lugar de items |

### Modificar — Modal con cambio menor (1 archivo, usado en 3+ contextos)

| Archivo                                              | Cambio                                |
| ---------------------------------------------------- | ------------------------------------- |
| `MaintenanceOrders/components/OrderDetailDialog.tsx` | Badge preventive_type junto al origen |

### Posible modificacion — Server actions (verificar queries)

| Archivo                      | Verificar                                                   |
| ---------------------------- | ----------------------------------------------------------- |
| Server actions de cada tabla | Que `source` y `preventive_type` esten en el select/include |

**Total: 2 archivos nuevos + 15 archivos modificados + N server actions a verificar.**
