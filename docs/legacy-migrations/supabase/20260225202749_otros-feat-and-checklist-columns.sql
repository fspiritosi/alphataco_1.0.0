alter table "public"."document_types" drop constraint "document_types_equipment_type_check";

alter table "public"."type" drop constraint "type_applies_to_check";

drop view if exists "public"."equipments_with_pending_deviations";

alter table "public"."checklist_answers" add column "chofer_employee_id" uuid;

alter table "public"."checklist_answers" add column "customer_id" uuid generated always as (
CASE
    WHEN (((answer_data ->> 'customer_id'::text) IS NOT NULL) AND ((answer_data ->> 'customer_id'::text) <> 'null'::text)) THEN ((answer_data ->> 'customer_id'::text))::uuid
    ELSE NULL::uuid
END) stored;

alter table "public"."checklist_answers" add column "horometro" numeric generated always as (
CASE
    WHEN (((answer_data ->> 'horometro'::text) IS NOT NULL) AND ((answer_data ->> 'horometro'::text) <> ''::text) AND ((answer_data ->> 'horometro'::text) ~ '^[0-9]+(\.[0-9]+)?$'::text)) THEN ((answer_data ->> 'horometro'::text))::numeric
    ELSE NULL::numeric
END) stored;

alter table "public"."checklist_answers" add column "kilometraje" numeric generated always as (
CASE
    WHEN (((answer_data ->> 'kilometraje'::text) IS NOT NULL) AND ((answer_data ->> 'kilometraje'::text) <> ''::text) AND ((answer_data ->> 'kilometraje'::text) ~ '^[0-9]+(\.[0-9]+)?$'::text)) THEN ((answer_data ->> 'kilometraje'::text))::numeric
    ELSE NULL::numeric
END) stored;

alter table "public"."dailyreportequipmentrelations" add column "other_equipment_id" uuid;

alter table "public"."type" add column "is_operative" boolean default false;

CREATE INDEX idx_daily_equip_rel_other_equipment ON public.dailyreportequipmentrelations USING btree (other_equipment_id) WHERE (other_equipment_id IS NOT NULL);

alter table "public"."checklist_answers" add constraint "checklist_answers_chofer_employee_id_fkey" FOREIGN KEY (chofer_employee_id) REFERENCES public.employees(id) not valid;

alter table "public"."checklist_answers" validate constraint "checklist_answers_chofer_employee_id_fkey";

alter table "public"."dailyreportequipmentrelations" add constraint "chk_daily_equipment_exclusive" CHECK ((num_nonnulls(equipment_id, other_equipment_id) = 1)) not valid;

alter table "public"."dailyreportequipmentrelations" validate constraint "chk_daily_equipment_exclusive";

alter table "public"."dailyreportequipmentrelations" add constraint "dailyreportequipmentrelations_other_equipment_id_fkey" FOREIGN KEY (other_equipment_id) REFERENCES public.other_equipment(id) not valid;

alter table "public"."dailyreportequipmentrelations" validate constraint "dailyreportequipmentrelations_other_equipment_id_fkey";

alter table "public"."document_types" add constraint "document_types_equipment_type_check" CHECK (((equipment_type)::text = ANY ((ARRAY['vehicle'::character varying, 'other_equipment'::character varying])::text[]))) not valid;

alter table "public"."document_types" validate constraint "document_types_equipment_type_check";

alter table "public"."type" add constraint "type_applies_to_check" CHECK (((applies_to)::text = ANY ((ARRAY['vehicle'::character varying, 'other_equipment'::character varying])::text[]))) not valid;

alter table "public"."type" validate constraint "type_applies_to_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.actualizar_estado_daily_reports()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    report_record RECORD;
    tiene_filas BOOLEAN;
    todas_completas BOOLEAN;
