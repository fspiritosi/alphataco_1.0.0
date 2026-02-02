drop view if exists "public"."equipments_with_pending_deviations";

set check_function_bodies = off;

create or replace view "public"."equipments_with_pending_deviations" as  SELECT DISTINCT v.id,
    v.domain,
    v.serie,
    v.intern_number,
    v.company_id,
    tv.name AS type_name,
    count(DISTINCT cd.id) AS deviation_count
   FROM ((public.checklist_deviations cd
     JOIN public.vehicles v ON ((cd.equipment_id = v.id)))
     LEFT JOIN public.types_of_vehicles tv ON ((v.type_of_vehicle = tv.id)))
  WHERE ((NOT (EXISTS ( SELECT 1
           FROM public.checklist_answer_repairs car
          WHERE ((car.checklist_answer_id = cd.checklist_answer_id) AND (car.item_code = cd.item_code))))) AND (NOT (EXISTS ( SELECT 1
           FROM public.maintenance_request_items mri
          WHERE (mri.checklist_deviation_id = cd.id)))))
  GROUP BY v.id, v.domain, v.serie, v.intern_number, v.company_id, tv.name
 HAVING (count(DISTINCT cd.id) > 0)
  ORDER BY (count(DISTINCT cd.id)) DESC;


CREATE OR REPLACE FUNCTION public.get_daily_report_deviations(p_daily_report_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSON;
  v_report_date DATE;
  v_report_day INT;
  v_report_month INT;
  v_report_year INT;
BEGIN
  -- Obtener la fecha del parte
  SELECT date INTO v_report_date
  FROM dailyreport
  WHERE id = p_daily_report_id;
  
  IF v_report_date IS NULL THEN
    RETURN json_build_object('error', 'Parte diario no encontrado');
  END IF;
  
  v_report_day := EXTRACT(DAY FROM v_report_date);
  v_report_month := EXTRACT(MONTH FROM v_report_date);
  v_report_year := EXTRACT(YEAR FROM v_report_date);
  
  WITH 
  -- Datos base: filas del parte con sus relaciones
  report_rows AS (
    SELECT 
      dr.id as row_id,
      dr.customer_id,
      c.name as customer_name,
      dr.service_id,
      cs.service_name as service_name,
      dr.item_id,
      si.item_name as item_name,
      dr.status as row_status
    FROM dailyreportrows dr
    LEFT JOIN customers c ON c.id = dr.customer_id
    LEFT JOIN customer_services cs ON cs.id = dr.service_id
    LEFT JOIN service_items si ON si.id = dr.item_id
    WHERE dr.daily_report_id = p_daily_report_id
  ),
  
  -- Empleados asignados a cada fila
  row_employees AS (
    SELECT 
      drer.daily_report_row_id,
      drer.employee_id,
      e.firstname,
      e.lastname,
      e.cuil
    FROM dailyreportemployeerelations drer
    JOIN employees e ON e.id = drer.employee_id
    WHERE drer.daily_report_row_id IN (SELECT row_id FROM report_rows)
  ),
  
  -- Desvío 1: Empleados no afectados al cliente
  employees_not_assigned AS (
    SELECT 
      rr.row_id,
      rr.customer_name,
      rr.service_name,
      rr.item_name,
      re.employee_id,
      re.firstname,
      re.lastname,
      re.cuil,
      'Empleado no afectado al cliente' as deviation_type
    FROM report_rows rr
    JOIN row_employees re ON re.daily_report_row_id = rr.row_id
    LEFT JOIN contractor_employee ce ON ce.employee_id = re.employee_id AND ce.contractor_id = rr.customer_id
    WHERE ce.id IS NULL
  ),
  
  -- Desvío 2: Empleados sin diagrama o con diagrama no laboral
  employees_no_valid_diagram AS (
    SELECT 
      rr.row_id,
      rr.customer_name,
      rr.service_name,
      rr.item_name,
      re.employee_id,
      re.firstname,
      re.lastname,
      re.cuil,
      CASE 
        WHEN ed.id IS NULL THEN 'Empleado sin diagrama para este día'
        WHEN dt.work_active = false THEN 'Empleado con diagrama no laboral (' || dt.name || ')'
        ELSE 'Diagrama inválido'
      END as deviation_type
    FROM report_rows rr
    JOIN row_employees re ON re.daily_report_row_id = rr.row_id
    LEFT JOIN employees_diagram ed ON ed.employee_id = re.employee_id 
      AND ed.day = v_report_day 
      AND ed.month = v_report_month 
      AND ed.year = v_report_year
      AND ed.is_active = true
    LEFT JOIN diagram_type dt ON dt.id = ed.diagram_type
    WHERE ed.id IS NULL OR dt.work_active = false
  ),
  
  -- Desvío 3: Filas sin recursos (sin empleados ni equipos)
  rows_without_resources AS (
    SELECT 
      rr.row_id,
      rr.customer_name,
      rr.service_name,
      rr.item_name,
      NULL::uuid as employee_id,
      NULL::text as firstname,
      NULL::text as lastname,
      NULL::text as cuil,
      'Fila sin recursos asignados' as deviation_type
    FROM report_rows rr
    LEFT JOIN dailyreportemployeerelations drer ON drer.daily_report_row_id = rr.row_id
    LEFT JOIN dailyreportequipmentrelations dreq ON dreq.daily_report_row_id = rr.row_id
    WHERE drer.id IS NULL AND dreq.id IS NULL
  ),
  
  -- Desvío 4: Empleados duplicados en el mismo parte
  duplicate_employees AS (
    SELECT 
      re.employee_id,
      re.firstname,
      re.lastname,
      re.cuil,
      COUNT(*) as times_assigned,
      array_agg(DISTINCT rr.customer_name || ' - ' || COALESCE(rr.service_name, 'Sin servicio')) as assignments
    FROM row_employees re
    JOIN report_rows rr ON rr.row_id = re.daily_report_row_id
    GROUP BY re.employee_id, re.firstname, re.lastname, re.cuil
    HAVING COUNT(*) > 1
  ),
  
  -- Combinar todos los desvíos
  all_deviations AS (
    SELECT row_id, customer_name, service_name, item_name, employee_id, firstname, lastname, cuil, deviation_type
    FROM employees_not_assigned
    UNION ALL
    SELECT row_id, customer_name, service_name, item_name, employee_id, firstname, lastname, cuil, deviation_type
    FROM employees_no_valid_diagram
    UNION ALL
    SELECT row_id, customer_name, service_name, item_name, employee_id, firstname, lastname, cuil, deviation_type
    FROM rows_without_resources
  )
  
  SELECT json_build_object(
    'daily_report_id', p_daily_report_id,
    'report_date', v_report_date,
    'deviations', COALESCE((
      SELECT json_agg(json_build_object(
        'row_id', row_id,
        'customer_name', customer_name,
        'service_name', service_name,
        'item_name', item_name,
        'employee_id', employee_id,
        'employee_name', CASE WHEN firstname IS NOT NULL THEN firstname || ' ' || lastname ELSE NULL END,
        'employee_cuil', cuil,
        'deviation_type', deviation_type
      ))
      FROM all_deviations
    ), '[]'::json),
    'duplicates', COALESCE((
      SELECT json_agg(json_build_object(
        'employee_id', employee_id,
        'employee_name', firstname || ' ' || lastname,
        'employee_cuil', cuil,
        'times_assigned', times_assigned,
        'assignments', assignments
      ))
      FROM duplicate_employees
    ), '[]'::json),
    'summary', json_build_object(
      'total_deviations', (SELECT COUNT(*) FROM all_deviations),
      'total_duplicates', (SELECT COUNT(*) FROM duplicate_employees),
      'employees_not_assigned', (SELECT COUNT(*) FROM employees_not_assigned),
      'employees_no_valid_diagram', (SELECT COUNT(*) FROM employees_no_valid_diagram),
      'rows_without_resources', (SELECT COUNT(*) FROM rows_without_resources)
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_work_orders_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."maintenance_order_item_repair_types" to "postgres";

grant insert on table "public"."maintenance_order_item_repair_types" to "postgres";

grant references on table "public"."maintenance_order_item_repair_types" to "postgres";

grant select on table "public"."maintenance_order_item_repair_types" to "postgres";

grant trigger on table "public"."maintenance_order_item_repair_types" to "postgres";

grant truncate on table "public"."maintenance_order_item_repair_types" to "postgres";

grant update on table "public"."maintenance_order_item_repair_types" to "postgres";

grant delete on table "public"."preparte_change_logs" to "postgres";

grant insert on table "public"."preparte_change_logs" to "postgres";

grant references on table "public"."preparte_change_logs" to "postgres";

grant select on table "public"."preparte_change_logs" to "postgres";

grant trigger on table "public"."preparte_change_logs" to "postgres";

grant truncate on table "public"."preparte_change_logs" to "postgres";

grant update on table "public"."preparte_change_logs" to "postgres";

grant delete on table "public"."work_order_items" to "postgres";

grant insert on table "public"."work_order_items" to "postgres";

grant references on table "public"."work_order_items" to "postgres";

grant select on table "public"."work_order_items" to "postgres";

grant trigger on table "public"."work_order_items" to "postgres";

grant truncate on table "public"."work_order_items" to "postgres";

grant update on table "public"."work_order_items" to "postgres";

grant delete on table "public"."work_orders" to "postgres";

grant insert on table "public"."work_orders" to "postgres";

grant references on table "public"."work_orders" to "postgres";

grant select on table "public"."work_orders" to "postgres";

grant trigger on table "public"."work_orders" to "postgres";

grant truncate on table "public"."work_orders" to "postgres";

grant update on table "public"."work_orders" to "postgres";


