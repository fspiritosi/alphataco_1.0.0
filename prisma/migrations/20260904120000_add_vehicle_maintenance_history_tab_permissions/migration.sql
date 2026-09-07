-- Permiso propio para la tab "Historial de Mantenimiento" del detalle de equipo.
-- Antes heredaba mantenimiento/ordenes_mantenimiento; ahora tiene su propia tab de permisos.

-- 1. Insert tab historial-mantenimiento-equipo (hija de detalle-equipo, modulo equipos)
INSERT INTO "public"."tabs" (id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES (
  '30000000-0000-0000-0000-000000000058',
  '34d7f9e5-7c01-4def-9446-6b3f52d761a0',
  'historial-mantenimiento-equipo',
  'Historial de Mantenimiento',
  'Historial de ordenes y operaciones de mantenimiento del equipo',
  8,
  '30000000-0000-0000-0000-000000000005'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Garantia base: los 3 roles de acceso completo con 'view'
INSERT INTO "public"."role_permissions" (role_id, tab_id, action_id)
SELECT r.id, '30000000-0000-0000-0000-000000000058', a.id
FROM "public"."roles" r, "public"."actions" a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND a.slug = 'view'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- 3. Copiar acceso por ROL actual de mantenimiento/ordenes_mantenimiento (view) -> nueva tab
--    Preserva a los roles operativos custom que hoy ven la tab (no pierden acceso).
INSERT INTO "public"."role_permissions" (role_id, tab_id, action_id)
SELECT rp.role_id, '30000000-0000-0000-0000-000000000058', rp.action_id
FROM "public"."role_permissions" rp
JOIN "public"."actions" a ON a.id = rp.action_id
WHERE rp.tab_id = '60000000-0000-0000-0000-000000000045'
  AND a.slug = 'view'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

-- 4. Copiar overrides por USUARIO actuales de ordenes_mantenimiento (view, incluidos los deny) -> nueva tab
--    Mantiene la resolucion exacta: is_granted final = COALESCE(override_usuario, permiso_rol).
INSERT INTO "public"."user_permissions" (user_id, tab_id, action_id, is_granted)
SELECT up.user_id, '30000000-0000-0000-0000-000000000058', up.action_id, up.is_granted
FROM "public"."user_permissions" up
JOIN "public"."actions" a ON a.id = up.action_id
WHERE up.tab_id = '60000000-0000-0000-0000-000000000045'
  AND a.slug = 'view'
ON CONFLICT (user_id, tab_id, action_id) DO NOTHING;
