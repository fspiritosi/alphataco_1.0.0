-- Compras, etapa 1: modulo, tabs y permisos de los roles de sistema.
-- Mismo contenido que declara src/features/Permissions/permissions-map.ts (el seed lo toma de
-- ahi en bases nuevas; esta migracion lo lleva a las bases ya desplegadas).

-- 1) Modulo. `price` y `description` son NOT NULL sin default: se completan igual que el seed.
INSERT INTO modules (id, slug, name, price, description, order_index, is_active)
VALUES ('c0000000-0000-0000-0000-000000000000', 'compras', 'Compras', 0, 'Compras', 0, true)
ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name;

-- 2) Tabs (todas de primer nivel).
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000000', 'solicitudes',
   'Solicitudes', 'Solicitudes de compra y su aprobacion', 0, NULL),
  ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000000', 'proveedores',
   'Proveedores', 'Ficha de proveedores', 1, NULL),
  ('c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000000', 'config-compras',
   'Configuración', 'Rubros de proveedor', 2, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 3) Permisos de los 3 roles de sistema, y SOLO esos tres: los roles custom de cada empresa
--    se asignan a mano desde el editor de permisos (regla del proyecto). `view_all_requests`
--    ya existe (la creo Almacenes etapa 3).
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.tab_id, a.id
FROM roles r
CROSS JOIN (VALUES
  ('c0000000-0000-0000-0000-000000000001'::uuid, ARRAY['view','view_all_requests','create','update','approve']),
  ('c0000000-0000-0000-0000-000000000002'::uuid, ARRAY['view','create','update','delete']),
  ('c0000000-0000-0000-0000-000000000003'::uuid, ARRAY['view','update'])
) AS t(tab_id, action_slugs)
JOIN actions a ON a.slug = ANY(t.action_slugs)
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
