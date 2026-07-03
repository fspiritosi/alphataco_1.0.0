-- Ticket 411: los documentos especiales archivados por el 358 ("Ya no aplica") cuyo recurso
-- HOY vuelve a cumplir la condicion del tipo (p.ej. los 23 Supervisor con "Apto Medico GH")
-- quedaban trabados en archivado, sin poder gestionarse ni des-archivarse.
--
-- Causa raiz: controlar_alertas_single_document_all_employees/_vehicles (disparadas al editar
-- las conditions/mandatory de un tipo) tenian DOS bugs:
--   1) Filtraban por "WHERE company_id = doc.company_id". Como los tipos son de una sola empresa
--      y muchos tienen company_id NULL (global), ese filtro no iteraba NINGUN recurso -> editar
--      sus condiciones nunca reconciliaba nada. Se elimina la dependencia de company_id: se
--      reconcilian TODOS los recursos y el match lo decide la condicion (where_sql).
--   2) En la rama "vuelve a cumplir" solo hacian INSERT ... WHERE NOT EXISTS. Como la fila
--      archivada ya existe, no se des-archivaba nunca. Se agrega el UPDATE ... archived_at = NULL
--      faltante (simetrico a controlar_alertas_documentos_single_employee/_vehicle).
--
-- Ademas: reparacion de datos embebida (bloques DO al final) para des-archivar los documentos
-- ya trabados cuyo recurso hoy cumple la condicion. Se ejecuta con el deploy de esta migracion.

-- ─── controlar_alertas_single_document_all_employees ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.controlar_alertas_single_document_all_employees(document_type_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  doc RECORD;
  employee_record RECORD;
  employee_matches boolean;
  where_sql text;
  conditions_jsonb jsonb;
BEGIN
  SELECT * INTO doc FROM document_types
  WHERE id = document_type_id_param
    AND mandatory = true
    AND applies = 'Persona'
    AND is_active = true;

  IF NOT FOUND THEN RETURN; END IF;

  IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
    SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
    where_sql := build_employee_where_alias(conditions_jsonb, 'e');

    -- Guard: si where_sql es invalido, no hacer nada
    IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN RETURN; END IF;

    -- Se reconcilian TODOS los empleados: solo GRUPO HORIZONTE opera recursos y los tipos son
    -- globales o de GH. El match final lo decide la condicion (where_sql), no el company_id del
    -- tipo (que puede ser NULL/global) — ese era el filtro roto ("company_id = doc.company_id")
    -- que con doc.company_id NULL no iteraba a nadie.
    FOR employee_record IN
      SELECT id FROM employees
      WHERE (COALESCE(doc.down_document, false) OR is_active = true)
    LOOP
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM employees e WHERE e.id = %L AND %s)',
        employee_record.id, where_sql
      ) INTO employee_matches;

      IF employee_matches THEN
        -- 411: vuelve a cumplir -> re-activar lo que estuviese archivado (conserva archivo/validity)
        UPDATE documents_employees SET archived_at = NULL
        WHERE id_document_types = doc.id
          AND applies = employee_record.id
          AND archived_at IS NOT NULL;
        -- crear alerta pendiente si no existe ninguna fila
        INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, employee_record.id, NULL, 'pendiente', TRUE, NULL, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_employees
          WHERE id_document_types = doc.id AND applies = employee_record.id
        );
      ELSE
        -- Empleado ya no cumple condiciones: borrar alerta vacia (sin doc subido)
        DELETE FROM documents_employees
        WHERE id_document_types = doc.id
          AND applies = employee_record.id
          AND (document_path IS NULL OR document_path = '');
      END IF;
    END LOOP;
  ELSE
    -- Tipo no especial: crear para todos los empleados
    FOR employee_record IN
      SELECT id FROM employees
      WHERE (COALESCE(doc.down_document, false) OR is_active = true)
    LOOP
      INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, employee_record.id, NULL, 'pendiente', TRUE, NULL, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_employees
        WHERE id_document_types = doc.id AND applies = employee_record.id
      );
    END LOOP;
  END IF;
END;
$function$;

