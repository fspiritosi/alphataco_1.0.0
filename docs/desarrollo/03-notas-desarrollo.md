en Solicitudes de Mantenimiento Eliminar el boton
Aprobar Entrada a Taller

Solicitudes de Mantenimiento (Desde aqui se aceptan los items particulares, item por item, tambien se pueden editar los items) no se deben mostrar los demas estados, solo las que se tienen que aceptar (mostrar los rechazados)

una vez que se acepta desde Solicitudes de Mantenimiento viaja a Pedidos de Mantenimiento (Desde aqui se propone la fecha, solo mostramos las que necesitan fecha )

una vez que se proone la fecha vuelven a la tab Pendientes de Ejecutar (para aprobar la fecha o rechazar y regresar al paso anterior)

_Guardar el ida y vuelta de las solicitudes, para poder rastrear los estados y pasos_

cuando la fecha se confirma viaja a Pedidos de Mantenimiento y ese registro en ese estado debe etner la opcion de Aprobar Entrada a Taller, una vez aprobada viaja a al tab Planificación de Mantenimiento

(Ver estados de cancelacion en la tab Pedidos de Mantenimiento)

en la tabla Equipos en Taller - Pendientes de Planificación separar en 2 columnas Items y Desvíos y en la columna condicion mostrar el estado del ITEM (tipo de reparacion)

en Asignar Talleres y Sectores falta el rango de fecha

asignar a talleres y sectores varios registros seleccionados

revisar los items al generarlos, no se estan detectando o generando

<!----------------------------------------------------->

✅no navega luego de generar los devios en el form
✅EN EL detalle del equipo no desaparece el Desvíos de Checklist Pendientes luego de generar el desvio
AB093KHLa soicitud de desvio no aparece en desvios, las realizadas desde el checklist
✅revisar modo oscuro
✅Mostrar los comentarios de los items en los modales
✅en la tab Pendientes de Ejecutar se deben mostrar las solicitudes confirmadas y las pendientes de planificar

✅tabla Pedidos de Mantenimiento

✅lo pendiente de planificar primero, y ordenadas de la mas vieja a mas reciente
✅agregar en Pedidos de Mantenimiento 2 subtabs pendiente (mostrar los pendientes de planificar y pendientes de aprobacion (los que se muestran en Pendientes de Ejecutar)) y confirmados

## [2026-01-22] - Subtabs: Pedidos de Mantenimiento

### SQL para replicar en producción:

```sql
-- Insertar subtabs para Pedidos de Mantenimiento
-- Subtab 1: Pendientes (pending_scheduling + scheduled)
INSERT INTO tabs (id, slug, name, description, order_index, parent_tab_id, module_id)
VALUES (
  '60000000-0000-0000-0000-000000000211',
  'pedidos_pendientes',
  'Pendientes',
  'Pedidos pendientes de planificar y pendientes de aprobación',
  1,
  '60000000-0000-0000-0000-000000000021',
  '421e96da-5235-4857-bf81-e63336447f13'
)
ON CONFLICT (id) DO NOTHING;

-- Subtab 2: Confirmados (date_confirmed)
INSERT INTO tabs (id, slug, name, description, order_index, parent_tab_id, module_id)
VALUES (
  '60000000-0000-0000-0000-000000000212',
  'pedidos_confirmados',
  'Confirmados',
  'Pedidos con fecha confirmada listos para entrada a taller',
  2,
  '60000000-0000-0000-0000-000000000021',
  '421e96da-5235-4857-bf81-e63336447f13'
)
ON CONFLICT (id) DO NOTHING;

-- Permisos para admin (role_id = 2)
-- action view = 'e2128d70-7a60-46c0-bf6f-23ec5d44c89c'
-- action update = '8b70189a-cea5-4e3b-98f4-a76d6447003f'
INSERT INTO role_permissions (role_id, tab_id, action_id)
VALUES
  -- Admin - pedidos_pendientes
  (2, '60000000-0000-0000-0000-000000000211', 'e2128d70-7a60-46c0-bf6f-23ec5d44c89c'), -- view
  (2, '60000000-0000-0000-0000-000000000211', '8b70189a-cea5-4e3b-98f4-a76d6447003f'), -- update
  -- Admin - pedidos_confirmados
  (2, '60000000-0000-0000-0000-000000000212', 'e2128d70-7a60-46c0-bf6f-23ec5d44c89c'), -- view
  (2, '60000000-0000-0000-0000-000000000212', '8b70189a-cea5-4e3b-98f4-a76d6447003f')  -- update
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
```

