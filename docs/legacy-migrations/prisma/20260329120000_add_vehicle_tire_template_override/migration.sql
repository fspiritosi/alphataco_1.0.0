-- 1. Add tire_template_id override to vehicles
ALTER TABLE "public"."vehicles"
ADD COLUMN "tire_template_id" UUID;

ALTER TABLE "public"."vehicles"
ADD CONSTRAINT "vehicles_tire_template_id_fkey"
FOREIGN KEY ("tire_template_id") REFERENCES "public"."tire_templates"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 2. Add is_vehicle_override and source_template_id to tire_templates
ALTER TABLE "public"."tire_templates"
ADD COLUMN "is_vehicle_override" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."tire_templates"
ADD COLUMN "source_template_id" UUID;

ALTER TABLE "public"."tire_templates"
ADD CONSTRAINT "tire_templates_source_template_id_fkey"
FOREIGN KEY ("source_template_id") REFERENCES "public"."tire_templates"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

-- 3. Insert tab for cubiertas-equipo
INSERT INTO "public"."tabs" (id, module_id, slug, name, description, order_index, parent_tab_id)
VALUES (
  '30000000-0000-0000-0000-000000000057',
  '34d7f9e5-7c01-4def-9446-6b3f52d761a0',
  'cubiertas-equipo',
  'Cubiertas',
  'Diagrama de cubiertas y historial de intervenciones del equipo',
  7,
  '30000000-0000-0000-0000-000000000005'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Assign view + update permissions to admin, administrador, full-access-provisional
INSERT INTO "public"."role_permissions" (role_id, tab_id, action_id)
SELECT r.id, '30000000-0000-0000-0000-000000000057', a.id
FROM "public"."roles" r, "public"."actions" a
WHERE r.slug IN ('admin', 'administrador', 'full-access-provisional')
AND a.slug IN ('view', 'update')
ON CONFLICT (role_id, tab_id, action_id) DO NOTHING;
