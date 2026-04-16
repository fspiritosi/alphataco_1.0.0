-- RPCs para carga masiva de una sola novedad (COD-387)
-- Mismo shape de respuesta que los RPCs de diagrama (v2) para compatibilidad con el cliente.
-- Diferencia clave: no aplica ciclo activo/inactivo — TODOS los días del rango usan la misma novedad.

-- ─────────────────────────────────────────────────────────────────────────────
-- check_novelty_conflicts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_novelty_conflicts(
  p_employee_ids text[],
  p_diagram_type_id text,
  p_date_from date,
  p_date_to date
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_conflicts json[];
  v_conflict_record json;
  v_current_date date;
  employee_record RECORD;
  v_existing_diagram_id uuid;
  v_existing_diagram_name text;
  v_existing_diagram_color text;
  v_new_novelty_name text;
  v_new_novelty_color text;
BEGIN
  -- Info de la novedad nueva
  SELECT dt.name, dt.color
    INTO v_new_novelty_name, v_new_novelty_color
  FROM diagram_type dt
  WHERE dt.id = p_diagram_type_id::uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Novelty not found: %', p_diagram_type_id;
  END IF;

  -- Por cada empleado × día del rango: ver si ya existe registro y si está en uso por operaciones
  FOR employee_record IN
    SELECT e.id, e.firstname, e.lastname
    FROM employees e
    WHERE e.id::text = ANY(p_employee_ids)
  LOOP
    v_current_date := p_date_from;
    WHILE v_current_date <= p_date_to LOOP
      SELECT ed.diagram_type, dt.name, dt.color
        INTO v_existing_diagram_id, v_existing_diagram_name, v_existing_diagram_color
      FROM employees_diagram ed
      LEFT JOIN diagram_type dt ON ed.diagram_type = dt.id
      WHERE ed.employee_id = employee_record.id
        AND ed.day = EXTRACT(DAY FROM v_current_date)
        AND ed.month = EXTRACT(MONTH FROM v_current_date)
        AND ed.year = EXTRACT(YEAR FROM v_current_date);

      IF FOUND THEN
        IF EXISTS (
          SELECT 1
          FROM dailyreportemployeerelations drer
          JOIN dailyreportrows drr ON drer.daily_report_row_id = drr.id
          JOIN dailyreport dr ON drr.daily_report_id = dr.id
          WHERE drer.employee_id = employee_record.id
            AND dr.date = v_current_date
        ) THEN
          -- IN_USE: no se puede actualizar
          v_conflict_record := json_build_object(
            'employee_id', employee_record.id,
            'employee_name', employee_record.firstname || ' ' || employee_record.lastname,
            'day', EXTRACT(DAY FROM v_current_date),
            'month', EXTRACT(MONTH FROM v_current_date),
            'year', EXTRACT(YEAR FROM v_current_date),
            'date_formatted', v_current_date::text,
            'current_diagram_type', v_existing_diagram_id,
            'current_diagram_name', COALESCE(v_existing_diagram_name, 'Sin nombre'),
            'current_diagram_color', COALESCE(v_existing_diagram_color, '#6b7280'),
            'new_diagram_name', COALESCE(v_new_novelty_name, 'Sin nombre'),
            'new_diagram_color', COALESCE(v_new_novelty_color, '#6b7280'),
            'is_used_in_operations', true,
            'can_update', false,
            'conflict_type', 'IN_USE'
          );
        ELSE
          -- CAN_UPDATE: se puede reemplazar
          v_conflict_record := json_build_object(
            'employee_id', employee_record.id,
            'employee_name', employee_record.firstname || ' ' || employee_record.lastname,
            'day', EXTRACT(DAY FROM v_current_date),
            'month', EXTRACT(MONTH FROM v_current_date),
            'year', EXTRACT(YEAR FROM v_current_date),
            'date_formatted', v_current_date::text,
            'current_diagram_type', v_existing_diagram_id,
            'current_diagram_name', COALESCE(v_existing_diagram_name, 'Sin nombre'),
            'current_diagram_color', COALESCE(v_existing_diagram_color, '#6b7280'),
            'new_diagram_name', COALESCE(v_new_novelty_name, 'Sin nombre'),
            'new_diagram_color', COALESCE(v_new_novelty_color, '#6b7280'),
            'is_used_in_operations', false,
            'can_update', true,
            'conflict_type', 'CAN_UPDATE'
          );
        END IF;
        v_conflicts := array_append(v_conflicts, v_conflict_record);
      END IF;

      v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;

  RETURN json_build_object(
    'conflicts', COALESCE(v_conflicts, '{}'),
    'diagram_type_id', p_diagram_type_id
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- process_massive_novelty_creation
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_massive_novelty_creation(
  p_employee_ids uuid[],
  p_diagram_type_id uuid,
  p_date_from date,
  p_date_to date,
  p_conflict_resolution text
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id uuid;
  v_current_date date;
  v_existing_record RECORD;
  v_result json;
  v_total_employees integer := 0;
  v_processed_employees integer := 0;
  v_total_days integer := 0;
  v_processed_days integer := 0;
  v_created_records integer := 0;
  v_updated_records integer := 0;
  v_skipped_records integer := 0;
  v_errors text[] := ARRAY[]::text[];
  v_start_time timestamp := NOW();
  v_end_time timestamp;
  v_created_data json[] := ARRAY[]::json[];
  v_updated_data json[] := ARRAY[]::json[];
  v_novelty_info RECORD;
  v_employee_name text;
  v_previous_novelty RECORD;
BEGIN
  -- Validaciones
  IF p_date_from IS NULL OR p_date_to IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Las fechas de inicio y fin son requeridas');
  END IF;

  IF p_date_from > p_date_to THEN
    RETURN json_build_object('success', false, 'error', 'La fecha de inicio no puede ser mayor que la fecha de fin');
  END IF;

  IF p_employee_ids IS NULL OR array_length(p_employee_ids, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Debe seleccionar al menos un empleado');
  END IF;

  IF p_diagram_type_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Debe seleccionar una novedad');
  END IF;

  -- Info de la novedad
  SELECT id, name, color INTO v_novelty_info
  FROM diagram_type
  WHERE id = p_diagram_type_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Novedad no encontrada o inactiva');
  END IF;

  v_total_employees := array_length(p_employee_ids, 1);
  v_total_days := (p_date_to - p_date_from + 1);

  -- Procesar por empleado
  FOREACH v_employee_id IN ARRAY p_employee_ids
  LOOP
    BEGIN
      v_processed_employees := v_processed_employees + 1;

      SELECT CONCAT(firstname, ' ', lastname) INTO v_employee_name
      FROM employees
      WHERE id = v_employee_id;

      IF NOT FOUND THEN
        v_errors := array_append(v_errors, 'Empleado con ID ' || v_employee_id || ' no encontrado');
        CONTINUE;
      END IF;

      -- Cada día del rango → siempre la misma novedad
      v_current_date := p_date_from;
      WHILE v_current_date <= p_date_to LOOP
        v_processed_days := v_processed_days + 1;

        SELECT * INTO v_existing_record
        FROM employees_diagram
        WHERE employee_id = v_employee_id
          AND day = EXTRACT(DAY FROM v_current_date)
          AND month = EXTRACT(MONTH FROM v_current_date)
          AND year = EXTRACT(YEAR FROM v_current_date);

        IF FOUND THEN
          SELECT dt.name, dt.color INTO v_previous_novelty
          FROM diagram_type dt
          WHERE dt.id = v_existing_record.diagram_type;

          IF p_conflict_resolution = 'skip' THEN
            v_skipped_records := v_skipped_records + 1;
          ELSIF p_conflict_resolution = 'update' THEN
            UPDATE employees_diagram
            SET diagram_type = p_diagram_type_id,
                created_at = NOW()
            WHERE employee_id = v_employee_id
              AND day = EXTRACT(DAY FROM v_current_date)
              AND month = EXTRACT(MONTH FROM v_current_date)
              AND year = EXTRACT(YEAR FROM v_current_date);

            v_updated_records := v_updated_records + 1;

            v_updated_data := array_append(v_updated_data, json_build_object(
              'employee_id', v_employee_id,
              'employee_name', v_employee_name,
              'date', v_current_date,
              'day', EXTRACT(DAY FROM v_current_date),
              'month', EXTRACT(MONTH FROM v_current_date),
              'year', EXTRACT(YEAR FROM v_current_date),
              'is_active', true,
              'novelty_name', v_novelty_info.name,
              'novelty_color', v_novelty_info.color,
              'previous_novelty_name', v_previous_novelty.name,
              'previous_novelty_color', v_previous_novelty.color
            ));
          END IF;
        ELSE
          INSERT INTO employees_diagram (
            employee_id, diagram_type, day, month, year, created_at
          ) VALUES (
            v_employee_id,
            p_diagram_type_id,
            EXTRACT(DAY FROM v_current_date),
            EXTRACT(MONTH FROM v_current_date),
            EXTRACT(YEAR FROM v_current_date),
            NOW()
          );

          v_created_records := v_created_records + 1;

          v_created_data := array_append(v_created_data, json_build_object(
            'employee_id', v_employee_id,
            'employee_name', v_employee_name,
            'date', v_current_date,
            'day', EXTRACT(DAY FROM v_current_date),
            'month', EXTRACT(MONTH FROM v_current_date),
            'year', EXTRACT(YEAR FROM v_current_date),
            'is_active', true,
            'novelty_name', v_novelty_info.name,
            'novelty_color', v_novelty_info.color
          ));
        END IF;

        v_current_date := v_current_date + 1;
      END LOOP;

    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Error procesando empleado ' || v_employee_id || ': ' || SQLERRM);
    END;
  END LOOP;

  v_end_time := NOW();

  v_result := json_build_object(
    'success', true,
    'summary', json_build_object(
      'total_employees', v_total_employees,
      'processed_employees', v_processed_employees,
      'total_days', v_total_days,
      'processed_days', v_processed_days,
      'created_records', v_created_records,
      'updated_records', v_updated_records,
      'skipped_records', v_skipped_records,
      'errors_count', array_length(v_errors, 1),
      'processing_time_seconds', EXTRACT(EPOCH FROM (v_end_time - v_start_time)),
      'start_time', v_start_time,
      'end_time', v_end_time
    ),
    'data', json_build_object(
      'created', v_created_data,
      'updated', v_updated_data
    ),
    'details', json_build_object(
      'date_range', json_build_object('from', p_date_from, 'to', p_date_to),
      'mode', 'novelty',
      'novelty', json_build_object(
        'id', v_novelty_info.id,
        'name', v_novelty_info.name,
        'color', v_novelty_info.color
      ),
      'conflict_resolution', p_conflict_resolution,
      'employee_ids', p_employee_ids
    ),
    'errors', v_errors
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Error interno del servidor: ' || SQLERRM,
    'details', json_build_object(
      'processed_employees', v_processed_employees,
      'processed_days', v_processed_days,
      'created_records', v_created_records,
      'updated_records', v_updated_records,
      'skipped_records', v_skipped_records
    )
  );
END;
$$;
