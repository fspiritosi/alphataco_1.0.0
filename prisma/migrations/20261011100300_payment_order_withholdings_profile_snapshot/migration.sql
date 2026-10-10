-- Situación impositiva del proveedor y exclusión aplicadas al calcular cada retención: el certificado
-- y los archivos para declarar no dependen del perfil actual del proveedor.
ALTER TABLE "payment_order_withholdings"
  ADD COLUMN "supplier_status" "withholding_status",
  ADD COLUMN "exclusion_percentage" DECIMAL(7,4);

UPDATE "payment_order_withholdings" w
SET "supplier_status" = p."status"
FROM "payment_orders" o
JOIN "supplier_withholding_profiles" p ON p."supplier_id" = o."supplier_id"
WHERE o."id" = w."payment_order_id" AND p."tax" = w."tax";
