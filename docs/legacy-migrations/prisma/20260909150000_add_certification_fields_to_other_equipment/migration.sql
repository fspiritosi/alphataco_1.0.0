-- ============================================================================
-- Certificacion de los equipamientos (other_equipment)
--
-- QUE RESUELVE
-- Hasta ahora no habia forma de registrar si un equipamiento esta certificado.
-- Lo unico parecido era la tab "Documentos" (`other_equipment_certifications`),
-- que guarda archivos sueltos con nombre y vencimiento opcional: sirve para
-- adjuntar el certificado, pero no es un dato estructurado del equipamiento y
-- por lo tanto no se puede listar ni filtrar en la tabla. De hecho, los pocos
-- registros cargados usan el campo `name` como numero ("001".."008"), que es
-- justamente el dato que faltaba.
--
-- QUE AGREGA
-- Tres columnas al propio equipamiento:
--   - has_certification            : el equipamiento posee certificacion
--   - certification_expiration_date: vencimiento de esa certificacion
--   - certification_number         : numero de certificacion
--
-- Mismo criterio de nullability que el bloque de contrato que ya vive en esta
-- tabla (`contract_expiration_date`, `contract_number`): el flag es NOT NULL con
-- default `false` (los 1425 equipamientos existentes quedan como "sin
-- certificacion", que es el estado real hoy) y los dos datos dependientes son
-- opcionales en la base. La obligatoriedad "si posee certificacion, se cargan
-- ambos" vive en el schema Zod del formulario, como en el resto del proyecto.
--
-- El archivo del certificado se sigue adjuntando en la tab "Documentos": esta
-- migracion no toca `other_equipment_certifications`.
-- ============================================================================

ALTER TABLE "public"."other_equipment"
  ADD COLUMN IF NOT EXISTS "has_certification" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "certification_expiration_date" DATE,
  ADD COLUMN IF NOT EXISTS "certification_number" TEXT;
