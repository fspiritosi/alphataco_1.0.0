-- Manual de uso: segunda tab del módulo Ayuda (junto a Tickets).
-- Solo si el catálogo ya está sembrado (en una base nueva la crea scripts/seed-company.ts desde
-- permissions-map.ts, que ya la incluye).
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id)
SELECT v.* FROM (VALUES
  ('a0000000-0000-0000-0000-000000000002'::uuid, '7785379f-1e5f-692f-da2d-fccf9ee5af39'::uuid, 'manual',
   'Manual de uso', 'Manual de uso del sistema: guías por pantalla, procesos y glosario', 1,
   NULL::uuid)
) AS v(id, module_id, slug, name, description, order_index, parent_tab_id)
WHERE EXISTS (SELECT 1 FROM tabs t WHERE t.id = 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Permisos de los 3 roles de sistema, y SOLO esos tres: los roles custom de cada empresa se
-- asignan a mano desde el editor de permisos (regla del proyecto).
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, 'a0000000-0000-0000-0000-000000000002'::uuid, a.id
FROM roles r
JOIN actions a ON a.slug = 'view'
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND EXISTS (SELECT 1 FROM tabs t WHERE t.id = 'a0000000-0000-0000-0000-000000000002')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
