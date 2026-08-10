-- Numeracion automatica de pre legajos (ticket 505).
--
-- El N° de pre legajo pasa de cargarse a mano a autogenerarse con el formato PL-0001,
-- correlativo por empresa. La generacion vive en la base y no en la aplicacion para que
-- dos altas simultaneas no puedan tomar el mismo numero: el advisory lock serializa a los
-- concurrentes dentro de la transaccion que despues inserta la fila.

-- ─── Generador del proximo numero ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.next_pre_file_number(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next integer;
BEGIN
  -- Se libera solo al terminar la transaccion del INSERT: sin esto, dos altas
  -- concurrentes leerian el mismo maximo y chocarian contra el unique.
  PERFORM pg_advisory_xact_lock(hashtext('pre_employees.pre_file_number'), hashtext(p_company_id::text));

  SELECT COALESCE(MAX(SUBSTRING(pre_file_number FROM 4)::integer), 0) + 1
  INTO v_next
  FROM pre_employees
  WHERE company_id = p_company_id
    AND pre_file_number ~ '^PL-[0-9]+$';

  RETURN 'PL-' || LPAD(v_next::text, 4, '0');
END;
$$;

COMMENT ON FUNCTION public.next_pre_file_number(uuid) IS
  'Devuelve el proximo N° de pre legajo (PL-0001, PL-0002, ...) correlativo por empresa. Llamar SIEMPRE dentro de la misma transaccion que inserta el pre legajo: el advisory lock es de transaccion.';

-- ─── Renumerado de los pre legajos existentes ────────────────────────────────
-- Los cargados a mano quedan correlativos por empresa segun su orden de creacion.
-- Se hace en dos pasos porque el unique (company_id, pre_file_number) se valida fila por
-- fila: pasar directo al numero final podria chocar contra el numero que todavia tiene otra.
UPDATE pre_employees
SET pre_file_number = 'TMP-' || id::text;

WITH numbered AS (
  SELECT
    id,
    'PL-' || LPAD((ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at, id))::text, 4, '0') AS new_number
  FROM pre_employees
)
UPDATE pre_employees p
SET pre_file_number = n.new_number
FROM numbered n
WHERE p.id = n.id;
