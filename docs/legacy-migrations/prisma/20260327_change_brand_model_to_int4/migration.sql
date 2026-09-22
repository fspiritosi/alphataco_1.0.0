-- Change brand_vehicles and model_vehicles PKs and all FK references from int8 to int4.
-- Values are small (max 162), safe to downsize.
-- This fixes the type mismatch where other_equipment.brand_id/model_id are already int4
-- but brand_vehicles.id and model_vehicles.id are int8, causing Prisma JOINs to fail.

-- FK columns first (must match the PK type)
ALTER TABLE vehicles ALTER COLUMN brand TYPE integer;
ALTER TABLE vehicles ALTER COLUMN model TYPE integer;
ALTER TABLE model_vehicles ALTER COLUMN brand TYPE integer;

-- Then PKs
ALTER TABLE model_vehicles ALTER COLUMN id TYPE integer;
ALTER TABLE brand_vehicles ALTER COLUMN id TYPE integer;
