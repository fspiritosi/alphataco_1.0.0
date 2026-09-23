-- P5 (jobs y email): `daily_indicators` idempotente + un indicador por empresa.
--
-- Problema verificado contra el compose antes de escribir esto: de las 11 funciones que
-- `run_daily_indicators_for_all_companies()` invocaba, CUATRO insertaban en
-- `daily_indicators` sin `ON CONFLICT`, asi que la segunda corrida del mismo dia chocaba
-- con la unique `daily_indicators_company_id_snapshot_date_source_uidx`. Como el bucle
-- envolvia cada empresa en `EXCEPTION WHEN OTHERS ... RAISE WARNING`, el error se tragaba
-- entero Y abortaba los 10 indicadores que venian despues del que fallo. Reproducido:
--
--   SELECT run_daily_indicators_for_all_companies();   -- ok, 18 filas
--   SELECT run_daily_indicators_for_all_companies();   -- 2 WARNINGs, 0 filas actualizadas
--
-- O sea: la unique impedia duplicar filas, pero no hacia el job idempotente — lo volvia un
-- no-op silencioso que nunca podia completar un reintento.
--
-- Esta migracion:
--   1. Agrega `ON CONFLICT (company_id, snapshot_date, source) DO UPDATE` a las 4 funciones
--      que no lo tenian (las otras 7 ya lo traian).
--   2. Reemplaza `run_daily_indicators_for_all_companies()` por
--      `run_daily_indicators_for_company(uuid)`, sin el `EXCEPTION WHEN OTHERS`: el recorrido
--      de empresas pasa al job `/api/jobs/daily-indicators`, que reclama una fila de
--      `jobs_runs` por empresa y persiste el error en vez de perderlo.