-- ─── controlar_alertas_single_document_all_vehicles ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.controlar_alertas_single_document_all_vehicles(document_type_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  doc RECORD;
  vehicle_record RECORD;
  vehicle_matches boolean;
  where_sql text;
  conditions_jsonb jsonb;
BEGIN
  SELECT * INTO doc FROM document_types
  WHERE id = document_type_id_param
    AND mandatory = true
    AND applies = 'Equipos'
    AND is_active = true;

  IF NOT FOUND THEN RETURN; END IF;

  IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
    SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
    where_sql := build_vehicle_where_alias(conditions_jsonb, 'v');

    IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN RETURN; END IF;

    -- Se reconcilian TODOS los vehiculos: solo GRUPO HORIZONTE opera recursos y los tipos son
    -- globales o de GH. El match final lo decide la condicion, no el company_id del tipo.
    FOR vehicle_record IN
      SELECT id FROM vehicles
      WHERE (COALESCE(doc.down_document, false) OR is_active = true)
    LOOP
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id = %L AND %s)',
        vehicle_record.id, where_sql
      ) INTO vehicle_matches;

      IF vehicle_matches THEN
        -- 411: vuelve a cumplir -> re-activar lo que estuviese archivado (conserva archivo/validity)
        UPDATE documents_equipment SET archived_at = NULL
        WHERE id_document_types = doc.id
          AND applies = vehicle_record.id
          AND archived_at IS NOT NULL;
        INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, vehicle_record.id, NULL, 'pendiente', TRUE, NULL, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_equipment
          WHERE id_document_types = doc.id AND applies = vehicle_record.id
        );
      ELSE
        -- Vehiculo ya no cumple condiciones: borrar alerta vacia (sin doc subido)
        DELETE FROM documents_equipment
        WHERE id_document_types = doc.id
          AND applies = vehicle_record.id
          AND (document_path IS NULL OR document_path = '');
      END IF;
    END LOOP;
  ELSE
    -- Tipo no especial: crear para todos los vehiculos
    FOR vehicle_record IN
      SELECT id FROM vehicles
      WHERE (COALESCE(doc.down_document, false) OR is_active = true)
    LOOP
      INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, vehicle_record.id, NULL, 'pendiente', TRUE, NULL, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_equipment
        WHERE id_document_types = doc.id AND applies = vehicle_record.id
      );
    END LOOP;
  END IF;
END;
$function$;

-- ─── Reparacion de datos: des-archivar lo que hoy vuelve a cumplir la condicion ──────────
-- Quirurgico: SOLO des-archiva (archived_at = NULL) los documentos archivados cuyo recurso
-- hoy cumple la condicion actual del tipo. No crea/borra alertas ni archiva nada nuevo.
-- Idempotente. (Todos los archivados son de tipos special con conditions.)

-- Empleados
DO $$
DECLARE d RECORD; where_sql text; conditions_jsonb jsonb; matches boolean;
BEGIN
  FOR d IN
    SELECT de.id AS row_id, de.applies, dt.conditions
    FROM documents_employees de
    JOIN document_types dt ON dt.id = de.id_document_types
    WHERE de.archived_at IS NOT NULL
      AND dt.special = true
      AND dt.conditions IS NOT NULL AND array_length(dt.conditions, 1) > 0
  LOOP
    SELECT array_to_json(d.conditions)::jsonb INTO conditions_jsonb;
    where_sql := build_employee_where_alias(conditions_jsonb, 'e');
    IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN CONTINUE; END IF;
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM employees e WHERE e.id = %L AND %s)', d.applies, where_sql)
      INTO matches;
    IF matches THEN
      UPDATE documents_employees SET archived_at = NULL WHERE id = d.row_id;
    END IF;
  END LOOP;
END $$;

-- Vehiculos/equipos
DO $$
DECLARE d RECORD; where_sql text; conditions_jsonb jsonb; matches boolean;
BEGIN
  FOR d IN
    SELECT de.id AS row_id, de.applies, dt.conditions
    FROM documents_equipment de
    JOIN document_types dt ON dt.id = de.id_document_types
    WHERE de.archived_at IS NOT NULL
      AND dt.special = true
      AND dt.conditions IS NOT NULL AND array_length(dt.conditions, 1) > 0
  LOOP
    SELECT array_to_json(d.conditions)::jsonb INTO conditions_jsonb;
    where_sql := build_vehicle_where_alias(conditions_jsonb, 'v');
    IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN CONTINUE; END IF;
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id = %L AND %s)', d.applies, where_sql)
      INTO matches;
    IF matches THEN
      UPDATE documents_equipment SET archived_at = NULL WHERE id = d.row_id;
    END IF;
  END LOOP;
END $$;
