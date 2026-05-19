-- Fix: ID 60000000-...0060 was already taken by repair_solicitudes.
-- Use 70 as the gomeria root tab ID instead.

-- 1. Insert the correct gomeria root tab
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
  ('60000000-0000-0000-0000-000000000070', '421e96da-5235-4857-bf81-e63336447f13', 'gomeria', 'Gomería', 'Gestión de cubiertas neumáticas', 7, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Fix the 3 subtabs that were inserted pointing to the wrong parent (60 = repair_solicitudes)
UPDATE tabs
SET parent_tab_id = '60000000-0000-0000-0000-000000000070'
WHERE id IN (
  '60000000-0000-0000-0000-000000000061',
  '60000000-0000-0000-0000-000000000062',
  '60000000-0000-0000-0000-000000000063'
);

-- 3. Assign permissions for the gomeria root tab (subtabs 61/62/63 permissions already assigned correctly
--    since their IDs haven't changed, only their parent_tab_id)
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, a.id, act.id
FROM roles r
CROSS JOIN (
  SELECT id FROM tabs WHERE id = '60000000-0000-0000-0000-000000000070'
) a
CROSS JOIN actions act
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND act.slug = 'view'
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
