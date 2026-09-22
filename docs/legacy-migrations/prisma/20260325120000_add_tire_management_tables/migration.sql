-- CreateEnum
CREATE TYPE "TireStatus" AS ENUM ('AVAILABLE', 'INSTALLED', 'IN_REPAIR', 'DISCARDED');

-- CreateEnum
CREATE TYPE "TireRetreadLevel" AS ENUM ('FIRST', 'SECOND', 'THIRD');

-- CreateEnum
CREATE TYPE "TireTreadType" AS ENUM ('SMOOTH', 'MIXED', 'BLOCK');

-- CreateEnum
CREATE TYPE "TirePositionSide" AS ENUM ('LEFT', 'RIGHT', 'SPARE');

-- CreateEnum
CREATE TYPE "TireServiceAction" AS ENUM ('REPLACE', 'REPAIR', 'CALIBRATE');

-- CreateEnum
CREATE TYPE "TireOldDestination" AS ENUM ('AVAILABLE', 'DISCARD', 'REPAIR');

-- CreateEnum
CREATE TYPE "TireServiceOrderStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN "tire_template_id" UUID;

-- CreateTable
CREATE TABLE "tire_brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tires" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "serial_number" TEXT NOT NULL,
    "brand_id" UUID NOT NULL,
    "size" TEXT NOT NULL,
    "is_new" BOOLEAN NOT NULL DEFAULT true,
    "retread_level" "TireRetreadLevel",
    "tread_type" "TireTreadType" NOT NULL,
    "tread_depth" DECIMAL(5,2),
    "status" "TireStatus" NOT NULL DEFAULT 'AVAILABLE',
    "discard_photo" TEXT,
    "discard_comment" TEXT,
    "discarded_at" TIMESTAMPTZ(6),
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "company_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_template_axles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "axle_number" INTEGER NOT NULL,
    "tires_per_side" INTEGER NOT NULL,
    "tire_size" TEXT NOT NULL,
    "is_drive_axle" BOOLEAN NOT NULL DEFAULT false,
    "is_spare" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_template_axles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_tire_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicle_id" UUID NOT NULL,
    "template_axle_id" UUID NOT NULL,
    "position_number" INTEGER NOT NULL,
    "axle_number" INTEGER NOT NULL,
    "side" "TirePositionSide" NOT NULL,
    "tire_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_tire_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_service_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicle_id" UUID NOT NULL,
    "trailer_vehicle_id" UUID,
    "kilometer" TEXT,
    "service_date" TIMESTAMPTZ(6) NOT NULL,
    "status" "TireServiceOrderStatus" NOT NULL DEFAULT 'OPEN',
    "created_by" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),

    CONSTRAINT "tire_service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_service_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_order_id" UUID NOT NULL,
    "position_number" INTEGER NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "action" "TireServiceAction" NOT NULL,
    "tire_id" UUID,
    "new_tire_id" UUID,
    "old_tire_destination" "TireOldDestination",
    "tread_depth" DECIMAL(5,2),
    "pressure_start" DECIMAL(5,1),
    "pressure_end" DECIMAL(5,1),
    "observations" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tire_brands_name_company_id_key" ON "tire_brands"("name", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "tires_serial_number_company_id_key" ON "tires"("serial_number", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "tire_template_axles_template_id_axle_number_key" ON "tire_template_axles"("template_id", "axle_number");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_tire_positions_vehicle_id_position_number_key" ON "vehicle_tire_positions"("vehicle_id", "position_number");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tire_template_id_fkey" FOREIGN KEY ("tire_template_id") REFERENCES "tire_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_brands" ADD CONSTRAINT "tire_brands_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tires" ADD CONSTRAINT "tires_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "tire_brands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tires" ADD CONSTRAINT "tires_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_templates" ADD CONSTRAINT "tire_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_template_axles" ADD CONSTRAINT "tire_template_axles_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "tire_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicle_tire_positions" ADD CONSTRAINT "vehicle_tire_positions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicle_tire_positions" ADD CONSTRAINT "vehicle_tire_positions_template_axle_id_fkey" FOREIGN KEY ("template_axle_id") REFERENCES "tire_template_axles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicle_tire_positions" ADD CONSTRAINT "vehicle_tire_positions_tire_id_fkey" FOREIGN KEY ("tire_id") REFERENCES "tires"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_orders" ADD CONSTRAINT "tire_service_orders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_orders" ADD CONSTRAINT "tire_service_orders_trailer_vehicle_id_fkey" FOREIGN KEY ("trailer_vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_orders" ADD CONSTRAINT "tire_service_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_orders" ADD CONSTRAINT "tire_service_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_items" ADD CONSTRAINT "tire_service_items_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "tire_service_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_items" ADD CONSTRAINT "tire_service_items_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_items" ADD CONSTRAINT "tire_service_items_tire_id_fkey" FOREIGN KEY ("tire_id") REFERENCES "tires"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tire_service_items" ADD CONSTRAINT "tire_service_items_new_tire_id_fkey" FOREIGN KEY ("new_tire_id") REFERENCES "tires"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
