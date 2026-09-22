-- Make template tire_size optional
ALTER TABLE "public"."tire_template_axles" ALTER COLUMN "tire_size" DROP NOT NULL;

-- Vehicle-level per-axle tire size override
CREATE TABLE "public"."vehicle_axle_tire_sizes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicle_id" UUID NOT NULL,
    "axle_number" INTEGER NOT NULL,
    "tire_size" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_axle_tire_sizes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vehicle_axle_tire_sizes_vehicle_id_axle_number_key"
    ON "public"."vehicle_axle_tire_sizes"("vehicle_id", "axle_number");

CREATE INDEX "idx_vehicle_axle_tire_sizes_vehicle"
    ON "public"."vehicle_axle_tire_sizes"("vehicle_id");

ALTER TABLE "public"."vehicle_axle_tire_sizes"
    ADD CONSTRAINT "vehicle_axle_tire_sizes_vehicle_id_fkey"
    FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
