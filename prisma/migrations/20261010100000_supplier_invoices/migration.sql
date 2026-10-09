-- Compras, etapa 4: facturas de proveedor, IVA por alicuota, tributos y conceptos de gasto.
-- CreateEnum
CREATE TYPE "supplier_invoice_status" AS ENUM ('CONFORMING', 'OBSERVED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "supplier_invoice_tax_kind" AS ENUM ('VAT_PERCEPTION', 'GROSS_INCOME_PERCEPTION', 'INTERNAL_TAX', 'OTHER_TAX');

-- CreateEnum
CREATE TYPE "arca_check_result" AS ENUM ('APPROVED', 'REJECTED', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "supplier_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "cbte_type" INTEGER NOT NULL,
    "sales_point" INTEGER NOT NULL,
    "number" BIGINT NOT NULL,
    "issue_date" DATE NOT NULL,
    "due_date" DATE,
    "vat_period" CHAR(7) NOT NULL,
    "cae" VARCHAR(14),
    "cae_due_date" DATE,
    "net_taxed" DECIMAL(15,2) NOT NULL,
    "net_untaxed" DECIMAL(15,2) NOT NULL,
    "exempt" DECIMAL(15,2) NOT NULL,
    "vat_total" DECIMAL(15,2) NOT NULL,
    "vat_perceptions" DECIMAL(15,2) NOT NULL,
    "gross_income_perceptions" DECIMAL(15,2) NOT NULL,
    "other_taxes" DECIMAL(15,2) NOT NULL,
    "total" DECIMAL(15,2) NOT NULL,
    "related_invoice_id" UUID,
    "status" "supplier_invoice_status" NOT NULL,
    "observations" JSONB NOT NULL DEFAULT '[]',
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_comment" TEXT,
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "arca_check_result" "arca_check_result",
    "arca_checked_at" TIMESTAMPTZ(6),
    "arca_check_detail" TEXT,
    "attachment_path" TEXT,
    "attachment_name" TEXT,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoice_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "order_line_id" UUID,
    "quantity" DECIMAL(15,4),
    "unit_price" DECIMAL(15,4),
    "expense_category_id" UUID,
    "description" TEXT,
    "vat_rate_id" INTEGER,
    "net_total" DECIMAL(15,2) NOT NULL,
    "vat_amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "supplier_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoice_vat" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "vat_rate_id" INTEGER NOT NULL,
    "base" DECIMAL(15,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "supplier_invoice_vat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoice_taxes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "kind" "supplier_invoice_tax_kind" NOT NULL,
    "province_id" BIGINT,
    "description" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "supplier_invoice_taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_expense_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_supplier_invoices_supplier_id" ON "supplier_invoices"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_supplier_invoices_vat_period" ON "supplier_invoices"("company_id", "vat_period");

-- CreateIndex
CREATE INDEX "idx_supplier_invoices_status" ON "supplier_invoices"("company_id", "status");

-- CreateIndex
CREATE INDEX "idx_supplier_invoices_related_invoice_id" ON "supplier_invoices"("related_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoices_voucher_key" ON "supplier_invoices"("company_id", "supplier_id", "cbte_type", "sales_point", "number");

-- CreateIndex
CREATE INDEX "idx_supplier_invoice_lines_invoice_id" ON "supplier_invoice_lines"("invoice_id");

-- CreateIndex
CREATE INDEX "idx_supplier_invoice_lines_order_line_id" ON "supplier_invoice_lines"("order_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoice_vat_invoice_id_vat_rate_id_key" ON "supplier_invoice_vat"("invoice_id", "vat_rate_id");

-- CreateIndex
CREATE INDEX "idx_supplier_invoice_taxes_invoice_id" ON "supplier_invoice_taxes"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_expense_categories_company_id_name_key" ON "purchase_expense_categories"("company_id", "name");

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_related_invoice_id_fkey" FOREIGN KEY ("related_invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_invoice_lines" ADD CONSTRAINT "supplier_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_lines" ADD CONSTRAINT "supplier_invoice_lines_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_invoice_lines" ADD CONSTRAINT "supplier_invoice_lines_expense_category_id_fkey" FOREIGN KEY ("expense_category_id") REFERENCES "purchase_expense_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_invoice_vat" ADD CONSTRAINT "supplier_invoice_vat_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_taxes" ADD CONSTRAINT "supplier_invoice_taxes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_taxes" ADD CONSTRAINT "supplier_invoice_taxes_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_expense_categories" ADD CONSTRAINT "purchase_expense_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CHECK (spec etapa 4, §2.3)
ALTER TABLE "supplier_invoices"
  ADD CONSTRAINT "supplier_invoices_sales_point_check" CHECK (sales_point BETWEEN 1 AND 99999),
  ADD CONSTRAINT "supplier_invoices_number_check" CHECK (number BETWEEN 1 AND 99999999),
  ADD CONSTRAINT "supplier_invoices_vat_period_check" CHECK (vat_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  ADD CONSTRAINT "supplier_invoices_cae_check" CHECK (cae IS NULL OR cae ~ '^[0-9]{14}$'),
  ADD CONSTRAINT "supplier_invoices_amounts_check" CHECK (
    net_taxed >= 0 AND net_untaxed >= 0 AND exempt >= 0 AND vat_total >= 0
    AND vat_perceptions >= 0 AND gross_income_perceptions >= 0 AND other_taxes >= 0 AND total >= 0),
  ADD CONSTRAINT "supplier_invoices_cancel_check" CHECK (
    (cancelled_by IS NULL AND cancelled_at IS NULL AND cancel_reason IS NULL)
    OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL)),
  ADD CONSTRAINT "supplier_invoices_cancelled_status_check" CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL)),
  ADD CONSTRAINT "supplier_invoices_resolution_check" CHECK (
    (resolved_by IS NULL AND resolved_at IS NULL AND resolution_comment IS NULL)
    OR (resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND resolution_comment IS NOT NULL));

ALTER TABLE "supplier_invoice_lines"
  ADD CONSTRAINT "supplier_invoice_lines_kind_check" CHECK ((order_line_id IS NULL) <> (expense_category_id IS NULL)),
  ADD CONSTRAINT "supplier_invoice_lines_order_check" CHECK (
    order_line_id IS NULL OR (quantity IS NOT NULL AND quantity > 0 AND unit_price IS NOT NULL AND unit_price >= 0)),
  ADD CONSTRAINT "supplier_invoice_lines_expense_check" CHECK (
    expense_category_id IS NULL OR (description IS NOT NULL AND length(btrim(description)) > 0)),
  ADD CONSTRAINT "supplier_invoice_lines_amounts_check" CHECK (net_total >= 0 AND vat_amount >= 0);

ALTER TABLE "supplier_invoice_vat"
  ADD CONSTRAINT "supplier_invoice_vat_amounts_check" CHECK (base >= 0 AND amount >= 0);

ALTER TABLE "supplier_invoice_taxes"
  ADD CONSTRAINT "supplier_invoice_taxes_amount_check" CHECK (amount > 0),
  ADD CONSTRAINT "supplier_invoice_taxes_province_check" CHECK (kind <> 'GROSS_INCOME_PERCEPTION' OR province_id IS NOT NULL),
  ADD CONSTRAINT "supplier_invoice_taxes_description_check" CHECK (
    kind <> 'OTHER_TAX' OR (description IS NOT NULL AND length(btrim(description)) > 0));
