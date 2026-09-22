set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.assign_owner_role_on_company_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_owner_role_id BIGINT;
  v_user_id UUID;
BEGIN
  -- Verificar que la empresa tiene un owner_id
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.owner_id;

  -- Obtener el ID del rol OWNER
  SELECT id INTO v_owner_role_id
  FROM roles
  WHERE slug = 'owner'
  LIMIT 1;

  -- Si no existe el rol OWNER, no hacer nada (evitar errores)
  IF v_owner_role_id IS NULL THEN
    RAISE WARNING 'Rol OWNER no encontrado. No se asignará rol automáticamente.';
    RETURN NEW;
  END IF;

  -- Asignar el rol OWNER al usuario si no lo tiene ya
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_user_id, v_owner_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- Asegurar que el usuario tenga acceso a la empresa en share_company_users
  -- (solo si no existe ya)
  IF NOT EXISTS (
    SELECT 1 
    FROM share_company_users 
    WHERE company_id = NEW.id AND profile_id = v_user_id
  ) THEN
    INSERT INTO share_company_users (company_id, profile_id)
    VALUES (NEW.id, v_user_id);
  END IF;

  RETURN NEW;
END;
$function$
;

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
$function$
;


