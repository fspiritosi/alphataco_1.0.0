# Diseño: Mantenimiento Preventivo en Wizard de Nuevo Pedido

**Fecha**: 2026-03-26
**Branch**: `feat/preventive-maintenance-wizard`
**Origen**: `/dashboard/maintenance?tab=nuevo_pedido`

---

## 1. Contexto

El wizard de "Nuevo Pedido" tiene 5 pasos: Equipo → Checklist → Items → Supervisor → Confirmar. Actualmente solo soporta el flujo de checklist (seleccionar template, marcar desvíos, asignar supervisor).

Se necesita agregar una segunda vía: **Mantenimiento Preventivo**. Cuando el usuario elige esta opción, selecciona uno de 4 programas estandarizados y el paso de ítems se omite. El taller ya sabe qué tareas realizar según el programa (documentado en ANEXO I PO 01).

## 2. Las 4 opciones de Mantenimiento Preventivo

Estáticas, hardcodeadas. No se administran desde la UI.

| Key              | Label                                  | Descripción corta                 | Icono       |
| ---------------- | -------------------------------------- | --------------------------------- | ----------- |
| `light_fleet`    | Mantenimiento Preventivo Flota Liviana | Intervalos por kilómetros         | `Car`       |
| `heavy_fleet`    | Mantenimiento Preventivo Flota Pesada  | Intervalos por horas/kilómetros   | `Truck`     |
| `summer_program` | Programa de Verano                     | Inspección por altas temperaturas | `Sun`       |
| `winter_program` | Programa de Invierno                   | Inspección por bajas temperaturas | `Snowflake` |

## 3. Enfoque elegido: Stepper Dinámico

El array de steps se define según la selección del paso 1:

```
Checklist:    [Equipo] → [Checklist + Template] → [Items] → [Supervisor] → [Confirmar]  (5 pasos)
Preventivo:   [Equipo] → [Preventivo + Opción]  →          [Supervisor] → [Confirmar]  (4 pasos)
```

El stepper lateral refleja los pasos reales. Sin pasos vacíos ni de relleno.

## 4. Modelo de Datos

### Nuevos campos

```sql
ALTER TABLE maintenance_requests ADD COLUMN preventive_type TEXT;
ALTER TABLE maintenance_orders ADD COLUMN preventive_type TEXT;
```

- `preventive_type`: Nullable. Solo tiene valor cuando `source = 'preventive'`. Valores posibles: `'light_fleet'`, `'heavy_fleet'`, `'summer_program'`, `'winter_program'`.
- `source`: Ya es `String` sin restricción. Se agrega el valor `'preventive'` (coexiste con `'checklist'` y `'manual'`).

### Cadena de datos por flujo

```
Flujo checklist:   request → request_items → order → order_items  (con checklist_deviations)
Flujo preventivo:  request (preventive_type) → order (preventive_type)  (SIN items)
```

Para preventivos NO se crean: `checklist_deviations`, `maintenance_request_items`, `maintenance_order_items`.

### Constantes compartidas (nuevo archivo)

```typescript
// src/features/Mantenimiento/shared/preventive-maintenance.ts

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

export const SOURCE_LABELS_EXTENDED = {
  checklist: 'Checklist',
  manual: 'Manual',
  preventive: 'Preventivo',
} as const;
```

## 5. UI del Wizard

### Paso 1 Modificado

En la parte superior del paso 1, se agregan 2 Cards clickeables como selector de tipo:

- **Card "Checklist"**: Icono ClipboardList + "Desde desvíos de inspección". Al seleccionar, muestra la lista de templates (comportamiento actual).
- **Card "Mant. Preventivo"**: Icono Wrench + "Programa planificado de mantenimiento". Al seleccionar, muestra grid 2x2 con las 4 opciones.

Separador (`<Separator />`) entre el selector de tipo y el contenido condicional.

Las 4 opciones preventivas se muestran como Cards en `grid-cols-2 gap-3`, cada una con icono Lucide grande, título y descripción de 1 línea. Selección con `border-primary bg-primary/5`.

### Stepper Dinámico

```typescript
const CHECKLIST_STEPS = [
  { title: 'Equipo', icon: Truck },
  { title: 'Checklist', icon: ClipboardList },
  { title: 'Items', icon: AlertTriangle },
  { title: 'Supervisor', icon: User },
  { title: 'Confirmar', icon: CheckCircle },
];

const PREVENTIVE_STEPS = [
  { title: 'Equipo', icon: Truck },
  { title: 'Preventivo', icon: Wrench },
  { title: 'Supervisor', icon: User },
  { title: 'Confirmar', icon: CheckCircle },
];
```

Al cambiar de tipo, se resetean las selecciones posteriores y el stepper se actualiza.

### Validaciones por paso

```
Paso 0 (Equipo):      selectedEquipmentId no vacío  (sin cambios)
Paso 1 (Tipo):
  - Si checklist: selectedTemplateId no vacío
  - Si preventivo: selectedPreventiveType no vacío
Paso 2 (Items):        Solo existe en flujo checklist. selectedDeviations.length > 0
Paso N-1 (Supervisor): Sin cambios respecto al actual
Paso N (Confirmar):    Sin cambios respecto al actual
```

### Paso de Confirmación (preventivo)

