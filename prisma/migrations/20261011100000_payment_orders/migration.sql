-- Compras, etapa 5: ordenes de pago, retenciones, cuentas y cajas (catalogo de Tesoreria).


-- CreateEnum
CREATE TYPE "treasury_account_kind" AS ENUM ('BANK', 'CASH');

-- CreateEnum
CREATE TYPE "payment_order_status" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_line_kind" AS ENUM ('INVOICE', 'CREDIT_NOTE', 'ADVANCE', 'ADVANCE_APPLIED');

-- CreateEnum
CREATE TYPE "withholding_tax" AS ENUM ('GANANCIAS', 'IVA', 'IIBB', 'SUSS');

-- CreateEnum
CREATE TYPE "withholding_status" AS ENUM ('SUBJECT', 'NOT_REGISTERED', 'EXEMPT');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('TRANSFER', 'CHECK', 'ECHECK', 'CASH');

-- CreateTable
CREATE TABLE "treasury_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "kind" "treasury_account_kind" NOT NULL,
    "name" TEXT NOT NULL,
    "bank_name" TEXT,
    "account_number" TEXT,
    "cbu" VARCHAR(22),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "supplier_id" UUID NOT NULL,
    "status" "payment_order_status" NOT NULL,
    "planned_on" DATE NOT NULL,
    "paid_on" DATE,
    "notes" TEXT,
    "invoices_total" DECIMAL(15,2) NOT NULL,
    "credits_total" DECIMAL(15,2) NOT NULL,
    "advance_total" DECIMAL(15,2) NOT NULL,
    "withholdings_total" DECIMAL(15,2) NOT NULL,
    "net_total" DECIMAL(15,2) NOT NULL,
    "submitted_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "rejected_by" UUID,
    "rejected_at" TIMESTAMPTZ(6),
    "rejection_notes" TEXT,
    "paid_by" UUID,
    "sent_at" TIMESTAMPTZ(6),
    "sent_to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_order_rejections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_order_id" UUID NOT NULL,
    "rejected_by" UUID NOT NULL,
    "rejected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,

    CONSTRAINT "payment_order_rejections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_order_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_order_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "payment_line_kind" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "invoice_id" UUID,
    "purchase_order_id" UUID,
    "description" TEXT,
    "source_line_id" UUID,

    CONSTRAINT "payment_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_order_withholdings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_order_id" UUID NOT NULL,
    "tax" "withholding_tax" NOT NULL,
    "regime_id" UUID NOT NULL,
    "base" DECIMAL(15,2) NOT NULL,
    "rate" DECIMAL(7,4) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "detail" TEXT NOT NULL,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "certificate_number" TEXT,
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_order_withholdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_order_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_order_id" UUID NOT NULL,
    "method" "payment_method" NOT NULL,
    "treasury_account_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reference" TEXT,
    "check_number" TEXT,
    "check_bank" TEXT,
    "check_due_on" DATE,

    CONSTRAINT "payment_order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withholding_regimes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "tax" "withholding_tax" NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "description" TEXT NOT NULL,
    "rate_registered" DECIMAL(7,4) NOT NULL,
    "rate_unregistered" DECIMAL(7,4),
    "monthly_exempt_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "minimum_withholding" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "scale" JSONB,
    "vat_percentage" DECIMAL(7,4),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withholding_regimes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_withholding_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "tax" "withholding_tax" NOT NULL,
    "status" "withholding_status" NOT NULL,
    "regime_id" UUID,
    "rate" DECIMAL(7,4),
    "exclusion_percentage" DECIMAL(7,4),
    "exclusion_from" DATE,
    "exclusion_to" DATE,
    "exclusion_certificate" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_withholding_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "treasury_accounts_company_id_name_key" ON "treasury_accounts"("company_id", "name");

-- CreateIndex
CREATE INDEX "idx_payment_orders_supplier_id" ON "payment_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_payment_orders_status" ON "payment_orders"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_company_id_number_key" ON "payment_orders"("company_id", "number");

-- CreateIndex
CREATE INDEX "idx_payment_order_rejections_order_id" ON "payment_order_rejections"("payment_order_id");

-- CreateIndex
CREATE INDEX "idx_payment_order_lines_order_id" ON "payment_order_lines"("payment_order_id");

-- CreateIndex
CREATE INDEX "idx_payment_order_lines_invoice_id" ON "payment_order_lines"("invoice_id");

-- CreateIndex
CREATE INDEX "idx_payment_order_lines_source_line_id" ON "payment_order_lines"("source_line_id");

-- CreateIndex
CREATE INDEX "idx_payment_order_withholdings_order_id" ON "payment_order_withholdings"("payment_order_id");

-- CreateIndex
CREATE INDEX "idx_payment_order_payments_order_id" ON "payment_order_payments"("payment_order_id");

