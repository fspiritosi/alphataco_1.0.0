-- Migration: move tire_template_id from vehicles to sub_type
-- Templates are now assigned per vehicle subtype, not per individual vehicle.

-- 1. Add tire_template_id column to sub_type
ALTER TABLE "public"."sub_type" ADD COLUMN "tire_template_id" UUID;

-- 2. Add FK constraint on sub_type
ALTER TABLE "public"."sub_type" ADD CONSTRAINT "sub_type_tire_template_id_fkey"
  FOREIGN KEY ("tire_template_id") REFERENCES "public"."tire_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 3. Migrate existing data: for each sub_type, set the template from the most common
--    template among its active vehicles (if any). Only sets if sub_type.tire_template_id IS NULL.
UPDATE "public"."sub_type" st
SET tire_template_id = (
  SELECT v.tire_template_id
  FROM "public"."vehicles" v
  WHERE v."subType" = st.id
    AND v.tire_template_id IS NOT NULL
    AND v.is_active = true
  GROUP BY v.tire_template_id
  ORDER BY COUNT(*) DESC
  LIMIT 1
)
WHERE st.tire_template_id IS NULL;

-- 4. Remove FK constraint from vehicles
ALTER TABLE "public"."vehicles" DROP CONSTRAINT IF EXISTS "vehicles_tire_template_id_fkey";

-- 5. Drop tire_template_id column from vehicles
ALTER TABLE "public"."vehicles" DROP COLUMN IF EXISTS "tire_template_id";
