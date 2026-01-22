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

no navega luego de generar los devios en el form
EN EL detalle del equipo no desaparece el Desvíos de Checklist Pendientes luego de generar el desvio
La soicitud de desvio no aparece en desvios, las realizadas desde el checklist
revisar modo oscuro
Mostrar los comentarios de los items en los modales

en la tab Pendientes de Ejecutar se deben mostrar las solicitudes confirmadas y las pendientes de planificar

tabla Pedidos de Mantenimiento

lo pendiente de planificar primero, y ordenadas de la mas vieja a mas reciente
agregar en Pedidos de Mantenimiento 2 subtabs pendiente (mostrar los pendientes de planificar y pendientes de aprobacion (los que se muestran en Pendientes de Ejecutar)) y confirmados

ingresar la tab nueva slicutud a operaciones/ Nuevo pedido, refactorizar la tab Carga individual para generar directamente un Pedidos de Mantenimiento (Salteandose la aprobacion)

CONTINUANDO EL FLUJO
nueva tab Ordenes de trabajo en Taller/Ordenes de trabajo

nomentclaura de las ordenes de trabajo (OT-{patente}-{sector}-{numero})

OT
Numero, Dominio, Taller, Sector, Items asignados, rango de fechas (vienen de la solicitud)

en Planificación de Mantenimiento la seleccion de los datos

<!----------------------------------------------------->

## [2026-01-22] Sincronización de Tabs: LOCAL → PRODUCCIÓN

### SQL para ejecutar en PRODUCCIÓN

Este script sincroniza la tabla `tabs` de producción con la estructura de local.
Afecta los módulos: **Empresa** y **Mantenimiento**.

```sql
-- ============================================
-- SINCRONIZACIÓN DE TABS: LOCAL → PROD
-- Fecha: 2026-01-22
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Eliminar tabs que existen en PROD pero no en LOCAL
-- ============================================

-- Eliminar tabs de Mantenimiento que ya no existen en local
DELETE FROM tabs WHERE id = '60000000-0000-0000-0000-000000000011'; -- created_solicitudes (no existe en local)
DELETE FROM tabs WHERE id = '60000000-0000-0000-0000-000000000022'; -- maintenance_operations (reemplazada por maint_operaciones)
DELETE FROM tabs WHERE id = '60000000-0000-0000-0000-000000000024'; -- operations_planned (no existe en local)

-- ============================================
-- PASO 2: Insertar tabs nuevas que existen en LOCAL pero no en PROD
-- ============================================

-- Módulo Empresa: Nueva sección de Mantenimiento dentro de Empresa
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000016', 'e0478383-1287-4b5e-a727-985baf867173', 'empresa_mantenimiento', 'Mantenimiento', 'Configuración de mantenimiento en empresa', 6, '10000000-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000161', 'e0478383-1287-4b5e-a727-985baf867173', 'talleres', 'Talleres', 'Gestión de talleres', 1, '10000000-0000-0000-0000-000000000016', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000162', 'e0478383-1287-4b5e-a727-985baf867173', 'sectores_taller', 'Sectores', 'Sectores de talleres', 2, '10000000-0000-0000-0000-000000000016', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Módulo Mantenimiento: Nuevas tabs padre
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, created_at, updated_at)
VALUES
  ('60000000-0000-0000-0000-000000000030', '421e96da-5235-4857-bf81-e63336447f13', 'maint_operaciones', 'Operaciones', 'Operaciones de mantenimiento', 1, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, created_at, updated_at)
VALUES
  ('60000000-0000-0000-0000-000000000040', '421e96da-5235-4857-bf81-e63336447f13', 'maint_taller', 'Taller', 'Gestión de taller', 2, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, created_at, updated_at)
VALUES
  ('60000000-0000-0000-0000-000000000050', '421e96da-5235-4857-bf81-e63336447f13', 'maint_configuracion', 'Configuración', 'Configuración de mantenimiento', 3, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id, created_at, updated_at)
VALUES
  ('60000000-0000-0000-0000-000000000041', '421e96da-5235-4857-bf81-e63336447f13', 'planificacion', 'Planificación', 'Planificación de mantenimiento', 2, '60000000-0000-0000-0000-000000000040', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PASO 3: Actualizar tabs existentes con cambios de slug, name, parent o order
-- ============================================

-- Tab 60000000-0000-0000-0000-000000000001: Cambiar de type_of_repairs a maint_nueva_solicitud
UPDATE tabs SET
  slug = 'maint_nueva_solicitud',
  name = 'Nueva Solicitud',
  order_index = 4,
  parent_tab_id = NULL
WHERE id = '60000000-0000-0000-0000-000000000001';

-- Tab 60000000-0000-0000-0000-000000000012: Cambiar parent a maint_configuracion
UPDATE tabs SET
  order_index = 1,
  parent_tab_id = '60000000-0000-0000-0000-000000000050'
WHERE id = '60000000-0000-0000-0000-000000000012';

-- Tab 60000000-0000-0000-0000-000000000013: Cambiar parent a maint_nueva_solicitud
UPDATE tabs SET
  order_index = 1,
  parent_tab_id = '60000000-0000-0000-0000-000000000001'
WHERE id = '60000000-0000-0000-0000-000000000013';

-- Tab 60000000-0000-0000-0000-000000000014: Cambiar parent a maint_configuracion
UPDATE tabs SET
  order_index = 2,
  parent_tab_id = '60000000-0000-0000-0000-000000000050'
WHERE id = '60000000-0000-0000-0000-000000000014';

-- Tab 60000000-0000-0000-0000-000000000015: Cambiar parent a maint_operaciones
UPDATE tabs SET
  order_index = 1,
  parent_tab_id = '60000000-0000-0000-0000-000000000030'
WHERE id = '60000000-0000-0000-0000-000000000015';

-- Tab 60000000-0000-0000-0000-000000000020: Cambiar parent a maint_operaciones
UPDATE tabs SET
  order_index = 2,
  parent_tab_id = '60000000-0000-0000-0000-000000000030'
WHERE id = '60000000-0000-0000-0000-000000000020';

-- Tab 60000000-0000-0000-0000-000000000021: Cambiar parent a maint_taller
UPDATE tabs SET
  order_index = 1,
  parent_tab_id = '60000000-0000-0000-0000-000000000040'
WHERE id = '60000000-0000-0000-0000-000000000021';

-- Tab 60000000-0000-0000-0000-000000000023: Cambiar slug y parent a maint_operaciones
UPDATE tabs SET
  slug = 'pendientes_ejecutar',
  name = 'Pendientes de Ejecutar',
  order_index = 3,
  parent_tab_id = '60000000-0000-0000-0000-000000000030'
WHERE id = '60000000-0000-0000-0000-000000000023';

COMMIT;

-- ============================================
-- VERIFICACIÓN: Ejecutar después para confirmar
-- ============================================
-- SELECT t.id, t.slug, t.name, t.order_index, t.parent_tab_id, m.name as module_name
-- FROM tabs t
-- JOIN modules m ON t.module_id = m.id
-- WHERE m.name IN ('Empresa', 'Mantenimiento')
-- ORDER BY m.name, t.order_index, t.name;
```

### Notas importantes:

- Este script usa `BEGIN/COMMIT` para ejecutar todo en una transacción
- Los `ON CONFLICT (id) DO NOTHING` previenen errores si se ejecuta múltiples veces
- Verificar con la query de verificación después de ejecutar
