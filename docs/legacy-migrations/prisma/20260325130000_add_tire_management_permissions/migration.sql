-- Insert tabs for Gomería module
-- NOTE: ID 60000000-...0060 was already taken by repair_solicitudes.
-- Gomería root tab uses 70; subtabs use 61/62/63 (were free).
-- A follow-up fixup migration (20260325130001) corrects parent_tab_id references.
INSERT INTO tabs (id, module_id, slug, name, description, order_index, parent_tab_id) VALUES
  ('60000000-0000-0000-0000-000000000061', '421e96da-5235-4857-bf81-e63336447f13', 'catalogo_cubiertas', 'Catálogo de Cubiertas', 'CRUD de cubiertas', 1, '60000000-0000-0000-0000-000000000070'),
  ('60000000-0000-0000-0000-000000000062', '421e96da-5235-4857-bf81-e63336447f13', 'plantillas_cubiertas', 'Plantillas de Cubiertas', 'Plantillas de distribución', 2, '60000000-0000-0000-0000-000000000070'),
  ('60000000-0000-0000-0000-000000000063', '421e96da-5235-4857-bf81-e63336447f13', 'ordenes_gomeria', 'Órdenes de Gomería', 'Órdenes de servicio de gomería', 3, '60000000-0000-0000-0000-000000000070')
ON CONFLICT (id) DO NOTHING;

-- Assign permissions to admin, administrador, and full-access-provisional for subtabs
INSERT INTO role_permissions (role_id, tab_id, action_id)
SELECT r.id, t.id, a.id
FROM roles r
CROSS JOIN (
  SELECT id, slug FROM tabs WHERE id IN (
    '60000000-0000-0000-0000-000000000061',
    '60000000-0000-0000-0000-000000000062',
    '60000000-0000-0000-0000-000000000063'
  )
) t
CROSS JOIN actions a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND (
    (t.slug = 'catalogo_cubiertas' AND a.slug IN ('view', 'create', 'update', 'delete'))
    OR (t.slug = 'plantillas_cubiertas' AND a.slug IN ('view', 'create', 'update'))
    OR (t.slug = 'ordenes_gomeria' AND a.slug IN ('view', 'create', 'update'))
  )
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
