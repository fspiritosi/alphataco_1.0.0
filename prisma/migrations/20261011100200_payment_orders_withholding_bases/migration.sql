-- Bases de retencion de la orden de pago: el acumulado mensual de Ganancias suma todos los pagos
-- del mes, tambien los que no llegaron a retener (spec etapa 5 §3.2).
ALTER TABLE "payment_orders"
  ADD COLUMN "withholding_net_base" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN "withholding_vat_base" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD CONSTRAINT "payment_orders_withholding_bases_check" CHECK (withholding_net_base >= 0 AND withholding_vat_base >= 0);
