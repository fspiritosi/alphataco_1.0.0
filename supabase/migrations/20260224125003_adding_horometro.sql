alter table "public"."maintenance_orders" drop constraint "maintenance_orders_status_check";

alter table "public"."preparte_change_logs" drop constraint "preparte_change_logs_changed_by_fkey";


  create table "public"."contractor_other_equipment" (
    "id" uuid not null default gen_random_uuid(),
    "equipment_id" uuid not null,
    "contractor_id" uuid not null
      );


alter table "public"."contractor_other_equipment" enable row level security;


  create table "public"."other_equipment" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid not null,
    "type_id" uuid not null,
    "sub_type_id" uuid,
    "brand_id" integer,
    "model_id" integer,
    "serial_number" text,
    "year" text,
    "condition" public.condition_enum,
    "status" public.status_type,
    "is_active" boolean not null default true,
    "intern_number" text,
    "pictures" text[] not null default '{}'::text[],
    "horometer" numeric,
    "blueprints" text[] not null default '{}'::text[],
    "manufacturer_plate" text,
    "composition" text,
    "invoice_number" text,
    "initial_value" numeric,
    "currency" public.currency_enum,
    "purchase_date" date,
    "cost_type" public.cost_type_enum,
    "cost_center_id" uuid,
    "sector" uuid,
    "linked_vehicle_id" uuid,
    "owner_id" uuid,
    "reason_for_termination" public.termination_reason_enum,
    "termination_date" date,
    "user_id" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."other_equipment" enable row level security;


  create table "public"."other_equipment_certifications" (
    "id" uuid not null default gen_random_uuid(),
    "equipment_id" uuid not null,
    "name" text not null,
    "file_url" text not null,
    "expiration_date" date,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."other_equipment_certifications" enable row level security;


  create table "public"."user_table_preferences" (
    "user_id" text not null,
    "preferences" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_table_preferences" enable row level security;

alter table "public"."document_types" add column "equipment_type" character varying(20) default NULL::character varying;

alter table "public"."employees" add column "full_name" text generated always as (((COALESCE(lastname, ''::text) || ' '::text) || COALESCE(firstname, ''::text))) stored;

alter table "public"."maintenance_order_items" add column "is_rejected" boolean not null default false;

alter table "public"."maintenance_order_items" add column "rejected_at" timestamp with time zone;

alter table "public"."maintenance_order_items" add column "rejected_by" uuid;

alter table "public"."maintenance_order_items" add column "rejection_reason" text;

alter table "public"."maintenance_order_items" add column "workshop_chief_comment" text;

alter table "public"."maintenance_order_items" add column "workshop_chief_comment_by" uuid;

alter table "public"."maintenance_orders" add column "engine_hours_at_entry" text;

alter table "public"."maintenance_request_items" add column "driver_comment_by" uuid;

alter table "public"."maintenance_request_items" add column "supervisor_comment" text;

alter table "public"."maintenance_request_items" add column "supervisor_comment_by" uuid;

alter table "public"."maintenance_request_items" add column "validator_comment_by" uuid;

alter table "public"."maintenance_requests" add column "engine_hours" text;

alter table "public"."profile" disable row level security;

alter table "public"."service_items" add column "needs_equipment" boolean not null default true;

alter table "public"."service_items" add column "needs_personnel" boolean not null default true;

alter table "public"."type" add column "applies_to" character varying(20) default 'vehicle'::character varying;

alter table "public"."type" add column "generates_qr" boolean default true;

alter table "public"."vehicles" add column "engine_hours" text default '0'::text;

alter table "public"."work_order_item_repairs" add column "technician_notes_by" uuid;

CREATE UNIQUE INDEX contractor_other_equipment_equipment_id_contractor_id_key ON public.contractor_other_equipment USING btree (equipment_id, contractor_id);

CREATE UNIQUE INDEX contractor_other_equipment_pkey ON public.contractor_other_equipment USING btree (id);

CREATE INDEX idx_contractor_other_equipment_contractor ON public.contractor_other_equipment USING btree (contractor_id);

CREATE INDEX idx_contractor_other_equipment_equipment ON public.contractor_other_equipment USING btree (equipment_id);

CREATE INDEX idx_document_types_equipment_type ON public.document_types USING btree (equipment_type);

CREATE INDEX idx_other_equipment_certifications_equipment ON public.other_equipment_certifications USING btree (equipment_id);

CREATE INDEX idx_other_equipment_company_id ON public.other_equipment USING btree (company_id);

CREATE INDEX idx_other_equipment_is_active ON public.other_equipment USING btree (is_active);

CREATE INDEX idx_other_equipment_linked_vehicle ON public.other_equipment USING btree (linked_vehicle_id);

CREATE INDEX idx_other_equipment_type_id ON public.other_equipment USING btree (type_id);

CREATE INDEX idx_type_applies_to ON public.type USING btree (applies_to);

CREATE UNIQUE INDEX other_equipment_certifications_pkey ON public.other_equipment_certifications USING btree (id);

CREATE UNIQUE INDEX other_equipment_pkey ON public.other_equipment USING btree (id);

CREATE UNIQUE INDEX user_table_preferences_pkey ON public.user_table_preferences USING btree (user_id);

alter table "public"."contractor_other_equipment" add constraint "contractor_other_equipment_pkey" PRIMARY KEY using index "contractor_other_equipment_pkey";

alter table "public"."other_equipment" add constraint "other_equipment_pkey" PRIMARY KEY using index "other_equipment_pkey";

alter table "public"."other_equipment_certifications" add constraint "other_equipment_certifications_pkey" PRIMARY KEY using index "other_equipment_certifications_pkey";

alter table "public"."user_table_preferences" add constraint "user_table_preferences_pkey" PRIMARY KEY using index "user_table_preferences_pkey";

alter table "public"."contractor_other_equipment" add constraint "contractor_other_equipment_contractor_id_fkey" FOREIGN KEY (contractor_id) REFERENCES public.customers(id) not valid;

alter table "public"."contractor_other_equipment" validate constraint "contractor_other_equipment_contractor_id_fkey";

alter table "public"."contractor_other_equipment" add constraint "contractor_other_equipment_equipment_id_contractor_id_key" UNIQUE using index "contractor_other_equipment_equipment_id_contractor_id_key";

alter table "public"."contractor_other_equipment" add constraint "contractor_other_equipment_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES public.other_equipment(id) ON DELETE CASCADE not valid;

alter table "public"."contractor_other_equipment" validate constraint "contractor_other_equipment_equipment_id_fkey";

alter table "public"."document_types" add constraint "document_types_equipment_type_check" CHECK (((equipment_type)::text = ANY ((ARRAY['vehicle'::character varying, 'other_equipment'::character varying])::text[]))) not valid;

alter table "public"."document_types" validate constraint "document_types_equipment_type_check";

alter table "public"."maintenance_order_items" add constraint "maintenance_order_items_rejected_by_fkey" FOREIGN KEY (rejected_by) REFERENCES public.profile(id) not valid;

alter table "public"."maintenance_order_items" validate constraint "maintenance_order_items_rejected_by_fkey";

alter table "public"."maintenance_order_items" add constraint "maintenance_order_items_workshop_chief_comment_by_fkey" FOREIGN KEY (workshop_chief_comment_by) REFERENCES public.profile(id) ON DELETE SET NULL not valid;

alter table "public"."maintenance_order_items" validate constraint "maintenance_order_items_workshop_chief_comment_by_fkey";

alter table "public"."maintenance_request_items" add constraint "maintenance_request_items_driver_comment_by_fkey" FOREIGN KEY (driver_comment_by) REFERENCES public.profile(id) ON DELETE SET NULL not valid;

alter table "public"."maintenance_request_items" validate constraint "maintenance_request_items_driver_comment_by_fkey";

alter table "public"."maintenance_request_items" add constraint "maintenance_request_items_supervisor_comment_by_fkey" FOREIGN KEY (supervisor_comment_by) REFERENCES public.profile(id) ON DELETE SET NULL not valid;

alter table "public"."maintenance_request_items" validate constraint "maintenance_request_items_supervisor_comment_by_fkey";

alter table "public"."maintenance_request_items" add constraint "maintenance_request_items_validator_comment_by_fkey" FOREIGN KEY (validator_comment_by) REFERENCES public.profile(id) ON DELETE SET NULL not valid;

alter table "public"."maintenance_request_items" validate constraint "maintenance_request_items_validator_comment_by_fkey";

alter table "public"."other_equipment" add constraint "other_equipment_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES public.brand_vehicles(id) not valid;

alter table "public"."other_equipment" validate constraint "other_equipment_brand_id_fkey";

alter table "public"."other_equipment" add constraint "other_equipment_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.company(id) not valid;

alter table "public"."other_equipment" validate constraint "other_equipment_company_id_fkey";

alter table "public"."other_equipment" add constraint "other_equipment_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES public.cost_center(id) not valid;

alter table "public"."other_equipment" validate constraint "other_equipment_cost_center_id_fkey";

alter table "public"."other_equipment" add constraint "other_equipment_linked_vehicle_id_fkey" FOREIGN KEY (linked_vehicle_id) REFERENCES public.vehicles(id) not valid;

alter table "public"."other_equipment" validate constraint "other_equipment_linked_vehicle_id_fkey";

alter table "public"."other_equipment" add constraint "other_equipment_model_id_fkey" FOREIGN KEY (model_id) REFERENCES public.model_vehicles(id) not valid;

alter table "public"."other_equipment" validate constraint "other_equipment_model_id_fkey";

alter table "public"."other_equipment" add constraint "other_equipment_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.equipment_owners(id) not valid;

alter table "public"."other_equipment" validate constraint "other_equipment_owner_id_fkey";

alter table "public"."other_equipment" add constraint "other_equipment_sector_fkey" FOREIGN KEY (sector) REFERENCES public.hierarchy(id) not valid;

alter table "public"."other_equipment" validate constraint "other_equipment_sector_fkey";

alter table "public"."other_equipment" add constraint "other_equipment_sub_type_id_fkey" FOREIGN KEY (sub_type_id) REFERENCES public.sub_type(id) not valid;

alter table "public"."other_equipment" validate constraint "other_equipment_sub_type_id_fkey";

alter table "public"."other_equipment" add constraint "other_equipment_type_id_fkey" FOREIGN KEY (type_id) REFERENCES public.type(id) not valid;

alter table "public"."other_equipment" validate constraint "other_equipment_type_id_fkey";

alter table "public"."other_equipment" add constraint "other_equipment_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profile(id) not valid;

alter table "public"."other_equipment" validate constraint "other_equipment_user_id_fkey";

alter table "public"."other_equipment_certifications" add constraint "other_equipment_certifications_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES public.other_equipment(id) ON DELETE CASCADE not valid;

alter table "public"."other_equipment_certifications" validate constraint "other_equipment_certifications_equipment_id_fkey";

alter table "public"."type" add constraint "type_applies_to_check" CHECK (((applies_to)::text = ANY ((ARRAY['vehicle'::character varying, 'other_equipment'::character varying])::text[]))) not valid;

alter table "public"."type" validate constraint "type_applies_to_check";

alter table "public"."work_order_item_repairs" add constraint "work_order_item_repairs_technician_notes_by_fkey" FOREIGN KEY (technician_notes_by) REFERENCES public.profile(id) ON DELETE SET NULL not valid;

alter table "public"."work_order_item_repairs" validate constraint "work_order_item_repairs_technician_notes_by_fkey";

alter table "public"."maintenance_orders" add constraint "maintenance_orders_status_check" CHECK ((status = ANY (ARRAY['pending_scheduling'::text, 'scheduled'::text, 'date_confirmed'::text, 'date_rejected'::text, 'in_workshop'::text, 'pending_workshop_validation'::text, 'pending_operations_validation'::text, 'completed'::text, 'rejected'::text, 'operations_rejected'::text, 'workshop_rejected'::text]))) not valid;

alter table "public"."maintenance_orders" validate constraint "maintenance_orders_status_check";

alter table "public"."preparte_change_logs" add constraint "preparte_change_logs_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES public.profile(credential_id) not valid;

alter table "public"."preparte_change_logs" validate constraint "preparte_change_logs_changed_by_fkey";

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

grant delete on table "public"."contractor_other_equipment" to "anon";

grant insert on table "public"."contractor_other_equipment" to "anon";

grant references on table "public"."contractor_other_equipment" to "anon";

grant select on table "public"."contractor_other_equipment" to "anon";

grant trigger on table "public"."contractor_other_equipment" to "anon";

grant truncate on table "public"."contractor_other_equipment" to "anon";

grant update on table "public"."contractor_other_equipment" to "anon";

grant delete on table "public"."contractor_other_equipment" to "authenticated";

grant insert on table "public"."contractor_other_equipment" to "authenticated";

grant references on table "public"."contractor_other_equipment" to "authenticated";

grant select on table "public"."contractor_other_equipment" to "authenticated";

grant trigger on table "public"."contractor_other_equipment" to "authenticated";

grant truncate on table "public"."contractor_other_equipment" to "authenticated";

grant update on table "public"."contractor_other_equipment" to "authenticated";

grant delete on table "public"."contractor_other_equipment" to "postgres";

grant insert on table "public"."contractor_other_equipment" to "postgres";

grant references on table "public"."contractor_other_equipment" to "postgres";

grant select on table "public"."contractor_other_equipment" to "postgres";

grant trigger on table "public"."contractor_other_equipment" to "postgres";

grant truncate on table "public"."contractor_other_equipment" to "postgres";

grant update on table "public"."contractor_other_equipment" to "postgres";

grant delete on table "public"."contractor_other_equipment" to "service_role";

grant insert on table "public"."contractor_other_equipment" to "service_role";

grant references on table "public"."contractor_other_equipment" to "service_role";

grant select on table "public"."contractor_other_equipment" to "service_role";

grant trigger on table "public"."contractor_other_equipment" to "service_role";

grant truncate on table "public"."contractor_other_equipment" to "service_role";

grant update on table "public"."contractor_other_equipment" to "service_role";

grant delete on table "public"."other_equipment" to "anon";

grant insert on table "public"."other_equipment" to "anon";

grant references on table "public"."other_equipment" to "anon";

grant select on table "public"."other_equipment" to "anon";

grant trigger on table "public"."other_equipment" to "anon";

grant truncate on table "public"."other_equipment" to "anon";

grant update on table "public"."other_equipment" to "anon";

grant delete on table "public"."other_equipment" to "authenticated";

grant insert on table "public"."other_equipment" to "authenticated";

grant references on table "public"."other_equipment" to "authenticated";

grant select on table "public"."other_equipment" to "authenticated";

grant trigger on table "public"."other_equipment" to "authenticated";

grant truncate on table "public"."other_equipment" to "authenticated";

grant update on table "public"."other_equipment" to "authenticated";

grant delete on table "public"."other_equipment" to "postgres";

grant insert on table "public"."other_equipment" to "postgres";

grant references on table "public"."other_equipment" to "postgres";

grant select on table "public"."other_equipment" to "postgres";

grant trigger on table "public"."other_equipment" to "postgres";

grant truncate on table "public"."other_equipment" to "postgres";

grant update on table "public"."other_equipment" to "postgres";

grant delete on table "public"."other_equipment" to "service_role";

grant insert on table "public"."other_equipment" to "service_role";

grant references on table "public"."other_equipment" to "service_role";

grant select on table "public"."other_equipment" to "service_role";

grant trigger on table "public"."other_equipment" to "service_role";

grant truncate on table "public"."other_equipment" to "service_role";

grant update on table "public"."other_equipment" to "service_role";

grant delete on table "public"."other_equipment_certifications" to "anon";

grant insert on table "public"."other_equipment_certifications" to "anon";

grant references on table "public"."other_equipment_certifications" to "anon";

grant select on table "public"."other_equipment_certifications" to "anon";

grant trigger on table "public"."other_equipment_certifications" to "anon";

grant truncate on table "public"."other_equipment_certifications" to "anon";

grant update on table "public"."other_equipment_certifications" to "anon";

grant delete on table "public"."other_equipment_certifications" to "authenticated";

grant insert on table "public"."other_equipment_certifications" to "authenticated";

grant references on table "public"."other_equipment_certifications" to "authenticated";

grant select on table "public"."other_equipment_certifications" to "authenticated";

grant trigger on table "public"."other_equipment_certifications" to "authenticated";

grant truncate on table "public"."other_equipment_certifications" to "authenticated";

grant update on table "public"."other_equipment_certifications" to "authenticated";

grant delete on table "public"."other_equipment_certifications" to "postgres";

grant insert on table "public"."other_equipment_certifications" to "postgres";

grant references on table "public"."other_equipment_certifications" to "postgres";

grant select on table "public"."other_equipment_certifications" to "postgres";

grant trigger on table "public"."other_equipment_certifications" to "postgres";

grant truncate on table "public"."other_equipment_certifications" to "postgres";

grant update on table "public"."other_equipment_certifications" to "postgres";

grant delete on table "public"."other_equipment_certifications" to "service_role";

grant insert on table "public"."other_equipment_certifications" to "service_role";

grant references on table "public"."other_equipment_certifications" to "service_role";

grant select on table "public"."other_equipment_certifications" to "service_role";

grant trigger on table "public"."other_equipment_certifications" to "service_role";

grant truncate on table "public"."other_equipment_certifications" to "service_role";

grant update on table "public"."other_equipment_certifications" to "service_role";

grant delete on table "public"."sector_repair_types" to "postgres";

grant insert on table "public"."sector_repair_types" to "postgres";

grant references on table "public"."sector_repair_types" to "postgres";

grant select on table "public"."sector_repair_types" to "postgres";

grant trigger on table "public"."sector_repair_types" to "postgres";

grant truncate on table "public"."sector_repair_types" to "postgres";

grant update on table "public"."sector_repair_types" to "postgres";

grant delete on table "public"."user_table_preferences" to "anon";

grant insert on table "public"."user_table_preferences" to "anon";

grant references on table "public"."user_table_preferences" to "anon";

grant select on table "public"."user_table_preferences" to "anon";

grant trigger on table "public"."user_table_preferences" to "anon";

grant truncate on table "public"."user_table_preferences" to "anon";

grant update on table "public"."user_table_preferences" to "anon";

grant delete on table "public"."user_table_preferences" to "authenticated";

grant insert on table "public"."user_table_preferences" to "authenticated";

grant references on table "public"."user_table_preferences" to "authenticated";

grant select on table "public"."user_table_preferences" to "authenticated";

grant trigger on table "public"."user_table_preferences" to "authenticated";

grant truncate on table "public"."user_table_preferences" to "authenticated";

grant update on table "public"."user_table_preferences" to "authenticated";

grant delete on table "public"."user_table_preferences" to "postgres";

grant insert on table "public"."user_table_preferences" to "postgres";

grant references on table "public"."user_table_preferences" to "postgres";

grant select on table "public"."user_table_preferences" to "postgres";

grant trigger on table "public"."user_table_preferences" to "postgres";

grant truncate on table "public"."user_table_preferences" to "postgres";

grant update on table "public"."user_table_preferences" to "postgres";

grant delete on table "public"."user_table_preferences" to "service_role";

grant insert on table "public"."user_table_preferences" to "service_role";

grant references on table "public"."user_table_preferences" to "service_role";

grant select on table "public"."user_table_preferences" to "service_role";

grant trigger on table "public"."user_table_preferences" to "service_role";

grant truncate on table "public"."user_table_preferences" to "service_role";

grant update on table "public"."user_table_preferences" to "service_role";


  create policy "Contractor other equipment access by company"
  on "public"."contractor_other_equipment"
  as permissive
  for all
  to authenticated, service_role
using ((equipment_id IN ( SELECT other_equipment.id
   FROM public.other_equipment
  WHERE (other_equipment.company_id = public.get_company_for_user(auth.uid())))))
with check ((equipment_id IN ( SELECT other_equipment.id
   FROM public.other_equipment
  WHERE (other_equipment.company_id = public.get_company_for_user(auth.uid())))));



  create policy "Other equipment access by company"
  on "public"."other_equipment"
  as permissive
  for all
  to authenticated, service_role
using ((company_id = public.get_company_for_user(auth.uid())))
with check ((company_id = public.get_company_for_user(auth.uid())));



  create policy "Other equipment certifications access by company"
  on "public"."other_equipment_certifications"
  as permissive
  for all
  to authenticated, service_role
using ((equipment_id IN ( SELECT other_equipment.id
   FROM public.other_equipment
  WHERE (other_equipment.company_id = public.get_company_for_user(auth.uid())))))
with check ((equipment_id IN ( SELECT other_equipment.id
   FROM public.other_equipment
  WHERE (other_equipment.company_id = public.get_company_for_user(auth.uid())))));
