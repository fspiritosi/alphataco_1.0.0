-- Ticket 543: el comentario de la novedad debe figurar en los reportes de ausentismo.
--
-- Las dos funciones que arman el detalle de ausencias construian el JSON con
-- 'observaciones', '' (literal vacio), asi que la columna "Observaciones" del Excel
-- "Detalle de Ausencias por Empleado" (ausencias-empleados.xlsx) y la del detalle por
-- sector salian siempre vacias, aunque employees_diagram.comments ya tenga el dato.
--
-- Se propaga el comentario de la novedad del dia consultado (el CTE today_type ya elige
-- una unica novedad por empleado para target_date). Las filas de altas y bajas siguen sin
-- observaciones: no provienen de una novedad de diagrama.
--
-- Cambio acotado a estas dos funciones. No modifica estructura.

CREATE OR REPLACE FUNCTION public.hr_get_current_absent_employees(p_company_id uuid, p_date date DEFAULT NULL::date, save_to_table boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  tz text := 'America/Argentina/Buenos_Aires';
  target_date date := COALESCE(p_date, (now() at time zone tz)::date);
  ausentes jsonb;
  altas_info jsonb;
  bajas_info jsonb;
  result jsonb;
BEGIN
  ausentes := (
    WITH base AS (
      SELECT
        e.id AS employee_id,
        e.file AS legajo,
        trim(e.lastname || ' ' || e.firstname) AS nombre,
        cp.name AS company_position,
        h.name AS hierarchical_position
      FROM public.employees e
      LEFT JOIN public.company_positions cp ON cp.id = e.company_position
      LEFT JOIN public.hierarchy h ON h.id = e.hierarchical_position
      WHERE e.company_id = p_company_id
      AND e.date_of_admission <= target_date
      AND (e.termination_date IS NULL OR e.termination_date >= target_date) -- incluir baja en el mismo día
    ),
    today_type AS (
      SELECT DISTINCT ON (ed.employee_id)
        ed.employee_id,
        dt.id AS dt_id,
        dt.name AS turno,
        ed.comments AS comentario
      FROM public.employees_diagram ed
      JOIN public.diagram_type dt ON dt.id = ed.diagram_type
      WHERE make_date(ed.year::int, ed.month::int, ed.day::int) = target_date
      AND dt.work_active = false
      AND NOT (
        lower(dt.name) LIKE 'franco%' OR dt.short_description IN ('F','FN')
        OR lower(dt.name) LIKE 'ausencia dia de vacaciones%'
      )
      ORDER BY ed.employee_id, dt.id
    ),
    period AS (
      SELECT
        b.employee_id,
        b.legajo,
        b.nombre,
        coalesce(b.company_position,'') AS tarea,
        coalesce(b.hierarchical_position,'') AS linea,
        t.turno,
        ''::text AS motivo,
        t.comentario,
        COALESCE(
          (
            SELECT (max(make_date(ed2.year::int, ed2.month::int, ed2.day::int)) + INTERVAL '1 day')::date
            FROM public.employees_diagram ed2
            JOIN public.diagram_type dt2 ON dt2.id = ed2.diagram_type
            WHERE ed2.employee_id = b.employee_id
            AND make_date(ed2.year::int, ed2.month::int, ed2.day::int) < target_date
            AND dt2.id <> t.dt_id
          ),
          (
            SELECT min(make_date(ed3.year::int, ed3.month::int, ed3.day::int))::date
            FROM public.employees_diagram ed3
            WHERE ed3.employee_id = b.employee_id
            AND ed3.diagram_type = t.dt_id
            AND make_date(ed3.year::int, ed3.month::int, ed3.day::int) <= target_date
          ),
          target_date
        ) AS desde,
        COALESCE(
          (
            SELECT (min(make_date(ed4.year::int, ed4.month::int, ed4.day::int)) - INTERVAL '1 day')::date
            FROM public.employees_diagram ed4
            JOIN public.diagram_type dt4 ON dt4.id = ed4.diagram_type
            WHERE ed4.employee_id = b.employee_id
            AND make_date(ed4.year::int, ed4.month::int, ed4.day::int) > target_date
            AND dt4.id <> t.dt_id
          ),
          target_date
        ) AS hasta
      FROM base b
      JOIN today_type t ON t.employee_id = b.employee_id
    )
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', p.employee_id,
          'legajo', p.legajo,
          'nombre', p.nombre,
          'tarea', p.tarea,
          'linea', p.linea,
          'turno', p.turno,
          'motivo', '',
          'desde', to_char(p.desde, 'DD/MM/YYYY'),
          'hasta', to_char(p.hasta, 'DD/MM/YYYY'),
          'diasCaidos', GREATEST(1, (p.hasta - p.desde + 1))::int,
          'observaciones', COALESCE(p.comentario, '')
        )
        ORDER BY p.nombre
      ),
      '[]'::jsonb
    )
    FROM period p
  );

  -- Detalle de ALTAS del día (date_of_admission = target_date)
  altas_info := (
    WITH base AS (
      SELECT
        e.id,
        e.file AS legajo,
        trim(e.lastname || ' ' || e.firstname) AS nombre,
        cp.name AS company_position,
        h.name AS hierarchical_position
      FROM public.employees e
      LEFT JOIN public.company_positions cp ON cp.id = e.company_position
      LEFT JOIN public.hierarchy h ON h.id = e.hierarchical_position
      WHERE e.company_id = p_company_id
      AND e.date_of_admission = target_date
    ),
    turno_today AS (
      SELECT DISTINCT ON (ed.employee_id)
        ed.employee_id,
        dt.name AS turno
      FROM public.employees_diagram ed
      JOIN public.diagram_type dt ON dt.id = ed.diagram_type
      WHERE make_date(ed.year::int, ed.month::int, ed.day::int) = target_date
      ORDER BY ed.employee_id, dt.id
    )
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'legajo', b.legajo,
          'nombre', b.nombre,
          'tarea', coalesce(b.company_position,''),
          'linea', coalesce(b.hierarchical_position,''),
          'turno', coalesce(t.turno,''),
          'motivo', 'Alta',
          'desde', to_char(target_date, 'DD/MM/YYYY'),
          'hasta', to_char(target_date, 'DD/MM/YYYY'),
          'diasCaidos', 0,
          'observaciones', ''
        )
        ORDER BY b.nombre
      ),
      '[]'::jsonb
    )
    FROM base b
    LEFT JOIN turno_today t ON t.employee_id = b.id
  );

  -- Detalle de BAJAS del día (termination_date = target_date)
  bajas_info := (
    WITH base AS (
      SELECT
        e.id,
        e.file AS legajo,
        trim(e.lastname || ' ' || e.firstname) AS nombre,
        cp.name AS company_position,
        h.name AS hierarchical_position,
        (e.reason_for_termination)::text AS motivo
      FROM public.employees e
      LEFT JOIN public.company_positions cp ON cp.id = e.company_position
      LEFT JOIN public.hierarchy h ON h.id = e.hierarchical_position
      WHERE e.company_id = p_company_id
      AND e.termination_date = target_date
    )
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'legajo', b.legajo,
          'nombre', b.nombre,
          'tarea', coalesce(b.company_position,''),
          'linea', coalesce(b.hierarchical_position,''),
          'turno', '',
          'motivo', coalesce(b.motivo,'Baja'),
          'desde', to_char(target_date, 'DD/MM/YYYY'),
          'hasta', to_char(target_date, 'DD/MM/YYYY'),
          'diasCaidos', 0,
          'observaciones', ''
        )
        ORDER BY b.nombre
      ),
      '[]'::jsonb
    )
    FROM base b
  );

  -- Construir el resultado final con el nuevo formato
  result := jsonb_build_object(
    'data', ausentes,
    'detalles', jsonb_build_object(
      'ausentes_info', ausentes,
      'bajas_info', bajas_info,
      'altas_info', altas_info
    )
  );

  IF save_to_table AND p_company_id IS NOT NULL THEN
    INSERT INTO public.daily_indicators (id, company_id, snapshot_date, metrics, source, created_at)
    VALUES (gen_random_uuid(), p_company_id, target_date, result, 'hr_get_current_absent_employees', now())
    ON CONFLICT (company_id, snapshot_date, source)
    DO UPDATE SET metrics = EXCLUDED.metrics, created_at = now();
  END IF;

  RETURN result;