✅ingresar la tab nueva solicitud a operaciones/ Nuevo pedido, refactorizar la tab Carga individual para generar directamente un Pedidos de Mantenimiento (Salteandose la aprobacion)

## [2026-01-22] - Tab: Nuevo Pedido (dentro de Operaciones)

### Cambios realizados:

- Se movió la funcionalidad de "Nueva Solicitud" dentro de la tab "Operaciones" como subtab "Nuevo Pedido"
- Se deshabilitó la subtab "Carga Múltiple" temporalmente
- Se creó un nuevo componente `NuevoPedidoForm` que crea `maintenance_orders` directamente con estado `pending_scheduling` (saltándose la aprobación)
- La funcionalidad original de `RepairEntry` sigue funcionando en `equipment/[id]/request` para crear solicitudes de mantenimiento (`repair_solicitudes`)

### SQL para replicar en producción:

```sql
-- Permitir que maintenance_order_items pueda existir sin maintenance_request_item_id
-- Esto es para crear pedidos de mantenimiento directamente sin pasar por solicitud
ALTER TABLE maintenance_order_items
ALTER COLUMN maintenance_request_item_id DROP NOT NULL;

COMMENT ON COLUMN maintenance_order_items.maintenance_request_item_id IS
'Nullable: Si es NULL indica que el item fue creado directamente sin pasar por solicitud de mantenimiento';

-- Agregar nueva subtab "Nuevo Pedido" dentro de maint_operaciones
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('60000000-0000-0000-0000-000000000024', '421e96da-5235-4857-bf81-e63336447f13', 'nuevo_pedido', 'Nuevo Pedido', 'Crear pedidos de mantenimiento directamente', 4, '60000000-0000-0000-0000-000000000030')
ON CONFLICT (id) DO NOTHING;

-- Agregar permisos para el rol admin
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '60000000-0000-0000-0000-000000000024', a.id
FROM roles r, actions a
WHERE r.slug = 'Administrador' AND a.slug IN ('view', 'create')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
```

### Archivos creados/modificados:

- `src/features/Mantenimiento/NuevoPedido/` - Nueva feature completa
  - `NuevoPedidoTabContent.tsx` - Server Component
  - `components/NuevoPedidoForm.tsx` - Client Component (formulario)
  - `actions/actionsServer.ts` - Server actions para crear maintenance_orders
  - `fallback/NuevoPedidoSkeleton.tsx` - Skeleton para Suspense
  - `index.ts` - Exports
- `src/features/Mantenimiento/MantenimientoComponent.tsx` - Actualizado para incluir "Nuevo Pedido" en Operaciones
- `src/features/Permissions/permissions-map.ts` - Agregada subtab `nuevo_pedido`
- `src/components/Tipos_de_reparaciones/RepairEntryWrapper.tsx` - Deshabilitada tab "Carga Múltiple"

## [2026-01-22] - Refactor: NuevoPedido reemplaza RepairEntry completamente

### Cambios realizados:

- `NuevoPedidoForm` ahora crea `maintenance_orders` directamente (NO `repair_solicitudes`)
- La página `equipment/[id]/request` ahora usa `NuevoPedidoForm` en lugar de `RepairEntry`
- `SolicitarMantenimiento` (usado desde QR) ahora usa `NuevoPedidoForm`
- Los pedidos creados aparecen en "Pedidos de Mantenimiento" → "Pendientes" con estado `pending_scheduling`

### Componentes deprecados (marcados con @deprecated):