CREATE OR REPLACE FUNCTION public.get_company_counts_indicator(p_company_id uuid DEFAULT NULL::uuid, save_to_table boolean DEFAULT false)
 RETURNS TABLE(employee_count bigint, vehicle_count bigint, total_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_employee_count bigint;
    v_vehicle_count bigint;
    v_total_count bigint;
    v_current_date date;
BEGIN
    -- Obtener la fecha actual en Argentina
    v_current_date := (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
    
    -- Consultar conteo de empleados activos
    SELECT COUNT(*) INTO v_employee_count
    FROM employees 
    WHERE company_id = p_company_id 
    AND is_active = true;
    
    -- Consultar conteo de vehículos activos
    SELECT COUNT(*) INTO v_vehicle_count
    FROM vehicles 
    WHERE company_id = p_company_id 
    AND is_active = true;
    
    -- Calcular total
    v_total_count := v_employee_count + v_vehicle_count;
    
    -- Si save_to_table es true, insertar en daily_indicators
    IF save_to_table THEN
        INSERT INTO public.daily_indicators (
            company_id,
            snapshot_date,
            metrics,
            source
        )
        SELECT
            p_company_id,
            v_current_date,
            jsonb_build_object(
                'employee_count', v_employee_count,
                'vehicle_count', v_vehicle_count,
                'total_count', v_total_count
            ),
            'get_company_counts_indicator'::public.indicator_function
        WHERE save_to_table = true AND p_company_id IS NOT NULL
        -- P5: el job puede correr dos veces el mismo dia (reintento del cron, reinicio del
        -- contenedor, llamada a mano). Sin este ON CONFLICT la unique
        -- (company_id, snapshot_date, source) aborta el bloque entero de la empresa y los
        -- indicadores que venian despues no se recalculan.
        ON CONFLICT (company_id, snapshot_date, source)
        DO UPDATE SET metrics = EXCLUDED.metrics, created_at = NOW();
    END IF;
    
    -- Retornar los resultados
    RETURN QUERY 
    SELECT 
        v_employee_count as employee_count,
        v_vehicle_count as vehicle_count,
        v_total_count as total_count;
END;
$function$;

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_employee_usage_indicator(position_uuids uuid[] DEFAULT NULL::uuid[], save_to_table boolean DEFAULT false, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(employees_operativos integer, employees_used integer, indicator numeric)
 LANGUAGE plpgsql
AS $function$BEGIN 
    RETURN QUERY 
    WITH 
    -- CTE 1: Empleados operativos con diagrama laboral activo para HOY (fecha argentina) 
    employees_with_active_diagram AS ( 
        SELECT DISTINCT ed.employee_id 
        FROM employees_diagram ed 
        INNER JOIN diagram_type dt ON ed.diagram_type = dt.id 
        INNER JOIN employees e ON ed.employee_id = e.id 
        WHERE ed.day = EXTRACT(DAY FROM (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')) 
          AND ed.month = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')) 
          AND ed.year = EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')) 
          AND dt.work_active = true 
          AND dt.is_active = true 
          AND (p_company_id IS NULL OR e.company_id = p_company_id) 
          AND (position_uuids IS NULL OR array_length(position_uuids, 1) IS NULL OR e.company_position = ANY(position_uuids)) 
          AND e.is_active = true 
    ), 
    
    -- CTE 2: Empleados asignados a líneas de dayReportRow para hoy (fecha argentina) 
    employees_in_daily_reports AS ( 
        SELECT DISTINCT drer.employee_id 
        FROM dailyreportemployeerelations drer 
        INNER JOIN dailyreportrows drr ON drer.daily_report_row_id = drr.id 
        INNER JOIN dailyreport dr ON drr.daily_report_id = dr.id 
        INNER JOIN employees e ON drer.employee_id = e.id 
        WHERE dr.date = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date 
          AND (p_company_id IS NULL OR e.company_id = p_company_id) 
          AND (position_uuids IS NULL OR array_length(position_uuids, 1) IS NULL OR e.company_position = ANY(position_uuids)) 
          AND e.is_active = true 
          AND dr.is_active = true 
    ), 
    
    -- CTE 3: Calcular resultados finales 
    count_results AS ( 
        SELECT 
            COALESCE((SELECT COUNT(*) FROM employees_with_active_diagram), 0)::integer as total_operativos, 
            COALESCE((SELECT COUNT(*) FROM employees_in_daily_reports), 0)::integer as total_used 
    ), 
    
    -- CTE 4: Agregar indicador de porcentaje 
    final_calculations AS ( 
        SELECT 
            cr.total_operativos as employees_operativos, 
            cr.total_used as employees_used, 
            CASE 
                WHEN cr.total_operativos > 0 THEN 
                    ROUND((cr.total_used::decimal / cr.total_operativos::decimal) * 100, 2) 
                ELSE 0.00 
            END::NUMERIC(5,2) as indicator 
        FROM count_results cr 
    ),
    
    -- CTE 5: Insertar en daily_indicators si save_to_table es true
    insert_data AS (
        INSERT INTO public.daily_indicators (
            company_id,
            snapshot_date,
            metrics,
            source
        )
        SELECT 
            p_company_id,
            (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
            jsonb_build_object(
                'employees_operativos', fc.employees_operativos,
                'employees_used', fc.employees_used,
                'indicator', fc.indicator
            ),
            'get_employee_usage_indicator'::public.indicator_function
        FROM final_calculations fc
        WHERE save_to_table = true AND p_company_id IS NOT NULL
        -- P5: idempotencia del job diario (ver get_company_counts_indicator).
        ON CONFLICT (company_id, snapshot_date, source)
        DO UPDATE SET metrics = EXCLUDED.metrics, created_at = NOW()
        RETURNING id
    )
    
    SELECT 
        fc.employees_operativos, 
        fc.employees_used, 
        fc.indicator 
    FROM final_calculations fc; 
END;$function$;

-- ---------------------------------------------------------------------------

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
        GROUP BY p_company_id
        -- P5: idempotencia del job diario (ver get_company_counts_indicator).
        ON CONFLICT (company_id, snapshot_date, source)
        DO UPDATE SET metrics = EXCLUDED.metrics, created_at = NOW();
    END IF;

    -- 🔚 Limpiar temporales
    DROP TABLE IF EXISTS vehicle_types_subtypes_to_process;
    DROP TABLE IF EXISTS available_counts;
    DROP TABLE IF EXISTS not_available_counts;
    DROP TABLE IF EXISTS used_counts;
END;
$function$;

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_employee_diagram_count_by_day(p_day integer, p_month integer, p_year integer, p_company_position_ids uuid[] DEFAULT NULL::uuid[], save_to_table boolean DEFAULT false, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE 
  total_active_employees INTEGER; 
  employees_with_diagram INTEGER; 
  employees_without_diagram INTEGER; 
  result_array JSON; 
BEGIN 
  -- Contar empleados activos (con filtro opcional por company_position) 
  SELECT COUNT(*) 
  INTO total_active_employees 
  FROM employees e 
  WHERE e.is_active = true 
    AND ( 
      p_company_position_ids IS NULL 
      OR array_length(p_company_position_ids, 1) = 0 
      OR e.company_position = ANY(p_company_position_ids) 
    )
    AND (p_company_id IS NULL OR e.company_id = p_company_id); 

  -- Contar empleados que tienen diagrama para el día especificado 
  SELECT COUNT(DISTINCT e.id) 
  INTO employees_with_diagram 
  FROM employees e 
  JOIN employees_diagram ed ON e.id = ed.employee_id 
  WHERE e.is_active = true 
    AND ed.day = p_day 
    AND ed.month = p_month 
    AND ed.year = p_year 
    AND ( 
      p_company_position_ids IS NULL 
      OR array_length(p_company_position_ids, 1) = 0 
      OR e.company_position = ANY(p_company_position_ids) 
    )
    AND (p_company_id IS NULL OR e.company_id = p_company_id); 
  
  -- Calcular empleados sin diagrama de forma más directa 
  employees_without_diagram := total_active_employees - employees_with_diagram; 
  
  -- Construir el array de resultados 
  WITH diagram_counts AS ( 
    SELECT 
      dt.id as diagram_type_id, 
      dt.name as diagram_type_name, 
      dt.color as diagram_type_color, 
      COUNT(DISTINCT ed.employee_id) as cantidad_empleados 
    FROM diagram_type dt 
    JOIN employees_diagram ed ON dt.id = ed.diagram_type 
    JOIN employees e ON ed.employee_id = e.id 
    WHERE ed.day = p_day 
      AND ed.month = p_month 
      AND ed.year = p_year 
      AND e.is_active = true 
      AND ( 
        p_company_position_ids IS NULL 
        OR array_length(p_company_position_ids, 1) = 0 
        OR e.company_position = ANY(p_company_position_ids) 
      )
      AND (p_company_id IS NULL OR e.company_id = p_company_id) 
    GROUP BY dt.id, dt.name, dt.color 
  ), 
  diagram_results AS ( 
    SELECT 
      diagram_type_id::TEXT as diagram_type_id_text, 
      diagram_type_name, 
      diagram_type_color, 
      cantidad_empleados 
    FROM diagram_counts 
  ), 
  combined_results AS ( 
    -- Resultados de diagram_types con empleados 
    SELECT * FROM diagram_results 
    
    UNION ALL 
    
    -- Agregar el objeto "Sin diagrama" de forma explícita 
    SELECT 
      '0' as diagram_type_id_text, 
      'Sin diagrama' as diagram_type_name, 
      '#CCCCCC' as diagram_type_color, 
      employees_without_diagram as cantidad_empleados 
    WHERE employees_without_diagram > 0 
  ),
  
  -- Insertar en daily_indicators si save_to_table es true
  insert_data AS (
    INSERT INTO public.daily_indicators (
      company_id,
      snapshot_date,
      metrics,
      source
    )
    SELECT 
      p_company_id,
      make_date(p_year, p_month, p_day),
      json_agg(
        json_build_object(
          'diagram_type_id', diagram_type_id_text,
          'diagram_type_name', diagram_type_name,
          'diagram_type_color', diagram_type_color,
          'cantidad_empleados', cantidad_empleados
        )
      ),
      'get_employee_diagram_count_by_day'::public.indicator_function
    FROM combined_results
    WHERE save_to_table = true AND p_company_id IS NOT NULL
    GROUP BY p_company_id
    -- P5: idempotencia del job diario (ver get_company_counts_indicator en kpis.sql).
    ON CONFLICT (company_id, snapshot_date, source)
    DO UPDATE SET metrics = EXCLUDED.metrics, created_at = NOW()
    RETURNING id
  )
  
  SELECT json_agg( 
    json_build_object( 
      'diagram_type_id', diagram_type_id_text, 
      'diagram_type_name', diagram_type_name, 
      'diagram_type_color', diagram_type_color, 
      'cantidad_empleados', cantidad_empleados 
    ) 
  ) 
  INTO result_array 
  FROM combined_results; 

  -- Si no hay resultados, devolver un array vacío 
  RETURN COALESCE(result_array, '[]'::json); 
END; 
$function$;

-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.run_daily_indicators_for_company(p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_today date := (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'run_daily_indicators_for_company requiere p_company_id';
  END IF;

  PERFORM public.get_employee_usage_indicator(
    position_uuids => NULL::uuid[],
    save_to_table => true,
    p_company_id => p_company_id
  );

  PERFORM public.get_employee_diagram_count_by_day(
    p_day => EXTRACT(DAY FROM v_today)::integer,
    p_month => EXTRACT(MONTH FROM v_today)::integer,
    p_year => EXTRACT(YEAR FROM v_today)::integer,
    p_company_position_ids => NULL,
    save_to_table => true,
    p_company_id => p_company_id
  );

  PERFORM public.get_vehicle_usage_indicator(
    p_vehicle_type_ids => ARRAY[]::uuid[],
    p_company_id => p_company_id,
    save_to_table => true
  );

  PERFORM public.get_company_counts_indicator(
    p_company_id => p_company_id,
    save_to_table => true
  );

  PERFORM public.hr_get_absenteeism_summary(
    p_company_id => p_company_id,
    p_from => v_today,
    p_to => v_today,
    save_to_table => true
  );

  PERFORM public.hr_get_absenteeism_trend(
    p_company_id => p_company_id,
    p_from => v_today,
    p_to => v_today,
    save_to_table => true
  );

  PERFORM public.hr_get_current_absent_employees(
    p_company_id => p_company_id,
    p_date => v_today,
    save_to_table => true
  );

  PERFORM public.hr_get_daily_absence_timeseries(
    p_company_id => p_company_id,
    p_from => v_today,
    p_to => v_today,
    save_to_table => true
  );

  PERFORM public.hr_get_department_absence_reasons(
    p_company_id => p_company_id,
    p_date => v_today,
    save_to_table => true
  );

  PERFORM public.hr_get_department_absence_summary(
    p_company_id => p_company_id,
    p_date => v_today,
    save_to_table => true
  );

  PERFORM public.get_daily_report_deviations_indicator(
    p_company_id => p_company_id,
    p_date => v_today,
    save_to_table => true
  );
END;
$function$;

-- El bucle de empresas ahora lo hace el job. La funcion vieja no tiene ningun otro llamador:
-- la porto la Task 4 de P1 desde el cron de Supabase y quedo esperando a P5.
DROP FUNCTION IF EXISTS public.run_daily_indicators_for_all_companies();
