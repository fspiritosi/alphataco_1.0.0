-- Compras, etapa 2: estados de avance de la solicitud de compra.
-- Va sola y antes que cualquier SQL que los use: Postgres no deja usar en la misma
-- transaccion un valor recien agregado a un enum.
ALTER TYPE "purchase_request_status" ADD VALUE IF NOT EXISTS 'PARTIALLY_ORDERED';
ALTER TYPE "purchase_request_status" ADD VALUE IF NOT EXISTS 'ORDERED';
ALTER TYPE "purchase_request_status" ADD VALUE IF NOT EXISTS 'CLOSED';
