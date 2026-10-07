-- Comprobantes emitidos con ARCA simulado (ARCA_MODE=mock, instancia demo y desarrollo): el CAE
-- es ficticio. Se marca para que nunca se confundan con uno real (listado, detalle y PDF).
ALTER TABLE "invoices" ADD COLUMN "simulated" BOOLEAN NOT NULL DEFAULT false;
