-- Facturación electrónica ARCA (fase 4): datos fiscales del receptor y alícuota de IVA por ítem.

-- 1) El CUIT del cliente pasa a ser único POR EMPRESA (antes, global). Relaja la restricción:
--    no puede haber datos existentes que la violen.
DROP INDEX "customers_cuit_key";
CREATE UNIQUE INDEX "customers_company_id_cuit_key" ON "customers"("company_id", "cuit");

-- 2) Datos fiscales del receptor. Nullable: los clientes existentes no los tienen y se exigen
--    recién al facturar. `vat_condition_id` = id de ARCA (RG 5616); sin exterior (8, 9) en v1.
ALTER TABLE "customers" ADD COLUMN "vat_condition_id" INTEGER,
ADD COLUMN "fiscal_street" VARCHAR(255),
ADD COLUMN "fiscal_city" VARCHAR(120),
ADD COLUMN "fiscal_province_id" BIGINT,
ADD COLUMN "fiscal_postal_code" VARCHAR(10);

ALTER TABLE "customers" ADD CONSTRAINT "customers_fiscal_province_id_fkey"
  FOREIGN KEY ("fiscal_province_id") REFERENCES "provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "customers" ADD CONSTRAINT "customers_vat_condition_id_check"
  CHECK ("vat_condition_id" IS NULL OR "vat_condition_id" IN (1, 4, 5, 6, 7, 10, 13, 15, 16));

-- 3) Alícuota de IVA por defecto de cada ítem de contrato (los precios son netos). El DEFAULT
--    completa los existentes con 21 %.
ALTER TABLE "service_items" ADD COLUMN "vat_rate_id" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "service_items" ADD CONSTRAINT "service_items_vat_rate_id_check"
  CHECK ("vat_rate_id" IN (3, 4, 5, 6, 8, 9));
