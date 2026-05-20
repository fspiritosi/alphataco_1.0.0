-- 1. Create tire_types table
CREATE TABLE "public"."tire_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "tread_type" "public"."TireTreadType" NOT NULL,
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tire_types_pkey" PRIMARY KEY ("id")
);

-- 2. Unique constraint
ALTER TABLE "public"."tire_types" ADD CONSTRAINT "tire_types_size_tread_type_company_id_key"
    UNIQUE ("size", "tread_type", "company_id");

-- 3. FK to company
ALTER TABLE "public"."tire_types" ADD CONSTRAINT "tire_types_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 4. Migrate existing data: insert unique (size, tread_type, company_id) combinations
INSERT INTO "public"."tire_types" ("id", "name", "size", "tread_type", "company_id", "created_at", "updated_at")
SELECT DISTINCT ON (t.size, t.tread_type, t.company_id)
    gen_random_uuid(),
    t.size || ' ' || CASE t.tread_type::text
        WHEN 'SMOOTH' THEN 'Liso'
        WHEN 'MIXED' THEN 'Mixto'
        WHEN 'BLOCK' THEN 'Taco'
        ELSE t.tread_type::text
    END,
    t.size,
    t.tread_type,
    t.company_id,
    NOW(),
    NOW()
FROM "public"."tires" t
WHERE t.size IS NOT NULL
ON CONFLICT ("size", "tread_type", "company_id") DO NOTHING;

-- 5. Add tire_type_id column (nullable first)
ALTER TABLE "public"."tires" ADD COLUMN "tire_type_id" UUID;

-- 6. Populate tire_type_id from existing data
UPDATE "public"."tires" t
SET "tire_type_id" = tt."id"
FROM "public"."tire_types" tt
WHERE t."size" = tt."size"
  AND t."tread_type" = tt."tread_type"
  AND t."company_id" = tt."company_id";

-- 7. Make tire_type_id NOT NULL
ALTER TABLE "public"."tires" ALTER COLUMN "tire_type_id" SET NOT NULL;

-- 8. Add FK constraint
ALTER TABLE "public"."tires" ADD CONSTRAINT "tires_tire_type_id_fkey"
    FOREIGN KEY ("tire_type_id") REFERENCES "public"."tire_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 9. Drop old columns
ALTER TABLE "public"."tires" DROP COLUMN "size";
ALTER TABLE "public"."tires" DROP COLUMN "tread_type";