- `src/components/Tipos_de_reparaciones/RepairEntry.tsx` - DEPRECADO
- `src/components/Tipos_de_reparaciones/RepairEntryMultiple.tsx` - DEPRECADO
- `src/components/Tipos_de_reparaciones/RepairEntryWrapper.tsx` - DEPRECADO
- `src/app/maintenance/equipment/[id]/request/repair-entry-with-router.tsx` - DEPRECADO (código comentado)
- `src/app/maintenance/equipment/[id]/request/repair-entry-mobile-wrapper.tsx` - DEPRECADO (código comentado)

### Flujo nuevo:

1. Usuario selecciona equipo (o viene preseleccionado desde detalle del equipo)
2. Usuario selecciona tipos de reparación (individual o por grupo)
3. Se crea `maintenance_order` con status `pending_scheduling`
4. Se crean `maintenance_order_items` con `maintenance_request_item_id = NULL`
5. El pedido aparece en "Pedidos de Mantenimiento" → "Pendientes" para asignarle fecha

### Nota:

El flujo de `repair_solicitudes` queda completamente deprecado. Todos los nuevos pedidos
de mantenimiento se crean directamente como `maintenance_orders`.

## [2026-01-22] - Feature: Órdenes de Trabajo (OT)

### Descripción:

Nueva funcionalidad para gestionar Órdenes de Trabajo que se generan desde la Planificación.
Las OT agrupan items de mantenimiento asignados a un taller/sector específico con un rango de fechas.

### Nomenclatura:

`OT-{PATENTE/SERIE}-{SECTOR}-{NUMERO}`

- Ejemplo: `OT-AB123CD-MECANICA-000001`
- El número es autoincremental global (no por empresa)
- El número se obtiene con `MAX(sequence_number) + 1`

### Migraciones aplicadas en DEV:

```sql
-- 1. Crear tipos ENUM para estados
CREATE TYPE work_order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE work_order_item_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

-- 2. Tabla principal de órdenes de trabajo
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    sequence_number INTEGER NOT NULL,
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
    sector_id UUID REFERENCES workshop_sectors(id) ON DELETE SET NULL,
    status work_order_status NOT NULL DEFAULT 'pending',
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES profile(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    started_by UUID REFERENCES profile(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES profile(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES profile(id) ON DELETE SET NULL,
    cancellation_reason TEXT
);

-- 3. Tabla de items de órdenes de trabajo
CREATE TABLE IF NOT EXISTS work_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    maintenance_order_item_id UUID NOT NULL REFERENCES maintenance_order_items(id) ON DELETE CASCADE,
    status work_order_item_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES profile(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(work_order_id, maintenance_order_item_id)
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_work_orders_company ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment ON work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_workshop ON work_orders(workshop_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_dates ON work_orders(planned_start_date, planned_end_date);
CREATE INDEX IF NOT EXISTS idx_work_order_items_work_order ON work_order_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_items_moi ON work_order_items(maintenance_order_item_id);

-- 5. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_work_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_work_orders_updated_at();

CREATE TRIGGER trigger_work_order_items_updated_at
    BEFORE UPDATE ON work_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_work_orders_updated_at();

-- 6. Campos de asignación en maintenance_order_items (para tracking antes de crear OT)
ALTER TABLE maintenance_order_items
ADD COLUMN IF NOT EXISTS assigned_workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL;

ALTER TABLE maintenance_order_items
ADD COLUMN IF NOT EXISTS assigned_sector_id UUID REFERENCES workshop_sectors(id) ON DELETE SET NULL;

ALTER TABLE maintenance_order_items
ADD COLUMN IF NOT EXISTS planned_start_date DATE;

ALTER TABLE maintenance_order_items
ADD COLUMN IF NOT EXISTS planned_end_date DATE;

ALTER TABLE maintenance_order_items
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profile(id) ON DELETE SET NULL;

ALTER TABLE maintenance_order_items
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

ALTER TABLE maintenance_order_items
ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_moi_assigned_workshop ON maintenance_order_items(assigned_workshop_id);
CREATE INDEX IF NOT EXISTS idx_moi_work_order ON maintenance_order_items(work_order_id);
```

