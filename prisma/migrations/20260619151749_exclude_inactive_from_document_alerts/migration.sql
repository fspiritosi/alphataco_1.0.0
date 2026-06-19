-- Excluir recursos dados de baja (is_active = false) de la generacion de alertas de
-- documentos pendientes, EXCEPTO para los tipos de documento marcados como
-- "Documento de baja" (down_document = true), que deben seguir generando alertas a
-- los recursos dados de baja sin cambios.
--
-- Regla aplicada en los 4 generadores de alertas:
--   crear/mantener alerta  <=>  (down_document = true)  OR  (recurso is_active = true)
--
-- Los documentos REALES (document_path no nulo) de recursos dados de baja NO se tocan:
-- la limpieza final solo elimina filas "pendiente" vacias (sin archivo).

-- ============================================================================
-- 1) Tipo de documento (INSERT/UPDATE) -> alertas para TODOS los empleados
-- ============================================================================
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

    FOR employee_record IN
      SELECT id FROM employees
      WHERE company_id = doc.company_id
        AND (COALESCE(doc.down_document, false) OR is_active = true)
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
      SELECT id FROM employees
      WHERE company_id = doc.company_id
        AND (COALESCE(doc.down_document, false) OR is_active = true)
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

-- ============================================================================
-- 2) Tipo de documento (INSERT/UPDATE) -> alertas para TODOS los vehiculos
-- ============================================================================
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

    FOR vehicle_record IN
      SELECT id FROM vehicles
      WHERE company_id = doc.company_id
        AND (COALESCE(doc.down_document, false) OR is_active = true)
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
      SELECT id FROM vehicles
      WHERE company_id = doc.company_id
        AND (COALESCE(doc.down_document, false) OR is_active = true)
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

-- ============================================================================
-- 3) Empleado (INSERT/UPDATE) -> alertas de todos los tipos obligatorios
--    Si el empleado esta dado de baja y el tipo NO es "de baja": no crear
--    alerta y eliminar la alerta vacia existente.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.controlar_alertas_documentos_single_employee(employee_id_param uuid, company_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  employee_matches boolean;
  emp_active boolean;
BEGIN
  BEGIN
    user_jwt := auth.jwt();
    user_id := user_jwt->>'sub';
  EXCEPTION WHEN OTHERS THEN
    user_id := NULL;
  END;

  SELECT is_active INTO emp_active FROM employees WHERE id = employee_id_param;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Persona' AND is_active = true
  LOOP
    -- Empleado dado de baja + tipo NO de baja: no debe tener alerta; limpiar la vacia.
    IF NOT (COALESCE(doc.down_document, false) OR COALESCE(emp_active, true)) THEN
      DELETE FROM documents_employees
      WHERE id_document_types = doc.id
        AND applies = employee_id_param
        AND (document_path IS NULL OR document_path = '');
      CONTINUE;
    END IF;

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
$function$;

-- ============================================================================
-- 4) Vehiculo (INSERT/UPDATE) -> alertas de todos los tipos obligatorios
--    Misma regla que empleados.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.controlar_alertas_documentos_single_vehicle(vehicle_id_param uuid, company_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  vehicle_matches boolean;
  veh_active boolean;
BEGIN
  BEGIN
    user_jwt := auth.jwt();
    user_id := user_jwt->>'sub';
  EXCEPTION WHEN OTHERS THEN
    user_id := NULL;
  END;

  SELECT is_active INTO veh_active FROM vehicles WHERE id = vehicle_id_param;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Equipos' AND is_active = true
  LOOP
    -- Vehiculo dado de baja + tipo NO de baja: no debe tener alerta; limpiar la vacia.
    IF NOT (COALESCE(doc.down_document, false) OR COALESCE(veh_active, true)) THEN
      DELETE FROM documents_equipment
      WHERE id_document_types = doc.id
        AND applies = vehicle_id_param
        AND (document_path IS NULL OR document_path = '');
      CONTINUE;
    END IF;

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
$function$;

-- ============================================================================
-- 5) Limpieza de datos existentes: eliminar las alertas vacias (filas
--    "pendiente" sin archivo) de recursos dados de baja cuyo tipo NO sea
--    "Documento de baja". Los documentos reales (con archivo) y las alertas de
--    tipos "de baja" se conservan.
-- ============================================================================
DELETE FROM documents_employees de
USING employees e, document_types dt
WHERE de.applies = e.id
  AND de.id_document_types = dt.id
  AND e.is_active = false
  AND (de.document_path IS NULL OR de.document_path = '')
  AND COALESCE(dt.down_document, false) = false;

DELETE FROM documents_equipment de
USING vehicles v, document_types dt
WHERE de.applies = v.id
  AND de.id_document_types = dt.id
  AND v.is_active = false
  AND (de.document_path IS NULL OR de.document_path = '')
  AND COALESCE(dt.down_document, false) = false;
