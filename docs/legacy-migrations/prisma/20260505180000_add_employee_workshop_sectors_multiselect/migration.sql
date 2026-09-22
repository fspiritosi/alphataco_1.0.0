-- Multiselect de sectores de taller para empleados (COD-575)
-- Crea tabla pivot, migra datos, y solo borra la columna vieja si el conteo coincide.

-- 1. Tabla pivot
CREATE TABLE IF NOT EXISTS "public"."employee_workshop_sectors" (
  "employee_id" uuid NOT NULL,
  "workshop_sector_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "employee_workshop_sectors_pkey" PRIMARY KEY ("employee_id", "workshop_sector_id"),
  CONSTRAINT "employee_workshop_sectors_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "employee_workshop_sectors_workshop_sector_id_fkey"
    FOREIGN KEY ("workshop_sector_id") REFERENCES "public"."workshop_sectors"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_ews_employee_id" ON "public"."employee_workshop_sectors" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_ews_workshop_sector_id" ON "public"."employee_workshop_sectors" ("workshop_sector_id");

-- 2. Backfill desde la columna actual employees.workshop_sector_id
INSERT INTO "public"."employee_workshop_sectors" ("employee_id", "workshop_sector_id")
SELECT id, workshop_sector_id
FROM "public"."employees"
WHERE workshop_sector_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Migrar document_types.conditions: convertir condicion 'workshop_sector' de one_to_many a many_to_many.
-- Necesario para PROD donde puede haber configuraciones existentes que apuntan a la columna eliminada.
UPDATE "public"."document_types" dt
SET conditions = (
  SELECT array_agg(
    CASE
      WHEN cond->>'property_key' = 'workshop_sector' AND cond->>'relation_type' = 'one_to_many' THEN
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                cond,
                '{relation_type}', '"many_to_many"'
              ),
              '{relation_table}', '"employee_workshop_sectors"'
            ),
            '{column_on_employees}', '"id"'
          ),
          '{column_on_relation}', '"employee_id"'
        )
      ELSE cond
    END
  )
  FROM unnest(dt.conditions) AS cond
)
WHERE dt.conditions IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(dt.conditions) AS c
    WHERE c->>'property_key' = 'workshop_sector' AND c->>'relation_type' = 'one_to_many'
  );

-- 4. Verificacion + drop condicional de la columna employees.workshop_sector_id
DO $$
DECLARE
  source_count INT;
  migrated_count INT;
  column_still_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'workshop_sector_id'
  ) INTO column_still_exists;

  IF NOT column_still_exists THEN
    RAISE NOTICE 'Columna employees.workshop_sector_id ya no existe. Nada que verificar.';
    RETURN;
  END IF;

  EXECUTE 'SELECT count(*) FROM "public"."employees" WHERE workshop_sector_id IS NOT NULL' INTO source_count;
  SELECT count(DISTINCT employee_id) INTO migrated_count FROM "public"."employee_workshop_sectors";

  IF source_count = migrated_count THEN
    ALTER TABLE "public"."employees" DROP COLUMN IF EXISTS "workshop_sector_id";
    RAISE NOTICE 'OK: % empleados migrados. Columna employees.workshop_sector_id eliminada.', migrated_count;
  ELSE
    RAISE WARNING 'MISMATCH: source=%, migrated=%. Pivot creado pero columna vieja NO eliminada. Revisar manualmente.', source_count, migrated_count;
  END IF;
END $$;