BEGIN
    -- Parte 1: Actualizar filas 'sin_recursos_asignados' que ya tienen los recursos requeridos
    -- Usa un solo UPDATE set-based en lugar de FOR LOOP
    UPDATE dailyreportrows dr
    SET status = 'pendiente',
        updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
    FROM service_items si
    WHERE dr.item_id = si.id
      AND dr.status = 'sin_recursos_asignados'
      AND (
        (NOT COALESCE(si.needs_personnel, true) OR EXISTS (
          SELECT 1 FROM dailyreportemployeerelations WHERE daily_report_row_id = dr.id
        ))
        AND
        (NOT COALESCE(si.needs_equipment, true) OR EXISTS (
          SELECT 1 FROM dailyreportequipmentrelations WHERE daily_report_row_id = dr.id
        ))
      );

    -- Parte 2: Cierre de reportes pasados (sin cambios)
    FOR report_record IN
        SELECT id
        FROM dailyreport
        WHERE date < ( (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date )
        AND status IN ('abierto', 'cerrado_incompleto')
    LOOP
        SELECT EXISTS (SELECT 1 FROM dailyreportrows WHERE daily_report_id = report_record.id) INTO tiene_filas;

        IF NOT tiene_filas THEN
            UPDATE dailyreport
            SET status = 'cerrado_completo',
                updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
            WHERE id = report_record.id;
        ELSE
            SELECT NOT EXISTS (
                SELECT 1
                FROM dailyreportrows
                WHERE daily_report_id = report_record.id
                AND (
                    status NOT IN ('ejecutado', 'reprogramado', 'cancelado')
                    OR (status = 'ejecutado' AND (document_path IS NULL OR document_path = ''))
                )
            ) INTO todas_completas;

            IF todas_completas THEN
                UPDATE dailyreport
                SET status = 'cerrado_completo',
                    updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
                WHERE id = report_record.id;
            ELSE
                UPDATE dailyreport
                SET status = 'cerrado_incompleto',
                    updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
                WHERE id = report_record.id;
            END IF;
        END IF;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.after_dailyreportrows_update_optimized()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    affected_reports UUID[];
    v_report_id UUID;
BEGIN
    -- Recopilar todos los report_ids únicos afectados en esta transacción
    SELECT ARRAY_AGG(DISTINCT daily_report_id)
    INTO affected_reports
    FROM (
        SELECT NEW.daily_report_id AS daily_report_id
        UNION
        SELECT OLD.daily_report_id AS daily_report_id WHERE TG_OP = 'UPDATE'
    ) reports
    WHERE daily_report_id IS NOT NULL;

    IF affected_reports IS NOT NULL AND array_length(affected_reports, 1) > 0 THEN
        FOREACH v_report_id IN ARRAY affected_reports
        LOOP
            -- Actualizar filas 'sin_recursos_asignados' que ahora tienen los recursos requeridos
            -- Respeta los flags needs_personnel y needs_equipment de service_items
            UPDATE dailyreportrows dr
            SET status = 'pendiente',
                updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
            FROM service_items si
            WHERE dr.item_id = si.id
              AND dr.status = 'sin_recursos_asignados'
              AND dr.daily_report_id = v_report_id
              AND (
                (NOT COALESCE(si.needs_personnel, true) OR EXISTS (
                  SELECT 1 FROM dailyreportemployeerelations WHERE daily_report_row_id = dr.id
                ))
                AND
                (NOT COALESCE(si.needs_equipment, true) OR EXISTS (
                  SELECT 1 FROM dailyreportequipmentrelations WHERE daily_report_row_id = dr.id
                ))
              );

            -- NOTA: La lógica de cierre de partes fue removida
            -- El cierre ahora es responsabilidad exclusiva del cronjob
            -- que ejecuta actualizar_estado_daily_reports() a las 00:00 Argentina
        END LOOP;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$function$
;

create or replace view "public"."equipments_with_pending_deviations" as  SELECT DISTINCT v.id,
    v.domain,
    v.serie,
    v.intern_number,
    v.company_id,
    tv.name AS type_name,
    count(DISTINCT cd.id) AS deviation_count,
    max(cd.created_at) AS last_deviation_date
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
  ORDER BY (max(cd.created_at)) DESC;


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
$function$
;

CREATE OR REPLACE FUNCTION public.log_equipment_relations_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_id UUID;
    readable_data JSONB;
    vehicle_data RECORD;
    other_equip_data RECORD;
    parent_exists BOOLEAN;
    ref_equipment_id UUID;
    ref_other_equipment_id UUID;
    ref_row_id UUID;
    ref_rel_id UUID;
BEGIN
    user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::UUID;

    IF TG_OP = 'DELETE' THEN
        ref_equipment_id := OLD.equipment_id;
        ref_other_equipment_id := OLD.other_equipment_id;
        ref_row_id := OLD.daily_report_row_id;
        ref_rel_id := OLD.id;
    ELSE
        ref_equipment_id := NEW.equipment_id;
        ref_other_equipment_id := NEW.other_equipment_id;
        ref_row_id := NEW.daily_report_row_id;
        ref_rel_id := NEW.id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF ref_equipment_id IS NOT NULL THEN
            SELECT v.domain, v.intern_number INTO vehicle_data
            FROM vehicles v WHERE v.id = ref_equipment_id;

            IF FOUND THEN
                readable_data := jsonb_build_object(
                    'vehiculo_id', ref_equipment_id,
                    'vehiculo_dominio', vehicle_data.domain,
                    'vehiculo_numero_interno', vehicle_data.intern_number,
                    'tipo_equipo', 'vehicle'
                );
            END IF;
        ELSIF ref_other_equipment_id IS NOT NULL THEN
            SELECT oe.intern_number, oe.serial_number, t.name as type_name
            INTO other_equip_data
            FROM other_equipment oe
            LEFT JOIN type t ON t.id = oe.type_id
            WHERE oe.id = ref_other_equipment_id;

            IF FOUND THEN
                readable_data := jsonb_build_object(
                    'otro_equipo_id', ref_other_equipment_id,
                    'otro_equipo_numero_interno', other_equip_data.intern_number,
                    'otro_equipo_numero_serie', other_equip_data.serial_number,
                    'otro_equipo_tipo', other_equip_data.type_name,
                    'tipo_equipo', 'other_equipment'
                );
            END IF;
        END IF;

        IF readable_data IS NOT NULL THEN
            INSERT INTO dailyreportrows_history (
                daily_report_row_id, related_table, related_id,
                action_type, changed_fields, changed_data, changed_by
            ) VALUES (
                ref_row_id, 'dailyreportequipmentrelations', ref_rel_id,
                'LINK', '{}'::JSONB, readable_data, user_id
            );
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        SELECT EXISTS (
            SELECT 1 FROM dailyreportrows WHERE id = ref_row_id
        ) INTO parent_exists;

        IF parent_exists THEN
            IF ref_equipment_id IS NOT NULL THEN
                SELECT v.domain, v.intern_number INTO vehicle_data
                FROM vehicles v WHERE v.id = ref_equipment_id;

                IF FOUND THEN
                    readable_data := jsonb_build_object(
                        'vehiculo_id', ref_equipment_id,
                        'vehiculo_dominio', vehicle_data.domain,
                        'vehiculo_numero_interno', vehicle_data.intern_number,
                        'tipo_equipo', 'vehicle'
                    );
                END IF;
            ELSIF ref_other_equipment_id IS NOT NULL THEN
                SELECT oe.intern_number, oe.serial_number, t.name as type_name
                INTO other_equip_data
                FROM other_equipment oe
                LEFT JOIN type t ON t.id = oe.type_id
                WHERE oe.id = ref_other_equipment_id;

                IF FOUND THEN
                    readable_data := jsonb_build_object(
                        'otro_equipo_id', ref_other_equipment_id,
                        'otro_equipo_numero_interno', other_equip_data.intern_number,
                        'otro_equipo_numero_serie', other_equip_data.serial_number,
                        'otro_equipo_tipo', other_equip_data.type_name,
                        'tipo_equipo', 'other_equipment'
                    );
                END IF;
            END IF;

            IF readable_data IS NOT NULL THEN
                INSERT INTO dailyreportrows_history (
                    daily_report_row_id, related_table, related_id,
                    action_type, changed_fields, changed_data, changed_by
                ) VALUES (
                    ref_row_id, 'dailyreportequipmentrelations', ref_rel_id,
                    'UNLINK', '{}'::JSONB, readable_data, user_id
                );
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$
;

grant delete on table "public"."contractor_other_equipment" to "postgres";

grant insert on table "public"."contractor_other_equipment" to "postgres";

grant references on table "public"."contractor_other_equipment" to "postgres";

grant select on table "public"."contractor_other_equipment" to "postgres";

grant trigger on table "public"."contractor_other_equipment" to "postgres";

grant truncate on table "public"."contractor_other_equipment" to "postgres";

grant update on table "public"."contractor_other_equipment" to "postgres";

grant delete on table "public"."other_equipment" to "postgres";

grant insert on table "public"."other_equipment" to "postgres";

grant references on table "public"."other_equipment" to "postgres";

grant select on table "public"."other_equipment" to "postgres";

grant trigger on table "public"."other_equipment" to "postgres";

grant truncate on table "public"."other_equipment" to "postgres";

grant update on table "public"."other_equipment" to "postgres";

grant delete on table "public"."other_equipment_certifications" to "postgres";

grant insert on table "public"."other_equipment_certifications" to "postgres";

grant references on table "public"."other_equipment_certifications" to "postgres";

grant select on table "public"."other_equipment_certifications" to "postgres";

grant trigger on table "public"."other_equipment_certifications" to "postgres";

grant truncate on table "public"."other_equipment_certifications" to "postgres";

grant update on table "public"."other_equipment_certifications" to "postgres";

grant delete on table "public"."sector_repair_types" to "postgres";

grant insert on table "public"."sector_repair_types" to "postgres";

grant references on table "public"."sector_repair_types" to "postgres";

grant select on table "public"."sector_repair_types" to "postgres";

grant trigger on table "public"."sector_repair_types" to "postgres";

grant truncate on table "public"."sector_repair_types" to "postgres";

grant update on table "public"."sector_repair_types" to "postgres";

grant delete on table "public"."user_table_preferences" to "postgres";

grant insert on table "public"."user_table_preferences" to "postgres";

grant references on table "public"."user_table_preferences" to "postgres";

grant select on table "public"."user_table_preferences" to "postgres";

grant trigger on table "public"."user_table_preferences" to "postgres";

grant truncate on table "public"."user_table_preferences" to "postgres";

grant update on table "public"."user_table_preferences" to "postgres";
