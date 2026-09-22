-- Migration: add_clothing_permissions
-- Adds tabs and role_permissions for the clothing/EPP (indumentaria) module.

-- ============================================================
-- 1. Parent tab under RRHH (empresa module)
--    parent_tab_id = '10000000-0000-0000-0000-000000000002' (rrhh)
--    order_index = 7 (current max is 6)
-- ============================================================
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('69c7334c-84a1-4122-a83d-65e279964fcd', 'e0478383-1287-4b5e-a727-985baf867173', 'listado_maestro_articulos', 'Listado Maestro de Artículos', 'Catálogo de indumentaria y EPP', 7, '10000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Subtabs under listado_maestro_articulos
-- ============================================================
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('7d36f2f7-6e56-4d61-b45a-da3ba43aaebe', 'e0478383-1287-4b5e-a727-985baf867173', 'articulos_indumentaria', 'Artículos', 'Gestión de artículos de indumentaria', 1, '69c7334c-84a1-4122-a83d-65e279964fcd'),
('309aa503-3fd1-45e7-b666-23ee2bdfda2e', 'e0478383-1287-4b5e-a727-985baf867173', 'marcas_indumentaria', 'Marcas', 'Gestión de marcas de indumentaria', 2, '69c7334c-84a1-4122-a83d-65e279964fcd'),
('88cf0886-2e20-491d-8c7a-e7b5b12759d7', 'e0478383-1287-4b5e-a727-985baf867173', 'talles_indumentaria', 'Talles', 'Gestión de talles de indumentaria', 3, '69c7334c-84a1-4122-a83d-65e279964fcd'),
('f377cf37-5aef-43a7-a663-3924a33cda02', 'e0478383-1287-4b5e-a727-985baf867173', 'reportes_indumentaria', 'Reportes', 'Reportes de entregas de indumentaria', 4, '69c7334c-84a1-4122-a83d-65e279964fcd')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Tab under detalle-empleado (empleados module)
--    parent_tab_id = '20000000-0000-0000-0000-000000000006' (detalle-empleado)
--    order_index = 5 (current max is 4)
-- ============================================================
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
('3df67b2a-f5e7-47e0-849b-88698d055863', '3c54a757-162c-4afc-8ea5-dca462f92e0c', 'indumentaria_empleado', 'Indumentaria', 'Historial de entregas del empleado', 5, '20000000-0000-0000-0000-000000000006')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Assign all permissions to admin, administrador, and full-access-provisional roles
-- ============================================================
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM roles r, tabs t, actions a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
AND t.slug IN (
  'listado_maestro_articulos',
  'articulos_indumentaria',
  'marcas_indumentaria',
  'talles_indumentaria',
  'reportes_indumentaria',
  'indumentaria_empleado'
)
AND a.slug IN ('view', 'create', 'update', 'delete')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
