-- Un comprobante anulado se puede volver a cargar (spec etapa 4 §3.1): el unico vale solo entre
-- los no anulados. Prisma no modela indices parciales: queda en SQL.
DROP INDEX IF EXISTS "supplier_invoices_voucher_key";
CREATE UNIQUE INDEX "supplier_invoices_voucher_key"
  ON "supplier_invoices" ("company_id", "supplier_id", "cbte_type", "sales_point", "number")
  WHERE status <> 'CANCELLED';