-- CreateIndex
CREATE INDEX "idx_payment_order_payments_account_id" ON "payment_order_payments"("treasury_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "withholding_regimes_company_tax_code_key" ON "withholding_regimes"("company_id", "tax", "code");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_withholding_profiles_supplier_tax_key" ON "supplier_withholding_profiles"("supplier_id", "tax");

-- AddForeignKey
ALTER TABLE "treasury_accounts" ADD CONSTRAINT "treasury_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_order_rejections" ADD CONSTRAINT "payment_order_rejections_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_order_rejections" ADD CONSTRAINT "payment_order_rejections_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_order_lines" ADD CONSTRAINT "payment_order_lines_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_order_lines" ADD CONSTRAINT "payment_order_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_order_lines" ADD CONSTRAINT "payment_order_lines_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_order_lines" ADD CONSTRAINT "payment_order_lines_source_line_id_fkey" FOREIGN KEY ("source_line_id") REFERENCES "payment_order_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_order_withholdings" ADD CONSTRAINT "payment_order_withholdings_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_order_withholdings" ADD CONSTRAINT "payment_order_withholdings_regime_id_fkey" FOREIGN KEY ("regime_id") REFERENCES "withholding_regimes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_order_payments" ADD CONSTRAINT "payment_order_payments_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_order_payments" ADD CONSTRAINT "payment_order_payments_treasury_account_id_fkey" FOREIGN KEY ("treasury_account_id") REFERENCES "treasury_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "withholding_regimes" ADD CONSTRAINT "withholding_regimes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_withholding_profiles" ADD CONSTRAINT "supplier_withholding_profiles_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_withholding_profiles" ADD CONSTRAINT "supplier_withholding_profiles_regime_id_fkey" FOREIGN KEY ("regime_id") REFERENCES "withholding_regimes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CHECK (spec etapa 5, §2.5)
ALTER TABLE "payment_orders"
  ADD CONSTRAINT "payment_orders_totals_check" CHECK (
    invoices_total >= 0 AND credits_total >= 0 AND advance_total >= 0 AND withholdings_total >= 0 AND net_total >= 0),
  ADD CONSTRAINT "payment_orders_cancel_check" CHECK (
    (cancelled_by IS NULL AND cancelled_at IS NULL AND cancel_reason IS NULL)
    OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL)),
  ADD CONSTRAINT "payment_orders_cancelled_status_check" CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL)),
  ADD CONSTRAINT "payment_orders_paid_check" CHECK (status <> 'PAID' OR (paid_on IS NOT NULL AND paid_by IS NOT NULL));

ALTER TABLE "payment_order_lines"
  ADD CONSTRAINT "payment_order_lines_amount_check" CHECK (amount > 0),
  ADD CONSTRAINT "payment_order_lines_kind_check" CHECK (
    (kind IN ('INVOICE', 'CREDIT_NOTE') AND invoice_id IS NOT NULL AND source_line_id IS NULL AND purchase_order_id IS NULL)
    OR (kind = 'ADVANCE' AND invoice_id IS NULL AND source_line_id IS NULL)
    OR (kind = 'ADVANCE_APPLIED' AND source_line_id IS NOT NULL AND invoice_id IS NULL AND purchase_order_id IS NULL));

ALTER TABLE "payment_order_withholdings"
  ADD CONSTRAINT "payment_order_withholdings_amount_check" CHECK (amount > 0 AND base >= 0 AND rate >= 0);

ALTER TABLE "payment_order_payments"
  ADD CONSTRAINT "payment_order_payments_amount_check" CHECK (amount > 0),
  ADD CONSTRAINT "payment_order_payments_check_check" CHECK (
    method NOT IN ('CHECK', 'ECHECK') OR (check_number IS NOT NULL AND check_due_on IS NOT NULL));

ALTER TABLE "withholding_regimes"
  ADD CONSTRAINT "withholding_regimes_code_check" CHECK (code ~ '^[0-9]{3}$'),
  ADD CONSTRAINT "withholding_regimes_rates_check" CHECK (
    rate_registered >= 0 AND (rate_unregistered IS NULL OR rate_unregistered >= 0)
    AND monthly_exempt_amount >= 0 AND minimum_withholding >= 0
    AND (vat_percentage IS NULL OR (vat_percentage > 0 AND vat_percentage <= 100)));

ALTER TABLE "supplier_withholding_profiles"
  ADD CONSTRAINT "supplier_withholding_profiles_exclusion_check" CHECK (
    (exclusion_percentage IS NULL AND exclusion_from IS NULL AND exclusion_to IS NULL)
    OR (exclusion_percentage > 0 AND exclusion_percentage <= 100 AND exclusion_from IS NOT NULL AND exclusion_to IS NOT NULL
        AND exclusion_to >= exclusion_from)),
  ADD CONSTRAINT "supplier_withholding_profiles_rate_check" CHECK (rate IS NULL OR rate >= 0);
