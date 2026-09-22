-- Insert new tabs (children of gomeria tab)
INSERT INTO "public"."tabs" ("id", "module_id", "slug", "name", "description", "order_index", "parent_tab_id")
VALUES
  ('60000000-0000-0000-0000-000000000064', '421e96da-5235-4857-bf81-e63336447f13', 'marcas_cubiertas', 'Marcas de Cubiertas', 'CRUD de marcas de cubiertas', 4, '60000000-0000-0000-0000-000000000070'),
  ('60000000-0000-0000-0000-000000000065', '421e96da-5235-4857-bf81-e63336447f13', 'tipos_cubiertas', 'Tipos de Cubierta', 'CRUD de tipos de cubierta', 5, '60000000-0000-0000-0000-000000000070')
ON CONFLICT ("id") DO NOTHING;

-- Assign view, create, update permissions to admin, administrador, full-access-provisional
INSERT INTO "public"."role_permissions" ("role_id", "tab_id", "action_id")
SELECT r.id, t.id, a.id
FROM "public"."roles" r
CROSS JOIN "public"."tabs" t
CROSS JOIN "public"."actions" a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
  AND t.id IN ('60000000-0000-0000-0000-000000000064', '60000000-0000-0000-0000-000000000065')
  AND a.slug IN ('view', 'create', 'update')
ON CONFLICT ("role_id", "tab_id", "action_id") DO NOTHING;
