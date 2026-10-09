-- Compras, etapa 2: historial de rechazos de la orden de compra. La cabecera guarda el ultimo
-- motivo (`rejection_notes`); esta tabla guarda cada uno, para el historial del detalle.
CREATE TABLE "purchase_order_rejections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "rejected_by" UUID NOT NULL,
    "rejected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,

    CONSTRAINT "purchase_order_rejections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "purchase_order_rejections_reason_check" CHECK (btrim(reason) <> '')
);

CREATE INDEX "idx_purchase_order_rejections_order_id" ON "purchase_order_rejections"("order_id");

ALTER TABLE "purchase_order_rejections" ADD CONSTRAINT "purchase_order_rejections_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_order_rejections" ADD CONSTRAINT "purchase_order_rejections_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
