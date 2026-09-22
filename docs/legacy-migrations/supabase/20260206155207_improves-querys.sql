CREATE INDEX idx_dailyreportemployeerelations_row_id ON public.dailyreportemployeerelations USING btree (daily_report_row_id);

CREATE INDEX idx_dailyreportequipmentrelations_row_id ON public.dailyreportequipmentrelations USING btree (daily_report_row_id);

CREATE INDEX idx_dailyreportrows_daily_report_id ON public.dailyreportrows USING btree (daily_report_id);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_daily_report_deviations(p_daily_report_id uuid, p_report_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_day INT;
  v_month INT;
  v_year INT;
  v_employee_deviations JSONB;
  v_equipment_deviations JSONB;
BEGIN
  v_day   := EXTRACT(DAY   FROM p_report_date)::INT;
  v_month := EXTRACT(MONTH FROM p_report_date)::INT;
  v_year  := EXTRACT(YEAR  FROM p_report_date)::INT;

  -- ========================================
  -- DESVÍOS DE EMPLEADOS
  -- ========================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'employee_id',              sub.employee_id,
      'row_id',                   sub.row_id,
      'customer_id',              sub.customer_id,
      'is_duplicated',            sub.is_duplicated,
      'is_unassigned_to_client',  sub.is_unassigned_to_client,
      'has_no_diagram',           sub.has_no_diagram,
      'is_non_work_day',          sub.is_non_work_day,
      'diagram_type_name',        sub.diagram_type_name
    )
  ), '[]'::jsonb)
  INTO v_employee_deviations
  FROM (
    SELECT
      der.employee_id,
      der.daily_report_row_id AS row_id,
      dr.customer_id,
      -- Duplicado: el empleado aparece en más de 1 row del parte
      (COUNT(*) OVER (PARTITION BY der.employee_id)) > 1 AS is_duplicated,
      -- No asignado al cliente de esta fila
      NOT EXISTS (
        SELECT 1 
        FROM contractor_employee ce
        WHERE ce.employee_id = der.employee_id
          AND ce.contractor_id = dr.customer_id
      ) AS is_unassigned_to_client,
      -- Sin diagrama cargado para esta fecha
      ed.id IS NULL AS has_no_diagram,
      -- Día no laboral (tiene diagrama pero work_active = false)
      CASE 
        WHEN ed.id IS NOT NULL THEN COALESCE(dt.work_active, true) = false 
        ELSE false 
      END AS is_non_work_day,
      -- Nombre del tipo de diagrama (para mostrar en tooltip)
      dt.name AS diagram_type_name
    FROM dailyreportemployeerelations der
    INNER JOIN dailyreportrows dr 
      ON dr.id = der.daily_report_row_id
    LEFT JOIN employees_diagram ed 
      ON ed.employee_id = der.employee_id
      AND ed.day = v_day
      AND ed.month = v_month
      AND ed.year = v_year
      AND (ed.is_active = true OR ed.is_active IS NULL)
    LEFT JOIN diagram_type dt 
      ON dt.id = ed.diagram_type
    WHERE dr.daily_report_id = p_daily_report_id
  ) sub;

  -- ========================================
  -- DESVÍOS DE EQUIPOS
  -- ========================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'equipment_id',             sub.equipment_id,
      'row_id',                   sub.row_id,
      'customer_id',              sub.customer_id,
      'is_duplicated',            sub.is_duplicated,
      'is_unassigned_to_client',  sub.is_unassigned_to_client,
      'condition',                sub.condition
    )
  ), '[]'::jsonb)
  INTO v_equipment_deviations
  FROM (
    SELECT
      deq.equipment_id,
      deq.daily_report_row_id AS row_id,
      dr.customer_id,
      -- Duplicado: el equipo aparece en más de 1 row del parte
      (COUNT(*) OVER (PARTITION BY deq.equipment_id)) > 1 AS is_duplicated,
      -- No asignado al cliente de esta fila
      NOT EXISTS (
        SELECT 1 
        FROM contractor_equipment ce
        WHERE ce.equipment_id = deq.equipment_id
          AND ce.contractor_id = dr.customer_id
      ) AS is_unassigned_to_client,
      -- Condición actual del vehículo
      v.condition::text AS condition
    FROM dailyreportequipmentrelations deq
    INNER JOIN dailyreportrows dr 
      ON dr.id = deq.daily_report_row_id
    LEFT JOIN vehicles v 
      ON v.id = deq.equipment_id
    WHERE dr.daily_report_id = p_daily_report_id
  ) sub;

  -- ========================================
  -- RESULTADO FINAL
  -- ========================================
  RETURN jsonb_build_object(
    'employee_deviations', v_employee_deviations,
    'equipment_deviations', v_equipment_deviations
  );
END;
$function$
;


