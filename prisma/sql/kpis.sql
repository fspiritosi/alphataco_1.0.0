-- Generado por scripts/sql/extract-sql-objects.ts — editar a mano SOLO en la revisión de Task 4
-- Dominio: kpis — 7 objeto(s)
-- Revisado a mano en la Task 4 (P1): + run_daily_indicators_for_all_companies (job P5).
-- P5: esa funcion se reemplazo por run_daily_indicators_for_company(uuid) — el bucle de
-- empresas lo hace el job, que registra una corrida por empresa en `jobs_runs`.

-- ============================================================================
-- FUNCTIONS (7)
-- ============================================================================

-- function generate_kpi_code (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.generate_kpi_code(company_uuid uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  max_number INTEGER;
  new_code TEXT;
BEGIN
  -- Obtener el número más grande de los códigos existentes para esta empresa
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM '^KPI-(\d+)$') AS INTEGER)), 0)
  INTO max_number
  FROM kpis
  WHERE company_id = company_uuid
    AND code ~ '^KPI-\d+$';
  
  -- Generar el nuevo código
  new_code := 'KPI-' || LPAD((max_number + 1)::TEXT, 4, '0');
  
  RETURN new_code;
END;
$function$;

-- function get_company_counts_indicator (origen: supabase/migrations/20251103211302_initial_structure.sql)
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

-- function get_employee_usage_indicator (origen: supabase/migrations/20251103211302_initial_structure.sql)
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

