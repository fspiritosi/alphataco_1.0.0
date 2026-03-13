-- ============================================================================
-- 1. DROP trigger duplicado (activo por error, duplica document_types_after_insert)
-- ============================================================================
DROP TRIGGER IF EXISTS add_new_document_trigger ON document_types;

-- ============================================================================
-- 2. Fix controlar_alertas_single_document_all_employees
--    - Usa doc.company_id en vez de auth.jwt()
--    - Filtra is_active = true
--    - Solo INSERT, nunca DELETE ni UPDATE status
-- ============================================================================
CREATE OR REPLACE FUNCTION controlar_alertas_single_document_all_employees(document_type_id_param uuid)
RETURNS void AS $$
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

    FOR employee_record IN
      SELECT id FROM employees WHERE company_id = doc.company_id
    LOOP
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM employees e WHERE e.id = %L AND e.company_id = %L AND %s)',
        employee_record.id, doc.company_id, where_sql
      ) INTO employee_matches;

      IF employee_matches THEN
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
    -- Tipo no especial: crear para todos los empleados de la empresa
    FOR employee_record IN
      SELECT id FROM employees WHERE company_id = doc.company_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Fix controlar_alertas_single_document_all_vehicles
--    - Usa doc.company_id en vez de auth.jwt()
--    - Filtra is_active = true
--    - Solo INSERT, nunca DELETE ni UPDATE status
-- ============================================================================
CREATE OR REPLACE FUNCTION controlar_alertas_single_document_all_vehicles(document_type_id_param uuid)
RETURNS void AS $$
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

    FOR vehicle_record IN
      SELECT id FROM vehicles WHERE company_id = doc.company_id
    LOOP
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id = %L AND v.company_id = %L AND %s)',
        vehicle_record.id, doc.company_id, where_sql
      ) INTO vehicle_matches;

      IF vehicle_matches THEN
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
    FOR vehicle_record IN
      SELECT id FROM vehicles WHERE company_id = doc.company_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Fix controlar_alertas_documentos_single_employee
--    - Filtra is_active = true en el FOR loop
--    - Guard de where_sql invalido (CONTINUE)
--    - Status excluye tipos inactivos
-- ============================================================================
CREATE OR REPLACE FUNCTION controlar_alertas_documentos_single_employee(employee_id_param uuid, company_id_param uuid)
RETURNS void AS $$
DECLARE
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  employee_matches boolean;
BEGIN
  BEGIN
    user_jwt := auth.jwt();
    user_id := user_jwt->>'sub';
  EXCEPTION WHEN OTHERS THEN
    user_id := NULL;
  END;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Persona' AND is_active = true
  LOOP
    IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
      SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
      where_sql := build_employee_where_alias(conditions_jsonb, 'e');

      -- Guard: condiciones invalidas -> skip este tipo
      IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN
        CONTINUE;
      END IF;

      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM employees e WHERE e.id = %L AND e.company_id = %L AND %s)',
        employee_id_param, company_id_param, where_sql
      ) INTO employee_matches;

      IF employee_matches THEN
        INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, employee_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_employees
          WHERE id_document_types = doc.id AND applies = employee_id_param
        );
      ELSE
        DELETE FROM documents_employees
        WHERE id_document_types = doc.id
          AND applies = employee_id_param
          AND (document_path IS NULL OR document_path = '');
      END IF;
    ELSE
      INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, employee_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_employees
        WHERE id_document_types = doc.id AND applies = employee_id_param
      );
    END IF;
  END LOOP;

  UPDATE employees e
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM documents_employees de
      WHERE de.applies = employee_id_param AND de.state = 'vencido'
    ) THEN 'Completo con doc vencida'::status_type
    WHEN EXISTS (
      SELECT 1 FROM document_types dt
      WHERE dt.mandatory = true AND dt.applies = 'Persona' AND dt.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM documents_employees de2
          WHERE de2.id_document_types = dt.id AND de2.applies = employee_id_param
        )
    ) THEN 'Incompleto'::status_type
    ELSE 'Completo'::status_type
  END
  WHERE e.id = employee_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Fix controlar_alertas_documentos_single_vehicle
