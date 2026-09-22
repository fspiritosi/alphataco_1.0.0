-- Add has_certificate column to clothing_delivery_items
ALTER TABLE "public"."clothing_delivery_items"
ADD COLUMN "has_certificate" BOOLEAN NOT NULL DEFAULT false;
