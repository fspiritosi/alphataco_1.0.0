```sql
--- Insertar subtabs para Pedidos de Mantenimiento
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
-- Insertar la nueva tab 'Para Taller' en el módulo de Mantenimiento (dentro de maint_operaciones)
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('60000000-0000-0000-0000-000000000025', '421e96da-5235-4857-bf81-e63336447f13', 'para_taller', 'Para Taller', 'Pedidos con fecha confirmada listos para entrada a taller', 5, '60000000-0000-0000-0000-000000000030')
ON CONFLICT (id) DO NOTHING;

-- Agregar permisos para para_taller (view y update) a roles relevantes
-- Roles: Super Admin (1), Admin (2), Administrador (9), Admin Mantenimiento (16), Usuario Mantenimiento (18)
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '60000000-0000-0000-0000-000000000025'::uuid, a.id
FROM roles r
CROSS JOIN actions a
WHERE r.id IN (1, 2, 9, 16, 18)
AND a.slug IN ('view', 'update')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- Agregar permisos de maint_operaciones (tab padre) para los mismos roles
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '60000000-0000-0000-0000-000000000030'::uuid, a.id
FROM roles r
CROSS JOIN actions a
WHERE r.id IN (1, 2, 9, 16, 18)
AND a.slug = 'view'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
```

-------------------------------------------

✅En el modal Registrar Desvíos el campo de descripcion debe ser opcional, se habilitaran un un boton que indica dejar comentario

✅El redireccionamiento debe ser a https://dev.gh-gestion.com/dashboard/forms/01bcdb07-3340-4868-8df5-7c0289a6c46c en lugar de la respuesta

✅en el modal
Validar Solicitud de Mantenimiento se debe poder ampliar el comentario del chofer (editar el comentario)

✅Se agregó campo validator_comment para comentarios del validador en maintenance_request_items

✅Cuando genero la Orden de trabajo debemos pedir la propiedad (Alta, Media, Baja, Urgente)
✅En el paso "En proceso" debemos dar la opcion de "Pausar"

✅en el modal Detalle de la orden de trabajo los TIPOS DE REPARACION seran los items a completar, es decir cada item es un tipo de reparacion, no es por tipo de reparacion






-✅la vista http://localhost:3000/dashboard/maintenance?subtab=maintenance_requests&tab=maint_taller no se refresca, tenemos que revalidar la query

-✅en la tabla "Órdenes de Trabajo
Gestión de órdenes de trabajo asignadas a talleres" mostrar la prioridad

-✅en el modal "Detalle de la orden de trabajo" primero poder marcarlas y luego completarlas, para evitar missclick

-✅dejar guardado quien pausa la oorden de trabajo en el modal "Detalle de la orden de trabajo"

-si todas las tareas estan completas ocultar el boton TAMBIEN EL DE CANCELAR, solo el de completar la orden

-✅Si al menos una de las tareas fue completada debemos reemplazar el boton Cancelar orden por "Finalizar con pendientes" que debe permitir cerrar la orden con tareas pendiente (para poder volver a tener operativo el equipo)

-✅en el modal Detalle de la orden de trabajo En las completadas tenemos que contabilizar el tiempo total real (descontando el tiempo pausado) y mostrarlo de manera legible

-✅en la tab PARA TALLER mostrar los registros de las que tienen fecha a probada es decir que ya estan en el taller

-✅Arreglar el modal Configure la asignación para este desvío (muestras las OT al lado de la seccino)

-Mostrar la disponibilidad del sector cuando se intente asignar al taller, debe permitir asignar, incluso se si supera el cupo, solamente es a modo AVISO, indicar visualmente si superamos el limite o no. debe permitir si esta lleno el cupo, solo avisar que esta lleno (Asignar Taller y Período)



-Filtras las solicitudes segun supervisor (los supervisores pueden ver solo sus asignadas)



DUDAS:
En en detalle "Detalle de la orden de trabajo" Completamos la orden automaticamente cuando todas las tareas estan completas?

Las canceladas en cada paso donde la mostramos?

El historial de la solicitud donde lo mostramos?

las rechazadas en el modal "Validar Solicitud de Mantenimiento" donde las mostramos?

En el modal "Detalle de la orden de trabajo" cuando finalizo con pendientes que deberia hacer con las tareas pendientes?