# Spec: Tab "Cubiertas" en Detalle de Equipo

**Fecha:** 2026-03-29
**Branch:** feat/tire-management
**Modulo:** Equipos (detalle de equipo)
**Dependencia:** Modulo de Gomeria (COD-356) completamente implementado

---

## Objetivo

Agregar una nueva tab "Cubiertas" (#8) al detalle del equipo que permita:

1. Visualizar el diagrama de cubiertas con el estado actual de cada posicion (que cubierta esta instalada)
2. Editar la configuracion de ejes del vehiculo individual (agregar/quitar ejes sin afectar la plantilla del sub-tipo)
3. Ver el historial de ordenes de gomeria realizadas sobre el vehiculo

---

## Decisiones de Diseno

| Decision                           | Eleccion                                                                      | Alternativas descartadas                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Override de plantilla por vehiculo | Campo `tire_template_id` en `vehicles` (Enfoque 1)                            | Tabla nueva `vehicle_tire_configs` (mas complejo, duplica logica)                         |
| Creacion de config custom          | Copia de la plantilla exclusiva para el vehiculo (se desvincula del sub-tipo) | Editar posiciones directamente sin plantilla; modificar plantilla compartida              |
| Vehiculo sin plantilla             | Dos opciones: crear custom desde cero O ir a Plantillas                       | Solo redirigir a Plantillas (limita flexibilidad)                                         |
| Permisos de la tab                 | `view` + `update` (ver diagrama/historial + editar ejes)                      | Agregar `create` para iniciar ordenes desde aqui (redundante con Gomeria)                 |
| Historial de intervenciones        | Tabla de ordenes con click para ver detalle via ServiceOrderDetailView        | Tabla de items individuales (demasiado granular); master-detail (complejidad innecesaria) |
| Layout de la tab                   | Diagrama arriba, tabla de ordenes abajo (scroll vertical)                     | Sub-tabs internas (agrega complejidad); side-by-side (problemas responsive)               |
| Cubiertas en ejes eliminados       | Desinstalacion automatica con confirmacion (AlertDialog)                      | Bloqueo estricto (burocracia); sin confirmacion (riesgoso)                                |

---

## Cambios en Schema (Migracion)

### Tabla `vehicles` — campo nuevo

```prisma
tire_template_id String? @db.Uuid
tire_template    tire_templates? @relation("vehicle_tire_template", fields: [tire_template_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
```

### Tabla `tire_templates` — campos nuevos

```prisma
is_vehicle_override Boolean  @default(false)
source_template_id  String?  @db.Uuid
source_template     tire_templates?  @relation("template_source", fields: [source_template_id], references: [id], onDelete: SetNull, onUpdate: NoAction)
derived_templates   tire_templates[] @relation("template_source")
```

- `is_vehicle_override`: distingue plantillas estandar (asignadas a sub-tipos) de copias custom (asignadas a vehiculos individuales)
- `source_template_id`: traza de que plantilla original se copio. Nullable porque las configs creadas desde cero no tienen origen.

### Tabla `tabs` — insert

```sql
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('<UUID-generar-en-migracion>', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'cubiertas-equipo', 'Cubiertas', 'Diagrama de cubiertas y historial de intervenciones del equipo', 7, '<detalle-equipo-tab-id-buscar-en-BD>')
ON CONFLICT (id) DO NOTHING;
```

Los UUIDs se generan al momento de crear la migracion. El `parent_tab_id` se obtiene consultando la tab `detalle-equipo` en la BD.

### Tabla `role_permissions` — insert

Asignar `view` + `update` a roles `admin`, `administrador` y `full-access-provisional`.

---

## Helper Centralizado: Resolucion de Plantilla

### Ubicacion

`src/features/Mantenimiento/Gomeria/shared/resolve-template.ts`

### Funcion

```typescript
/**
 * Resuelve el tire_template_id efectivo de un vehiculo.
 * Prioridad: override del vehiculo > herencia del sub-tipo.
 */
export function resolveVehicleTireTemplateId(vehicle: {
  tire_template_id?: string | null;
  sub_type?: { tire_template_id?: string | null } | null;
}): string | null {
  return vehicle.tire_template_id ?? vehicle.sub_type?.tire_template_id ?? null;
}
```

### Archivos que se actualizan para usar el helper

| #   | Archivo                                            | Funcion                         | Cambio                                                                                                                                     |
| --- | -------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `Gomeria/Ordenes/actions.server.ts`                | `searchVehicleByDomain`         | Select incluye `vehicles.tire_template_id`. Retorna `resolveVehicleTireTemplateId(vehicle)` en vez de `sub_type.tire_template_id`          |
| 2   | `Gomeria/Ordenes/actions.server.ts`                | `searchCompatibleHitchVehicles` | Mismo patron que #1                                                                                                                        |
| 3   | `Gomeria/Ordenes/actions.server.ts`                | `ensureVehicleTirePositions`    | Usa helper para resolver plantilla. Error message actualizado: "Este equipo no tiene configuracion de cubiertas asignada"                  |
| 4   | `maintenance/equipment/[id]/tire-service/page.tsx` | Gate QR                         | Lee `vehicles.tire_template_id` ademas de `sub_type.tire_template_id`. Aplica resolucion con helper (o logica inline si es Supabase query) |
| 5   | `maintenance/equipment/[id]/page.tsx`              | Dashboard equipo                | Incluye `tire_template_id` del vehiculo en el select. Resuelve antes de pasar como prop                                                    |
| 6   | `equipment-dashboard-client.tsx`                   | Prop                            | Sin cambios de interface — recibe `tire_template_id` ya resuelto upstream                                                                  |
| 7   | `Gomeria/Plantillas/actions.server.ts`             | `deleteTemplate`                | Guard verifica TAMBIEN `vehicles` con `tire_template_id = id` antes de permitir borrado                                                    |

---

## Nueva Tab: Estructura de Componentes

### Ubicacion

`src/features/Equipos/EquipoID/components/vehicle-tires/`

### Arbol de archivos

```
vehicle-tires/
├── vehicle-tires-tab.tsx                # Contenedor principal (client)
├── vehicle-tire-diagram-section.tsx     # Seccion diagrama + boton editar (client)
├── vehicle-axle-editor.tsx              # Sheet para editar ejes (client)
├── vehicle-tire-orders/                 # DataTable de ordenes (2 capas — vive dentro de client)
│   ├── _VehicleTireOrdersDataTable.tsx  # Client Component (queryFn para fetch)
│   └── columns.tsx                      # Columnas
├── actions.server.ts                    # Server actions
└── fallback/
    └── VehicleTiresSkeleton.tsx         # Skeleton para Suspense
```

**Nota:** La DataTable usa 2 capas (Client + columns) en vez de 3 porque vive dentro de un Client Component (`vehicle-tires-tab.tsx`). Un Server Component no puede ser hijo de un Client Component en render time. El `queryFn` pattern maneja el fetch enteramente client-side, consistente con las otras tabs del detalle de equipo (ej: `vehicle-operations-history.tsx`).

### Componentes reutilizados (sin modificar)

- `TireDiagramRenderer` — renderiza el diagrama visual cenital
- `ServiceOrderDetailView` — vista detalle de orden cerrada/abierta
- `tire-mappers.ts` — labels/badges de enums
- `tire-diagram-utils.ts` — tipos DiagramAxle/DiagramPosition, calculatePositions()
- `facet-helpers.ts` — helpers de facets compartidos

---

## Componente: vehicle-tires-tab.tsx

**Tipo:** Client Component (`'use client'`)

**Props:**

- `vehicleId: string`
- `permissionsMap: Record<string, boolean>`

**Layout:** Diagrama arriba, tabla de ordenes abajo (scroll vertical).

**Responsabilidades:**

- Organizar las dos secciones (diagrama + tabla)
- Pasar `vehicleId` y permisos a cada seccion

---

## Componente: vehicle-tire-diagram-section.tsx

**Tipo:** Client Component (`'use client'`)

**Props:**

- `vehicleId: string`
- `canUpdate: boolean` (derivado de permisos)

**Comportamiento:**

### Con plantilla asignada

- Carga posiciones via `useQuery` llamando a `getVehicleTirePositionsWithDetails(vehicleId)`
- Renderiza `TireDiagramRenderer` en modo no interactivo (sin onClick)
- Cada posicion muestra tooltip con: numero de serie, marca, tipo (medida + banda), profundidad de banda, estado
- Posiciones vacias: estilo gris/dashed con texto "Vacia"
- Header de la seccion muestra nombre de la plantilla + badge "Personalizada" o "Heredada de [sub-tipo]"
- Boton "Editar configuracion" (esquina superior derecha, solo si `canUpdate`)
  - Si hereda del sub-tipo → aviso previo: "Se creara una configuracion personalizada para este equipo. Los demas equipos del mismo sub-tipo no se veran afectados."
  - Si ya tiene override → abre editor directamente
- Boton "Restablecer plantilla original" (solo si tiene override Y el sub-tipo tiene plantilla) — AlertDialog de confirmacion, elimina el override y vuelve a heredar

### Sin plantilla

- Card con icono ilustrativo
- Mensaje: "Este equipo no tiene configuracion de cubiertas"
- Dos botones:
  - "Crear configuracion personalizada" → abre `vehicle-axle-editor` para crear desde cero
  - "Ir a Plantillas" → navega a `/dashboard/maintenance?tab=gomeria&subtab=plantillas`

---

## Componente: vehicle-axle-editor.tsx

**Tipo:** Client Component (`'use client'`)
**UI:** Sheet lateral (consistente con UX del wizard de gomeria)

**Props:**

- `vehicleId: string`
- `currentAxles: AxleConfig[]` (ejes actuales o vacio si no hay plantilla)
- `isNewConfig: boolean` (true si es creacion desde cero)
- `onSave: () => void` (callback para refetch del diagrama)

**Funcionalidad:**

- Reutiliza la logica del `AxleConfigurator` existente en Plantillas (agregar/quitar ejes, configurar tires_per_side, tire_size, is_drive_axle, is_spare)
- Preview del diagrama en tiempo real con `TireDiagramRenderer`
- Al quitar un eje que tiene cubiertas instaladas → AlertDialog: "Este eje tiene N cubiertas instaladas. Al eliminarlo se desinstalaran automaticamente y quedaran disponibles en el catalogo. ¿Continuar?"
- Al guardar:
  1. Si `isNewConfig` y vehiculo hereda de sub-tipo → `createVehicleCustomTemplate(vehicleId)` clona plantilla + aplica cambios
  2. Si `isNewConfig` y vehiculo no tiene plantilla → `createVehicleCustomTemplate(vehicleId)` crea desde cero
  3. Si ya tiene override → `updateVehicleCustomAxles(vehicleId, axles)` modifica directamente
  4. Cubiertas de ejes eliminados: `tires.status = AVAILABLE`, `tire_id = null` en posiciones, posiciones eliminadas
  5. Invalidar query de posiciones del diagrama

---

## DataTable: Ordenes de Gomeria del Vehiculo

### Arquitectura: 2 capas (Client + columns — dentro de contexto client)

**\_VehicleTireOrdersDataTable.tsx** (Client Component):

- Recibe `vehicleId` como prop
- `paramNamespace={TABLE_ID}` y `tableId={TABLE_ID}`
- `queryFn` para client-side navigation (fetch via React Query, sin Server Component wrapper)
- `onStateChange` + `currentParams` para export
- Lazy-load facets con `fetchFacet`
- Click en fila → abre `ServiceOrderDetailView` en dialog

No hay Server Component wrapper porque la DataTable vive dentro de un Client Component padre. El patron `queryFn` maneja todo el fetch client-side.

### Columnas

| Columna           | Tipo                          | accessorFn/Key                              | Filtro               | Export                  |
| ----------------- | ----------------------------- | ------------------------------------------- | -------------------- | ----------------------- |
| Fecha de servicio | Fecha                         | `service_date`                              | dateRange            | moment DD/MM/YYYY       |
| Kilometro         | Texto                         | `kilometer`                                 | text                 | directo                 |
| Estado            | Enum (TireServiceOrderStatus) | `status`                                    | faceted (fetchFacet) | label del mapper        |
| Intervenciones    | Numero virtual                | `_count.items`                              | sin filtro           | directo                 |
| Creado por        | FK (profile)                  | accessorFn → `creator.firstname + lastname` | faceted (fetchFacet) | nombre completo         |
| Fecha de cierre   | Fecha nullable                | `closed_at`                                 | dateRange            | moment DD/MM/YYYY o "-" |

### Datos

Query Prisma sobre `tire_service_orders` con:

```
where: {
  OR: [
    { vehicle_id: vehicleId },
    { trailer_vehicle_id: vehicleId }
  ]
}
include: {
  creator: { select: { firstname, lastname } },
  _count: { select: { items: true } }
}
```

Sin boton de crear. Solo lectura. Export Excel opcional.

---

## Server Actions

### Ubicacion

`src/features/Equipos/EquipoID/components/vehicle-tires/actions.server.ts`

### Funciones

**`getVehicleTirePositionsWithDetails(vehicleId: string)`**

- Retorna posiciones del vehiculo con relaciones incluidas: tire (serial_number, status, tread_depth, brand.name, tire_type.size, tire_type.tread_type), template_axle (axle_number, tires_per_side, is_spare, is_drive_axle, tire_size)
- Usado por el diagrama

**`getVehicleTemplateInfo(vehicleId: string)`**

- Retorna: `{ hasOverride: boolean, templateId: string | null, templateName: string | null, sourceType: 'vehicle' | 'sub_type' | 'none' }`
- Usado para decidir si mostrar aviso de copia o estado vacio

**`createVehicleCustomTemplate(vehicleId: string, axles?: AxleInput[])`**

- Si el vehiculo hereda plantilla del sub-tipo Y no se pasan axles: clona plantilla y sus axles, asigna a `vehicles.tire_template_id`, regenera `vehicle_tire_positions` preservando cubiertas en posiciones equivalentes
- Si se pasan axles: crea plantilla nueva con esos ejes
- Marca `is_vehicle_override = true` y `source_template_id` si aplica
- Todo en transaccion Prisma

**`updateVehicleCustomAxles(vehicleId: string, axles: AxleInput[])`**

- Valida que el vehiculo tenga override propio (no se puede editar plantilla heredada directamente)
- Compara ejes actuales vs nuevos: agrega nuevos, elimina los que ya no estan
- Para ejes eliminados con cubiertas: marca `tires.status = AVAILABLE`, limpia `tire_id` en posiciones, elimina posiciones
- Regenera posiciones de ejes nuevos
- Todo en transaccion Prisma

**`resetVehicleToSubTypeTemplate(vehicleId: string)`**

- Elimina el override: limpia `vehicles.tire_template_id`, elimina `vehicle_tire_positions`, elimina plantilla custom si no tiene mas referencias
- Regenera posiciones desde la plantilla del sub-tipo (via `ensureVehicleTirePositions`)
- Cubiertas instaladas se desinstalan automaticamente (status → AVAILABLE)
- Todo en transaccion Prisma

**`getVehicleTireOrdersPaginated(vehicleId: string, searchParams: DataTableSearchParams)`**

- Ordenes paginadas con `OR: [{ vehicle_id }, { trailer_vehicle_id }]`
- Incluye count de items y creator profile
- Usa `buildWhereClause` pattern con search, filters, dateRange, text

**`getVehicleTireOrdersForExport(vehicleId: string, searchParams: DataTableSearchParams)`**

- Misma query sin skip/take

**`getVehicleTireOrderSingleFacet(vehicleId: string, columnId: string, searchParams: DataTableSearchParams)`**

- Facet individual con cross-filter (crossWhere excluyendo columna propia)
- Retorna `{ counts: Map, resolvedOptions? }`

Todas con `Logger`, try-catch, tipos exportados con `Awaited<ReturnType<typeof fn>>`.

### Tipo AxleInput

```typescript
type AxleInput = {
  axle_number: number;
  tires_per_side: number; // 1 = eje simple (2 cubiertas), 2 = eje doble (4 cubiertas)
  tire_size: string; // ej: "295/80R22.5"
  is_drive_axle: boolean;
  is_spare: boolean;
};
```

### Preservacion de cubiertas al clonar

Al clonar una plantilla (`createVehicleCustomTemplate`), las cubiertas existentes se preservan si la posicion equivalente existe en la nueva config. "Equivalente" = mismo `axle_number` + mismo `side` + mismo `position_number`. Si un eje cambia de configuracion (ej: de simple a doble), las posiciones nuevas quedan vacias y las cubiertas de posiciones que ya no existen se desinstalan (status → AVAILABLE).

---

## Permisos

### permissions-map.ts

Agregar bajo `detalle-equipo.subtabs`:

```typescript
'cubiertas-equipo': {
  slug: 'cubiertas-equipo',
  name: 'Cubiertas',
  tabId: '<UUID>',
  parent: 'detalle-equipo',
  allowedActions: ['view', 'update'],
  subtabs: {},
}
```

### vehicle-tabs.tsx

Agregar tab #8:

```typescript
{
  value: 'tires',
  label: 'Cubiertas',
  moduleSlug: 'equipos',
  tabSlug: 'cubiertas-equipo',
  disabled: mode === 'new',
  content: <VehicleTiresTab vehicleId={vehicleId} permissionsMap={permissionsMap} />,
}
```

### Migracion SQL

```sql
-- Tab
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('<UUID>', '34d7f9e5-7c01-4def-9446-6b3f52d761a0', 'cubiertas-equipo', 'Cubiertas',
 'Diagrama de cubiertas y historial de intervenciones', 7, '<detalle-equipo-tab-id>')
ON CONFLICT (id) DO NOTHING;

-- Permisos para admin, administrador, full-access-provisional
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '<TAB_UUID>', a.id
FROM roles r, actions a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
AND a.slug IN ('view', 'update')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
```

---

## Integracion con vehicle-tabs.tsx

El componente `vehicle-tires-tab.tsx` se pasa como slot renderizado en el server, igual que las demas tabs:

1. **page.tsx** (Server Component): carga `permissionsMap` (ya lo hace) y pasa al form
2. **vehicle-form.tsx**: recibe el componente de cubiertas como prop slot
3. **vehicle-tabs.tsx**: renderiza la tab con el slot

Alternativamente, si la tab necesita `searchParams` para la DataTable, se puede pasar como prop desde el server, igual que la tab de documentos.

---

## Resumen de archivos

### Nuevos (9)

| Archivo                                                             | Tipo                       |
| ------------------------------------------------------------------- | -------------------------- |
| `vehicle-tires/vehicle-tires-tab.tsx`                               | Client Component           |
| `vehicle-tires/vehicle-tire-diagram-section.tsx`                    | Client Component           |
| `vehicle-tires/vehicle-axle-editor.tsx`                             | Client Component           |
| `vehicle-tires/vehicle-tire-orders/_VehicleTireOrdersDataTable.tsx` | Client Component (queryFn) |
| `vehicle-tires/vehicle-tire-orders/columns.tsx`                     | Columnas                   |
| `vehicle-tires/actions.server.ts`                                   | Server Actions             |
| `vehicle-tires/fallback/VehicleTiresSkeleton.tsx`                   | Skeleton                   |
| `Gomeria/shared/resolve-template.ts`                                | Helper puro                |
| Migracion SQL                                                       | prisma/migrations/         |

### Modificados (8)

| Archivo                                | Cambio                                       |
| -------------------------------------- | -------------------------------------------- |
| `prisma/schema.prisma`                 | Campos nuevos en vehicles y tire_templates   |
| `Gomeria/Ordenes/actions.server.ts`    | 3 funciones usan helper de resolucion        |
| `tire-service/page.tsx`                | Gate QR usa resolucion con override          |
| `equipment/[id]/page.tsx`              | Select incluye tire_template_id del vehiculo |
| `Gomeria/Plantillas/actions.server.ts` | Guard de delete verifica vehiculos           |
| `vehicle-tabs.tsx`                     | Agrega tab #8                                |
| `permissions-map.ts`                   | Agrega subtab cubiertas-equipo               |
| `action/page.tsx` (equipment detail)   | Pasa searchParams y/o slot de cubiertas      |
