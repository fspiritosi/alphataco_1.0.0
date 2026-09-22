-- Add snapshot fields for historical diagram reconstruction
ALTER TABLE "public"."tire_service_orders"
  ADD COLUMN IF NOT EXISTS "axle_snapshot" jsonb,
  ADD COLUMN IF NOT EXISTS "positions_snapshot" jsonb;
