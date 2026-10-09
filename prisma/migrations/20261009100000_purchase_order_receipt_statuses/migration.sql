-- Compras, etapa 3: estados de recepcion y cierre de la orden de compra.
-- Va sola y antes del SQL que los usa (Postgres no deja usar en la misma transaccion un valor
-- recien agregado a un enum).
ALTER TYPE "purchase_order_status" ADD VALUE IF NOT EXISTS 'PARTIALLY_RECEIVED';
ALTER TYPE "purchase_order_status" ADD VALUE IF NOT EXISTS 'RECEIVED';
ALTER TYPE "purchase_order_status" ADD VALUE IF NOT EXISTS 'CLOSED';
