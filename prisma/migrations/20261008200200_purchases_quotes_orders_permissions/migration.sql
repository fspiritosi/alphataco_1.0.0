-- Compras, etapa 2: tabs Cotizaciones y Ordenes de compra, y permisos de los roles de sistema.
-- Mismo contenido que permissions-map.ts (el seed lo toma de ahi en bases nuevas).

-- 1) Tabs nuevas y orden: Solicitudes, Cotizaciones, Ordenes de compra, Proveedores, Configuracion.
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000000', 'solicitudes',
   'Solicitudes', 'Solicitudes de compra y su aprobacion', 0, NULL),
  ('c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000000', 'cotizaciones',
   'Cotizaciones', 'Pedidos de cotizacion a proveedores', 1, NULL),
  ('c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000000', 'ordenes',
   'Órdenes de compra', 'Ordenes de compra, aprobacion y envio al proveedor', 2, NULL),
  ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000000', 'proveedores',
   'Proveedores', 'Ficha de proveedores', 3, NULL),
  ('c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000000', 'config-compras',
   'Configuración', 'Rubros de proveedor', 4, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- 2) Permisos de los 3 roles de sistema, y SOLO esos tres (los roles custom se asignan a mano).
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.tab_id, a.id
FROM roles r
CROSS JOIN (VALUES
  ('c0000000-0000-0000-0000-000000000004'::uuid, ARRAY['view','create','update']),
  ('c0000000-0000-0000-0000-000000000005'::uuid, ARRAY['view','create','update','approve'])
) AS t(tab_id, action_slugs)
JOIN actions a ON a.slug = ANY(t.action_slugs)
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