END
$function$;

CREATE OR REPLACE FUNCTION public.hr_get_department_absence_summary(p_company_id uuid, p_date date DEFAULT NULL::date, save_to_table boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  tz text := 'America/Argentina/Buenos_Aires';
  target_date date := COALESCE(p_date, (now() at time zone tz)::date);
  result jsonb;
BEGIN
  result := (
    WITH base AS (
      SELECT
        e.id AS employee_id,
        COALESCE(cc.name, 'SIN SECTOR') AS sector,
        e.file AS legajo,
        trim(e.lastname || ' ' || e.firstname) AS nombre,
        cp.name AS company_position,
        h.name AS hierarchical_position
      FROM public.employees e
      LEFT JOIN public.cost_center cc ON cc.id = e.cost_center_id
      LEFT JOIN public.company_positions cp ON cp.id = e.company_position
      LEFT JOIN public.hierarchy h ON h.id = e.hierarchical_position
      WHERE e.company_id = p_company_id
      AND e.date_of_admission <= target_date
      AND (e.termination_date IS NULL OR e.termination_date > target_date)
    ),
    today_type AS (
      SELECT DISTINCT ON (ed.employee_id)
        ed.employee_id,
        dt.id AS dt_id,
        dt.name AS turno,
        ed.comments AS comentario
      FROM public.employees_diagram ed
      JOIN public.diagram_type dt ON dt.id = ed.diagram_type
      WHERE make_date(ed.year::int, ed.month::int, ed.day::int) = target_date
      AND dt.work_active = false
      AND NOT (
        lower(dt.name) LIKE 'franco%' OR dt.short_description IN ('F','FN')
        OR lower(dt.name) LIKE 'ausencia dia de vacaciones%'
      )
      ORDER BY ed.employee_id, dt.id
    ),
    period AS (
      SELECT
        b.sector,
        b.employee_id,
        b.legajo,
        b.nombre,
        coalesce(b.company_position,'') AS tarea,
        coalesce(b.hierarchical_position,'') AS linea,
        t.turno,
        ''::text AS motivo,
        t.comentario,
        COALESCE(
          (
            SELECT (max(make_date(ed2.year::int, ed2.month::int, ed2.day::int)) + INTERVAL '1 day')::date
            FROM public.employees_diagram ed2
            JOIN public.diagram_type dt2 ON dt2.id = ed2.diagram_type
            WHERE ed2.employee_id = b.employee_id
            AND make_date(ed2.year::int, ed2.month::int, ed2.day::int) < target_date
            AND dt2.id <> t.dt_id
          ),
          (
            SELECT min(make_date(ed3.year::int, ed3.month::int, ed3.day::int))::date
            FROM public.employees_diagram ed3
            WHERE ed3.employee_id = b.employee_id
            AND ed3.diagram_type = t.dt_id
            AND make_date(ed3.year::int, ed3.month::int, ed3.day::int) <= target_date
          ),
          target_date
        ) AS desde,
        COALESCE(
          (
            SELECT (min(make_date(ed4.year::int, ed4.month::int, ed4.day::int)) - INTERVAL '1 day')::date
            FROM public.employees_diagram ed4
            JOIN public.diagram_type dt4 ON dt4.id = ed4.diagram_type
            WHERE ed4.employee_id = b.employee_id
            AND make_date(ed4.year::int, ed4.month::int, ed4.day::int) > target_date
            AND dt4.id <> t.dt_id
          ),
          target_date
        ) AS hasta
      FROM base b
      JOIN today_type t ON t.employee_id = b.employee_id
    ),
    absent_details_grouped AS (
      SELECT
        p.sector,
        jsonb_agg(
          jsonb_build_object(
            'employee_id', p.employee_id,
            'legajo', p.legajo,
            'nombre', p.nombre,
            'tarea', p.tarea,
            'linea', p.linea,
            'turno', p.turno,
            'motivo', p.motivo,
            'desde', to_char(p.desde, 'DD/MM/YYYY'),
            'hasta', to_char(p.hasta, 'DD/MM/YYYY'),
            'observaciones', COALESCE(p.comentario, ''),
            'diasCaidos', GREATEST(1, (p.hasta - p.desde + 1))::int
          )
          ORDER BY p.nombre
        ) AS data
      FROM period p
      GROUP BY p.sector
    ),
    per_sector AS (
      SELECT
        b.sector,
        count(*)::int AS dotacion,
        count(tt.employee_id)::int AS ausentes
      FROM base b
      LEFT JOIN today_type tt ON tt.employee_id = b.employee_id
      GROUP BY b.sector
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'sector', ps.sector,
          'dotacion', ps.dotacion,
          'ausentes', ps.ausentes,
          'porcentaje', CASE
            WHEN ps.dotacion > 0
            THEN round((ps.ausentes::numeric * 100.0 / ps.dotacion), 2)
            ELSE 0
          END,
          'data', COALESCE(adg.data, '[]'::jsonb)
        )
        ORDER BY ps.sector
      ),
      '[]'::jsonb
    )
    FROM per_sector ps
    LEFT JOIN absent_details_grouped adg ON adg.sector = ps.sector
  );

  IF save_to_table AND p_company_id IS NOT NULL THEN
    INSERT INTO public.daily_indicators (id, company_id, snapshot_date, metrics, source, created_at)
    VALUES (gen_random_uuid(), p_company_id, target_date, result, 'hr_get_department_absence_summary', now())
    ON CONFLICT (company_id, snapshot_date, source)
    DO UPDATE SET metrics = EXCLUDED.metrics, created_at = now();
  END IF;

  RETURN result;
END
$function$;
