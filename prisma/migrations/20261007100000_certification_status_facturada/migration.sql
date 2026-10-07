-- Estado "facturada" de las certificaciones (módulo de facturación electrónica ARCA).
-- Va en una migración propia: un valor nuevo de enum no se puede usar en la misma transacción
-- en la que se agrega.
ALTER TYPE "public"."certification_status" ADD VALUE IF NOT EXISTS 'facturada';
