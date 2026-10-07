-- Una línea de parte diario puede estar en UNA sola certificación vigente (no anulada).
-- Hasta acá el mismo trabajo podía quedar en dos certificaciones del mismo contrato si los
-- períodos se solapaban, y con la facturación eso es cobrar dos veces lo mismo.
--
-- `is_live` es una denormalización que mantiene el código: anular la certificación la apaga.
-- Los borradores también reservan sus líneas (dos usuarios no arman dos borradores con lo mismo).

ALTER TABLE "public"."certification_lines" ADD COLUMN "is_live" BOOLEAN NOT NULL DEFAULT true;

UPDATE "public"."certification_lines" cl
SET is_live = false
FROM "public"."certifications" c
WHERE c.id = cl.certification_id
  AND c.status = 'anulada';

-- Borradores en conflicto: se les sacan las líneas repetidas. Son un derivado de los partes y se
-- regeneran con "Refrescar"; los documentos emitidos/confirmados, en cambio, no se tocan.
CREATE TEMP TABLE _draft_lines_in_conflict ON COMMIT DROP AS
SELECT cl.id, cl.certification_id
FROM "public"."certification_lines" cl
JOIN "public"."certifications" c ON c.id = cl.certification_id
WHERE c.status = 'borrador'
  AND cl.is_live
  AND cl.dailyreportrow_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "public"."certification_lines" other
    WHERE other.dailyreportrow_id = cl.dailyreportrow_id
      AND other.is_live
      AND other.id <> cl.id
  );

DELETE FROM "public"."certification_lines"
WHERE id IN (SELECT id FROM _draft_lines_in_conflict);

UPDATE "public"."certifications" c
SET total = COALESCE((SELECT SUM(cl.amount) FROM "public"."certification_lines" cl WHERE cl.certification_id = c.id), 0)
WHERE c.id IN (SELECT DISTINCT certification_id FROM _draft_lines_in_conflict);

-- Si quedan repetidas entre certificaciones emitidas o confirmadas, no se resuelve en silencio:
-- decidir cuál conserva la línea es del usuario (anular una de las dos).
DO $$
DECLARE
  conflicts text;
BEGIN
  SELECT string_agg(format('parte %s en %s', dailyreportrow_id, numbers), '; ')
  INTO conflicts
  FROM (
    SELECT cl.dailyreportrow_id, string_agg(c.number, ', ' ORDER BY c.number) AS numbers
    FROM "public"."certification_lines" cl
    JOIN "public"."certifications" c ON c.id = cl.certification_id
    WHERE cl.is_live AND cl.dailyreportrow_id IS NOT NULL
    GROUP BY cl.dailyreportrow_id
    HAVING COUNT(*) > 1
  ) d;

  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'Hay líneas de parte diario en más de una certificación vigente. Anulá una de cada par y volvé a desplegar: %', conflicts;
  END IF;
END $$;

CREATE UNIQUE INDEX "uq_certification_lines_live_row"
ON "public"."certification_lines" ("dailyreportrow_id")
WHERE (is_live AND dailyreportrow_id IS NOT NULL);
