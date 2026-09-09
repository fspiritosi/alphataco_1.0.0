-- ============================================================================
-- Rollback de 20260909110000_fix_deviations_include_other_equipment
--
-- Prisma NO ejecuta este archivo: es referencia manual para revertir en prod.
--
-- Contiene las dos funciones EXACTAMENTE como estaban en produccion antes del
-- cambio, capturadas con pg_get_functiondef el 2026-09-09. Volver a ellas
-- reintroduce el bug de los "otros equipos" (dominio y N° interno vacios,
-- condicion "Desconocido", "No afectado" y "Duplicado" falsos).
--
-- El snapshot invalidado del 2026-09-08 NO se puede restaurar: los valores
-- que tenia (rows_with_deviations 33, employee_deviations 10,
-- equipment_deviations 89) eran justamente los inflados por el bug. Si hiciera
-- falta reponerlos, estan al final de este archivo, comentados.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_daily_report_deviations(p_daily_report_id uuid, p_report_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_day INT;
  v_month INT;
  v_year INT;
  v_rows_with_deviations JSONB;
  v_summary JSONB;
  v_total_employee_deviations INT := 0;
  v_total_equipment_deviations INT := 0;
  v_total_duplicated_employees INT := 0;
  v_total_duplicated_equipment INT := 0;
BEGIN
  v_day   := EXTRACT(DAY   FROM p_report_date)::INT;
  v_month := EXTRACT(MONTH FROM p_report_date)::INT;
  v_year  := EXTRACT(YEAR  FROM p_report_date)::INT;

  WITH employee_devs AS (
    SELECT
      der.daily_report_row_id AS row_id,
      der.employee_id,
      COALESCE(e.firstname || ' ' || e.lastname, '—') AS employee_name,
      COALESCE(e.cuil, '—') AS employee_cuil,
      der.role::text AS role,
      dr.customer_id,
      (COUNT(*) OVER (PARTITION BY der.employee_id)) > 1 AS is_duplicated,
      NOT EXISTS (
        SELECT 1 FROM contractor_employee ce
        WHERE ce.employee_id = der.employee_id
          AND ce.contractor_id = dr.customer_id
      ) AS is_unassigned_to_client,
      ed.id IS NULL AS has_no_diagram,
      CASE
        WHEN ed.id IS NOT NULL THEN COALESCE(dt.work_active, true) = false
        ELSE false
      END AS is_non_work_day,
      dt.name AS diagram_type_name
    FROM dailyreportemployeerelations der
    INNER JOIN dailyreportrows dr ON dr.id = der.daily_report_row_id
    LEFT JOIN employees e ON e.id = der.employee_id
    LEFT JOIN employees_diagram ed
      ON ed.employee_id = der.employee_id
      AND ed.day = v_day AND ed.month = v_month AND ed.year = v_year
      AND (ed.is_active = true OR ed.is_active IS NULL)
    LEFT JOIN diagram_type dt ON dt.id = ed.diagram_type
    WHERE dr.daily_report_id = p_daily_report_id
  ),
  equipment_devs AS (
    SELECT
      deq.daily_report_row_id AS row_id,
      deq.equipment_id,
      COALESCE(v.domain, '—') AS equipment_domain,
      COALESCE(v.intern_number, '—') AS equipment_intern_number,
      v.condition::text AS condition,
      dr.customer_id,
      (COUNT(*) OVER (PARTITION BY deq.equipment_id)) > 1 AS is_duplicated,
      NOT EXISTS (
        SELECT 1 FROM contractor_equipment ce
        WHERE ce.equipment_id = deq.equipment_id
          AND ce.contractor_id = dr.customer_id
      ) AS is_unassigned_to_client
    FROM dailyreportequipmentrelations deq
    INNER JOIN dailyreportrows dr ON dr.id = deq.daily_report_row_id
    LEFT JOIN vehicles v ON v.id = deq.equipment_id
    WHERE dr.daily_report_id = p_daily_report_id
  ),
  emp_by_row AS (
    SELECT
      row_id,
      jsonb_agg(
        jsonb_build_object(
          'employee_id', employee_id,
          'employee_name', employee_name,
          'employee_cuil', employee_cuil,
          'role', COALESCE(role, 'sin_rol'),
          'is_duplicated', is_duplicated,
          'is_unassigned_to_client', is_unassigned_to_client,
          'has_no_diagram', has_no_diagram,
          'is_non_work_day', is_non_work_day,
          'diagram_type_name', diagram_type_name
        )
      ) AS employee_deviations
    FROM employee_devs
    WHERE is_duplicated OR is_unassigned_to_client OR has_no_diagram OR is_non_work_day
    GROUP BY row_id
  ),
  equip_by_row AS (
    SELECT
      row_id,
      jsonb_agg(
        jsonb_build_object(
          'equipment_id', equipment_id,
          'equipment_domain', equipment_domain,
          'equipment_intern_number', equipment_intern_number,
          'condition', COALESCE(condition, 'desconocido'),
          'is_duplicated', is_duplicated,
          'is_unassigned_to_client', is_unassigned_to_client
        )
      ) AS equipment_deviations
    FROM equipment_devs
    WHERE is_duplicated OR is_unassigned_to_client OR (condition IS NOT NULL AND condition <> 'operativo')
    GROUP BY row_id
  ),
  -- Customer equipment per row
  cust_equip_by_row AS (
    SELECT
      dcer.daily_report_row_id AS row_id,
      jsonb_agg(
        jsonb_build_object(
          'name', COALESCE(ec.name, '—'),
          'type', COALESCE(ec.type::text, '—')
        )
      ) AS customer_equipment
    FROM dailyreport_customer_equipment_relations dcer
    LEFT JOIN equipos_clientes ec ON ec.id = dcer.customer_equipment_id
    INNER JOIN dailyreportrows dr ON dr.id = dcer.daily_report_row_id
    WHERE dr.daily_report_id = p_daily_report_id
    GROUP BY dcer.daily_report_row_id
  ),
  rows_data AS (
    SELECT
      dr.id AS row_id,
      dr.customer_id,
      c.name AS customer_name,
      cs.service_name AS service_name,
      si.item_name AS item_name,
      dr.start_time,
      dr.end_time,
      dr.working_day,
      dr.type_service::text AS type_service,
      dr.status::text AS status,
      dr.description,
      sec.name AS sector_name,
      ac.descripcion_corta AS area_name,
      COALESCE(ebr.employee_deviations, '[]'::jsonb) AS employee_deviations,
      COALESCE(eqr.equipment_deviations, '[]'::jsonb) AS equipment_deviations,
      COALESCE(cer.customer_equipment, '[]'::jsonb) AS customer_equipment
    FROM dailyreportrows dr
    LEFT JOIN customers c ON c.id = dr.customer_id
    LEFT JOIN customer_services cs ON cs.id = dr.service_id
    LEFT JOIN service_items si ON si.id = dr.item_id
    LEFT JOIN service_sectors ss ON ss.id = dr.sector_service_id
    LEFT JOIN sectors sec ON sec.id = ss.sector_id
    LEFT JOIN service_areas sa ON sa.id = dr.areas_service_id
    LEFT JOIN areas_cliente ac ON ac.id = sa.area_id
    LEFT JOIN emp_by_row ebr ON ebr.row_id = dr.id
    LEFT JOIN equip_by_row eqr ON eqr.row_id = dr.id
    LEFT JOIN cust_equip_by_row cer ON cer.row_id = dr.id
    WHERE dr.daily_report_id = p_daily_report_id
      AND (ebr.row_id IS NOT NULL OR eqr.row_id IS NOT NULL)
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'row_id', rd.row_id,
      'customer_id', rd.customer_id,
      'customer_name', COALESCE(rd.customer_name, '—'),
      'service_name', COALESCE(rd.service_name, '—'),
      'item_name', COALESCE(rd.item_name, '—'),
      'start_time', rd.start_time,
      'end_time', rd.end_time,
      'working_day', rd.working_day,
      'type_service', rd.type_service,
      'status', rd.status,
      'description', rd.description,
      'sector_name', rd.sector_name,
      'area_name', rd.area_name,
      'customer_equipment', rd.customer_equipment,
      'employee_deviations', rd.employee_deviations,
      'equipment_deviations', rd.equipment_deviations
    )
    ORDER BY rd.customer_name, rd.service_name
  ), '[]'::jsonb)
  INTO v_rows_with_deviations
  FROM rows_data rd;

  -- CONTADORES
  SELECT COUNT(*) INTO v_total_employee_deviations
  FROM (
    SELECT der.employee_id
    FROM dailyreportemployeerelations der
    INNER JOIN dailyreportrows dr ON dr.id = der.daily_report_row_id
    LEFT JOIN employees_diagram ed
      ON ed.employee_id = der.employee_id
      AND ed.day = v_day AND ed.month = v_month AND ed.year = v_year
      AND (ed.is_active = true OR ed.is_active IS NULL)
    LEFT JOIN diagram_type dt ON dt.id = ed.diagram_type
    WHERE dr.daily_report_id = p_daily_report_id
      AND (
        NOT EXISTS (
          SELECT 1 FROM contractor_employee ce
          WHERE ce.employee_id = der.employee_id AND ce.contractor_id = dr.customer_id
        )
        OR ed.id IS NULL
        OR (ed.id IS NOT NULL AND COALESCE(dt.work_active, true) = false)
      )
  ) sub;

  SELECT COUNT(*) INTO v_total_equipment_deviations
  FROM (
    SELECT deq.equipment_id
    FROM dailyreportequipmentrelations deq
    INNER JOIN dailyreportrows dr ON dr.id = deq.daily_report_row_id
    LEFT JOIN vehicles v ON v.id = deq.equipment_id
    WHERE dr.daily_report_id = p_daily_report_id
      AND (
        NOT EXISTS (
          SELECT 1 FROM contractor_equipment ce
          WHERE ce.equipment_id = deq.equipment_id AND ce.contractor_id = dr.customer_id
        )
        OR (v.condition IS NOT NULL AND v.condition::text <> 'operativo')
      )
  ) sub;

  SELECT COUNT(DISTINCT employee_id) INTO v_total_duplicated_employees
  FROM (
    SELECT der.employee_id
    FROM dailyreportemployeerelations der
    INNER JOIN dailyreportrows dr ON dr.id = der.daily_report_row_id
    WHERE dr.daily_report_id = p_daily_report_id
    GROUP BY der.employee_id
    HAVING COUNT(*) > 1
  ) sub;

  SELECT COUNT(DISTINCT equipment_id) INTO v_total_duplicated_equipment
  FROM (
    SELECT deq.equipment_id
    FROM dailyreportequipmentrelations deq
    INNER JOIN dailyreportrows dr ON dr.id = deq.daily_report_row_id
    WHERE dr.daily_report_id = p_daily_report_id
    GROUP BY deq.equipment_id
    HAVING COUNT(*) > 1
  ) sub;

  v_summary := jsonb_build_object(
    'total_employee_deviations', v_total_employee_deviations,
    'total_equipment_deviations', v_total_equipment_deviations,
    'total_duplicated_employees', v_total_duplicated_employees,
    'total_duplicated_equipment', v_total_duplicated_equipment,
    'total_rows_with_deviations', jsonb_array_length(v_rows_with_deviations)
  );

  RETURN jsonb_build_object(
    'rows_with_deviations', v_rows_with_deviations,
    'summary', v_summary
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_daily_report_deviations_indicator(p_company_id uuid DEFAULT NULL::uuid, p_date date DEFAULT NULL::date, save_to_table boolean DEFAULT false)
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


-- ── Snapshot del 2026-09-08 como estaba antes de invalidarlo ────────────────
-- Solo por si hiciera falta reponer el valor original (inflado por el bug).
--
-- UPDATE public.daily_indicators
-- SET metrics = jsonb_set(jsonb_set(jsonb_set(
--       jsonb_set(metrics, '{totals,rows_with_deviations}', '33'::jsonb, true),
--       '{totals,employee_deviations}', '10'::jsonb, true),
--       '{totals,equipment_deviations}', '89'::jsonb, true),
--       '{meta,captured_live}', 'true'::jsonb, true)
-- WHERE source = 'get_daily_report_deviations_indicator'::public.indicator_function
--   AND snapshot_date = DATE '2026-09-08'
--   AND company_id = 'be4119b0-12ca-4a8f-87ed-209239194dab'::uuid;
--
-- Los desgloses por cliente (by_customer) y los breakdown completos no se
-- conservaron: tambien estaban inflados y no aportaban nada recuperable.
