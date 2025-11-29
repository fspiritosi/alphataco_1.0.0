drop policy "Vehicles access by company" on "public"."vehicles";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_new_document()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.mandatory THEN
    IF NEW.applies = 'Persona' THEN
      PERFORM controlar_alertas_single_document_all_employees(NEW.id);
    ELSIF NEW.applies = 'Equipos' THEN
      PERFORM controlar_alertas_single_document_all_vehicles(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.after_dailyreportrows_update_optimized()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
    affected_reports UUID[];
    v_report_id UUID;
    row_record RECORD;
    tiene_filas BOOLEAN;
    todas_completas BOOLEAN;
    tiene_recursos BOOLEAN;
BEGIN
    -- Recopilar todos los report_ids únicos afectados en esta transacción
    -- Esto funciona tanto para 1 fila como para múltiples filas
    SELECT ARRAY_AGG(DISTINCT daily_report_id) 
    INTO affected_reports
    FROM (
        SELECT NEW.daily_report_id AS daily_report_id
        UNION
        SELECT OLD.daily_report_id AS daily_report_id WHERE TG_OP = 'UPDATE'
    ) reports
    WHERE daily_report_id IS NOT NULL;
    IF affected_reports IS NOT NULL AND array_length(affected_reports, 1) > 0 THEN
 
    -- Procesar cada reporte afectado UNA SOLA VEZ
    FOREACH v_report_id IN ARRAY affected_reports
    LOOP
        -- Actualizar filas 'sin_recursos_asignados' que ahora tienen recursos
        UPDATE dailyreportrows
        SET status = 'pendiente',
            updated_at = NOW()
        WHERE id IN (
            SELECT dr.id
            FROM dailyreportrows dr
            WHERE dr.status = 'sin_recursos_asignados'
              AND dr.daily_report_id = v_report_id
              AND EXISTS (
                  SELECT 1 FROM dailyreportemployeerelations 
                  WHERE daily_report_row_id = dr.id
                  UNION
                  SELECT 1 FROM dailyreportequipmentrelations 
                  WHERE daily_report_row_id = dr.id
              )
        );

        -- Continuar con la lógica de cierre SOLO para reportes pasados y abiertos
        IF EXISTS (
            SELECT 1 
            FROM dailyreport 
            WHERE id = v_report_id
              AND date < CURRENT_DATE 
              AND status IN ('abierto', 'cerrado_incompleto')
        ) THEN
            -- Verificar si el reporte tiene filas asociadas
            SELECT EXISTS (SELECT 1 FROM dailyreportrows WHERE daily_report_id = v_report_id) INTO tiene_filas;
            
            IF NOT tiene_filas THEN
                -- Si no tiene filas, marcarlo como cerrado_completo
                UPDATE dailyreport 
                SET status = 'cerrado_completo', 
                    updated_at = NOW() 
                WHERE id = v_report_id;
            ELSE
                -- Verificar si todas las filas están completas
                SELECT NOT EXISTS (
                    SELECT 1 
                    FROM dailyreportrows 
                    WHERE daily_report_id = v_report_id 
                    AND (
                        status NOT IN ('ejecutado', 'reprogramado', 'cancelado')
                        OR (status = 'ejecutado' AND (document_path IS NULL OR document_path = ''))
                    )
                ) INTO todas_completas;
                
                -- Actualizar el estado según corresponda
                IF todas_completas THEN
                    UPDATE dailyreport 
                    SET status = 'cerrado_completo', 
                        updated_at = NOW() 
                    WHERE id = v_report_id;
                ELSE
                    UPDATE dailyreport 
                    SET status = 'cerrado_incompleto', 
                        updated_at = NOW() 
                    WHERE id = v_report_id;
                END IF;
            END IF;
        END IF;
    END LOOP;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;$function$
;

CREATE OR REPLACE FUNCTION public.check_diagram_conflicts_with_operations(p_employee_ids uuid[], p_date_from date, p_date_to date)
 RETURNS TABLE(employee_id uuid, employee_name text, day numeric, month numeric, year numeric, date_formatted text, current_diagram_type uuid, current_diagram_name text, current_diagram_color text, is_used_in_operations boolean, operation_details text, can_update boolean, conflict_type text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ed.employee_id,
    (e.firstname || ' ' || e.lastname) as employee_name,
    ed.day,
    ed.month,
    ed.year,
    to_char(make_date(ed.year::int, ed.month::int, ed.day::int), 'DD/MM/YYYY') as date_formatted,
    ed.diagram_type as current_diagram_type,
    dt.name as current_diagram_name,
    dt.color as current_diagram_color,
    -- Verificar si está siendo usado en operaciones
    CASE 
      WHEN dr.date IS NOT NULL THEN true 
      ELSE false 
    END as is_used_in_operations,
    -- Detalles de la operación si existe
    CASE 
      WHEN dr.date IS NOT NULL THEN 
        'Usado en reporte diario del ' || to_char(dr.date, 'DD/MM/YYYY') || 
        ' (ID: ' || dr.id::text || ')'
      ELSE 'No usado en operaciones'
    END as operation_details,
    -- Puede actualizarse si NO está en operaciones
    CASE 
      WHEN dr.date IS NULL THEN true 
      ELSE false 
    END as can_update,
    -- Tipo de conflicto
    CASE 
      WHEN dr.date IS NOT NULL THEN 'USED_IN_OPERATIONS'
      ELSE 'SIMPLE_CONFLICT'
    END as conflict_type
  FROM employees_diagram ed
  JOIN employees e ON e.id = ed.employee_id
  JOIN diagram_type dt ON dt.id = ed.diagram_type
  -- LEFT JOIN para verificar uso en operaciones
  LEFT JOIN dailyreportemployeerelations drer ON drer.employee_id = ed.employee_id
  LEFT JOIN dailyreportrows drr ON drr.id = drer.daily_report_row_id
  LEFT JOIN dailyreport dr ON dr.id = drr.daily_report_id 
    AND dr.date = make_date(ed.year::int, ed.month::int, ed.day::int)
  WHERE ed.employee_id = ANY(p_employee_ids)
    AND make_date(ed.year::int, ed.month::int, ed.day::int) 
        BETWEEN p_date_from AND p_date_to
  ORDER BY e.firstname, e.lastname, ed.year, ed.month, ed.day;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_diagram_conflicts_with_operations(p_employee_ids uuid[], p_diagram_type_id uuid, p_date_from date, p_date_to date)
 RETURNS TABLE(employee_id uuid, employee_name text, date_value date, date_formatted text, conflict_type text, current_diagram_id uuid, current_diagram_name text, current_diagram_color text, operation_details text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ed.employee_id,
    CONCAT(e.firstname, ' ', e.lastname) as employee_name,
    make_date(ed.year::integer, ed.month::integer, ed.day::integer) as date_value,
    TO_CHAR(make_date(ed.year::integer, ed.month::integer, ed.day::integer), 'DD/MM/YYYY') as date_formatted,
    CASE 
      WHEN dr.date IS NOT NULL THEN 'USED_IN_OPERATIONS'
      ELSE 'SIMPLE_CONFLICT'
    END as conflict_type,
    ed.diagram_type as current_diagram_id,
    dt.name as current_diagram_name,
    dt.color as current_diagram_color,
    CASE 
      WHEN dr.date IS NOT NULL THEN 
        CONCAT('Usado en reporte del ', TO_CHAR(dr.date, 'DD/MM/YYYY'))
      ELSE 'Registro existente'
    END as operation_details
  FROM employees_diagram ed
  JOIN employees e ON ed.employee_id = e.id
  JOIN diagram_type dt ON ed.diagram_type = dt.id
  LEFT JOIN (
    SELECT DISTINCT der.employee_id, dr.date
    FROM dailyreportemployeerelations der
    JOIN dailyreportrows drr ON der.daily_report_row_id = drr.id
    JOIN dailyreport dr ON drr.daily_report_id = dr.id
  ) dr ON ed.employee_id = dr.employee_id AND make_date(ed.year::integer, ed.month::integer, ed.day::integer) = dr.date
  WHERE ed.employee_id = ANY(p_employee_ids)
    AND make_date(ed.year::integer, ed.month::integer, ed.day::integer) BETWEEN p_date_from AND p_date_to
  ORDER BY ed.employee_id, make_date(ed.year::integer, ed.month::integer, ed.day::integer);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_diagram_conflicts_with_operations_v2(p_employee_ids text[], p_work_diagram_id uuid, p_date_from date, p_date_to date)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    conflict_record RECORD;
    operation_conflicts json[] := '{}';
    simple_conflicts json[] := '{}';
    result json;
BEGIN
    -- Verificar conflictos con operaciones (registros en uso)
    FOR conflict_record IN
        SELECT DISTINCT
            ed.employee_id,
            CONCAT(e.firstname, ' ', e.lastname) as employee_name,
            TO_CHAR(make_date(ed.year, ed.month, ed.day), 'DD/MM/YYYY') as date,
            dt.name as diagram_type
        FROM employees_diagram ed
        JOIN employees e ON e.id = ed.employee_id::uuid
        JOIN diagram_type dt ON dt.id = ed.diagram_type::uuid
        WHERE ed.employee_id = ANY(p_employee_ids)
          AND make_date(ed.year, ed.month, ed.day) BETWEEN p_date_from AND p_date_to
          AND EXISTS (
              SELECT 1 
              FROM dailyreportemployeerelations drer
              JOIN dailyreportrows drr ON drr.id = drer.daily_report_row_id
              JOIN dailyreport dr ON dr.id = drr.daily_report_id
              WHERE drer.employee_id = ed.employee_id::uuid
                AND dr.date = make_date(ed.year, ed.month, ed.day)
          )
    LOOP
        operation_conflicts := operation_conflicts || json_build_object(
            'employee_id', conflict_record.employee_id,
            'employee_name', conflict_record.employee_name,
            'date', conflict_record.date,
            'diagram_type', conflict_record.diagram_type,
            'conflict_type', 'OPERATION_IN_USE'
        );
    END LOOP;

    -- Verificar conflictos simples (registros existentes pero no en uso)
    FOR conflict_record IN
        SELECT DISTINCT
            ed.employee_id,
            CONCAT(e.firstname, ' ', e.lastname) as employee_name,
            TO_CHAR(make_date(ed.year, ed.month, ed.day), 'DD/MM/YYYY') as date,
            dt.name as diagram_type
        FROM employees_diagram ed
        JOIN employees e ON e.id = ed.employee_id::uuid
        JOIN diagram_type dt ON dt.id = ed.diagram_type::uuid
        WHERE ed.employee_id = ANY(p_employee_ids)
          AND make_date(ed.year, ed.month, ed.day) BETWEEN p_date_from AND p_date_to
          AND NOT EXISTS (
              SELECT 1 
              FROM dailyreportemployeerelations drer
              JOIN dailyreportrows drr ON drr.id = drer.daily_report_row_id
              JOIN dailyreport dr ON dr.id = drr.daily_report_id
              WHERE drer.employee_id = ed.employee_id::uuid
                AND dr.date = make_date(ed.year, ed.month, ed.day)
          )
    LOOP
        simple_conflicts := simple_conflicts || json_build_object(
            'employee_id', conflict_record.employee_id,
            'employee_name', conflict_record.employee_name,
            'date', conflict_record.date,
            'diagram_type', conflict_record.diagram_type,
            'conflict_type', 'SIMPLE_CONFLICT'
        );
    END LOOP;

    -- Construir resultado
    result := json_build_object(
        'operation_conflicts', array_to_json(operation_conflicts),
        'simple_conflicts', array_to_json(simple_conflicts),
        'total_operation_conflicts', array_length(operation_conflicts, 1),
        'total_simple_conflicts', array_length(simple_conflicts, 1)
    );

    RETURN result;
END;
$function$
;

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
BEGIN
  BEGIN
    user_jwt := auth.jwt();
    user_id := user_jwt->>'sub';
  EXCEPTION WHEN OTHERS THEN
    user_id := NULL;
  END;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Persona'
  LOOP
    IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
      SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
      where_sql := build_employee_where_alias(conditions_jsonb, 'e');
      
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
      WHERE dt.mandatory = true AND dt.applies = 'Persona'
        AND NOT EXISTS (
          SELECT 1 FROM documents_employees de2
          WHERE de2.id_document_types = dt.id AND de2.applies = employee_id_param
        )
    ) THEN 'Incompleto'::status_type
    ELSE 'Completo'::status_type
  END
  WHERE e.id = employee_id_param;
END;
$function$
;

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
BEGIN
  BEGIN
    user_jwt := auth.jwt();
    user_id := user_jwt->>'sub';
  EXCEPTION WHEN OTHERS THEN
    user_id := NULL;
  END;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Equipos'
  LOOP
    IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
      SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
      where_sql := build_vehicle_where_alias(conditions_jsonb, 'v');
      
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
      WHERE dt.mandatory = true AND dt.applies = 'Equipos'
        AND NOT EXISTS (
          SELECT 1 FROM documents_equipment de2
          WHERE de2.id_document_types = dt.id AND de2.applies = vehicle_id_param
        )
    ) THEN 'Incompleto'::status_type
    ELSE 'Completo'::status_type
  END
  WHERE v.id = vehicle_id_param;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.controlar_alertas_single_document_all_employees(document_type_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  company_id_var uuid;
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  employee_record RECORD;
  employee_matches boolean;
BEGIN
  user_jwt := auth.jwt();
  company_id_var := user_jwt->'app_metadata'->>'company';
  user_id := user_jwt->>'sub';

  SELECT * INTO doc FROM document_types
  WHERE id = document_type_id_param AND mandatory = true AND applies = 'Persona';
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  IF current_setting('myapp.inside_single_document_batch', true) = 'true' THEN
    RETURN;
  END IF;
  
  PERFORM set_config('myapp.inside_single_document_batch', 'true', true);
  
  IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
    SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
    where_sql := build_employee_where_alias(conditions_jsonb, 'e');
    
    FOR employee_record IN
      SELECT id FROM employees WHERE company_id = company_id_var
    LOOP
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM employees e WHERE e.id = %L AND e.company_id = %L AND %s)',
        employee_record.id, company_id_var, where_sql
      ) INTO employee_matches;
      
      IF employee_matches THEN
        INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, employee_record.id, NULL, 'pendiente', TRUE, user_id, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_employees 
          WHERE id_document_types = doc.id AND applies = employee_record.id
        );
      ELSE
        DELETE FROM documents_employees
        WHERE id_document_types = doc.id
          AND applies = employee_record.id
          AND (document_path IS NULL OR document_path = '');
      END IF;
      
      UPDATE employees e
      SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM documents_employees de
          WHERE de.applies = employee_record.id AND de.state = 'vencido'
        ) THEN 'Completo con doc vencida'::status_type
        WHEN EXISTS (
          SELECT 1 FROM document_types dt
          WHERE dt.mandatory = true AND dt.applies = 'Persona'
            AND NOT EXISTS (
              SELECT 1 FROM documents_employees de2
              WHERE de2.id_document_types = dt.id AND de2.applies = employee_record.id
            )
        ) THEN 'Incompleto'::status_type
        ELSE 'Completo'::status_type
      END
      WHERE e.id = employee_record.id;
    END LOOP;
  ELSE
    FOR employee_record IN
      SELECT id FROM employees WHERE company_id = company_id_var
    LOOP
      INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, employee_record.id, NULL, 'pendiente', TRUE, user_id, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_employees 
        WHERE id_document_types = doc.id AND applies = employee_record.id
      );
      
      UPDATE employees e
      SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM documents_employees de
          WHERE de.applies = employee_record.id AND de.state = 'vencido'
        ) THEN 'Completo con doc vencida'::status_type
        WHEN EXISTS (
          SELECT 1 FROM document_types dt
          WHERE dt.mandatory = true AND dt.applies = 'Persona'
            AND NOT EXISTS (
              SELECT 1 FROM documents_employees de2
              WHERE de2.id_document_types = dt.id AND de2.applies = employee_record.id
            )
        ) THEN 'Incompleto'::status_type
        ELSE 'Completo'::status_type
      END
      WHERE e.id = employee_record.id;
    END LOOP;
  END IF;
  
  PERFORM set_config('myapp.inside_single_document_batch', 'false', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.controlar_alertas_single_document_all_vehicles(document_type_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  company_id_var uuid;
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  vehicle_record RECORD;
  vehicle_matches boolean;
BEGIN
  user_jwt := auth.jwt();
  company_id_var := user_jwt->'app_metadata'->>'company';
  user_id := user_jwt->>'sub';

  SELECT * INTO doc FROM document_types
  WHERE id = document_type_id_param AND mandatory = true AND applies = 'Equipos';
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  IF current_setting('myapp.inside_single_document_batch_vehicles', true) = 'true' THEN
    RETURN;
  END IF;
  
  PERFORM set_config('myapp.inside_single_document_batch_vehicles', 'true', true);
  
  IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
    SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
    where_sql := build_vehicle_where_alias(conditions_jsonb, 'v');
    
    FOR vehicle_record IN
      SELECT id FROM vehicles WHERE company_id = company_id_var
    LOOP
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id = %L AND v.company_id = %L AND %s)',
        vehicle_record.id, company_id_var, where_sql
      ) INTO vehicle_matches;
      
      IF vehicle_matches THEN
        INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, vehicle_record.id, NULL, 'pendiente', TRUE, user_id, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_equipment 
          WHERE id_document_types = doc.id AND applies = vehicle_record.id
        );
      ELSE
        DELETE FROM documents_equipment
        WHERE id_document_types = doc.id
          AND applies = vehicle_record.id
          AND (document_path IS NULL OR document_path = '');
      END IF;
      
      UPDATE vehicles v
      SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM documents_equipment de
          WHERE de.applies = vehicle_record.id AND de.state = 'vencido'
        ) THEN 'Completo con doc vencida'::status_type
        WHEN EXISTS (
          SELECT 1 FROM document_types dt
          WHERE dt.mandatory = true AND dt.applies = 'Equipos'
            AND NOT EXISTS (
              SELECT 1 FROM documents_equipment de2
              WHERE de2.id_document_types = dt.id AND de2.applies = vehicle_record.id
            )
        ) THEN 'Incompleto'::status_type
        ELSE 'Completo'::status_type
      END
      WHERE v.id = vehicle_record.id;
    END LOOP;
  ELSE
    FOR vehicle_record IN
      SELECT id FROM vehicles WHERE company_id = company_id_var
    LOOP
      INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, vehicle_record.id, NULL, 'pendiente', TRUE, user_id, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_equipment 
        WHERE id_document_types = doc.id AND applies = vehicle_record.id
      );
      
      UPDATE vehicles v
      SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM documents_equipment de
          WHERE de.applies = vehicle_record.id AND de.state = 'vencido'
        ) THEN 'Completo con doc vencida'::status_type
        WHEN EXISTS (
          SELECT 1 FROM document_types dt
          WHERE dt.mandatory = true AND dt.applies = 'Equipos'
            AND NOT EXISTS (
              SELECT 1 FROM documents_equipment de2
              WHERE de2.id_document_types = dt.id AND de2.applies = vehicle_record.id
            )
        ) THEN 'Incompleto'::status_type
        ELSE 'Completo'::status_type
      END
      WHERE v.id = vehicle_record.id;
    END LOOP;
  END IF;
  
  PERFORM set_config('myapp.inside_single_document_batch_vehicles', 'false', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_massive_diagrams_with_validations(p_employee_ids uuid[], p_diagram_type_id uuid, p_date_from date, p_date_to date)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_employee_id UUID;
  v_current_date DATE;
  v_work_diagram_id UUID;
  v_active_days INTEGER;
  v_inactive_days INTEGER;
  v_active_novelty_id UUID;
  v_inactive_novelty_id UUID;
  v_cycle_position INTEGER;
  v_should_be_active BOOLEAN;
  v_target_diagram_type_id UUID;
  v_existing_record RECORD;
  v_is_used_in_operations BOOLEAN;
  v_employee_name TEXT;
  v_created_count INTEGER := 0;
  v_updated_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_total_processed INTEGER := 0;
  v_created_records JSON[] := '{}';
  v_updated_records JSON[] := '{}';
  v_error_records JSON[] := '{}';
  v_start_time TIMESTAMP := clock_timestamp();
  v_day INTEGER;
  v_month INTEGER;
  v_year INTEGER;
BEGIN
  -- Procesar cada empleado
  FOREACH v_employee_id IN ARRAY p_employee_ids
  LOOP
    -- Obtener información del empleado
    SELECT 
      CONCAT(firstname, ' ', lastname),
      workflow_diagram
    INTO v_employee_name, v_work_diagram_id
    FROM employees 
    WHERE id = v_employee_id;
    
    -- Si el empleado no tiene diagrama de trabajo asignado, usar valores por defecto
    IF v_work_diagram_id IS NULL THEN
      v_active_days := 1;
      v_inactive_days := 0;
      v_active_novelty_id := p_diagram_type_id;
      v_inactive_novelty_id := NULL;
    ELSE
      -- Obtener configuración del diagrama de trabajo
      SELECT 
        active_working_days,
        inactive_working_days,
        COALESCE(active_novelty_id, (SELECT id FROM diagram_type WHERE name = 'Día de trabajo' AND company_id = (SELECT company_id FROM employees WHERE id = v_employee_id) LIMIT 1)),
        inactive_novelty_id
      INTO v_active_days, v_inactive_days, v_active_novelty_id, v_inactive_novelty_id
      FROM work_diagram
      WHERE id = v_work_diagram_id;
    END IF;

    -- Inicializar ciclo
    v_current_date := p_date_from;
    v_cycle_position := 0; -- Asumimos que el ciclo empieza con el rango de fechas

    -- Iterar sobre el rango de fechas
    WHILE v_current_date <= p_date_to LOOP
      v_total_processed := v_total_processed + 1;

      -- Determinar si el día es activo o inactivo
      v_should_be_active := v_cycle_position < v_active_days;

      -- Determinar el tipo de diagrama a asignar
      IF v_should_be_active THEN
        v_target_diagram_type_id := v_active_novelty_id;
      ELSE
        v_target_diagram_type_id := v_inactive_novelty_id;
      END IF;

      -- Si no hay tipo de diagrama para el estado, continuar
      IF v_target_diagram_type_id IS NOT NULL THEN
        -- Verificar si ya existe un registro para este empleado y fecha
        SELECT day, month, year, diagram_type INTO v_existing_record
        FROM employees_diagram
        WHERE employee_id = v_employee_id
          AND day = EXTRACT(DAY FROM v_current_date)
          AND month = EXTRACT(MONTH FROM v_current_date)
          AND year = EXTRACT(YEAR FROM v_current_date);

        IF FOUND THEN
          -- Si existe, verificar si se puede actualizar
          -- Verificar si el registro existente está siendo usado en operaciones
          SELECT EXISTS (
            SELECT 1
            FROM dailyreportemployeerelations drer
            JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
            JOIN dailyreport dr ON drw.daily_report_id = dr.id
            WHERE drer.employee_id = v_employee_id
              AND dr.date = make_date(v_existing_record.year, v_existing_record.month, v_existing_record.day)
          )
          INTO v_is_used_in_operations;

          IF v_is_used_in_operations THEN
            -- No se puede actualizar, registrar error
            v_error_count := v_error_count + 1;
            v_error_records := v_error_records || json_build_object(
              'employee_id', v_employee_id,
              'employee_name', v_employee_name,
              'date', TO_CHAR(v_current_date, 'DD/MM/YYYY'),
              'error', 'El registro está siendo usado en operaciones y no puede ser modificado.'
            );
          ELSE
            -- Se puede actualizar
            UPDATE employees_diagram
            SET diagram_type = v_target_diagram_type_id
            WHERE employee_id = v_employee_id
              AND day = EXTRACT(DAY FROM v_current_date)
              AND month = EXTRACT(MONTH FROM v_current_date)
              AND year = EXTRACT(YEAR FROM v_current_date);
            v_updated_count := v_updated_count + 1;
            v_updated_records := v_updated_records || json_build_object(
              'employee_id', v_employee_id,
              'employee_name', v_employee_name,
              'date', TO_CHAR(v_current_date, 'DD/MM/YYYY'),
              'old_diagram_type', v_existing_record.diagram_type,
              'new_diagram_type', v_target_diagram_type_id
            );
          END IF;
        ELSE
          -- Si no existe, crear nuevo registro
          BEGIN
            INSERT INTO employees_diagram (employee_id, day, month, year, diagram_type)
            VALUES (v_employee_id, EXTRACT(DAY FROM v_current_date), EXTRACT(MONTH FROM v_current_date), EXTRACT(YEAR FROM v_current_date), v_target_diagram_type_id);
            v_created_count := v_created_count + 1;
            v_created_records := v_created_records || json_build_object(
              'employee_id', v_employee_id,
              'employee_name', v_employee_name,
              'date', TO_CHAR(v_current_date, 'DD/MM/YYYY'),
              'diagram_type', v_target_diagram_type_id
            );
          EXCEPTION WHEN OTHERS THEN
            -- Error al insertar
            v_error_count := v_error_count + 1;
            v_error_records := v_error_records || json_build_object(
              'employee_id', v_employee_id,
              'employee_name', v_employee_name,
              'date', TO_CHAR(v_current_date, 'DD/MM/YYYY'),
              'diagram_type', v_target_diagram_type_id,
              'error', SQLERRM
            );
          END;
        END IF;
      END IF;
      
      -- Avanzar al siguiente día y posición del ciclo
      v_current_date := v_current_date + INTERVAL '1 day';
      v_cycle_position := (v_cycle_position + 1) % (v_active_days + v_inactive_days);
    END LOOP;
  END LOOP;
  
  -- Retornar resultado en formato JSON
  RETURN json_build_object(
    'success', true,
    'summary', json_build_object(
      'total_created', v_created_count,
      'total_updated', v_updated_count,
      'total_errors', v_error_count,
      'total_processed', v_total_processed
    ),
    'details', json_build_object(
      'created_records', array_to_json(v_created_records),
      'updated_records', array_to_json(v_updated_records),
      'error_records', array_to_json(v_error_records)
    ),
    'processing_time', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time))
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'summary', json_build_object(
      'total_created', v_created_count,
      'total_updated', v_updated_count,
      'total_errors', v_error_count,
      'total_processed', v_total_processed
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_dailyreportrow_history(p_row_id uuid)
 RETURNS TABLE(id uuid, action_type text, changed_fields jsonb, changed_data jsonb, changed_by jsonb, created_at timestamp with time zone, related_table text, related_id uuid, metadata jsonb, reassignment_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.action_type,
        h.changed_fields,
        h.changed_data,
        jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'raw_user_meta_data', u.raw_user_meta_data
        ) as changed_by,
        h.created_at,
        h.related_table,
        h.related_id,
        h.metadata,
        h.reassignment_reason
    FROM 
        dailyreportrows_history h
    LEFT JOIN 
        auth.users u ON h.changed_by = u.id
    WHERE 
        h.daily_report_row_id = p_row_id
    ORDER BY 
        h.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_employee_usage_by_positions(position_uuids uuid[])
 RETURNS TABLE(employees_operativos integer, employees_used integer, indicator numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH 
    -- CTE 1: Empleados operativos con diagrama laboral activo para HOY
    employees_with_active_diagram AS (
        SELECT DISTINCT ed.employee_id
        FROM employees_diagram ed
        INNER JOIN diagram_type dt ON ed.diagram_type = dt.id
        INNER JOIN employees e ON ed.employee_id = e.id
        WHERE ed.day = EXTRACT(DAY FROM CURRENT_DATE)
          AND ed.month = EXTRACT(MONTH FROM CURRENT_DATE)
          AND ed.year = EXTRACT(YEAR FROM CURRENT_DATE)
          AND dt.work_active = true
          AND dt.is_active = true
          AND e.company_position = ANY(position_uuids)
          AND e.is_active = true
    ),

    -- CTE 2: Empleados asignados a líneas de dayReportRow para hoy
    employees_in_daily_reports AS (
        SELECT DISTINCT drer.employee_id
        FROM dailyreportemployeerelations drer
        INNER JOIN dailyreportrows drr ON drer.daily_report_row_id = drr.id
        INNER JOIN dailyreport dr ON drr.daily_report_id = dr.id
        INNER JOIN employees e ON drer.employee_id = e.id
        WHERE dr.date = CURRENT_DATE
          AND e.company_position = ANY(position_uuids)
          AND e.is_active = true
          AND dr.is_active = true
    ),

    -- CTE 3: Calcular resultados finales
    results AS (
        SELECT 
            (SELECT COUNT(*)::INTEGER FROM employees_with_active_diagram) as total_operativos,
            (SELECT COUNT(*)::INTEGER FROM employees_in_daily_reports) as total_used
    ),

    -- CTE 4: Agregar indicador de porcentaje
    final_results AS (
        SELECT 
            total_operativos,
            total_used,
            CASE 
                WHEN total_operativos > 0 THEN 
                    ROUND((total_used::decimal / total_operativos::decimal) * 100, 2)
                ELSE 0.00 
            END::DECIMAL(5,2) as calc_indicator
        FROM results
    )

    SELECT 
        total_operativos as employees_operativos,
        total_used as employees_used,
        calc_indicator as indicator
    FROM final_results;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_services_summary_by_type(p_company_id uuid, save_to_history boolean DEFAULT false)
 RETURNS TABLE(type_service text, service_count bigint, percentage numeric)
 LANGUAGE plpgsql
AS $function$BEGIN
  RETURN QUERY
  WITH service_summary AS (
    SELECT 
      COALESCE(dr.type_service::TEXT, 'sin_tipo') AS type_service,
      COUNT(*) AS count_services
    FROM dailyreportrows dr
    INNER JOIN dailyreport d 
      ON dr.daily_report_id = d.id
    WHERE d.company_id = p_company_id
      AND d.date = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
    GROUP BY dr.type_service
  ),
  total_services AS (
    SELECT SUM(count_services) AS total 
    FROM service_summary
  )
  SELECT 
    ss.type_service,
    ss.count_services AS service_count,
    CASE 
      WHEN ts.total > 0 
        THEN ROUND((ss.count_services::NUMERIC / ts.total::NUMERIC) * 100, 2)
      ELSE 0
    END AS percentage
  FROM service_summary ss
  CROSS JOIN total_services ts
  ORDER BY ss.count_services DESC;
END;$function$
;

CREATE OR REPLACE FUNCTION public.get_user_accessible_modules(p_user_id uuid)
 RETURNS TABLE(module_id uuid, module_slug text, module_name text, module_icon text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        m.id,
        m.slug,
        m.name,
        m.icon
    FROM public.modules m
    WHERE m.is_active = true
        AND EXISTS (
            SELECT 1
            FROM public.get_user_permissions(p_user_id) up
            WHERE up.module_id = m.id
        )
    ORDER BY m.id;  -- Ordenar por ID en lugar de order_index
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
 RETURNS TABLE(module_id uuid, module_slug text, module_name text, tab_id uuid, tab_slug text, tab_name text, action_id uuid, action_slug text, action_name text, source text, is_granted boolean, role_id bigint, role_name text, role_color text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH user_role_permissions AS (
        -- Get permissions from user's roles
        SELECT DISTINCT
            m.id as module_id,
            m.slug as module_slug,
            m.name as module_name,
            t.id as tab_id,
            t.slug as tab_slug,
            t.name as tab_name,
            a.id as action_id,
            a.slug as action_slug,
            a.name as action_name,
            'role' as source,
            true as is_granted,
            r.id as role_id,
            r.name as role_name,
            r.color as role_color
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.tabs t ON rp.tab_id = t.id
        JOIN public.modules m ON t.module_id = m.id
        JOIN public.actions a ON rp.action_id = a.id
        WHERE ur.user_id = p_user_id
            AND m.is_active = true
            AND t.is_active = true
            AND r.is_active = true
    ),
    user_custom_permissions AS (
        -- Get custom permissions (overrides)
        SELECT
            m.id as module_id,
            m.slug as module_slug,
            m.name as module_name,
            t.id as tab_id,
            t.slug as tab_slug,
            t.name as tab_name,
            a.id as action_id,
            a.slug as action_slug,
            a.name as action_name,
            'custom' as source,
            up.is_granted,
            NULL::bigint as role_id,
            NULL::text as role_name,
            NULL::text as role_color
        FROM public.user_permissions up
        JOIN public.tabs t ON up.tab_id = t.id
        JOIN public.modules m ON t.module_id = m.id
        JOIN public.actions a ON up.action_id = a.id
        WHERE up.user_id = p_user_id
            AND m.is_active = true
            AND t.is_active = true
    )
    -- Combine both, with custom permissions taking precedence
    SELECT DISTINCT ON (
        COALESCE(ucp.module_id, urp.module_id), 
        COALESCE(ucp.tab_id, urp.tab_id), 
        COALESCE(ucp.action_id, urp.action_id)
    )
        COALESCE(ucp.module_id, urp.module_id),
        COALESCE(ucp.module_slug, urp.module_slug),
        COALESCE(ucp.module_name, urp.module_name),
        COALESCE(ucp.tab_id, urp.tab_id),
        COALESCE(ucp.tab_slug, urp.tab_slug),
        COALESCE(ucp.tab_name, urp.tab_name),
        COALESCE(ucp.action_id, urp.action_id),
        COALESCE(ucp.action_slug, urp.action_slug),
        COALESCE(ucp.action_name, urp.action_name),
        COALESCE(ucp.source, urp.source),
        COALESCE(ucp.is_granted, urp.is_granted),
        COALESCE(ucp.role_id, urp.role_id),
        COALESCE(ucp.role_name, urp.role_name),
        COALESCE(ucp.role_color, urp.role_color)
    FROM user_role_permissions urp
    FULL OUTER JOIN user_custom_permissions ucp 
        ON urp.tab_id = ucp.tab_id AND urp.action_id = ucp.action_id
    WHERE COALESCE(ucp.is_granted, urp.is_granted) = true
    ORDER BY 
        COALESCE(ucp.module_id, urp.module_id), 
        COALESCE(ucp.tab_id, urp.tab_id), 
        COALESCE(ucp.action_id, urp.action_id), 
        ucp.source NULLS LAST;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_vehicle_usage_indicator(p_vehicle_type_ids uuid[] DEFAULT NULL::uuid[], p_company_id uuid DEFAULT NULL::uuid, save_to_table boolean DEFAULT false)
 RETURNS TABLE(type_id uuid, type_name text, subtype_id uuid, subtype_name text, available_units bigint, not_available_units bigint, used_units bigint, usage_indicator numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 1️⃣ Tabla temporal para los tipos y subtipos de vehículos a procesar
    CREATE TEMP TABLE vehicle_types_subtypes_to_process AS
    SELECT DISTINCT 
        t.id as type_id, 
        t.name as type_name,
        v."subType" as subtype_id,
        st.name as subtype_name
    FROM vehicles v
    JOIN type t ON v.type = t.id
    LEFT JOIN sub_type st ON v."subType" = st.id
    WHERE v.is_active = TRUE
      AND (array_length(p_vehicle_type_ids, 1) IS NULL
           OR array_length(p_vehicle_type_ids, 1) = 0
           OR v.type = ANY(p_vehicle_type_ids))
      AND (p_company_id IS NULL OR v.company_id = p_company_id);

    -- 2️⃣ Contar unidades disponibles por tipo y subtipo
    CREATE TEMP TABLE available_counts AS
    SELECT
        v.type as type_id,
        v."subType" as subtype_id,
        COUNT(v.id) AS total
    FROM vehicles v
    WHERE v.is_active = TRUE
      AND v.condition NOT IN ('no operativo', 'en reparacion')
      AND EXISTS (
          SELECT 1 
          FROM vehicle_types_subtypes_to_process vtp
          WHERE vtp.type_id = v.type 
            AND COALESCE(vtp.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(v."subType", '00000000-0000-0000-0000-000000000000'::uuid)
      )
      AND (p_company_id IS NULL OR v.company_id = p_company_id)
    GROUP BY v.type, v."subType";

    -- 3️⃣ Contar unidades NO disponibles por tipo y subtipo
    CREATE TEMP TABLE not_available_counts AS
    SELECT
        v.type as type_id,
        v."subType" as subtype_id,
        COUNT(v.id) AS total
    FROM vehicles v
    WHERE v.is_active = TRUE
      AND v.condition IN ('no operativo', 'en reparacion')
      AND EXISTS (
          SELECT 1 
          FROM vehicle_types_subtypes_to_process vtp
          WHERE vtp.type_id = v.type 
            AND COALESCE(vtp.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(v."subType", '00000000-0000-0000-0000-000000000000'::uuid)
      )
      AND (p_company_id IS NULL OR v.company_id = p_company_id)
    GROUP BY v.type, v."subType";

    -- 4️⃣ Contar unidades utilizadas hoy por tipo y subtipo
    CREATE TEMP TABLE used_counts AS
    SELECT
        v.type as type_id,
        v."subType" as subtype_id,
        COUNT(DISTINCT v.id) AS total
    FROM dailyreport dr
    JOIN dailyreportrows drr 
      ON dr.id = drr.daily_report_id
    JOIN dailyreportequipmentrelations drer 
      ON drr.id = drer.daily_report_row_id
    JOIN vehicles v 
      ON drer.equipment_id = v.id
    WHERE v.is_active = TRUE
      AND dr.date >= (current_timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
      AND dr.date < ((current_timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + interval '1 day')
      AND EXISTS (
          SELECT 1 
          FROM vehicle_types_subtypes_to_process vtp
          WHERE vtp.type_id = v.type 
            AND COALESCE(vtp.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(v."subType", '00000000-0000-0000-0000-000000000000'::uuid)
      )
      AND (p_company_id IS NULL OR v.company_id = p_company_id)
    GROUP BY v.type, v."subType";

    -- 5️⃣ Unir resultados
    RETURN QUERY
    SELECT
        vt.type_id,
        vt.type_name,
        vt.subtype_id,
        vt.subtype_name,
        COALESCE(ac.total, 0) AS available_units,
        COALESCE(nac.total, 0) AS not_available_units,
        COALESCE(uc.total, 0) AS used_units,
        CASE
            WHEN COALESCE(ac.total, 0) > 0 THEN
                (COALESCE(uc.total, 0)::numeric / ac.total::numeric)
            ELSE
                0
        END AS usage_indicator
    FROM vehicle_types_subtypes_to_process vt
    LEFT JOIN available_counts ac 
        ON vt.type_id = ac.type_id 
        AND COALESCE(vt.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(ac.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid)
    LEFT JOIN not_available_counts nac 
        ON vt.type_id = nac.type_id 
        AND COALESCE(vt.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(nac.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid)
    LEFT JOIN used_counts uc 
        ON vt.type_id = uc.type_id 
        AND COALESCE(vt.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(uc.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid);

    -- 6️⃣ Guardar snapshot si aplica
    IF save_to_table AND p_company_id IS NOT NULL THEN
        INSERT INTO public.daily_indicators (
            company_id,
            snapshot_date,
            metrics,
            source
        )
        SELECT
            p_company_id,
            (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'type_id', vt.type_id,
                    'type_name', vt.type_name,
                    'subtype_id', vt.subtype_id,
                    'subtype_name', vt.subtype_name,
                    'available_units', COALESCE(ac.total, 0),
                    'not_available_units', COALESCE(nac.total, 0),
                    'used_units', COALESCE(uc.total, 0),
                    'usage_indicator', CASE
                        WHEN COALESCE(ac.total, 0) > 0 THEN
                            (COALESCE(uc.total, 0)::numeric / ac.total::numeric)
                        ELSE
                            0
                    END
                )
            ),
            'get_vehicle_usage_indicator'::public.indicator_function
        FROM vehicle_types_subtypes_to_process vt
        LEFT JOIN available_counts ac 
            ON vt.type_id = ac.type_id 
            AND COALESCE(vt.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(ac.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid)
        LEFT JOIN not_available_counts nac 
            ON vt.type_id = nac.type_id 
            AND COALESCE(vt.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(nac.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid)
        LEFT JOIN used_counts uc 
            ON vt.type_id = uc.type_id 
            AND COALESCE(vt.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(uc.subtype_id, '00000000-0000-0000-0000-000000000000'::uuid)
        GROUP BY p_company_id;
    END IF;

    -- 🔚 Limpiar temporales
    DROP TABLE IF EXISTS vehicle_types_subtypes_to_process;
    DROP TABLE IF EXISTS available_counts;
    DROP TABLE IF EXISTS not_available_counts;
    DROP TABLE IF EXISTS used_counts;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_dailyreport_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
    user_id UUID;
    changed_fields JSONB;
    readable_data JSONB;
    row_exists BOOLEAN;
    v_reassignment_reason TEXT; -- Variable para capturar el motivo de reasignación
BEGIN
    -- Intentar obtener el motivo de reasignación (si existe)
    BEGIN
        v_reassignment_reason := current_setting('myapp.reassignment_reason', true);
        -- Agregar log para depuración
        RAISE NOTICE 'Valor de reassignment_reason obtenido: %', v_reassignment_reason;
    EXCEPTION WHEN OTHERS THEN
        v_reassignment_reason := NULL;
        RAISE NOTICE 'Error al obtener reassignment_reason, establecido a NULL';
    END;

    -- Get the current user ID from the request context
    BEGIN
        user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::UUID;
        RAISE NOTICE 'ID de usuario obtenido: %', user_id;
    EXCEPTION WHEN OTHERS THEN
        user_id := NULL;
        RAISE NOTICE 'Error al obtener ID de usuario, establecido a NULL';
    END;
    
    IF TG_OP = 'UPDATE' THEN
        -- Verify the row exists before proceeding
        SELECT EXISTS(SELECT 1 FROM dailyreportrows WHERE id = NEW.id) INTO row_exists;
        
        IF NOT row_exists THEN
            -- Skip logging if row doesn't exist
            RAISE NOTICE 'Fila no existe, omitiendo';
            RETURN NEW;
        END IF;
    
        changed_fields := '{}'::JSONB;
        
        IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
            changed_fields := jsonb_set(changed_fields, '{customer_id}', 
                jsonb_build_object('old', OLD.customer_id, 'new', NEW.customer_id));
        END IF;
        
        IF NEW.service_id IS DISTINCT FROM OLD.service_id THEN
            changed_fields := jsonb_set(changed_fields, '{service_id}', 
                jsonb_build_object('old', OLD.service_id, 'new', NEW.service_id));
        END IF;

        IF NEW.completed_night IS DISTINCT FROM OLD.completed_night THEN
            changed_fields := jsonb_set(changed_fields, '{completed_night}', 
                jsonb_build_object('old', OLD.completed_night, 'new', NEW.completed_night));
        END IF;

        IF NEW.completed_day IS DISTINCT FROM OLD.completed_day THEN
            changed_fields := jsonb_set(changed_fields, '{completed_day}', 
                jsonb_build_object('old', OLD.completed_day, 'new', NEW.completed_day));
        END IF;
        
IF NEW.item_id IS DISTINCT FROM OLD.item_id THEN
    changed_fields := jsonb_set(changed_fields, '{item_id}', 
        jsonb_build_object(
            'old',(SELECT item_name FROM service_items WHERE id = OLD.item_id),
            'new', (SELECT item_name FROM service_items WHERE id = NEW.item_id)
        ));
END IF;
        
        IF NEW.working_day IS DISTINCT FROM OLD.working_day THEN
            changed_fields := jsonb_set(changed_fields, '{working_day}', 
                jsonb_build_object('old', OLD.working_day, 'new', NEW.working_day));
        END IF;
        
        IF NEW.start_time IS DISTINCT FROM OLD.start_time THEN
            changed_fields := jsonb_set(changed_fields, '{start_time}', 
                jsonb_build_object('old', OLD.start_time::TEXT, 'new', NEW.start_time::TEXT));
        END IF;
        
        IF NEW.end_time IS DISTINCT FROM OLD.end_time THEN
            changed_fields := jsonb_set(changed_fields, '{end_time}', 
                jsonb_build_object('old', OLD.end_time::TEXT, 'new', NEW.end_time::TEXT));
        END IF;
        
        IF NEW.description IS DISTINCT FROM OLD.description THEN
            changed_fields := jsonb_set(changed_fields, '{description}', 
                jsonb_build_object('old', OLD.description, 'new', NEW.description));
        END IF;
        
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            changed_fields := jsonb_set(changed_fields, '{status}', 
                jsonb_build_object('old', OLD.status::TEXT, 'new', NEW.status::TEXT));
        END IF;

        -- Eliminados los bloques que comparan employee_id y equipment_id porque no existen en esta tabla
        
        IF NEW.sector_service_id IS DISTINCT FROM OLD.sector_service_id THEN
            changed_fields := jsonb_set(changed_fields, '{sector_service_id}', 
                jsonb_build_object('old', OLD.sector_service_id, 'new', NEW.sector_service_id));
        END IF;
        
        IF NEW.areas_service_id IS DISTINCT FROM OLD.areas_service_id THEN
            changed_fields := jsonb_set(changed_fields, '{areas_service_id}', 
                jsonb_build_object('old', OLD.areas_service_id, 'new', NEW.areas_service_id));
        END IF;
        
        IF NEW.remit_number IS DISTINCT FROM OLD.remit_number THEN
            changed_fields := jsonb_set(changed_fields, '{remit_number}', 
                jsonb_build_object('old', OLD.remit_number, 'new', NEW.remit_number));
        END IF;
        
        IF NEW.cancel_reason IS DISTINCT FROM OLD.cancel_reason THEN
            changed_fields := jsonb_set(changed_fields, '{cancel_reason}', 
                jsonb_build_object('old', OLD.cancel_reason, 'new', NEW.cancel_reason));
        END IF;
        
        IF NEW.type_service IS DISTINCT FROM OLD.type_service THEN
            changed_fields := jsonb_set(changed_fields, '{type_service}', 
                jsonb_build_object('old', OLD.type_service::TEXT, 'new', NEW.type_service::TEXT));
        END IF;
        
        IF changed_fields != '{}'::JSONB THEN
            BEGIN
                SELECT jsonb_build_object(
                    'customer_name', (SELECT name FROM customers WHERE id = NEW.customer_id),
                    'service_name', (SELECT service_name FROM customer_services WHERE id = NEW.service_id),
                    'item_name', (SELECT item_name FROM service_items WHERE id = NEW.item_id),
                    'working_day', NEW.working_day,
                    'status', NEW.status,
                    'type_service', NEW.type_service
                ) INTO readable_data;
                
                RAISE NOTICE 'Insertando en dailyreportrows_history. Action: UPDATE, Reason: %', v_reassignment_reason;
                
                INSERT INTO dailyreportrows_history (
                    daily_report_row_id,
                    related_table,
                    related_id,
                    action_type,
                    changed_fields,
                    changed_data,
                    changed_by,
                    reassignment_reason
                ) VALUES (
                    NEW.id,
                    TG_TABLE_NAME,
                    NEW.id,
                    'UPDATE',
                    changed_fields,
                    readable_data,
                    user_id,
                    v_reassignment_reason
                );
                
                -- Limpiar la variable de sesión después de usarla
                IF v_reassignment_reason IS NOT NULL THEN
                    PERFORM set_config('myapp.reassignment_reason', NULL, false);
                    RAISE NOTICE 'Variable de sesión de motivo de reasignación limpiada';
                END IF;
                
            EXCEPTION WHEN foreign_key_violation THEN
                RAISE NOTICE 'Excepción de clave foránea en INSERT';
                NULL;
            WHEN OTHERS THEN
                RAISE NOTICE 'Error durante la inserción: %', SQLERRM;
            END;
        END IF;
        
    ELSIF TG_OP = 'INSERT' THEN
        BEGIN
            SELECT jsonb_build_object(
                'customer_name', (SELECT name FROM customers WHERE id = NEW.customer_id),
                'service_name', (SELECT service_name FROM customer_services WHERE id = NEW.service_id),
                'item_name', (SELECT item_name FROM service_items WHERE id = NEW.item_id),
                'working_day', NEW.working_day,
                'status', NEW.status,
                'type_service', NEW.type_service
            ) INTO readable_data;
            
            RAISE NOTICE 'Insertando en dailyreportrows_history. Action: CREATE';
            
            INSERT INTO dailyreportrows_history (
                daily_report_row_id,
                related_table,
                related_id,
                action_type,
                changed_fields,
                changed_data,
                changed_by,
                reassignment_reason
            ) VALUES (
                NEW.id,
                TG_TABLE_NAME,
                NEW.id,
                'CREATE',
                '{}'::JSONB,
                readable_data,
                user_id,
                NULL -- No hay motivo de reasignación para nuevas filas
            );
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE NOTICE 'Excepción de clave foránea en INSERT para CREATE';
            NULL;
        END;
        
    ELSIF TG_OP = 'DELETE' THEN
        BEGIN
            SELECT EXISTS(SELECT 1 FROM dailyreportrows_history WHERE daily_report_row_id = OLD.id) INTO row_exists;
            
            IF row_exists THEN
                SELECT jsonb_build_object(
                    'customer_name', (SELECT name FROM customers WHERE id = OLD.customer_id),
                    'service_name', (SELECT service_name FROM customer_services WHERE id = OLD.service_id),
                    'item_name', (SELECT item_name FROM service_items WHERE id = OLD.item_id),
                    'working_day', OLD.working_day,
                    'status', OLD.status,
                    'type_service', OLD.type_service
                ) INTO readable_data;
                
                RAISE NOTICE 'Insertando en dailyreportrows_history. Action: DELETE';
                
                INSERT INTO dailyreportrows_history (
                    daily_report_row_id,
                    related_table,
                    related_id,
                    action_type,
                    changed_fields,
                    changed_data,
                    changed_by,
                    reassignment_reason
                ) VALUES (
                    OLD.id,
                    TG_TABLE_NAME,
                    OLD.id,
                    'DELETE',
                    '{}'::JSONB,
                    readable_data,
                    user_id,
                    NULL -- No hay motivo de reasignación para eliminaciones
                );
            END IF;
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE NOTICE 'Excepción de clave foránea en INSERT para DELETE';
            NULL;
        END;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;$function$
;

CREATE OR REPLACE FUNCTION public.log_reassignment_reason_before_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    reason TEXT;
BEGIN
    BEGIN
        reason := current_setting('myapp.reassignment_reason', true);
        RAISE LOG 'BEFORE UPDATE: reassignment_reason = %', reason;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'BEFORE UPDATE: Error obteniendo reassignment_reason';
    END;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.marcar_prepartes_vencidos()
 RETURNS void
 LANGUAGE plpgsql
AS $function$BEGIN
    UPDATE public.preparte
    SET 
        status = 'vencido',
        updated_at = NOW()
    WHERE status = 'pendiente'
    AND "executionDate" < CURRENT_DATE
    AND (
        "executionDate"::date < CURRENT_DATE
        OR 
        ("executionDate"::date = CURRENT_DATE AND "executionDate" < NOW())
    );
END;$function$
;

CREATE OR REPLACE FUNCTION public.run_daily_indicators_for_all_companies()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  company_record RECORD;
  v_today date := (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
  FOR company_record IN SELECT id FROM company LOOP
    BEGIN
      PERFORM public.get_employee_usage_indicator(
        position_uuids => NULL::uuid[],
        save_to_table => true,
        p_company_id => company_record.id
      );

      PERFORM public.get_employee_diagram_count_by_day(
        p_day => EXTRACT(DAY FROM v_today)::integer,
        p_month => EXTRACT(MONTH FROM v_today)::integer,
        p_year => EXTRACT(YEAR FROM v_today)::integer,
        p_company_position_ids => NULL,
        save_to_table => true,
        p_company_id => company_record.id
      );

      PERFORM public.get_vehicle_usage_indicator(
        p_vehicle_type_ids => ARRAY[]::uuid[],
        p_company_id => company_record.id,
        save_to_table => true
      );

      PERFORM public.get_company_counts_indicator(
        p_company_id => company_record.id,
        save_to_table => true
      );

      PERFORM public.hr_get_absenteeism_summary(
        p_company_id => company_record.id,
        p_from => v_today,
        p_to => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_absenteeism_trend(
        p_company_id => company_record.id,
        p_from => v_today,
        p_to => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_current_absent_employees(
        p_company_id => company_record.id,
        p_date => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_daily_absence_timeseries(
        p_company_id => company_record.id,
        p_from => v_today,
        p_to => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_department_absence_reasons(
        p_company_id => company_record.id,
        p_date => v_today,
        save_to_table => true
      );

      PERFORM public.hr_get_department_absence_summary(
        p_company_id => company_record.id,
        p_date => v_today,
        save_to_table => true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error al ejecutar indicadores para company_id %: %', company_record.id, SQLERRM;
    END;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.select_distinct_values(p_table_name text, p_column_path text, p_join_mappings jsonb DEFAULT NULL::jsonb, p_multi_join_paths jsonb DEFAULT NULL::jsonb, p_filters jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(col_value text, col_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    query TEXT;
    parts TEXT[];
    current_table TEXT;
    current_column TEXT;
    join_clause TEXT := '';
    where_clause TEXT := '';
    table_alias_counter INTEGER := 1;
    i INTEGER;
    target_table TEXT;
    fk_column TEXT;
    mapping_key TEXT;
    mapping_value TEXT;
    processed_mappings JSONB;
    join_info JSONB;
    joins_array_length INTEGER;
    parsed_multi_join_paths JSONB;
    parsed_filters JSONB;
    filter_key TEXT;
    filter_value TEXT;
    filter_conditions TEXT[] := ARRAY[]::TEXT[];
    -- 🔑 NUEVO: Mapeo de tablas a aliases
    table_aliases JSONB := '{}'::JSONB;
    filter_table TEXT;
    filter_column TEXT;
    filter_parts TEXT[];
BEGIN
    RAISE LOG '[SELECT_DISTINCT_VALUES] === INICIO DE EJECUCIÓN ===';
    RAISE LOG '[SELECT_DISTINCT_VALUES] Parámetros de entrada:';
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_table_name: %', p_table_name;
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_column_path: %', p_column_path;
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_join_mappings: %', p_join_mappings;
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_multi_join_paths: %', p_multi_join_paths;
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_filters: %', p_filters;
    
    -- 🔑 NUEVO: Inicializar mapeo de tabla principal
    table_aliases := jsonb_set(table_aliases, ARRAY[p_table_name], to_jsonb(p_table_name));
    
    -- Si se proporciona multi_join_paths, usar la nueva lógica
    IF p_multi_join_paths IS NOT NULL AND p_multi_join_paths != 'null'::jsonb THEN
        RAISE LOG '[SELECT_DISTINCT_VALUES] Usando multi_join_paths';
        
        -- Parsear el JSON si viene como string
        BEGIN
            IF jsonb_typeof(p_multi_join_paths) = 'string' THEN
                parsed_multi_join_paths := (p_multi_join_paths #>> '{}')::JSONB;
                RAISE LOG '[SELECT_DISTINCT_VALUES] JSON parseado desde string: %', parsed_multi_join_paths;
            ELSE
                parsed_multi_join_paths := p_multi_join_paths;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error al parsear p_multi_join_paths: %. Valor recibido: %', SQLERRM, p_multi_join_paths;
        END;
        
        -- Validar que el parámetro tenga la estructura correcta
        IF NOT (parsed_multi_join_paths ? 'joins' AND parsed_multi_join_paths ? 'final_column') THEN
            RAISE EXCEPTION 'p_multi_join_paths debe contener "joins" y "final_column". Recibido: %', parsed_multi_join_paths;
        END IF;
        
        -- Obtener la longitud del array de joins de forma segura
        joins_array_length := jsonb_array_length(parsed_multi_join_paths->'joins');
        
        IF joins_array_length IS NULL OR joins_array_length = 0 THEN
            RAISE EXCEPTION 'El array "joins" en p_multi_join_paths está vacío o es NULL';
        END IF;
        
        current_table := p_table_name;
        
        -- Construir JOINs múltiples basados en el array de joins
        FOR i IN 0..joins_array_length - 1 LOOP
            join_info := parsed_multi_join_paths->'joins'->i;
            
            -- Validar que el join_info tenga todas las propiedades necesarias
            IF NOT (join_info ? 'from_table' AND join_info ? 'to_table' AND join_info ? 'from_column' AND join_info ? 'to_column') THEN
                RAISE EXCEPTION 'Cada elemento del array "joins" debe contener: from_table, to_table, from_column, to_column';
            END IF;
            
            join_clause := join_clause || format(' LEFT JOIN %I t%s ON %I.%I::TEXT = t%s.%I::TEXT',
                join_info->>'to_table', 
                table_alias_counter,
                current_table,
                join_info->>'from_column',
                table_alias_counter,
                join_info->>'to_column'
            );
            
            -- 🔑 NUEVO: Registrar alias de tabla
            table_aliases := jsonb_set(table_aliases, ARRAY[join_info->>'to_table'], to_jsonb('t' || table_alias_counter));
            
            RAISE LOG '[SELECT_DISTINCT_VALUES] JOIN construido: %', join_clause;
            RAISE LOG '[SELECT_DISTINCT_VALUES] Alias registrado: % -> t%', join_info->>'to_table', table_alias_counter;
            
            current_table := 't' || table_alias_counter;
            table_alias_counter := table_alias_counter + 1;
        END LOOP;
        
        -- Extraer tabla y columna final
        parts := string_to_array(parsed_multi_join_paths->>'final_column', '.');
        IF array_length(parts, 1) = 2 THEN
            current_table := 't' || (table_alias_counter - 1); -- Usar el último alias
            current_column := parts[2];
        ELSE
            current_column := parsed_multi_join_paths->>'final_column';
        END IF;
        
    ELSE
        -- Lógica existente sin cambios para join_mappings
        BEGIN
            IF p_join_mappings IS NOT NULL AND jsonb_typeof(p_join_mappings) = 'string' THEN
                processed_mappings := (p_join_mappings #>> '{}')::JSONB;
                RAISE LOG '[SELECT_DISTINCT_VALUES] Convertido string JSON interno a JSONB: %', processed_mappings;
            ELSE
                processed_mappings := p_join_mappings;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error al procesar p_join_mappings: %. Valor recibido: %', SQLERRM, p_join_mappings;
        END;
        
        -- Dividir el column_path en partes
        parts := string_to_array(p_column_path, '.');
        current_table := p_table_name;
        
        -- Si hay más de una parte, es una relación anidada
        IF array_length(parts, 1) > 1 THEN
            RAISE LOG '[SELECT_DISTINCT_VALUES] Partes anidadas detectadas: %', array_to_string(parts, ', ');
            RAISE LOG '[SELECT_DISTINCT_VALUES] Procesando relación anidada...';
            
            -- Procesar cada nivel de la relación
            FOR i IN 1..array_length(parts, 1)-1 LOOP
                RAISE LOG '[SELECT_DISTINCT_VALUES] Procesando nivel %: buscando tabla destino para columna %', i, parts[i];
                
                -- Buscar en los mappings
                target_table := NULL;
                fk_column := NULL;
                
                -- Iterar sobre los mappings para encontrar la relación
                IF processed_mappings IS NOT NULL THEN
                    FOR mapping_key, mapping_value IN SELECT * FROM jsonb_each_text(processed_mappings) LOOP
                        RAISE LOG '[SELECT_DISTINCT_VALUES] Evaluando mapping: % -> %', mapping_key, mapping_value;
                        
                        -- CORREGIDO: Formato correcto {"tabla_destino": "columna_fk"}
                        IF mapping_key = parts[i] THEN
                            target_table := mapping_key;
                            fk_column := mapping_value;
                            RAISE LOG '[SELECT_DISTINCT_VALUES] Formato correcto detectado: tabla_destino=%, columna_fk=%', target_table, fk_column;
                            EXIT;
                        END IF;
                        
                        -- Formato legacy: {"columna_fk": "tabla_destino"}
                        IF mapping_value = parts[i] THEN
                            target_table := mapping_value;
                            fk_column := mapping_key;
                            RAISE LOG '[SELECT_DISTINCT_VALUES] Formato legacy detectado: tabla_destino=%, columna_fk=%', target_table, fk_column;
                            RAISE WARNING '[SELECT_DISTINCT_VALUES] Usando formato legacy de join_mappings. Se recomienda usar: {"%": "%"}', parts[i], target_table;
                            EXIT;
                        END IF;
                    END LOOP;
                END IF;
                
                -- Si no se encontró mapping, buscar por foreign key
                IF target_table IS NULL THEN
                    SELECT 
                        ccu.table_name,
                        kcu.column_name
                    INTO target_table, fk_column
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_name = current_table
                      AND kcu.column_name = parts[i]
                    LIMIT 1;
                    
                    IF target_table IS NOT NULL THEN
                        RAISE LOG '[SELECT_DISTINCT_VALUES] Relación encontrada por FK: tabla_destino=%, columna_fk=%', target_table, fk_column;
                    END IF;
                END IF;
                
                -- Si aún no se encontró, error
                IF target_table IS NULL THEN
                    RAISE EXCEPTION 'No se encontró clave foránea para la columna % en la tabla % y no hay mapping disponible', parts[i], current_table;
                END IF;
                
                -- Validar que la tabla destino existe
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = target_table AND table_schema = 'public') THEN
                    RAISE EXCEPTION 'La tabla destino % no existe', target_table;
                END IF;
                
                -- Validar que la columna FK existe en la tabla actual
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = current_table AND column_name = fk_column AND table_schema = 'public') THEN
                    RAISE EXCEPTION 'La columna % no existe en la tabla %', fk_column, current_table;
                END IF;
                
                -- Construir el JOIN
                join_clause := join_clause || format(' LEFT JOIN %I t%s ON %I.%I::TEXT = t%s.id::TEXT',
                    target_table, table_alias_counter, current_table, fk_column, table_alias_counter);
                
                -- 🔑 NUEVO: Registrar alias de tabla
                table_aliases := jsonb_set(table_aliases, ARRAY[target_table], to_jsonb('t' || table_alias_counter));
                
                RAISE LOG '[SELECT_DISTINCT_VALUES] JOIN construido: %', join_clause;
                RAISE LOG '[SELECT_DISTINCT_VALUES] Alias registrado: % -> t%', target_table, table_alias_counter;
                
                current_table := 't' || table_alias_counter;
                table_alias_counter := table_alias_counter + 1;
            END LOOP;
            
            current_column := parts[array_length(parts, 1)];
        ELSE
            current_column := p_column_path;
        END IF;
    END IF;
    
    -- 🔑 MODIFICADO: Procesar filtros con soporte para relaciones
    IF p_filters IS NOT NULL AND p_filters != 'null'::jsonb AND jsonb_typeof(p_filters) != 'null' THEN
        RAISE LOG '[SELECT_DISTINCT_VALUES] Procesando filtros: %', p_filters;
        
        -- Parsear el JSON si viene como string
        BEGIN
            IF jsonb_typeof(p_filters) = 'string' THEN
                parsed_filters := (p_filters #>> '{}')::JSONB;
                RAISE LOG '[SELECT_DISTINCT_VALUES] Filtros parseados desde string: %', parsed_filters;
            ELSE
                parsed_filters := p_filters;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error al parsear p_filters: %. Valor recibido: %', SQLERRM, p_filters;
        END;
        
        -- Verificar que parsed_filters no sea null antes de iterar
        IF parsed_filters IS NOT NULL AND jsonb_typeof(parsed_filters) = 'object' THEN
            -- Iterar sobre cada filtro
            FOR filter_key, filter_value IN SELECT * FROM jsonb_each_text(parsed_filters) LOOP
                RAISE LOG '[SELECT_DISTINCT_VALUES] Aplicando filtro: % = %', filter_key, filter_value;
                
                -- 🔑 NUEVO: Determinar tabla y columna del filtro
                filter_parts := string_to_array(filter_key, '.');
                IF array_length(filter_parts, 1) = 2 THEN
                    -- Filtro con tabla.columna
                    filter_table := filter_parts[1];
                    filter_column := filter_parts[2];
                    
                    -- Buscar el alias de la tabla
                    IF table_aliases ? filter_table THEN
                        filter_table := table_aliases ->> filter_table;
                        RAISE LOG '[SELECT_DISTINCT_VALUES] Usando alias para tabla %: %', filter_parts[1], filter_table;
                    ELSE
                        -- Si no hay alias, usar el nombre original
                        filter_table := filter_parts[1];
                        RAISE LOG '[SELECT_DISTINCT_VALUES] No se encontró alias para tabla %, usando nombre original', filter_table;
                    END IF;
                ELSE
                    -- Filtro simple, usar tabla principal
                    filter_table := p_table_name;
                    filter_column := filter_key;
                END IF;
                
                -- Construir condición de filtro
                IF filter_value = 'null' THEN
                    filter_conditions := array_append(filter_conditions, format('%I.%I IS NULL', filter_table, filter_column));
                ELSIF filter_value = 'not_null' THEN
                    filter_conditions := array_append(filter_conditions, format('%I.%I IS NOT NULL', filter_table, filter_column));
                ELSIF filter_value IN ('true', 'false') THEN
                    -- Para valores booleanos
                    filter_conditions := array_append(filter_conditions, format('%I.%I = %s', filter_table, filter_column, filter_value));
                ELSE
                    -- Para valores de texto
                    filter_conditions := array_append(filter_conditions, format('%I.%I::TEXT = %L', filter_table, filter_column, filter_value));
                END IF;
                
                RAISE LOG '[SELECT_DISTINCT_VALUES] Condición de filtro construida: %', filter_conditions[array_length(filter_conditions, 1)];
            END LOOP;
        END IF;
        
        -- Construir cláusula WHERE
        IF array_length(filter_conditions, 1) > 0 THEN
            where_clause := ' WHERE ' || array_to_string(filter_conditions, ' AND ');
            RAISE LOG '[SELECT_DISTINCT_VALUES] Cláusula WHERE construida: %', where_clause;
        END IF;
    ELSE
        RAISE LOG '[SELECT_DISTINCT_VALUES] No se aplicarán filtros (p_filters es null o vacío)';
    END IF;
    
    -- Construir la consulta final
    query := format('SELECT COALESCE(%I.%I::TEXT, ''null'') as col_value, COUNT(*) as col_count FROM %I%s%s GROUP BY COALESCE(%I.%I::TEXT, ''null'') ORDER BY col_value ASC',
        current_table, current_column, p_table_name, join_clause, where_clause, current_table, current_column);
    
    RAISE LOG '[SELECT_DISTINCT_VALUES] Consulta SQL generada: %', query;
    
    -- Ejecutar la consulta
    RETURN QUERY EXECUTE query;
    
    RAISE LOG '[SELECT_DISTINCT_VALUES] === FIN DE EJECUCIÓN ===';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_reassignment_reason(reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Establece una variable de configuración local usando true para "is_local"
  -- para que persista en transacciones futuras dentro de la misma conexión
  PERFORM set_config('myapp.reassignment_reason', reason, true);
  
  -- Agregar log para verificar
  RAISE LOG 'set_reassignment_reason called with reason: %', reason;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_controlar_alertas_employees()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF current_setting('myapp.inside_controlar_alertas', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  PERFORM set_config('myapp.inside_controlar_alertas', 'true', true);
  PERFORM controlar_alertas_documentos_single_employee(NEW.id, NEW.company_id);
  PERFORM set_config('myapp.inside_controlar_alertas', 'false', true);
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_controlar_alertas_vehicles()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF current_setting('myapp.inside_controlar_alertas_vehicles', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  PERFORM set_config('myapp.inside_controlar_alertas_vehicles', 'true', true);
  PERFORM controlar_alertas_documentos_single_vehicle(NEW.id, NEW.company_id);
  PERFORM set_config('myapp.inside_controlar_alertas_vehicles', 'false', true);
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_document_types_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.mandatory THEN
    IF NEW.applies = 'Persona' THEN
      PERFORM controlar_alertas_single_document_all_employees(NEW.id);
    ELSIF NEW.applies = 'Equipos' THEN
      PERFORM controlar_alertas_single_document_all_vehicles(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_document_types_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.mandatory OR (OLD.mandatory AND NEW.conditions IS DISTINCT FROM OLD.conditions) THEN
    IF NEW.applies = 'Persona' THEN
      PERFORM controlar_alertas_single_document_all_employees(NEW.id);
    ELSIF NEW.applies = 'Equipos' THEN
      PERFORM controlar_alertas_single_document_all_vehicles(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_module_slug text, p_tab_slug text, p_action_slug text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_has_permission boolean;
BEGIN
    -- Check if user has the permission (from role or custom)
    SELECT EXISTS (
        SELECT 1
        FROM public.get_user_permissions(p_user_id) up
        WHERE up.module_slug = p_module_slug
            AND up.tab_slug = p_tab_slug
            AND up.action_slug = p_action_slug
            AND up.is_granted = true
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$function$
;


  create policy "Vehicles access by company"
  on "public"."vehicles"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



