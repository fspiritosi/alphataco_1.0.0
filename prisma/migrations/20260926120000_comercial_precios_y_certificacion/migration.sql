-- tsk-745 — Modulo Comercial: sectores por cliente, cantidad en la linea del parte,
-- revisiones de precio con reglas de actualizacion, y certificacion como entidad.
--
-- Contexto: las 19 tablas del dominio comercial estan en CERO filas, asi que no hay backfill
-- ni migracion de datos. El `ADD COLUMN customer_id UUID NOT NULL` sobre `sectors` es seguro
-- por eso mismo; sobre una tabla con filas habria que hacerlo en tres pasos.
--
-- `sector_customer` se elimina: con `sectors.customer_id` la pivote queda sin funcion, y una
-- pivote muerta es una trampa para el proximo que lea el esquema.

-- CreateEnum
CREATE TYPE "price_update_method" AS ENUM ('manual', 'index', 'polynomial');

-- CreateEnum
CREATE TYPE "certification_status" AS ENUM ('borrador', 'emitida', 'confirmada', 'anulada');

-- DropForeignKey
ALTER TABLE "sector_customer" DROP CONSTRAINT "sector_customer_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "sector_customer" DROP CONSTRAINT "sector_customer_sector_id_fkey";

-- AlterTable
ALTER TABLE "customer_services" ADD COLUMN     "currency" CHAR(3) NOT NULL DEFAULT 'ARS';

-- AlterTable
ALTER TABLE "dailyreportrows" ADD COLUMN     "quantity" DECIMAL(15,4) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "sectors" ADD COLUMN     "customer_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "service_items" ALTER COLUMN "item_price" SET DATA TYPE DECIMAL(15,4);

-- DropTable
DROP TABLE "sector_customer";

-- CreateTable
CREATE TABLE "service_item_price_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_item_id" UUID NOT NULL,
    "price" DECIMAL(15,4) NOT NULL,
    "previous_price" DECIMAL(15,4),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "valid_from" DATE NOT NULL,
    "source" "price_update_method" NOT NULL,
    "change_reason" TEXT,
    "created_by" UUID,
    "run_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_item_price_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_update_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "customer_service_id" UUID,
    "name" TEXT NOT NULL,
    "method" "price_update_method" NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_update_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_update_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "rule_id" UUID,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_by" UUID,
    "items_affected" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "price_update_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "customer_service_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "period_from" DATE NOT NULL,
    "period_to" DATE NOT NULL,
    "status" "certification_status" NOT NULL DEFAULT 'borrador',
    "currency" CHAR(3) NOT NULL,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "issued_at" TIMESTAMPTZ(6),
    "issued_by" UUID,
    "confirmed_at" TIMESTAMPTZ(6),
    "confirmed_by" UUID,
    "voided_at" TIMESTAMPTZ(6),
    "voided_by" UUID,
    "voided_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "certification_id" UUID NOT NULL,
    "dailyreportrow_id" UUID,
    "service_item_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit_price" DECIMAL(15,4) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certification_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_price_revisions_service_item_id" ON "service_item_price_revisions"("service_item_id");

-- CreateIndex
CREATE INDEX "idx_price_revisions_run_id" ON "service_item_price_revisions"("run_id");

-- CreateIndex
CREATE INDEX "idx_price_update_rules_company_id" ON "price_update_rules"("company_id");

-- CreateIndex
CREATE INDEX "idx_price_update_rules_customer_service_id" ON "price_update_rules"("customer_service_id");

-- CreateIndex
CREATE INDEX "idx_price_update_runs_company_id" ON "price_update_runs"("company_id");

-- CreateIndex
CREATE INDEX "idx_price_update_runs_rule_id" ON "price_update_runs"("rule_id");

-- CreateIndex
CREATE INDEX "idx_certifications_company_id" ON "certifications"("company_id");

-- CreateIndex
CREATE INDEX "idx_certifications_customer_id" ON "certifications"("customer_id");

-- CreateIndex
CREATE INDEX "idx_certifications_customer_service_id" ON "certifications"("customer_service_id");

-- CreateIndex
CREATE INDEX "idx_certifications_status" ON "certifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_company_id_number_key" ON "certifications"("company_id", "number");

-- CreateIndex
CREATE INDEX "idx_certification_lines_certification_id" ON "certification_lines"("certification_id");

-- CreateIndex
CREATE INDEX "idx_certification_lines_dailyreportrow_id" ON "certification_lines"("dailyreportrow_id");

-- CreateIndex
CREATE INDEX "idx_certification_lines_service_item_id" ON "certification_lines"("service_item_id");

-- CreateIndex
CREATE INDEX "idx_sectors_customer_id" ON "sectors"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "sectors_customer_id_name_key" ON "sectors"("customer_id", "name");

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_item_price_revisions" ADD CONSTRAINT "service_item_price_revisions_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "service_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_item_price_revisions" ADD CONSTRAINT "service_item_price_revisions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "price_update_runs"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "price_update_rules" ADD CONSTRAINT "price_update_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_update_rules" ADD CONSTRAINT "price_update_rules_customer_service_id_fkey" FOREIGN KEY ("customer_service_id") REFERENCES "customer_services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "price_update_runs" ADD CONSTRAINT "price_update_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_update_runs" ADD CONSTRAINT "price_update_runs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "price_update_rules"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_customer_service_id_fkey" FOREIGN KEY ("customer_service_id") REFERENCES "customer_services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certification_lines" ADD CONSTRAINT "certification_lines_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certification_lines" ADD CONSTRAINT "certification_lines_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "service_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certification_lines" ADD CONSTRAINT "certification_lines_dailyreportrow_id_fkey" FOREIGN KEY ("dailyreportrow_id") REFERENCES "dailyreportrows"("id") ON DELETE SET NULL ON UPDATE NO ACTION;


-- ── Lo que Prisma no sabe expresar ──────────────────────────────────────────
--
-- Un solo precio vigente por item, garantizado por la BASE y no por convencion del codigo.
-- Prisma no modela indices parciales, asi que este va a mano y NO aparece en schema.prisma:
-- si alguien regenera el baseline a partir del schema, hay que volver a sumarlo.
--
-- Sin esto, "el precio a usar es el que tenga is_current" depende de que ninguna action se
-- equivoque nunca. Con esto, equivocarse tira error en vez de dejar dos precios vigentes y que
-- gane el que la query devuelva primero.
CREATE UNIQUE INDEX "uq_price_revisions_one_current_per_item"
  ON "service_item_price_revisions" ("service_item_id")
  WHERE "is_current";

-- Un periodo de certificacion no puede terminar antes de empezar.
ALTER TABLE "certifications"
  ADD CONSTRAINT "certifications_period_check" CHECK ("period_to" >= "period_from");

-- Cantidades e importes no negativos. Barato de declarar, y atrapa el error donde se produce
-- en lugar de en el total de un documento que alguien ya firmo.
ALTER TABLE "certification_lines"
  ADD CONSTRAINT "certification_lines_quantity_check" CHECK ("quantity" >= 0),
  ADD CONSTRAINT "certification_lines_unit_price_check" CHECK ("unit_price" >= 0);

ALTER TABLE "dailyreportrows"
  ADD CONSTRAINT "dailyreportrows_quantity_check" CHECK ("quantity" >= 0);