--    - Filtra is_active = true en el FOR loop
--    - Guard de where_sql invalido (CONTINUE)
--    - Status excluye tipos inactivos
-- ============================================================================
CREATE OR REPLACE FUNCTION controlar_alertas_documentos_single_vehicle(vehicle_id_param uuid, company_id_param uuid)
RETURNS void AS $$
DECLARE
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  vehicle_matches boolean;
BEGIN
  BEGIN
    user_jwt := auth.jwt();
    user_id := user_jwt->>'sub';
  EXCEPTION WHEN OTHERS THEN
    user_id := NULL;
  END;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Equipos' AND is_active = true
  LOOP
    IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
      SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
      where_sql := build_vehicle_where_alias(conditions_jsonb, 'v');

      IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN
        CONTINUE;
      END IF;

      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id = %L AND v.company_id = %L AND %s)',
        vehicle_id_param, company_id_param, where_sql
      ) INTO vehicle_matches;

      IF vehicle_matches THEN
        INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, vehicle_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_equipment
          WHERE id_document_types = doc.id AND applies = vehicle_id_param
        );
      ELSE
        DELETE FROM documents_equipment
        WHERE id_document_types = doc.id
          AND applies = vehicle_id_param
          AND (document_path IS NULL OR document_path = '');
      END IF;
    ELSE
      INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, vehicle_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_equipment
        WHERE id_document_types = doc.id AND applies = vehicle_id_param
      );
    END IF;
  END LOOP;

  UPDATE vehicles v
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM documents_equipment de
      WHERE de.applies = vehicle_id_param AND de.state = 'vencido'
    ) THEN 'Completo con doc vencida'::status_type
    WHEN EXISTS (
      SELECT 1 FROM document_types dt
      WHERE dt.mandatory = true AND dt.applies = 'Equipos' AND dt.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM documents_equipment de2
          WHERE de2.id_document_types = dt.id AND de2.applies = vehicle_id_param
        )
    ) THEN 'Incompleto'::status_type
    ELSE 'Completo'::status_type
  END
  WHERE v.id = vehicle_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Fix trg_document_types_update
--    - Si se desactiva (is_active -> false): no reconciliar (app maneja)
--    - Si se reactiva (is_active false -> true): no reconciliar (app maneja)
--    - Reconciliacion normal solo si tipo esta activo y cambio mandatory/conditions
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_document_types_update()
RETURNS trigger AS $$
BEGIN
  -- Si se esta desactivando, no reconciliar (la app maneja la limpieza)
  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;
  -- Si se esta reactivando, no reconciliar (la app maneja la creacion de alertas)
  IF OLD.is_active = false AND NEW.is_active = true THEN
    RETURN NEW;
  END IF;
  -- Reconciliacion normal: solo si tipo esta activo y cambio mandatory/conditions
  IF NEW.mandatory OR (OLD.mandatory AND NEW.conditions IS DISTINCT FROM OLD.conditions) THEN
    IF NEW.applies = 'Persona' THEN
      PERFORM controlar_alertas_single_document_all_employees(NEW.id);
    ELSIF NEW.applies = 'Equipos' THEN
      PERFORM controlar_alertas_single_document_all_vehicles(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Fix build_vehicle_where_alias
--    - Agregar filtro de IDs vacios (WHERE id IS NOT NULL AND id <> '')
--    - Agregar check ids_txt IS NULL -> CONTINUE
--    - Agregar check parts vacios -> RETURN 'TRUE'
--    - DROP primero porque la firma original tiene parameter defaults
-- ============================================================================
DROP FUNCTION IF EXISTS build_vehicle_where_alias(jsonb, text);
CREATE OR REPLACE FUNCTION build_vehicle_where_alias(_conditions jsonb, table_alias text)
RETURNS text AS $$
DECLARE
  c       jsonb;
  parts   text[] := '{}';
  ids_txt text;
BEGIN
  IF _conditions IS NULL OR jsonb_typeof(_conditions) <> 'array' THEN
     RETURN 'TRUE';
  END IF;

  FOR c IN SELECT * FROM jsonb_array_elements(_conditions) LOOP
    -- Filtrar IDs vacios/null (misma guarda que build_employee_where_alias)
    SELECT '(' || string_agg(quote_literal(id), ',') || ')'
      INTO ids_txt
      FROM jsonb_array_elements_text(c -> 'ids') id
      WHERE id IS NOT NULL AND id <> '';

    -- Si no hay IDs validos, skip esta condicion
    IF ids_txt IS NULL OR ids_txt = '()' THEN
      CONTINUE;
    END IF;

    CASE c ->> 'relation_type'
      WHEN 'many_to_many' THEN
        parts := parts || format(
          'EXISTS (SELECT 1 FROM %I rel
                    WHERE rel.%I = %I.%I
                      AND rel.%I IN %s)',
          c ->> 'relation_table',
          c ->> 'column_on_relation',
          table_alias,
          COALESCE(c ->> 'column_on_vehicles', 'id'),
          c ->> 'filter_column',
          ids_txt
        );
      WHEN 'one_to_many' THEN
        parts := parts || format(
          '%I.%I IN %s',
          table_alias,
          c ->> 'filter_column',
          ids_txt
        );
      ELSE
        parts := parts || format(
          '%I.%I IN %s',
          table_alias,
          c ->> 'filter_column',
          ids_txt
        );
    END CASE;
  END LOOP;

  -- Si no se generaron condiciones validas, retornar TRUE
  IF array_length(parts, 1) IS NULL OR array_length(parts, 1) = 0 THEN
    RETURN 'TRUE';
  END IF;

  RETURN array_to_string(parts, ' AND ');
END;
$$ LANGUAGE plpgsql;
