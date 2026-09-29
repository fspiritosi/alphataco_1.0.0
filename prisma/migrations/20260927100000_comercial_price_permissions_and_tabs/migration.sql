-- tsk-745 — Permisos del rediseño comercial.
--
-- 1) Dos acciones nuevas. Un precio no es un dato como los otros: ver un parte y ver lo que
--    vale son permisos distintos, y poder tocarlo es un tercero.
INSERT INTO actions (slug, name) VALUES
  ('view_prices',   'Ver precios e importes'),
  ('update_prices', 'Modificar precios')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- 2) Tabs nuevas.
--    - areas-cliente / sectores-cliente: areas y sectores dejan de ser pantallas sueltas del
--      modulo y pasan a ser pestañas de la ficha del cliente, que es de quien dependen.
--    - certificaciones: el documento que se arma con lo trabajado en un periodo.
--    - reglas-precio: como se actualizan los precios (indice, polinomica, manual).
--    Solo si el catalogo ya esta sembrado: en una base nueva el modulo Comercial y las tabs
--    padre todavia no existen (las crea `scripts/seed-company.ts` despues de migrar, desde
--    permissions-map.ts, que ya incluye estas cuatro) y el INSERT rompia por FK.
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
SELECT v.* FROM (VALUES
  ('40000000-0000-0000-0000-000000000114'::uuid, '92bfac14-dc5b-41be-b366-740bfbeaea13'::uuid, 'areas-cliente',
   'Areas del Cliente', 'Areas operativas del cliente', 3, '40000000-0000-0000-0000-000000000011'::uuid),
  ('40000000-0000-0000-0000-000000000115'::uuid, '92bfac14-dc5b-41be-b366-740bfbeaea13'::uuid, 'sectores-cliente',
   'Sectores del Cliente', 'Sectores operativos del cliente', 4, '40000000-0000-0000-0000-000000000011'::uuid),
  ('40000000-0000-0000-0000-000000000018'::uuid, '92bfac14-dc5b-41be-b366-740bfbeaea13'::uuid, 'certificaciones',
   'Certificaciones', 'Certificacion de lo trabajado por cliente, contrato y periodo', 8,
   '40000000-0000-0000-0000-000000000001'::uuid),
  ('40000000-0000-0000-0000-000000000154'::uuid, '92bfac14-dc5b-41be-b366-740bfbeaea13'::uuid, 'reglas-precio',
   'Reglas de Actualizacion de Precios', 'Como se actualizan los precios de los items', 4,
   '40000000-0000-0000-0000-000000000015'::uuid)
) AS v(id, module_id, slug, name, description, order_index, parent_tab_id)
WHERE EXISTS (SELECT 1 FROM modules m WHERE m.id = '92bfac14-dc5b-41be-b366-740bfbeaea13')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 3) Permisos de los 3 roles de sistema, y SOLO esos tres: los roles custom de cada empresa
--    se asignan a mano desde el editor de permisos (regla del proyecto).
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.tab_id, a.id
FROM roles r
CROSS JOIN (VALUES
  ('40000000-0000-0000-0000-000000000114'::uuid, ARRAY['view','create','update','delete']),
  ('40000000-0000-0000-0000-000000000115'::uuid, ARRAY['view','create','update','delete']),
  ('40000000-0000-0000-0000-000000000018'::uuid, ARRAY['view','create','update','delete','approve','view_prices']),
  ('40000000-0000-0000-0000-000000000154'::uuid, ARRAY['view','create','update','delete']),
  -- Los precios viven en los items del contrato, que ya existia.
  ('40000000-0000-0000-0000-000000000153'::uuid, ARRAY['view_prices','update_prices'])
) AS t(tab_id, action_slugs)
JOIN actions a ON a.slug = ANY(t.action_slugs)
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
