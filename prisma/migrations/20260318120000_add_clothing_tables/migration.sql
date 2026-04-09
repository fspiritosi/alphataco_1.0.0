-- CreateEnum
CREATE TYPE "public"."clothing_delivery_type" AS ENUM ('PLANNED_CCT', 'PLANNED_EPP', 'REPLACEMENT');

-- CreateTable
CREATE TABLE "public"."clothing_brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clothing_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clothing_sizes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clothing_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clothing_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clothing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clothing_item_brand_sizes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clothing_item_id" UUID NOT NULL,
    "clothing_brand_id" UUID NOT NULL,
    "clothing_size_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clothing_item_brand_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clothing_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "delivered_by_id" UUID NOT NULL,
    "delivery_type" "public"."clothing_delivery_type" NOT NULL,
    "signature_url" TEXT,
    "notes" TEXT,
    "delivered_at" TIMESTAMPTZ(6) NOT NULL,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clothing_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clothing_delivery_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clothing_delivery_id" UUID NOT NULL,
    "clothing_item_id" UUID NOT NULL,
    "clothing_brand_id" UUID,
    "clothing_size_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "clothing_delivery_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clothing_brands_name_company_id_key" ON "public"."clothing_brands"("name", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "clothing_sizes_name_company_id_key" ON "public"."clothing_sizes"("name", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "clothing_items_name_company_id_key" ON "public"."clothing_items"("name", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "clothing_item_brand_sizes_unique_key" ON "public"."clothing_item_brand_sizes"("clothing_item_id", "clothing_brand_id", "clothing_size_id");

-- CreateIndex
CREATE INDEX "idx_clothing_deliveries_employee" ON "public"."clothing_deliveries"("employee_id");

-- CreateIndex
CREATE INDEX "idx_clothing_deliveries_company" ON "public"."clothing_deliveries"("company_id");

-- CreateIndex
CREATE INDEX "idx_clothing_delivery_items_delivery" ON "public"."clothing_delivery_items"("clothing_delivery_id");

-- AddForeignKey
ALTER TABLE "public"."clothing_brands" ADD CONSTRAINT "clothing_brands_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clothing_sizes" ADD CONSTRAINT "clothing_sizes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clothing_items" ADD CONSTRAINT "clothing_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clothing_item_brand_sizes" ADD CONSTRAINT "clothing_item_brand_sizes_clothing_item_id_fkey" FOREIGN KEY ("clothing_item_id") REFERENCES "public"."clothing_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clothing_item_brand_sizes" ADD CONSTRAINT "clothing_item_brand_sizes_clothing_brand_id_fkey" FOREIGN KEY ("clothing_brand_id") REFERENCES "public"."clothing_brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clothing_item_brand_sizes" ADD CONSTRAINT "clothing_item_brand_sizes_clothing_size_id_fkey" FOREIGN KEY ("clothing_size_id") REFERENCES "public"."clothing_sizes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clothing_deliveries" ADD CONSTRAINT "clothing_deliveries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clothing_deliveries" ADD CONSTRAINT "clothing_deliveries_delivered_by_id_fkey" FOREIGN KEY ("delivered_by_id") REFERENCES "public"."employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clothing_deliveries" ADD CONSTRAINT "clothing_deliveries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clothing_delivery_items" ADD CONSTRAINT "clothing_delivery_items_clothing_delivery_id_fkey" FOREIGN KEY ("clothing_delivery_id") REFERENCES "public"."clothing_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clothing_delivery_items" ADD CONSTRAINT "clothing_delivery_items_clothing_item_id_fkey" FOREIGN KEY ("clothing_item_id") REFERENCES "public"."clothing_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clothing_delivery_items" ADD CONSTRAINT "clothing_delivery_items_clothing_brand_id_fkey" FOREIGN KEY ("clothing_brand_id") REFERENCES "public"."clothing_brands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clothing_delivery_items" ADD CONSTRAINT "clothing_delivery_items_clothing_size_id_fkey" FOREIGN KEY ("clothing_size_id") REFERENCES "public"."clothing_sizes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Storage bucket for delivery signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('clothing-signatures', 'clothing-signatures', true) ON CONFLICT (id) DO NOTHING;
