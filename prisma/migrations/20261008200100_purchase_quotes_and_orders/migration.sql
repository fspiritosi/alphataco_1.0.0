-- Compras, etapa 2: pedidos de cotizacion y ordenes de compra (spec
-- docs/superpowers/specs/2026-10-08-compras-etapa-2-design.md §2). Del migrate diff se toma solo
-- lo de Compras: el diff tambien propone borrar indices parciales que Prisma no modela (drift).

-- CreateEnum
CREATE TYPE "purchase_quote_status" AS ENUM ('DRAFT', 'SENT', 'RECEIVED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "purchase_order_status" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'CANCELLED');


-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN     "close_reason" TEXT,
ADD COLUMN     "closed_at" TIMESTAMPTZ(6),
ADD COLUMN     "closed_by" UUID;

-- CreateTable
CREATE TABLE "purchase_quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "supplier_id" UUID NOT NULL,
    "status" "purchase_quote_status" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "sent_to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "received_at" DATE,
    "valid_until" DATE,
    "delivery_days" INTEGER,
    "supplier_notes" TEXT,
    "attachment_path" TEXT,
    "attachment_name" TEXT,
    "notes" TEXT,
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_quote_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "request_line_id" UUID NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit_price" DECIMAL(15,4),
    "vat_rate_id" INTEGER,
    "not_quoted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "purchase_quote_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "supplier_id" UUID NOT NULL,
    "quote_id" UUID,
    "status" "purchase_order_status" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "delivery_date" DATE,
    "delivery_place" TEXT,
    "payment_term_days" INTEGER,
    "notes" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vat_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "rejection_notes" TEXT,
    "rejected_by" UUID,
    "rejected_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "sent_to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sent_by" UUID,
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "request_line_id" UUID NOT NULL,
    "quote_line_id" UUID,
    "position" INTEGER NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit_price" DECIMAL(15,4) NOT NULL,
    "vat_rate_id" INTEGER NOT NULL,
    "net_total" DECIMAL(15,2) NOT NULL,
    "vat_amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_purchase_quotes_company_status" ON "purchase_quotes"("company_id", "status");

-- CreateIndex
CREATE INDEX "idx_purchase_quotes_supplier_id" ON "purchase_quotes"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_quotes_company_id_number_key" ON "purchase_quotes"("company_id", "number");

-- CreateIndex
CREATE INDEX "idx_purchase_quote_lines_request_line_id" ON "purchase_quote_lines"("request_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_quote_lines_quote_id_request_line_id_key" ON "purchase_quote_lines"("quote_id", "request_line_id");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_company_status" ON "purchase_orders"("company_id", "status");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_supplier_id" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_quote_id" ON "purchase_orders"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_company_id_number_key" ON "purchase_orders"("company_id", "number");

-- CreateIndex
CREATE INDEX "idx_purchase_order_lines_order_id" ON "purchase_order_lines"("order_id");

-- CreateIndex
CREATE INDEX "idx_purchase_order_lines_request_line_id" ON "purchase_order_lines"("request_line_id");

-- CreateIndex

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_quotes" ADD CONSTRAINT "purchase_quotes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_quotes" ADD CONSTRAINT "purchase_quotes_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_quotes" ADD CONSTRAINT "purchase_quotes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_quotes" ADD CONSTRAINT "purchase_quotes_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_quote_lines" ADD CONSTRAINT "purchase_quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "purchase_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_quote_lines" ADD CONSTRAINT "purchase_quote_lines_request_line_id_fkey" FOREIGN KEY ("request_line_id") REFERENCES "purchase_request_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "purchase_quotes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_request_line_id_fkey" FOREIGN KEY ("request_line_id") REFERENCES "purchase_request_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_quote_line_id_fkey" FOREIGN KEY ("quote_line_id") REFERENCES "purchase_quote_lines"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- ── Reglas en la base (el servidor valida antes y da el mensaje) ─────────────
ALTER TABLE "purchase_quote_lines"
  ADD CONSTRAINT "purchase_quote_lines_quantity_check" CHECK (quantity > 0),
  ADD CONSTRAINT "purchase_quote_lines_price_check" CHECK (unit_price IS NULL OR unit_price >= 0),
  ADD CONSTRAINT "purchase_quote_lines_price_vat_check" CHECK ((unit_price IS NULL) = (vat_rate_id IS NULL)),
  ADD CONSTRAINT "purchase_quote_lines_not_quoted_check" CHECK (NOT (not_quoted AND unit_price IS NOT NULL));

ALTER TABLE "purchase_quotes"
  ADD CONSTRAINT "purchase_quotes_cancel_check" CHECK (
    (cancelled_by IS NULL AND cancelled_at IS NULL AND cancel_reason IS NULL)
    OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL)),
  ADD CONSTRAINT "purchase_quotes_delivery_days_check" CHECK (delivery_days IS NULL OR delivery_days >= 0);

ALTER TABLE "purchase_order_lines"
  ADD CONSTRAINT "purchase_order_lines_quantity_check" CHECK (quantity > 0),
  ADD CONSTRAINT "purchase_order_lines_price_check" CHECK (unit_price >= 0);

ALTER TABLE "purchase_orders"
  ADD CONSTRAINT "purchase_orders_approval_check" CHECK ((approved_by IS NULL) = (approved_at IS NULL)),
  ADD CONSTRAINT "purchase_orders_send_check" CHECK ((sent_at IS NULL) = (sent_by IS NULL)),
  ADD CONSTRAINT "purchase_orders_cancel_check" CHECK (
    (cancelled_by IS NULL AND cancelled_at IS NULL AND cancel_reason IS NULL)
    OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL)),
  ADD CONSTRAINT "purchase_orders_status_check" CHECK (
    (status NOT IN ('APPROVED', 'SENT') OR approved_at IS NOT NULL)
    AND (status <> 'SENT' OR sent_at IS NOT NULL)
    AND (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)),
  ADD CONSTRAINT "purchase_orders_payment_term_check" CHECK (payment_term_days IS NULL OR payment_term_days BETWEEN 0 AND 365);

ALTER TABLE "purchase_requests"
  ADD CONSTRAINT "purchase_requests_close_check" CHECK (
    ((closed_by IS NULL AND closed_at IS NULL AND close_reason IS NULL)
      OR (closed_by IS NOT NULL AND closed_at IS NOT NULL AND close_reason IS NOT NULL))
    AND (status <> 'CLOSED' OR closed_at IS NOT NULL));
