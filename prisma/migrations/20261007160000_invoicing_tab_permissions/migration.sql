-- Facturación electrónica ARCA: subtab "Facturación" en Comercial.
-- Solo si el catálogo ya está sembrado (en una base nueva la crea scripts/seed-company.ts desde
-- permissions-map.ts, que ya la incluye).
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
SELECT v.* FROM (VALUES
  ('40000000-0000-0000-0000-000000000019'::uuid, '92bfac14-dc5b-41be-b366-740bfbeaea13'::uuid, 'facturacion',
   'Facturación', 'Comprobantes electrónicos de ARCA: facturas, notas de crédito y de débito', 9,
   '40000000-0000-0000-0000-000000000001'::uuid)
) AS v(id, module_id, slug, name, description, order_index, parent_tab_id)
WHERE EXISTS (SELECT 1 FROM tabs t WHERE t.id = '40000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Permisos de los 3 roles de sistema, y SOLO esos tres: los roles custom de cada empresa se
-- asignan a mano desde el editor de permisos (regla del proyecto).
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '40000000-0000-0000-0000-000000000019'::uuid, a.id
FROM roles r
JOIN actions a ON a.slug IN ('view', 'create', 'delete', 'approve', 'view_prices')
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND EXISTS (SELECT 1 FROM tabs t WHERE t.id = '40000000-0000-0000-0000-000000000019')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
