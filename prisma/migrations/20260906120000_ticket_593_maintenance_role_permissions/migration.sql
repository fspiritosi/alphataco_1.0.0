-- Ticket 593 — Configurador de permisos del modulo Mantenimiento.
--
-- 1. `nuevo_pedido` pasa a ser tab raiz. Ya se renderiza asi en la UI
--    (MantenimientoComponent: "NUEVO PEDIDO (movido desde subtab de Operaciones)");
--    el arbol de permisos habia quedado desactualizado. Mientras siga colgando de
--    `maint_operaciones`, el TabsManager infiere visibilidad hacia arriba y dar
--    Nuevo Pedido hace aparecer tambien la tab Operaciones.
-- 2. ROL "Supervisor de Operaciones": solo Operaciones | Nuevo Pedido.
-- 3. ROL "Jefe de Taller": solo Vista Taller | Taller | Nuevo Pedido | Gomeria |
--    Configuracion, con TODAS las acciones sobre esas tabs y sus subtabs.
--
-- Los dos son roles custom de la empresa (`roles.slug IS NULL`), por eso se
-- identifican por `name`. Todo el script es idempotente.

-- ============================================================================
-- 1. nuevo_pedido deja de ser subtab de Operaciones
-- ============================================================================
UPDATE "public"."tabs"
SET parent_tab_id = NULL
WHERE id = '60000000-0000-0000-0000-000000000024';

-- ============================================================================
-- 2. Supervisor de Operaciones -> Operaciones | Nuevo Pedido
-- ============================================================================

-- Quita todo permiso del modulo mantenimiento que no sea Operaciones (con sus
-- subtabs operativas) ni Nuevo Pedido.
DELETE FROM "public"."role_permissions" rp
USING "public"."roles" r, "public"."tabs" t
WHERE rp.role_id = r.id
  AND rp.tab_id = t.id
  AND r.name = 'Supervisor de Operaciones'
  AND t.module_id = '421e96da-5235-4857-bf81-e63336447f13'
  AND t.slug NOT IN (
    'maint_operaciones',
    'maintenance_requests',
    'pendientes_ejecutar',
    'para_taller',
    'seguimiento_taller',
    'nuevo_pedido'
  );

-- Garantiza el acceso a las dos tabs que si debe ver.
INSERT INTO "public"."role_permissions" (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM "public"."roles" r
CROSS JOIN "public"."tabs" t
CROSS JOIN "public"."actions" a
WHERE r.name = 'Supervisor de Operaciones'
  AND (
    (t.slug = 'maint_operaciones' AND a.slug = 'view')
    OR (t.slug = 'nuevo_pedido' AND a.slug IN ('view', 'create'))
  )
  AND t.module_id = '421e96da-5235-4857-bf81-e63336447f13'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- ============================================================================
-- 3. Jefe de Taller -> Vista Taller | Taller | Nuevo Pedido | Gomeria | Configuracion
-- ============================================================================

-- Quita Operaciones y sus subtabs, mas las dos tabs desconectadas de la UI.
--
-- EXCEPCION `view_all_requests`: esa accion no solo gobierna la tab Operaciones.
-- `supervisorFilter.ts` la evalua sobre `maintenance_requests`, `pendientes_ejecutar`
-- y `para_taller` para decidir si un usuario ve TODOS los pedidos o solo aquellos en
-- los que figura como supervisor, y ese filtro se aplica tambien al paso
-- "Por Programar" del pipeline de Taller (PedidosMantenimiento/Pendientes), que el
-- Jefe de Taller si debe seguir viendo completo. Borrarla lo dejaria viendo apenas
-- los pedidos propios.
DELETE FROM "public"."role_permissions" rp
USING "public"."roles" r, "public"."tabs" t, "public"."actions" a
WHERE rp.role_id = r.id
  AND rp.tab_id = t.id
  AND rp.action_id = a.id
  AND r.name = 'Jefe de Taller'
  AND t.module_id = '421e96da-5235-4857-bf81-e63336447f13'
  AND a.slug <> 'view_all_requests'
  AND t.slug IN (
    'maint_operaciones',
    'maintenance_requests',
    'pendientes_ejecutar',
    'para_taller',
    'seguimiento_taller',
    'equipments_with_deviations',
    'created_solicitudes',
    'type_of_repair_new_entry'
  );

-- Todas las acciones sobre las 5 tabs permitidas y sus subtabs.
-- El par (tab, accion) replica los `allowedActions` de permissions-map.ts.
INSERT INTO "public"."role_permissions" (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM "public"."roles" r
CROSS JOIN "public"."tabs" t
CROSS JOIN "public"."actions" a
WHERE r.name = 'Jefe de Taller'
  AND t.module_id = '421e96da-5235-4857-bf81-e63336447f13'
  AND (
    -- Vista Taller
    (t.slug = 'workshop_view' AND a.slug = 'view')
    -- Nuevo Pedido
    OR (t.slug = 'nuevo_pedido' AND a.slug IN ('view', 'create'))
    -- Taller
    OR (t.slug = 'maint_taller' AND a.slug = 'view')
    OR (t.slug = 'maintenance_orders' AND a.slug IN ('view', 'update'))
    -- pedidos_pendientes:update ES el permiso de planificar fechas del ticket
    OR (t.slug = 'pedidos_pendientes' AND a.slug IN ('view', 'update'))
    OR (t.slug = 'pedidos_confirmados' AND a.slug IN ('view', 'update'))
    OR (t.slug = 'gestion_ordenes' AND a.slug IN ('view', 'create', 'update'))
    OR (t.slug = 'bandeja_aprobaciones' AND a.slug IN ('view', 'update'))
    OR (t.slug = 'ordenes_mantenimiento' AND a.slug IN ('view', 'update'))
    -- Gomeria
    OR (t.slug = 'gomeria' AND a.slug = 'view')
    OR (t.slug = 'catalogo_cubiertas' AND a.slug IN ('view', 'create', 'update', 'delete'))
    OR (t.slug = 'plantillas_cubiertas' AND a.slug IN ('view', 'create', 'update'))
    OR (t.slug = 'ordenes_gomeria' AND a.slug IN ('view', 'create', 'update'))
    OR (t.slug = 'marcas_cubiertas' AND a.slug IN ('view', 'create', 'update'))
    OR (t.slug = 'tipos_cubiertas' AND a.slug IN ('view', 'create', 'update'))
    -- Configuracion
    OR (t.slug = 'maint_configuracion' AND a.slug = 'view')
    OR (t.slug = 'type_of_repair' AND a.slug IN ('view', 'create', 'update'))
    OR (t.slug = 'maintenance_groups' AND a.slug IN ('view', 'create', 'update'))
  )
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- ============================================================================
-- 4. Overrides por usuario: NO se tocan (a proposito)
-- ============================================================================
-- Un `user_permissions` puede devolver por la puerta de atras un acceso que este
-- script acaba de quitar, asi que la tentacion es borrarlos. No se hace:
--
--  * Un usuario puede tener VARIOS roles (`user_roles` es N:M). Borrar por
--    "pertenece al rol X y la tab no esta en la lista de X" alcanza overrides que
--    el usuario tiene legitimamente por otro rol suyo. En dev, ese borrado se
--    llevaba puestos overrides de gomeria (catalogo/plantillas/ordenes) y
--    `workshop_view:view` de 5 usuarios.
--  * Son decisiones individuales cargadas a mano desde el editor de permisos; el
--    ticket pide configurar ROLES.
--
-- Si aparece un usuario con acceso de mas, se le quita el override desde el
-- editor, que es donde se lo dieron.
