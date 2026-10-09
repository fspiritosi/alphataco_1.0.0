-- Compras, etapa 4: tabs Facturas y Libro IVA, y permisos de los roles de sistema (solo esos tres).
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000000', 'solicitudes',
   'Solicitudes', 'Solicitudes de compra y su aprobacion', 0, NULL),
  ('c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000000', 'cotizaciones',
   'Cotizaciones', 'Pedidos de cotizacion a proveedores', 1, NULL),
  ('c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000000', 'ordenes',
   'Órdenes de compra', 'Ordenes de compra, aprobacion y envio al proveedor', 2, NULL),
  ('c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000000', 'recepciones',
   'Recepciones', 'Recepcion de lo comprado y entrada a Almacenes', 3, NULL),
  ('c0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000000', 'facturas',
   'Facturas', 'Facturas, notas de debito y de credito de proveedores', 4, NULL),
  ('c0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000000', 'libro-iva',
   'Libro IVA', 'Libro IVA Compras y archivos del Libro IVA Digital', 5, NULL),
  ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000000', 'proveedores',
   'Proveedores', 'Ficha de proveedores', 6, NULL),
  ('c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000000', 'config-compras',
   'Configuración', 'Rubros de proveedor y conceptos de gasto', 7, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000007'::uuid, a.id
FROM roles r
JOIN actions a ON a.slug IN ('view', 'create', 'update', 'approve')
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;

INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000008'::uuid, a.id
FROM roles r
JOIN actions a ON a.slug = 'view'
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
