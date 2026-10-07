-- Facturación electrónica ARCA: subtab "Datos fiscales" en Configuración → General.
-- Solo si el catálogo ya está sembrado (en una base nueva lo crea scripts/seed-company.ts desde
-- permissions-map.ts, que ya la incluye).
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
SELECT v.* FROM (VALUES
  ('10000000-0000-0000-0000-000000000017'::uuid, 'e0478383-1287-4b5e-a727-985baf867173'::uuid, 'datos-fiscales',
   'Datos fiscales', 'Datos fiscales del emisor, puntos de venta y certificado de ARCA', 7,
   '10000000-0000-0000-0000-000000000001'::uuid)
) AS v(id, module_id, slug, name, description, order_index, parent_tab_id)
WHERE EXISTS (SELECT 1 FROM tabs t WHERE t.id = '10000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Permisos de los 3 roles de sistema, y SOLO esos tres: los roles custom de cada empresa se
-- asignan a mano desde el editor de permisos (regla del proyecto).
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, '10000000-0000-0000-0000-000000000017'::uuid, a.id
FROM roles r
JOIN actions a ON a.slug IN ('view', 'update')
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND EXISTS (SELECT 1 FROM tabs t WHERE t.id = '10000000-0000-0000-0000-000000000017')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
