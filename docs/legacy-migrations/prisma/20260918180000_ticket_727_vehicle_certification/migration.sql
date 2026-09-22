-- ============================================================================
-- Ticket 727: certificacion de los equipos (vehicles), idem a equipamientos
--
-- QUE RESUELVE
-- Equipamientos (other_equipment) ya registra si esta certificado, con su numero
-- y vencimiento, y lo muestra como columna "Posee certificacion" en su tabla
-- (migracion 20260909150000_add_certification_fields_to_other_equipment).
-- Equipos (vehicles) no tenia ninguno de esos datos, asi que no habia nada que
-- listar ni filtrar.
--
-- QUE AGREGA
-- Las mismas tres columnas, con el mismo criterio de nullability:
--   - has_certification            : el equipo posee certificacion
--   - certification_expiration_date: vencimiento de esa certificacion
--   - certification_number         : numero de certificacion
--
-- El flag es NOT NULL con default `false` (los equipos existentes quedan como
-- "sin certificacion", que es el estado real hoy) y los dos datos dependientes
-- son opcionales en la base. La obligatoriedad "si posee certificacion, se cargan
-- ambos" vive en el schema Zod del formulario, como en equipamientos.
--
-- No toca triggers: las columnas nuevas no figuran en la guarda WHEN de
-- controlar_alertas_vehicles, asi que editarlas no dispara la reconciliacion de
-- documentos.
-- ============================================================================

ALTER TABLE "public"."vehicles"
  ADD COLUMN IF NOT EXISTS "has_certification" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "certification_expiration_date" DATE,
  ADD COLUMN IF NOT EXISTS "certification_number" TEXT;