### SQL para tab y permisos:

```sql
-- Insertar la nueva tab "Órdenes de Trabajo" bajo "Taller"
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES (
  '60000000-0000-0000-0000-000000000042',
  '421e96da-5235-4857-bf81-e63336447f13',
  'ordenes_trabajo',
  'Órdenes de Trabajo',
  'Gestión de órdenes de trabajo para taller',
  3,
  '60000000-0000-0000-0000-000000000040'
)
ON CONFLICT (id) DO NOTHING;

-- Permisos para los roles admin (1=super-admin, 2=admin, 9=administrador)
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '60000000-0000-0000-0000-000000000042'::uuid, a.id
FROM (VALUES (1), (2), (9)) AS r(id)
CROSS JOIN actions a
WHERE a.slug IN ('view', 'create', 'update', 'delete')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
```

### Archivos creados:

- `src/features/Mantenimiento/Planificacion/actions/actionsServer.ts` - Server actions para asignar taller y crear OT
- `src/features/Mantenimiento/OrdenesTrabajo/` - Feature completa:
  - `types/index.ts` - Tipos y constantes
  - `actions/actionsServer.ts` - Server actions CRUD
  - `hooks/useOrdenesTrabajo.ts` - React Query hooks
  - `components/columns.tsx` - Columnas de tabla
  - `components/OrdenDetalleDialog.tsx` - Modal de detalle
  - `components/OrdenesTrabajoTableClient.tsx` - Tabla principal con subtabs
  - `fallback/OrdenesTrabajoSkeleton.tsx` - Skeleton
  - `OrdenesTrabajoTabContent.tsx` - Server Component
  - `index.ts` - Exports

### Archivos modificados:

- `src/features/Mantenimiento/Planificacion/components/AsignarTallerDialog.tsx` - Ahora usa server actions reales
- `src/features/Mantenimiento/MantenimientoComponent.tsx` - Agregada tab "Órdenes de Trabajo"
- `src/features/Permissions/permissions-map.ts` - Agregada subtab `ordenes_trabajo`

## [2026-01-24] - Subtab: Para Taller (dentro de Operaciones)

### Descripción:

Nueva subtab en Operaciones que muestra los pedidos con fecha confirmada (`date_confirmed`)
listos para ser enviados a taller (cambiar status a `in_workshop`).

### SQL para replicar en producción:

```sql
-- Insertar la nueva tab 'Para Taller' en el módulo de Mantenimiento (dentro de maint_operaciones)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('60000000-0000-0000-0000-000000000025', '421e96da-5235-4857-bf81-e63336447f13', 'para_taller', 'Para Taller', 'Pedidos con fecha confirmada listos para entrada a taller', 5, '60000000-0000-0000-0000-000000000030')
ON CONFLICT (id) DO NOTHING;

-- Agregar permisos para el rol admin (view y update)
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '60000000-0000-0000-0000-000000000025', a.id
FROM roles r, actions a
WHERE r.slug = 'admin' AND a.slug IN ('view', 'update')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
```

### Archivos creados:

- `src/features/Mantenimiento/Operaciones/ParaTaller/` - Feature completa:
  - `ParaTallerTabContent.tsx` - Server Component
  - `components/ParaTallerTableClient.tsx` - Client Component (tabla)
  - `components/columns.tsx` - Columnas de tabla
  - `components/ParaTallerDetailDialog.tsx` - Modal de detalle
  - `components/ParaTallerEntradaDialog.tsx` - Modal para aprobar entrada a taller
  - `index.ts` - Exports

### Archivos modificados:

- `src/features/Mantenimiento/Operaciones/OperacionesTabContent.tsx` - Agregada subtab "Para Taller"
- `src/features/Mantenimiento/Operaciones/actions/actionsServer.ts` - Agregada función `getOrdersForWorkshop`
- `src/features/Permissions/permissions-map.ts` - Agregada subtab `para_taller`
