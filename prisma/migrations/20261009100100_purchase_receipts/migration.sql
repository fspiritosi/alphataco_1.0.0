-- Compras, etapa 3: recepciones de lo comprado (spec
-- docs/superpowers/specs/2026-10-09-compras-etapa-3-design.md §2). Del migrate diff se toma solo lo
-- de Compras (el diff tambien propone borrar indices parciales que Prisma no modela).

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "close_reason" TEXT,
ADD COLUMN     "closed_at" TIMESTAMPTZ(6),
ADD COLUMN     "closed_by" UUID,
ADD COLUMN     "complements_order_id" UUID,
ADD COLUMN     "complements_receipt_id" UUID;

-- CreateTable
CREATE TABLE "purchase_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "warehouse_id" UUID,
    "received_on" DATE NOT NULL,
    "delivery_note" TEXT,
    "attachment_path" TEXT,
    "attachment_name" TEXT,
    "notes" TEXT,
    "stock_movement_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "reversal_movement_id" UUID,

    CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receipt_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receipt_id" UUID NOT NULL,
    "order_line_id" UUID NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit_cost" DECIMAL(15,4) NOT NULL,
    "batch_number" TEXT,
    "batch_expires_on" DATE,
    "serial_numbers" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "purchase_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receipts_stock_movement_id_key" ON "purchase_receipts"("stock_movement_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receipts_reversal_movement_id_key" ON "purchase_receipts"("reversal_movement_id");

-- CreateIndex
CREATE INDEX "idx_purchase_receipts_order_id" ON "purchase_receipts"("order_id");

-- CreateIndex
CREATE INDEX "idx_purchase_receipts_warehouse_id" ON "purchase_receipts"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receipts_company_id_number_key" ON "purchase_receipts"("company_id", "number");

-- CreateIndex
CREATE INDEX "idx_purchase_receipt_lines_receipt_id" ON "purchase_receipt_lines"("receipt_id");

-- CreateIndex
CREATE INDEX "idx_purchase_receipt_lines_order_line_id" ON "purchase_receipt_lines"("order_line_id");

-- CreateIndex

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_complements_order_id_fkey" FOREIGN KEY ("complements_order_id") REFERENCES "purchase_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_complements_receipt_id_fkey" FOREIGN KEY ("complements_receipt_id") REFERENCES "purchase_receipts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "purchase_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_stock_movement_id_fkey" FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_reversal_movement_id_fkey" FOREIGN KEY ("reversal_movement_id") REFERENCES "stock_movements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_receipt_lines" ADD CONSTRAINT "purchase_receipt_lines_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "purchase_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_lines" ADD CONSTRAINT "purchase_receipt_lines_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ── Reglas en la base (el servidor valida antes y da el mensaje) ─────────────
ALTER TABLE "purchase_receipt_lines"
  ALTER COLUMN "serial_numbers" SET NOT NULL,
  ADD CONSTRAINT "purchase_receipt_lines_quantity_check" CHECK (quantity > 0),
  ADD CONSTRAINT "purchase_receipt_lines_cost_check" CHECK (unit_cost >= 0);

ALTER TABLE "purchase_receipts"
  ADD CONSTRAINT "purchase_receipts_cancel_check" CHECK (
    (cancelled_by IS NULL AND cancelled_at IS NULL AND cancel_reason IS NULL)
    OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL)),
  ADD CONSTRAINT "purchase_receipts_reversal_check" CHECK (reversal_movement_id IS NULL OR cancelled_at IS NOT NULL);

ALTER TABLE "purchase_orders"
  ADD CONSTRAINT "purchase_orders_close_check" CHECK (
    ((closed_by IS NULL AND closed_at IS NULL AND close_reason IS NULL)
      OR (closed_by IS NOT NULL AND closed_at IS NOT NULL AND close_reason IS NOT NULL))
    AND (status <> 'CLOSED' OR closed_at IS NOT NULL)),
  ADD CONSTRAINT "purchase_orders_complement_check" CHECK ((complements_order_id IS NULL) = (complements_receipt_id IS NULL));

CREATE INDEX "idx_purchase_orders_complements_order_id" ON "purchase_orders"("complements_order_id");
