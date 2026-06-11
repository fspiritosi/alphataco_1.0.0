-- Flag en el tipo de documento: marca qué tipos llevan N° de póliza
-- (solo activable en UI cuando el tipo es multirecurso y aplica a Equipos)
ALTER TABLE "document_types" ADD COLUMN "has_policy_number" BOOLEAN DEFAULT false;

-- N° de póliza concreto a nivel de cada documento de equipo (opcional)
ALTER TABLE "documents_equipment" ADD COLUMN "policy_number" TEXT;
