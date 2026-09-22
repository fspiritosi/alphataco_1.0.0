-- ============================================================================
-- Snapshot diario de desvios del parte diario (ticket 578)
--
-- PROBLEMA QUE RESUELVE
-- Los desvios nunca se persistian: `get_daily_report_deviations` los recalcula
-- contra el estado ACTUAL de contractor_employee / contractor_equipment y de
-- vehicles.condition. El parte de ayer es inmutable, pero el contexto contra el
-- que se evalua no lo es: al afectar un empleado a un cliente hoy, sus desvios
-- pasados desaparecen. Medido en prod: el recalculo devuelve 1.557 desvios de
-- "empleado no afectado" contra 25.065 reconstruidos por fecha de alta (-94%).
--
-- Esta funcion congela los contadores por dia en `daily_indicators`, el mismo
-- mecanismo que ya usan los otros 10 indicadores del dashboard.
--
-- NO toca `get_daily_report_deviations` ni la Edge Function del mail nocturno:
-- ambos siguen funcionando igual. Los contadores son equivalentes a los del
-- mail (verificado sobre el parte 0701db17: empleados 41/8 y equipos 10/3
-- identicos a los de la RPC evaluada con el mismo estado de base).
--
-- RECONSTRUCCION HISTORICA
-- La afectacion a cliente se evalua con `created_at <= fecha del parte`, que
-- para el dia corriente equivale a "existe" (todo lo creado hoy cumple <= hoy).
-- Una sola formula sirve para el cron y para el backfill.
-- La condicion del equipo NO es reconstruible: `vehicles.condition` es un unico
-- campo sin historial. Por eso el snapshot expone `meta.condition_is_historical`,
-- que la UI usa para marcar como estimado el tramo backfilleado.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_daily_report_deviations_indicator(
  p_company_id uuid DEFAULT NULL::uuid,
  p_date date DEFAULT NULL::date,
  save_to_table boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_tz text := 'America/Argentina/Buenos_Aires';
  v_date date := COALESCE(p_date, (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date);
  v_condition_is_historical boolean;
  v_result jsonb;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- La condicion del equipo solo refleja el dia real cuando el snapshot se toma
  -- ese mismo dia. En un backfill de fechas pasadas queda aproximada.
  v_condition_is_historical := v_date >= (NOW() AT TIME ZONE v_tz)::date;

  WITH reports AS (
    SELECT dr.id
    FROM dailyreport dr
    WHERE dr.company_id = p_company_id
      AND dr.date = v_date
      AND dr.is_active = true
  ),
  emp AS (
    SELECT
      drr.id AS row_id,
      drr.customer_id,
      der.employee_id,
      (COUNT(*) OVER (PARTITION BY drr.daily_report_id, der.employee_id)) > 1 AS is_duplicated,
      NOT EXISTS (
        SELECT 1 FROM contractor_employee ce
        WHERE ce.employee_id = der.employee_id
          AND ce.contractor_id = drr.customer_id
          AND ce.created_at::date <= v_date
      ) AS is_unassigned,
      ed.id IS NULL AS has_no_diagram,
      CASE WHEN ed.id IS NOT NULL THEN COALESCE(dt.work_active, true) = false ELSE false END AS is_non_work_day
    FROM dailyreportemployeerelations der
    INNER JOIN dailyreportrows drr ON drr.id = der.daily_report_row_id
    INNER JOIN reports r ON r.id = drr.daily_report_id
    LEFT JOIN employees_diagram ed
      ON ed.employee_id = der.employee_id
      AND ed.day = EXTRACT(DAY FROM v_date)::int
      AND ed.month = EXTRACT(MONTH FROM v_date)::int
      AND ed.year = EXTRACT(YEAR FROM v_date)::int
      AND (ed.is_active = true OR ed.is_active IS NULL)
    LEFT JOIN diagram_type dt ON dt.id = ed.diagram_type
  ),
  eq AS (
    SELECT
      drr.id AS row_id,
      drr.customer_id,
      deq.equipment_id,
      (COUNT(*) OVER (PARTITION BY drr.daily_report_id, deq.equipment_id)) > 1 AS is_duplicated,
      NOT EXISTS (
        SELECT 1 FROM contractor_equipment ce
        WHERE ce.equipment_id = deq.equipment_id
          AND ce.contractor_id = drr.customer_id
          AND ce.created_at::date <= v_date
      ) AS is_unassigned,
      (v.condition IS NOT NULL AND v.condition::text <> 'operativo') AS is_non_operative
    FROM dailyreportequipmentrelations deq
    INNER JOIN dailyreportrows drr ON drr.id = deq.daily_report_row_id
    INNER JOIN reports r ON r.id = drr.daily_report_id
    LEFT JOIN vehicles v ON v.id = deq.equipment_id
  ),
  -- Una fila cuenta como "con desvios" si tiene al menos un desvio de empleado
  -- o de equipo, duplicados incluidos (misma regla que la RPC del mail).
  bad_rows AS (
    SELECT row_id, customer_id FROM emp
    WHERE is_duplicated OR is_unassigned OR has_no_diagram OR is_non_work_day
    UNION
    SELECT row_id, customer_id FROM eq
    WHERE is_duplicated OR is_unassigned OR is_non_operative
  ),
  emp_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE is_unassigned OR has_no_diagram OR is_non_work_day)::int AS employee_deviations,
      COUNT(DISTINCT employee_id) FILTER (WHERE is_duplicated)::int AS duplicated_employees,
      COUNT(*) FILTER (WHERE is_unassigned)::int AS b_unassigned,
      COUNT(*) FILTER (WHERE has_no_diagram)::int AS b_no_diagram,
      COUNT(*) FILTER (WHERE is_non_work_day)::int AS b_non_work_day,
      COUNT(*) FILTER (WHERE is_duplicated)::int AS b_duplicated
    FROM emp
  ),
  eq_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE is_unassigned OR is_non_operative)::int AS equipment_deviations,
      COUNT(DISTINCT equipment_id) FILTER (WHERE is_duplicated)::int AS duplicated_equipment,
      COUNT(*) FILTER (WHERE is_unassigned)::int AS b_unassigned,
      COUNT(*) FILTER (WHERE is_non_operative)::int AS b_non_operative,
      COUNT(*) FILTER (WHERE is_duplicated)::int AS b_duplicated
    FROM eq
  ),
  rows_agg AS (
    SELECT COUNT(*)::int AS rows_with_deviations FROM bad_rows
  ),
  per_customer AS (
    SELECT
      c.id AS customer_id,
      COALESCE(cu.name, 'Sin cliente') AS customer_name,
      COALESCE((SELECT COUNT(*) FROM bad_rows br
                WHERE br.customer_id IS NOT DISTINCT FROM c.id), 0)::int AS rows_with_deviations,
      COALESCE((SELECT COUNT(*) FROM emp e
                WHERE e.customer_id IS NOT DISTINCT FROM c.id
                  AND (e.is_unassigned OR e.has_no_diagram OR e.is_non_work_day)), 0)::int AS employee_deviations,
      COALESCE((SELECT COUNT(*) FROM eq q
                WHERE q.customer_id IS NOT DISTINCT FROM c.id
                  AND (q.is_unassigned OR q.is_non_operative)), 0)::int AS equipment_deviations,
      COALESCE((SELECT COUNT(DISTINCT e.employee_id) FROM emp e
                WHERE e.customer_id IS NOT DISTINCT FROM c.id
                  AND e.is_duplicated), 0)::int AS duplicated_employees,
      COALESCE((SELECT COUNT(DISTINCT q.equipment_id) FROM eq q
                WHERE q.customer_id IS NOT DISTINCT FROM c.id
                  AND q.is_duplicated), 0)::int AS duplicated_equipment
    FROM (SELECT DISTINCT customer_id AS id FROM bad_rows) c
    LEFT JOIN customers cu ON cu.id = c.id
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'rows_with_deviations', ra.rows_with_deviations,
      'employee_deviations', ea.employee_deviations,
      'equipment_deviations', qa.equipment_deviations,
      'duplicated_employees', ea.duplicated_employees,
      'duplicated_equipment', qa.duplicated_equipment
    ),
    'employee_breakdown', jsonb_build_object(
      'unassigned_to_client', ea.b_unassigned,
      'no_diagram', ea.b_no_diagram,
      'non_work_day', ea.b_non_work_day,
      'duplicated', ea.b_duplicated
    ),
    'equipment_breakdown', jsonb_build_object(
      'unassigned_to_client', qa.b_unassigned,
      'non_operative_condition', qa.b_non_operative,
      'duplicated', qa.b_duplicated
    ),
    'by_customer', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'customer_id', pc.customer_id,
        'customer_name', pc.customer_name,
        'rows_with_deviations', pc.rows_with_deviations,
        'employee_deviations', pc.employee_deviations,
        'equipment_deviations', pc.equipment_deviations,
        'duplicated_employees', pc.duplicated_employees,
        'duplicated_equipment', pc.duplicated_equipment
      ) ORDER BY pc.customer_name)
      FROM per_customer pc
    ), '[]'::jsonb),
    'meta', jsonb_build_object(
      'report_date', v_date,
      'condition_is_historical', v_condition_is_historical
    )
  )
  INTO v_result
  FROM rows_agg ra
  CROSS JOIN emp_agg ea
  CROSS JOIN eq_agg qa;

  IF save_to_table AND p_company_id IS NOT NULL THEN
    INSERT INTO public.daily_indicators (id, company_id, snapshot_date, metrics, source, created_at)
    VALUES (
      gen_random_uuid(),
      p_company_id,
      v_date,
      v_result,
      'get_daily_report_deviations_indicator'::public.indicator_function,
      now()
    )
    ON CONFLICT (company_id, snapshot_date, source)
    DO UPDATE SET metrics = EXCLUDED.metrics, created_at = now();
  END IF;

  RETURN v_result;