-- function get_kpi_range (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
CREATE OR REPLACE FUNCTION public.get_kpi_range(p_kpi_code text, p_company_id uuid, p_from_date date, p_to_date date)
 RETURNS TABLE(snapshot_date date, indicator numeric, raw_data jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
  -- IDs de tipos Tractor y Chasis
  v_tipo_tractor_id uuid := 'ea07ff34-13fb-4483-b5bc-8389e41c7d89';
  v_tipo_chasis_id uuid := '5dc2bc44-de86-4e1d-ae0c-87eafd60dccf';
  -- ID del cliente GH - Movimientos Internos
  v_gh_mi_id uuid := 'fecde2b8-f310-495d-9d70-847c9ebfa890';
BEGIN
  
  -- =====================================================
  -- KPI-0001: Ausentismo Diario (AD)
  -- =====================================================
  IF p_kpi_code = 'KPI-0001' THEN
    RETURN QUERY
    WITH 
    -- Total empleados activos (constante para todo el rango)
    te_base AS (
      SELECT COUNT(*)::integer as te
      FROM employees e
      WHERE e.company_id = p_company_id AND e.is_active = true
    ),
    -- Total ausentes por fecha
    ta_by_date AS (
      SELECT 
        make_date(ed.year::int, ed.month::int, ed.day::int) as fecha,
        COUNT(DISTINCT ed.employee_id)::integer as ta
      FROM employees_diagram ed
      JOIN employees e ON e.id = ed.employee_id
      JOIN diagram_type dt ON dt.id = ed.diagram_type
      WHERE e.company_id = p_company_id
        AND e.is_active = true
        AND dt.computes_absenteeism = true
        AND make_date(ed.year::int, ed.month::int, ed.day::int) BETWEEN p_from_date AND p_to_date
      GROUP BY make_date(ed.year::int, ed.month::int, ed.day::int)
    ),
    -- Generar todas las fechas del rango
    dates AS (
      SELECT d::date as fecha
      FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d
    )
    SELECT 
      d.fecha,
      CASE WHEN tb.te = 0 THEN 0 ELSE ROUND((COALESCE(ta.ta, 0)::numeric / tb.te::numeric) * 100, 2) END,
      jsonb_build_object('date', d.fecha, 'TE', tb.te, 'TA', COALESCE(ta.ta, 0), 'AD', 
        CASE WHEN tb.te = 0 THEN 0 ELSE ROUND((COALESCE(ta.ta, 0)::numeric / tb.te::numeric) * 100, 2) END)
    FROM dates d
    CROSS JOIN te_base tb
    LEFT JOIN ta_by_date ta ON ta.fecha = d.fecha
    ORDER BY d.fecha;
    
    RETURN;
  END IF;

  -- =====================================================
  -- KPI-0002: Personal en Movimientos Internos (PMI)
  -- =====================================================
  IF p_kpi_code = 'KPI-0002' THEN
    RETURN QUERY
    WITH 
    -- TPA: Personal apto por fecha (choferes con work_active en diagrama)
    tpa_by_date AS (
      SELECT 
        make_date(ed.year::int, ed.month::int, ed.day::int) as fecha,
        COUNT(DISTINCT ed.employee_id)::integer as tpa
      FROM employees_diagram ed
      JOIN diagram_type dt ON ed.diagram_type = dt.id
      JOIN employees e ON ed.employee_id = e.id
      JOIN category cat ON cat.id = e.category_id
      WHERE e.company_id = p_company_id
        AND e.is_active = true
        AND dt.work_active = true
        AND dt.is_active = true
        AND cat.is_active = true
        AND (cat.name IN ('Chofer de 1°', 'Chofer de 3°')
             OR cat.name ILIKE '%chofer%1°%' OR cat.name ILIKE '%chofer%3°%'
             OR cat.name ILIKE '%conductor%1°%' OR cat.name ILIKE '%conductor%3°%')
        AND make_date(ed.year::int, ed.month::int, ed.day::int) BETWEEN p_from_date AND p_to_date
      GROUP BY make_date(ed.year::int, ed.month::int, ed.day::int)
    ),
    -- TMI: Personal en Movimientos Internos por fecha
    tmi_by_date AS (
      SELECT 
        dr.date as fecha,
        COUNT(DISTINCT drer.employee_id)::integer as tmi
      FROM dailyreportemployeerelations drer
      JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
      JOIN dailyreport dr ON drw.daily_report_id = dr.id
      JOIN employees e ON e.id = drer.employee_id
      JOIN category cat ON cat.id = e.category_id
      WHERE e.company_id = p_company_id
        AND e.is_active = true
        AND cat.is_active = true
        AND (cat.name IN ('Chofer de 1°', 'Chofer de 3°')
             OR cat.name ILIKE '%chofer%1°%' OR cat.name ILIKE '%chofer%3°%'
             OR cat.name ILIKE '%conductor%1°%' OR cat.name ILIKE '%conductor%3°%')
        AND dr.is_active = true
        AND drw.customer_id = v_gh_mi_id
        AND dr.date BETWEEN p_from_date AND p_to_date
      GROUP BY dr.date
    ),
    dates AS (
      SELECT d::date as fecha FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d
    )
    SELECT 
      d.fecha,
      CASE WHEN COALESCE(tpa.tpa, 0) = 0 THEN 0 
           ELSE ROUND((COALESCE(tmi.tmi, 0)::numeric / tpa.tpa::numeric) * 100, 2) END,
      jsonb_build_object('date', d.fecha, 'TPA', COALESCE(tpa.tpa, 0), 'TMI', COALESCE(tmi.tmi, 0), 'PMI',
        CASE WHEN COALESCE(tpa.tpa, 0) = 0 THEN 0 
             ELSE ROUND((COALESCE(tmi.tmi, 0)::numeric / tpa.tpa::numeric) * 100, 2) END)
    FROM dates d
    LEFT JOIN tpa_by_date tpa ON tpa.fecha = d.fecha
    LEFT JOIN tmi_by_date tmi ON tmi.fecha = d.fecha
    ORDER BY d.fecha;
    
    RETURN;
  END IF;

  -- =====================================================
  -- KPI-0003: Productividad Personal (PP)
  -- =====================================================
  IF p_kpi_code = 'KPI-0003' THEN
    RETURN QUERY
    WITH 
    -- TPA: Personal apto por fecha
    tpa_by_date AS (
      SELECT 
        make_date(ed.year::int, ed.month::int, ed.day::int) as fecha,
        COUNT(DISTINCT ed.employee_id)::integer as tpa
      FROM employees_diagram ed
      JOIN diagram_type dt ON ed.diagram_type = dt.id
      JOIN employees e ON ed.employee_id = e.id
      JOIN category cat ON cat.id = e.category_id
      WHERE e.company_id = p_company_id
        AND e.is_active = true
        AND dt.work_active = true
        AND dt.is_active = true
        AND cat.is_active = true
        AND (cat.name IN ('Chofer de 1°', 'Chofer de 3°')
             OR cat.name ILIKE '%chofer%1°%' OR cat.name ILIKE '%chofer%3°%'
             OR cat.name ILIKE '%conductor%1°%' OR cat.name ILIKE '%conductor%3°%')
        AND make_date(ed.year::int, ed.month::int, ed.day::int) BETWEEN p_from_date AND p_to_date
      GROUP BY make_date(ed.year::int, ed.month::int, ed.day::int)
    ),
    -- TMI y TPC en una sola consulta
    personal_by_date AS (
      SELECT 
        dr.date as fecha,
        COUNT(DISTINCT CASE WHEN drw.customer_id = v_gh_mi_id THEN drer.employee_id END)::integer as tmi,
        COUNT(DISTINCT CASE WHEN drw.customer_id IS NOT NULL AND drw.customer_id <> v_gh_mi_id THEN drer.employee_id END)::integer as tpc
      FROM dailyreportemployeerelations drer
      JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
      JOIN dailyreport dr ON drw.daily_report_id = dr.id
      JOIN employees e ON e.id = drer.employee_id
      JOIN category cat ON cat.id = e.category_id
      WHERE e.company_id = p_company_id
        AND e.is_active = true
        AND cat.is_active = true
        AND (cat.name IN ('Chofer de 1°', 'Chofer de 3°')
             OR cat.name ILIKE '%chofer%1°%' OR cat.name ILIKE '%chofer%3°%'
             OR cat.name ILIKE '%conductor%1°%' OR cat.name ILIKE '%conductor%3°%')
        AND dr.is_active = true
        AND dr.date BETWEEN p_from_date AND p_to_date
      GROUP BY dr.date
    ),
    dates AS (
      SELECT d::date as fecha FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d
    )
    SELECT 
      d.fecha,
      CASE WHEN GREATEST(COALESCE(tpa.tpa, 0) - COALESCE(p.tmi, 0), 0) = 0 THEN 0
           ELSE ROUND((COALESCE(p.tpc, 0)::numeric / GREATEST(COALESCE(tpa.tpa, 0) - COALESCE(p.tmi, 0), 1)::numeric) * 100, 2) END,
      jsonb_build_object('date', d.fecha, 'TPA', COALESCE(tpa.tpa, 0), 'TMI', COALESCE(p.tmi, 0), 'TPC', COALESCE(p.tpc, 0), 'PP',
        CASE WHEN GREATEST(COALESCE(tpa.tpa, 0) - COALESCE(p.tmi, 0), 0) = 0 THEN 0
             ELSE ROUND((COALESCE(p.tpc, 0)::numeric / GREATEST(COALESCE(tpa.tpa, 0) - COALESCE(p.tmi, 0), 1)::numeric) * 100, 2) END)
    FROM dates d
    LEFT JOIN tpa_by_date tpa ON tpa.fecha = d.fecha
    LEFT JOIN personal_by_date p ON p.fecha = d.fecha
    ORDER BY d.fecha;
    
    RETURN;
  END IF;

  -- =====================================================
  -- KPI-0004: Disponibilidad Operacional Mantenimiento (EDO)
  -- =====================================================
  IF p_kpi_code = 'KPI-0004' THEN
    RETURN QUERY
    WITH 
    -- EA y ENO son constantes (estado actual de vehículos)
    equipos_base AS (
      SELECT 
        COUNT(*) FILTER (WHERE v.condition <> 'en preparacion')::integer as ea,
        COUNT(*) FILTER (WHERE v.condition = 'no operativo')::integer as eno
      FROM vehicles v
      WHERE v.company_id = p_company_id
        AND v.is_active = true
        AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
    ),
    dates AS (
      SELECT d::date as fecha FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d
    )
    SELECT 
      d.fecha,
      CASE WHEN eb.ea = 0 THEN 0 ELSE ROUND((eb.eno::numeric / eb.ea::numeric) * 100, 2) END,
      jsonb_build_object('date', d.fecha, 'EA', eb.ea, 'ENO', eb.eno, 'EDO',
        CASE WHEN eb.ea = 0 THEN 0 ELSE ROUND((eb.eno::numeric / eb.ea::numeric) * 100, 2) END)
    FROM dates d
    CROSS JOIN equipos_base eb
    ORDER BY d.fecha;
    
    RETURN;
  END IF;

  -- =====================================================
  -- KPI-0005: Equipos en Movimientos Internos (EMI)
  -- =====================================================
  IF p_kpi_code = 'KPI-0005' THEN
    RETURN QUERY
    WITH 
    -- EOA: Equipos operativos (constante)
    eoa_base AS (
      SELECT COUNT(*)::integer as eoa
      FROM vehicles v
      WHERE v.company_id = p_company_id
        AND v.is_active = true
        AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
        AND v.condition NOT IN ('en preparacion', 'no operativo')
    ),
    -- EAMI por fecha
    eami_by_date AS (
      SELECT 
        dr.date as fecha,
        COUNT(DISTINCT drer.equipment_id)::integer as eami
      FROM dailyreportequipmentrelations drer
      JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
      JOIN dailyreport dr ON drw.daily_report_id = dr.id
      JOIN vehicles v ON v.id = drer.equipment_id
      WHERE v.company_id = p_company_id
        AND v.is_active = true
        AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
        AND v.condition NOT IN ('en preparacion', 'no operativo')
        AND dr.is_active = true
        AND drw.customer_id = v_gh_mi_id
        AND dr.date BETWEEN p_from_date AND p_to_date
      GROUP BY dr.date
    ),
    dates AS (
      SELECT d::date as fecha FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d
    )
    SELECT 
      d.fecha,
      CASE WHEN eb.eoa = 0 THEN 0 ELSE ROUND((COALESCE(eami.eami, 0)::numeric / eb.eoa::numeric) * 100, 2) END,
      jsonb_build_object('date', d.fecha, 'EOA', eb.eoa, 'EAMI', COALESCE(eami.eami, 0), 'EMI',
        CASE WHEN eb.eoa = 0 THEN 0 ELSE ROUND((COALESCE(eami.eami, 0)::numeric / eb.eoa::numeric) * 100, 2) END)
    FROM dates d
    CROSS JOIN eoa_base eb
    LEFT JOIN eami_by_date eami ON eami.fecha = d.fecha
    ORDER BY d.fecha;
    
    RETURN;
  END IF;

  -- =====================================================
  -- KPI-0006: Equipos Operativos en Cliente (EOC)
  -- =====================================================
  IF p_kpi_code = 'KPI-0006' THEN
    RETURN QUERY
    WITH 
    -- EOA: Equipos operativos (constante)
    eoa_base AS (
      SELECT COUNT(*)::integer as eoa
      FROM vehicles v
      WHERE v.company_id = p_company_id
        AND v.is_active = true
        AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
        AND v.condition NOT IN ('en preparacion', 'no operativo')
    ),
    -- EAMI y TEOC en una sola consulta
    equipos_by_date AS (
      SELECT 
        dr.date as fecha,
        COUNT(DISTINCT CASE WHEN drw.customer_id = v_gh_mi_id THEN drer.equipment_id END)::integer as eami,
        COUNT(DISTINCT CASE WHEN drw.customer_id IS NOT NULL AND drw.customer_id <> v_gh_mi_id THEN drer.equipment_id END)::integer as teoc
      FROM dailyreportequipmentrelations drer
      JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
      JOIN dailyreport dr ON drw.daily_report_id = dr.id
      JOIN vehicles v ON v.id = drer.equipment_id
      WHERE v.company_id = p_company_id
        AND v.is_active = true
        AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
        AND v.condition NOT IN ('en preparacion', 'no operativo')
        AND dr.is_active = true
        AND dr.date BETWEEN p_from_date AND p_to_date
      GROUP BY dr.date
    ),
    dates AS (
      SELECT d::date as fecha FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d
    )
    SELECT 
      d.fecha,
      CASE WHEN GREATEST(eb.eoa - COALESCE(eq.eami, 0), 0) = 0 THEN 0
           ELSE ROUND((COALESCE(eq.teoc, 0)::numeric / GREATEST(eb.eoa - COALESCE(eq.eami, 0), 1)::numeric) * 100, 2) END,
      jsonb_build_object('date', d.fecha, 'EOA', eb.eoa, 'EAMI', COALESCE(eq.eami, 0), 
        'TEOA', GREATEST(eb.eoa - COALESCE(eq.eami, 0), 0), 'TEOC', COALESCE(eq.teoc, 0), 'EOC',
        CASE WHEN GREATEST(eb.eoa - COALESCE(eq.eami, 0), 0) = 0 THEN 0
             ELSE ROUND((COALESCE(eq.teoc, 0)::numeric / GREATEST(eb.eoa - COALESCE(eq.eami, 0), 1)::numeric) * 100, 2) END)
    FROM dates d
    CROSS JOIN eoa_base eb
    LEFT JOIN equipos_by_date eq ON eq.fecha = d.fecha
    ORDER BY d.fecha;
    
    RETURN;
  END IF;

  -- KPI no reconocido - retornar vacío
  RETURN;
END;
$function$;

-- function get_services_summary_by_type (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
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
END;$function$;

-- function get_vehicle_usage_indicator (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
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

-- function run_daily_indicators_for_company (origen: prisma/migrations/20260923180000_daily_indicators_idempotent/migration.sql)
-- P5: reemplaza a `run_daily_indicators_for_all_companies()`, que la Task 4 de P1 porto desde
-- el cron de Supabase y que nunca llego a tener llamador. El recorrido de empresas se mudo al
-- job `/api/jobs/daily-indicators`, que reclama una fila de `jobs_runs` POR EMPRESA: asi el
-- fallo de una empresa queda registrado, es reintentable y no arrastra a las demas.
--
-- Y aca NO va `EXCEPTION WHEN OTHERS`, que es lo que tenia la version anterior: convertia
-- cualquier error en un `RAISE WARNING` que nadie veia (el endpoint habria devuelto 200 y el
-- `curl -fsS` del cron lo habria dado por bueno) y ademas abortaba los indicadores que venian
-- despues del que fallo. El error sube al job, que lo persiste y devuelve 500.
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