En lugar de la lista de ítems, muestra:

- Equipo (dominio/serie + km + horómetro)
- Badge "Mantenimiento Preventivo" + Badge con el programa seleccionado
- Descripción corta del programa
- Supervisor asignado
- Estado inicial (Pendiente de Planificación / Pendiente de Aprobación)

## 6. Server Actions

Se extienden las 2 funciones existentes para aceptar input preventivo:

### `createMaintenanceOrderFromDeviations` (supervisor directo)

Recibe campo adicional opcional: `source?: 'preventive'`, `preventiveType?: PreventiveType`.

Si `source === 'preventive'`:

1. NO crear `checklist_deviations`
2. Crear `maintenance_request` con `source: 'preventive'`, `preventive_type: X`, `status: 'approved'`
3. NO crear `maintenance_request_items`
4. Crear `maintenance_order` con `source: 'preventive'`, `preventive_type: X`, `status: 'pending_scheduling'`
5. NO crear `maintenance_order_items`
6. Log con metadata `{ source: 'preventive', preventive_type: X }`

Else: flujo actual sin cambios.

### `createMaintenanceRequestPendingApproval` (no supervisor)

Mismo patrón: si `source === 'preventive'`, saltar creación de deviations e items.

## 7. Impacto Downstream

### 7.1 Labels y Filtros (cambio mecánico)

| Archivo                                        | Cambio                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `PedidosMantenimiento/Confirmados/columns.tsx` | Agregar `preventive: 'Preventivo'` a `SOURCE_LABELS`, `preventive: Shield` a `SOURCE_ICONS` |
| `SolicitudesMantenimiento/tableColumns.tsx`    | Agregar `preventive: 'Preventivo'` a `SOURCE_LABELS`                                        |

Los filtros facetados de `source` (groupBy en Prisma) reconocen el valor automáticamente.

### 7.2 Diálogos de detalle (~5 archivos con cambio visual)

Donde se itera sobre items, agregar condicional:

```tsx
{source === 'preventive' ? (
  <PreventiveTypeBadge type={preventive_type} />
) : (
  items.map(item => /* renderizado actual */)
)}
```

Archivos afectados:

- `PedidosMantenimiento/components/PedidoDetailDialog.tsx`
- `MaintenanceOrders/components/OrderDetailDialog.tsx`
- `Equipos/EquipoID/components/equipment-order-detail-dialog.tsx`
- `Operaciones/components/OperacionDetailDialog.tsx`
- `SolicitudesMantenimiento/components/SolicitudDetailDialog.tsx`

Los otros 9 diálogos que pasan `source` a `<ItemComments>` no necesitan cambios — sin items, las secciones de items no renderizan nada.

### 7.3 OrderManagement (cambio funcional)

- `Step1Tasks.tsx`: Si `source === 'preventive'` y no hay items, mostrar info del tipo preventivo + permitir agregar items manualmente.
- `ManageOrderDialog.tsx`: Pasar `source` y `preventive_type` al contexto del wizard.

### 7.4 Queries Prisma (~15 archivos, sin cambio)

Los archivos que hacen `select: { source: true }` no necesitan modificación. El nuevo valor viaja automáticamente. Solo agregar `preventive_type: true` al select donde se necesite mostrar el tipo.

### 7.5 utils/driverInfo.ts — Sin cambio

`getItemComments()` no se invoca para preventivos (no hay items).

## 8. Migración BD

Una migración Prisma:

```sql
-- prisma/migrations/YYYYMMDDHHMMSS_add_preventive_maintenance_type/migration.sql
ALTER TABLE maintenance_requests ADD COLUMN preventive_type TEXT;
ALTER TABLE maintenance_orders ADD COLUMN preventive_type TEXT;
```

Flujo: modificar schema.prisma → diff → crear carpeta → SQL → db execute → resolve → generate.

## 9. Archivos involucrados (resumen)

| Área                      | Archivos                                                               | Riesgo |
| ------------------------- | ---------------------------------------------------------------------- | ------ |
| Schema Prisma + migración | `prisma/schema.prisma` + migration SQL                                 | Bajo   |
| Constantes compartidas    | `src/features/Mantenimiento/shared/preventive-maintenance.ts` (nuevo)  | Bajo   |
| Wizard                    | `NuevoPedidoChecklistForm.tsx`                                         | Medio  |
| Server actions            | `NuevoPedido/actions/actionsServer.ts`                                 | Medio  |
| Labels columnas           | `Confirmados/columns.tsx`, `SolicitudesMantenimiento/tableColumns.tsx` | Bajo   |
| Diálogos detalle          | 5 archivos de dialog                                                   | Medio  |
| OrderManagement           | `Step1Tasks.tsx`, `ManageOrderDialog.tsx`                              | Mayor  |
| Tipos                     | `Mantenimiento/types/index.ts`                                         | Bajo   |
| Queries (agregar select)  | ~5 archivos de actions.server.ts que muestran el detalle               | Bajo   |
| **Total**                 | **~17 archivos**                                                       |        |

## 10. Fuera de alcance

- Administración de los 4 tipos preventivos (son estáticos)
- Checklist automático basado en el tipo preventivo (el taller sigue el procedimiento del PDF)
- Cambios en el flujo de aprobación de solicitudes
- Cambios en el operador dashboard
