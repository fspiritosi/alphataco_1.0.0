-- ============================================================================
-- Restringe el backfill de desvios a las series que se pueden reconstruir
-- (ticket 578, correccion de 20260819120100)
--
-- POR QUE
-- El backfill original reconstruia la afectacion a cliente con
-- `contractor_employee.created_at`. Validado contra los mails reales que el
-- sistema envio esas noches, ese criterio esta MAL: las afectaciones se borran
-- y se recrean enteras al editar un empleado o un cliente, asi que `created_at`
-- es la fecha de la ultima edicion y no la del alta. Medicion sobre 5 fechas:
--
--   fecha        mail   backfill    estado actual
--   2026-08-18     12         12               10
--   2026-08-13     42         41               39
--   2026-06-04     46        136               28
--   2026-05-12     82        139               22
--   2026-03-10     69        117               15
--
-- Ningun criterio reconstruye el pasado, y por una razon de fondo: cuatro de los
-- siete componentes del desvio (no afectado a cliente, sin diagrama, dia no
-- laboral, equipo no operativo) miden errores de carga que el propio mail existe
-- para que se corrijan. Corregido el dato maestro, el error desaparece de la
-- base. El mail es el unico registro de que existio.
--
-- Los duplicados SI son reconstruibles: dependen solo de las relaciones del
-- parte, que es inmutable. Coincidieron en los 10 valores de las 5 fechas.
--
-- QUE HACE ESTA MIGRACION
-- Para fechas pasadas guarda unicamente los duplicados y deja el resto en NULL
-- (dato ausente, no cero: el grafico corta la linea en vez de dibujar un valor
-- inventado). Para el dia corriente — el unico momento en que la base todavia
-- refleja lo que vio el mail — guarda los cinco indicadores.
--
-- Ademas protege los snapshots ya capturados en vivo: un backfill posterior no
-- puede pisarlos con NULL.
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
  v_is_live boolean;
  v_result jsonb;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Solo el dia corriente se puede medir con fidelidad: es el unico en que las
  -- tablas maestras (afectaciones, diagramas, condicion del equipo) todavia
  -- estan como las vio el reporte nocturno. Estrictamente igual, no >=: los
  -- partes futuros se crean vacios por adelantado y marcarlos como medidos
  -- afirmaria "cero desvios" sobre dias que todavia no ocurrieron.
  v_is_live := v_date = (NOW() AT TIME ZONE v_tz)::date;

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
      ) AS is_unassigned,
      (v.condition IS NOT NULL AND v.condition::text <> 'operativo') AS is_non_operative
    FROM dailyreportequipmentrelations deq
    INNER JOIN dailyreportrows drr ON drr.id = deq.daily_report_row_id
    INNER JOIN reports r ON r.id = drr.daily_report_id
    LEFT JOIN vehicles v ON v.id = deq.equipment_id
  ),
  bad_rows AS (
    SELECT row_id, customer_id FROM emp
    WHERE is_duplicated OR is_unassigned OR has_no_diagram OR is_non_work_day
    UNION
    SELECT row_id, customer_id FROM eq
    WHERE is_duplicated OR is_unassigned OR is_non_operative
  ),
  -- Los duplicados no dependen de ninguna tabla maestra, asi que se agregan
  -- aparte: son la unica parte que sobrevive al paso del tiempo.
  dup_rows AS (
    SELECT row_id, customer_id FROM emp WHERE is_duplicated
    UNION
    SELECT row_id, customer_id FROM eq WHERE is_duplicated
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
    SELECT
      (SELECT COUNT(*) FROM bad_rows)::int AS rows_with_deviations,
      (SELECT COUNT(*) FROM dup_rows)::int AS rows_with_duplicates
  ),
  per_customer AS (
    SELECT
      c.id AS customer_id,
      COALESCE(cu.name, 'Sin cliente') AS customer_name,
      COALESCE((SELECT COUNT(*) FROM bad_rows br
                WHERE br.customer_id IS NOT DISTINCT FROM c.id), 0)::int AS rows_with_deviations,
      COALESCE((SELECT COUNT(*) FROM dup_rows dr2
                WHERE dr2.customer_id IS NOT DISTINCT FROM c.id), 0)::int AS rows_with_duplicates,
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
      -- NULL = no medible para esa fecha. Distinto de 0, que significa "no hubo".
      'rows_with_deviations', CASE WHEN v_is_live THEN ra.rows_with_deviations ELSE NULL END,
      'employee_deviations', CASE WHEN v_is_live THEN ea.employee_deviations ELSE NULL END,
      'equipment_deviations', CASE WHEN v_is_live THEN qa.equipment_deviations ELSE NULL END,
      'duplicated_employees', ea.duplicated_employees,
      'duplicated_equipment', qa.duplicated_equipment
    ),
    'employee_breakdown', CASE WHEN v_is_live THEN jsonb_build_object(
      'unassigned_to_client', ea.b_unassigned,
      'no_diagram', ea.b_no_diagram,
      'non_work_day', ea.b_non_work_day,
      'duplicated', ea.b_duplicated
    ) ELSE jsonb_build_object('duplicated', ea.b_duplicated) END,
    'equipment_breakdown', CASE WHEN v_is_live THEN jsonb_build_object(
      'unassigned_to_client', qa.b_unassigned,
      'non_operative_condition', qa.b_non_operative,
      'duplicated', qa.b_duplicated
    ) ELSE jsonb_build_object('duplicated', qa.b_duplicated) END,
    'by_customer', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'customer_id', pc.customer_id,
        'customer_name', pc.customer_name,
        'rows_with_deviations', CASE WHEN v_is_live THEN pc.rows_with_deviations ELSE NULL END,
        'employee_deviations', CASE WHEN v_is_live THEN pc.employee_deviations ELSE NULL END,
        'equipment_deviations', CASE WHEN v_is_live THEN pc.equipment_deviations ELSE NULL END,
        'duplicated_employees', pc.duplicated_employees,
        'duplicated_equipment', pc.duplicated_equipment
      ) ORDER BY pc.customer_name)
      FROM per_customer pc
      -- En backfill solo interesan los clientes que aportan duplicados.
      WHERE v_is_live OR pc.duplicated_employees > 0 OR pc.duplicated_equipment > 0
    ), '[]'::jsonb),
    'meta', jsonb_build_object(
      'report_date', v_date,
      -- true = los cinco indicadores son fieles al reporte de esa noche.
      -- false = solo los duplicados; el resto viaja en NULL.
      'captured_live', v_is_live
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
    DO UPDATE SET metrics = EXCLUDED.metrics, created_at = now()
    -- Un backfill nunca degrada un snapshot que ya se tomo en vivo.
    WHERE COALESCE(daily_indicators.metrics->'meta'->>'captured_live', 'false') <> 'true'
       OR COALESCE(EXCLUDED.metrics->'meta'->>'captured_live', 'false') = 'true';
  END IF;

  RETURN v_result;
END;
$function$;


-- ============================================================================
-- Reproceso: los snapshots ya escritos traen los desvios reconstruidos que la
-- validacion contra los mails demostro incorrectos. Se recalculan todos con el
-- criterio nuevo, que los deja en NULL y conserva los duplicados.
-- ============================================================================

-- Los partes se crean por adelantado, asi que el backfill original genero
-- snapshots de dias que todavia no ocurrieron. Se descartan: cuando llegue la
-- fecha, el cron los va a escribir con la medicion real.
DELETE FROM public.daily_indicators
WHERE source = 'get_daily_report_deviations_indicator'::public.indicator_function
  AND snapshot_date > (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

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
      AND dr.date <= (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
    ORDER BY dr.date
  LOOP
    PERFORM public.get_daily_report_deviations_indicator(
      p_company_id => rec.company_id,
      p_date => rec.date,
      save_to_table => true
    );
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Reproceso de desvios completado: % dias', v_count;
END $$;