END;
$function$;


-- ============================================================================
-- Enganche al cron nocturno existente (`guardar_indicadores_diarios`, 02:50 UTC).
-- Se reescribe la funcion COMPLETA con la llamada nueva agregada al final del
-- bloque, dentro del mismo BEGIN/EXCEPTION para que un fallo de este indicador
-- no corte a los otros diez.
-- ============================================================================

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

      PERFORM public.get_daily_report_deviations_indicator(
        p_company_id => company_record.id,
        p_date => v_today,
        save_to_table => true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error al ejecutar indicadores para company_id %: %', company_record.id, SQLERRM;
    END;
  END LOOP;
END;
$function$;


-- ============================================================================
-- Backfill del historico. Idempotente: el upsert se apoya en el indice unico
-- (company_id, snapshot_date, source), asi que reejecutar la migracion no
-- duplica filas. El tramo backfilleado queda marcado con
-- meta.condition_is_historical = false.
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
  v_count int := 0;
BEGIN
  FOR rec IN
    SELECT DISTINCT dr.company_id, dr.date
    FROM dailyreport dr
    WHERE dr.is_active = true
      AND dr.company_id IS NOT NULL
    ORDER BY dr.date
  LOOP
    PERFORM public.get_daily_report_deviations_indicator(
      p_company_id => rec.company_id,
      p_date => rec.date,
      save_to_table => true
    );
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfill de desvios completado: % dias procesados', v_count;
END $$;
