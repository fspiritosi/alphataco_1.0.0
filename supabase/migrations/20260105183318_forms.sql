drop policy "Enable acces for users serviceRole" on "public"."profile";

drop policy "Enable read access for all users" on "public"."profile";

drop policy "Vehicles access by company" on "public"."vehicles";


  create table "public"."checklist_answer_repairs" (
    "id" uuid not null default gen_random_uuid(),
    "checklist_answer_id" uuid not null,
    "repair_solicitud_id" uuid not null,
    "item_code" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."checklist_answer_repairs" enable row level security;


  create table "public"."checklist_answers" (
    "id" uuid not null default gen_random_uuid(),
    "template_id" uuid not null,
    "equipment_id" uuid not null,
    "employee_id" uuid,
    "user_id" uuid,
    "answer_data" jsonb not null,
    "result" text,
    "observations" text,
    "critical_items_failed" text[],
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."checklist_answers" enable row level security;


  create table "public"."checklist_deviations" (
    "id" uuid not null default gen_random_uuid(),
    "checklist_answer_id" uuid not null,
    "equipment_id" uuid not null,
    "item_code" text not null,
    "item_label" text not null,
    "section_code" text,
    "created_at" timestamp with time zone default now(),
    "created_by_user_id" uuid,
    "created_by_employee_id" uuid
      );


alter table "public"."checklist_deviations" enable row level security;


  create table "public"."checklist_items" (
    "id" uuid not null default gen_random_uuid(),
    "section_id" uuid not null,
    "code" text not null,
    "label" text not null,
    "description" text,
    "input_type" text not null,
    "options" jsonb,
    "is_critical" boolean default false,
    "requires_certification" boolean default false,
    "certification_validity_days" integer,
    "requires_side_validation" boolean default false,
    "default_value" text,
    "validation_rules" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "order_index" integer
      );


alter table "public"."checklist_items" enable row level security;


  create table "public"."checklist_sections" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "name" text not null,
    "description" text,
    "is_reusable" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."checklist_sections" enable row level security;


  create table "public"."checklist_template_items" (
    "id" uuid not null default gen_random_uuid(),
    "template_id" uuid not null,
    "section_id" uuid not null,
    "item_id" uuid,
    "code" text not null,
    "label" text not null,
    "description" text,
    "input_type" text not null,
    "options" jsonb,
    "is_critical" boolean default false,
    "requires_certification" boolean default false,
    "certification_validity_days" integer,
    "requires_side_validation" boolean default false,
    "order_index" integer not null,
    "validation_rules" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."checklist_template_items" enable row level security;


  create table "public"."checklist_template_sections" (
    "id" uuid not null default gen_random_uuid(),
    "template_id" uuid not null,
    "section_id" uuid,
    "code" text not null,
    "name" text not null,
    "order_index" integer not null,
    "is_required" boolean default true,
    "is_specific" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."checklist_template_sections" enable row level security;


  create table "public"."checklist_template_sub_types" (
    "id" uuid not null default gen_random_uuid(),
    "template_id" uuid not null,
    "sub_type_id" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."checklist_template_sub_types" enable row level security;


  create table "public"."checklist_template_types" (
    "id" uuid not null default gen_random_uuid(),
    "template_id" uuid not null,
    "type_id" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."checklist_template_types" enable row level security;


  create table "public"."checklist_templates" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid not null,
    "name" text not null,
    "description" text,
    "code" text not null,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."checklist_templates" enable row level security;

CREATE UNIQUE INDEX checklist_answer_repairs_checklist_answer_id_repair_solicit_key ON public.checklist_answer_repairs USING btree (checklist_answer_id, repair_solicitud_id, item_code);

CREATE UNIQUE INDEX checklist_answer_repairs_pkey ON public.checklist_answer_repairs USING btree (id);

CREATE UNIQUE INDEX checklist_answers_pkey ON public.checklist_answers USING btree (id);

CREATE UNIQUE INDEX checklist_deviations_pkey ON public.checklist_deviations USING btree (id);

CREATE UNIQUE INDEX checklist_items_pkey ON public.checklist_items USING btree (id);

CREATE UNIQUE INDEX checklist_items_section_id_code_key ON public.checklist_items USING btree (section_id, code);

CREATE UNIQUE INDEX checklist_sections_code_key ON public.checklist_sections USING btree (code);

CREATE UNIQUE INDEX checklist_sections_pkey ON public.checklist_sections USING btree (id);

CREATE UNIQUE INDEX checklist_template_items_pkey ON public.checklist_template_items USING btree (id);

CREATE UNIQUE INDEX checklist_template_items_template_id_section_id_code_key ON public.checklist_template_items USING btree (template_id, section_id, code);

CREATE UNIQUE INDEX checklist_template_sections_pkey ON public.checklist_template_sections USING btree (id);

CREATE UNIQUE INDEX checklist_template_sections_template_id_code_key ON public.checklist_template_sections USING btree (template_id, code);

CREATE UNIQUE INDEX checklist_template_sub_types_pkey ON public.checklist_template_sub_types USING btree (id);

CREATE UNIQUE INDEX checklist_template_sub_types_template_id_sub_type_id_key ON public.checklist_template_sub_types USING btree (template_id, sub_type_id);

CREATE UNIQUE INDEX checklist_template_types_pkey ON public.checklist_template_types USING btree (id);

CREATE UNIQUE INDEX checklist_template_types_template_id_type_id_key ON public.checklist_template_types USING btree (template_id, type_id);

CREATE UNIQUE INDEX checklist_templates_company_id_code_key ON public.checklist_templates USING btree (company_id, code);

CREATE UNIQUE INDEX checklist_templates_pkey ON public.checklist_templates USING btree (id);

CREATE INDEX idx_checklist_answer_repairs_answer ON public.checklist_answer_repairs USING btree (checklist_answer_id);

CREATE INDEX idx_checklist_answer_repairs_repair ON public.checklist_answer_repairs USING btree (repair_solicitud_id);

CREATE INDEX idx_checklist_answers_created ON public.checklist_answers USING btree (created_at DESC);

CREATE INDEX idx_checklist_answers_equipment ON public.checklist_answers USING btree (equipment_id);

CREATE INDEX idx_checklist_answers_template ON public.checklist_answers USING btree (template_id);

CREATE INDEX idx_checklist_deviations_checklist_answer_id ON public.checklist_deviations USING btree (checklist_answer_id);

CREATE INDEX idx_checklist_deviations_equipment_id ON public.checklist_deviations USING btree (equipment_id);

CREATE INDEX idx_checklist_deviations_pending ON public.checklist_deviations USING btree (equipment_id) WHERE (equipment_id IS NOT NULL);

CREATE INDEX idx_checklist_items_code ON public.checklist_items USING btree (code);

CREATE INDEX idx_checklist_items_section ON public.checklist_items USING btree (section_id);

CREATE INDEX idx_checklist_template_items_section ON public.checklist_template_items USING btree (section_id);

CREATE INDEX idx_checklist_template_items_template ON public.checklist_template_items USING btree (template_id);

CREATE INDEX idx_checklist_template_sections_template ON public.checklist_template_sections USING btree (template_id);

CREATE INDEX idx_checklist_template_sub_types_sub_type ON public.checklist_template_sub_types USING btree (sub_type_id);

CREATE INDEX idx_checklist_template_sub_types_template ON public.checklist_template_sub_types USING btree (template_id);

CREATE INDEX idx_checklist_template_types_template ON public.checklist_template_types USING btree (template_id);

CREATE INDEX idx_checklist_template_types_type ON public.checklist_template_types USING btree (type_id);

CREATE INDEX idx_checklist_templates_code ON public.checklist_templates USING btree (code);

CREATE INDEX idx_checklist_templates_company ON public.checklist_templates USING btree (company_id);

alter table "public"."checklist_answer_repairs" add constraint "checklist_answer_repairs_pkey" PRIMARY KEY using index "checklist_answer_repairs_pkey";

alter table "public"."checklist_answers" add constraint "checklist_answers_pkey" PRIMARY KEY using index "checklist_answers_pkey";

alter table "public"."checklist_deviations" add constraint "checklist_deviations_pkey" PRIMARY KEY using index "checklist_deviations_pkey";

alter table "public"."checklist_items" add constraint "checklist_items_pkey" PRIMARY KEY using index "checklist_items_pkey";

alter table "public"."checklist_sections" add constraint "checklist_sections_pkey" PRIMARY KEY using index "checklist_sections_pkey";

alter table "public"."checklist_template_items" add constraint "checklist_template_items_pkey" PRIMARY KEY using index "checklist_template_items_pkey";

alter table "public"."checklist_template_sections" add constraint "checklist_template_sections_pkey" PRIMARY KEY using index "checklist_template_sections_pkey";

alter table "public"."checklist_template_sub_types" add constraint "checklist_template_sub_types_pkey" PRIMARY KEY using index "checklist_template_sub_types_pkey";

alter table "public"."checklist_template_types" add constraint "checklist_template_types_pkey" PRIMARY KEY using index "checklist_template_types_pkey";

alter table "public"."checklist_templates" add constraint "checklist_templates_pkey" PRIMARY KEY using index "checklist_templates_pkey";

alter table "public"."checklist_answer_repairs" add constraint "checklist_answer_repairs_checklist_answer_id_fkey" FOREIGN KEY (checklist_answer_id) REFERENCES public.checklist_answers(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_answer_repairs" validate constraint "checklist_answer_repairs_checklist_answer_id_fkey";

alter table "public"."checklist_answer_repairs" add constraint "checklist_answer_repairs_checklist_answer_id_repair_solicit_key" UNIQUE using index "checklist_answer_repairs_checklist_answer_id_repair_solicit_key";

alter table "public"."checklist_answer_repairs" add constraint "checklist_answer_repairs_repair_solicitud_id_fkey" FOREIGN KEY (repair_solicitud_id) REFERENCES public.repair_solicitudes(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_answer_repairs" validate constraint "checklist_answer_repairs_repair_solicitud_id_fkey";

alter table "public"."checklist_answers" add constraint "checklist_answers_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) not valid;

alter table "public"."checklist_answers" validate constraint "checklist_answers_employee_id_fkey";

alter table "public"."checklist_answers" add constraint "checklist_answers_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES public.vehicles(id) not valid;

alter table "public"."checklist_answers" validate constraint "checklist_answers_equipment_id_fkey";

alter table "public"."checklist_answers" add constraint "checklist_answers_result_check" CHECK ((result = ANY (ARRAY['B'::text, 'M'::text]))) not valid;

alter table "public"."checklist_answers" validate constraint "checklist_answers_result_check";

alter table "public"."checklist_answers" add constraint "checklist_answers_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.checklist_templates(id) not valid;

alter table "public"."checklist_answers" validate constraint "checklist_answers_template_id_fkey";

alter table "public"."checklist_answers" add constraint "checklist_answers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profile(id) not valid;

alter table "public"."checklist_answers" validate constraint "checklist_answers_user_id_fkey";

alter table "public"."checklist_deviations" add constraint "checklist_deviations_checklist_answer_id_fkey" FOREIGN KEY (checklist_answer_id) REFERENCES public.checklist_answers(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_deviations" validate constraint "checklist_deviations_checklist_answer_id_fkey";

alter table "public"."checklist_deviations" add constraint "checklist_deviations_created_by_employee_id_fkey" FOREIGN KEY (created_by_employee_id) REFERENCES public.employees(id) not valid;

alter table "public"."checklist_deviations" validate constraint "checklist_deviations_created_by_employee_id_fkey";

alter table "public"."checklist_deviations" add constraint "checklist_deviations_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES public.profile(id) not valid;

alter table "public"."checklist_deviations" validate constraint "checklist_deviations_created_by_user_id_fkey";

alter table "public"."checklist_deviations" add constraint "checklist_deviations_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES public.vehicles(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_deviations" validate constraint "checklist_deviations_equipment_id_fkey";

alter table "public"."checklist_items" add constraint "checklist_items_input_type_check" CHECK ((input_type = ANY (ARRAY['radio'::text, 'select'::text, 'date'::text, 'text'::text, 'number'::text, 'double_side'::text]))) not valid;

alter table "public"."checklist_items" validate constraint "checklist_items_input_type_check";

alter table "public"."checklist_items" add constraint "checklist_items_section_id_code_key" UNIQUE using index "checklist_items_section_id_code_key";

alter table "public"."checklist_items" add constraint "checklist_items_section_id_fkey" FOREIGN KEY (section_id) REFERENCES public.checklist_sections(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_items" validate constraint "checklist_items_section_id_fkey";

alter table "public"."checklist_sections" add constraint "checklist_sections_code_key" UNIQUE using index "checklist_sections_code_key";

alter table "public"."checklist_template_items" add constraint "checklist_template_items_input_type_check" CHECK ((input_type = ANY (ARRAY['radio'::text, 'select'::text, 'date'::text, 'text'::text, 'number'::text, 'double_side'::text]))) not valid;

alter table "public"."checklist_template_items" validate constraint "checklist_template_items_input_type_check";

alter table "public"."checklist_template_items" add constraint "checklist_template_items_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.checklist_items(id) ON DELETE SET NULL not valid;

alter table "public"."checklist_template_items" validate constraint "checklist_template_items_item_id_fkey";

alter table "public"."checklist_template_items" add constraint "checklist_template_items_section_id_fkey" FOREIGN KEY (section_id) REFERENCES public.checklist_template_sections(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_template_items" validate constraint "checklist_template_items_section_id_fkey";

alter table "public"."checklist_template_items" add constraint "checklist_template_items_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.checklist_templates(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_template_items" validate constraint "checklist_template_items_template_id_fkey";

alter table "public"."checklist_template_items" add constraint "checklist_template_items_template_id_section_id_code_key" UNIQUE using index "checklist_template_items_template_id_section_id_code_key";

alter table "public"."checklist_template_sections" add constraint "checklist_template_sections_section_id_fkey" FOREIGN KEY (section_id) REFERENCES public.checklist_sections(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_template_sections" validate constraint "checklist_template_sections_section_id_fkey";

alter table "public"."checklist_template_sections" add constraint "checklist_template_sections_template_id_code_key" UNIQUE using index "checklist_template_sections_template_id_code_key";

alter table "public"."checklist_template_sections" add constraint "checklist_template_sections_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.checklist_templates(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_template_sections" validate constraint "checklist_template_sections_template_id_fkey";

alter table "public"."checklist_template_sub_types" add constraint "checklist_template_sub_types_sub_type_id_fkey" FOREIGN KEY (sub_type_id) REFERENCES public.sub_type(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_template_sub_types" validate constraint "checklist_template_sub_types_sub_type_id_fkey";

alter table "public"."checklist_template_sub_types" add constraint "checklist_template_sub_types_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.checklist_templates(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_template_sub_types" validate constraint "checklist_template_sub_types_template_id_fkey";

alter table "public"."checklist_template_sub_types" add constraint "checklist_template_sub_types_template_id_sub_type_id_key" UNIQUE using index "checklist_template_sub_types_template_id_sub_type_id_key";

alter table "public"."checklist_template_types" add constraint "checklist_template_types_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.checklist_templates(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_template_types" validate constraint "checklist_template_types_template_id_fkey";

alter table "public"."checklist_template_types" add constraint "checklist_template_types_template_id_type_id_key" UNIQUE using index "checklist_template_types_template_id_type_id_key";

alter table "public"."checklist_template_types" add constraint "checklist_template_types_type_id_fkey" FOREIGN KEY (type_id) REFERENCES public.type(id) ON DELETE CASCADE not valid;

alter table "public"."checklist_template_types" validate constraint "checklist_template_types_type_id_fkey";

alter table "public"."checklist_templates" add constraint "checklist_templates_company_id_code_key" UNIQUE using index "checklist_templates_company_id_code_key";

alter table "public"."checklist_templates" add constraint "checklist_templates_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.company(id) not valid;

alter table "public"."checklist_templates" validate constraint "checklist_templates_company_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_vehicle_kilometer_anonymous(p_vehicle_id uuid, p_kilometer text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Actualizar el kilometraje del vehículo
  UPDATE public.vehicles
  SET kilometer = p_kilometer
  WHERE id = p_vehicle_id;
  
  -- Si no se actualizó ningún registro, lanzar error
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle with id % not found', p_vehicle_id;
  END IF;
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
    row_record RECORD;
    tiene_filas BOOLEAN;
    todas_completas BOOLEAN;
    tiene_recursos BOOLEAN;
    v_current_date_argentina DATE;
BEGIN
    -- Obtener la fecha actual en zona horaria de Argentina
    v_current_date_argentina := (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
    
    -- Recopilar todos los report_ids únicos afectados en esta transacción
    -- Esto funciona tanto para 1 fila como para múltiples filas
    SELECT ARRAY_AGG(DISTINCT daily_report_id) 
    INTO affected_reports
    FROM (
        SELECT NEW.daily_report_id AS daily_report_id
        UNION
        SELECT OLD.daily_report_id AS daily_report_id WHERE TG_OP = 'UPDATE'
    ) reports
    WHERE daily_report_id IS NOT NULL;
    
    IF affected_reports IS NOT NULL AND array_length(affected_reports, 1) > 0 THEN
 
    -- Procesar cada reporte afectado UNA SOLA VEZ
    FOREACH v_report_id IN ARRAY affected_reports
    LOOP
        -- Actualizar filas 'sin_recursos_asignados' que ahora tienen recursos
        UPDATE dailyreportrows
        SET status = 'pendiente',
            updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
        WHERE id IN (
            SELECT dr.id
            FROM dailyreportrows dr
            WHERE dr.status = 'sin_recursos_asignados'
              AND dr.daily_report_id = v_report_id
              AND EXISTS (
                  SELECT 1 FROM dailyreportemployeerelations 
                  WHERE daily_report_row_id = dr.id
                  UNION
                  SELECT 1 FROM dailyreportequipmentrelations 
                  WHERE daily_report_row_id = dr.id
              )
        );

        -- Continuar con la lógica de cierre SOLO para reportes pasados y abiertos
        -- USAR FECHA EN ZONA HORARIA ARGENTINA
        IF EXISTS (
            SELECT 1 
            FROM dailyreport 
            WHERE id = v_report_id
              AND date < v_current_date_argentina
              AND status IN ('abierto', 'cerrado_incompleto')
        ) THEN
            -- Verificar si el reporte tiene filas asociadas
            SELECT EXISTS (SELECT 1 FROM dailyreportrows WHERE daily_report_id = v_report_id) INTO tiene_filas;
            
            IF NOT tiene_filas THEN
                -- Si no tiene filas, marcarlo como cerrado_completo
                UPDATE dailyreport 
                SET status = 'cerrado_completo', 
                    updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
                WHERE id = v_report_id;
            ELSE
                -- Verificar si todas las filas están completas
                SELECT NOT EXISTS (
                    SELECT 1 
                    FROM dailyreportrows 
                    WHERE daily_report_id = v_report_id 
                    AND (
                        status NOT IN ('ejecutado', 'reprogramado', 'cancelado')
                        OR (status = 'ejecutado' AND (document_path IS NULL OR document_path = ''))
                    )
                ) INTO todas_completas;
                
                -- Actualizar el estado según corresponda
                IF todas_completas THEN
                    UPDATE dailyreport 
                    SET status = 'cerrado_completo', 
                        updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
                    WHERE id = v_report_id;
                ELSE
                    UPDATE dailyreport 
                    SET status = 'cerrado_incompleto', 
                        updated_at = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
                    WHERE id = v_report_id;
                END IF;
            END IF;
        END IF;
    END LOOP;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

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

grant delete on table "public"."checklist_answer_repairs" to "anon";

grant insert on table "public"."checklist_answer_repairs" to "anon";

grant references on table "public"."checklist_answer_repairs" to "anon";

grant select on table "public"."checklist_answer_repairs" to "anon";

grant trigger on table "public"."checklist_answer_repairs" to "anon";

grant truncate on table "public"."checklist_answer_repairs" to "anon";

grant update on table "public"."checklist_answer_repairs" to "anon";

grant delete on table "public"."checklist_answer_repairs" to "authenticated";

grant insert on table "public"."checklist_answer_repairs" to "authenticated";

grant references on table "public"."checklist_answer_repairs" to "authenticated";

grant select on table "public"."checklist_answer_repairs" to "authenticated";

grant trigger on table "public"."checklist_answer_repairs" to "authenticated";

grant truncate on table "public"."checklist_answer_repairs" to "authenticated";

grant update on table "public"."checklist_answer_repairs" to "authenticated";

grant delete on table "public"."checklist_answer_repairs" to "postgres";

grant insert on table "public"."checklist_answer_repairs" to "postgres";

grant references on table "public"."checklist_answer_repairs" to "postgres";

grant select on table "public"."checklist_answer_repairs" to "postgres";

grant trigger on table "public"."checklist_answer_repairs" to "postgres";

grant truncate on table "public"."checklist_answer_repairs" to "postgres";

grant update on table "public"."checklist_answer_repairs" to "postgres";

grant delete on table "public"."checklist_answer_repairs" to "service_role";

grant insert on table "public"."checklist_answer_repairs" to "service_role";

grant references on table "public"."checklist_answer_repairs" to "service_role";

grant select on table "public"."checklist_answer_repairs" to "service_role";

grant trigger on table "public"."checklist_answer_repairs" to "service_role";

grant truncate on table "public"."checklist_answer_repairs" to "service_role";

grant update on table "public"."checklist_answer_repairs" to "service_role";

grant delete on table "public"."checklist_answers" to "anon";

grant insert on table "public"."checklist_answers" to "anon";

grant references on table "public"."checklist_answers" to "anon";

grant select on table "public"."checklist_answers" to "anon";

grant trigger on table "public"."checklist_answers" to "anon";

grant truncate on table "public"."checklist_answers" to "anon";

grant update on table "public"."checklist_answers" to "anon";

grant delete on table "public"."checklist_answers" to "authenticated";

grant insert on table "public"."checklist_answers" to "authenticated";

grant references on table "public"."checklist_answers" to "authenticated";

grant select on table "public"."checklist_answers" to "authenticated";

grant trigger on table "public"."checklist_answers" to "authenticated";

grant truncate on table "public"."checklist_answers" to "authenticated";

grant update on table "public"."checklist_answers" to "authenticated";

grant delete on table "public"."checklist_answers" to "postgres";

grant insert on table "public"."checklist_answers" to "postgres";

grant references on table "public"."checklist_answers" to "postgres";

grant select on table "public"."checklist_answers" to "postgres";

grant trigger on table "public"."checklist_answers" to "postgres";

grant truncate on table "public"."checklist_answers" to "postgres";

grant update on table "public"."checklist_answers" to "postgres";

grant delete on table "public"."checklist_answers" to "service_role";

grant insert on table "public"."checklist_answers" to "service_role";

grant references on table "public"."checklist_answers" to "service_role";

grant select on table "public"."checklist_answers" to "service_role";

grant trigger on table "public"."checklist_answers" to "service_role";

grant truncate on table "public"."checklist_answers" to "service_role";

grant update on table "public"."checklist_answers" to "service_role";

grant delete on table "public"."checklist_deviations" to "anon";

grant insert on table "public"."checklist_deviations" to "anon";

grant references on table "public"."checklist_deviations" to "anon";

grant select on table "public"."checklist_deviations" to "anon";

grant trigger on table "public"."checklist_deviations" to "anon";

grant truncate on table "public"."checklist_deviations" to "anon";

grant update on table "public"."checklist_deviations" to "anon";

grant delete on table "public"."checklist_deviations" to "authenticated";

grant insert on table "public"."checklist_deviations" to "authenticated";

grant references on table "public"."checklist_deviations" to "authenticated";

grant select on table "public"."checklist_deviations" to "authenticated";

grant trigger on table "public"."checklist_deviations" to "authenticated";

grant truncate on table "public"."checklist_deviations" to "authenticated";

grant update on table "public"."checklist_deviations" to "authenticated";

grant delete on table "public"."checklist_deviations" to "service_role";

grant insert on table "public"."checklist_deviations" to "service_role";

grant references on table "public"."checklist_deviations" to "service_role";

grant select on table "public"."checklist_deviations" to "service_role";

grant trigger on table "public"."checklist_deviations" to "service_role";

grant truncate on table "public"."checklist_deviations" to "service_role";

grant update on table "public"."checklist_deviations" to "service_role";

grant delete on table "public"."checklist_items" to "anon";

grant insert on table "public"."checklist_items" to "anon";

grant references on table "public"."checklist_items" to "anon";

grant select on table "public"."checklist_items" to "anon";

grant trigger on table "public"."checklist_items" to "anon";

grant truncate on table "public"."checklist_items" to "anon";

grant update on table "public"."checklist_items" to "anon";

grant delete on table "public"."checklist_items" to "authenticated";

grant insert on table "public"."checklist_items" to "authenticated";

grant references on table "public"."checklist_items" to "authenticated";

grant select on table "public"."checklist_items" to "authenticated";

grant trigger on table "public"."checklist_items" to "authenticated";

grant truncate on table "public"."checklist_items" to "authenticated";

grant update on table "public"."checklist_items" to "authenticated";

grant delete on table "public"."checklist_items" to "postgres";

grant insert on table "public"."checklist_items" to "postgres";

grant references on table "public"."checklist_items" to "postgres";

grant select on table "public"."checklist_items" to "postgres";

grant trigger on table "public"."checklist_items" to "postgres";

grant truncate on table "public"."checklist_items" to "postgres";

grant update on table "public"."checklist_items" to "postgres";

grant delete on table "public"."checklist_items" to "service_role";

grant insert on table "public"."checklist_items" to "service_role";

grant references on table "public"."checklist_items" to "service_role";

grant select on table "public"."checklist_items" to "service_role";

grant trigger on table "public"."checklist_items" to "service_role";

grant truncate on table "public"."checklist_items" to "service_role";

grant update on table "public"."checklist_items" to "service_role";

grant delete on table "public"."checklist_sections" to "anon";

grant insert on table "public"."checklist_sections" to "anon";

grant references on table "public"."checklist_sections" to "anon";

grant select on table "public"."checklist_sections" to "anon";

grant trigger on table "public"."checklist_sections" to "anon";

grant truncate on table "public"."checklist_sections" to "anon";

grant update on table "public"."checklist_sections" to "anon";

grant delete on table "public"."checklist_sections" to "authenticated";

grant insert on table "public"."checklist_sections" to "authenticated";

grant references on table "public"."checklist_sections" to "authenticated";

grant select on table "public"."checklist_sections" to "authenticated";

grant trigger on table "public"."checklist_sections" to "authenticated";

grant truncate on table "public"."checklist_sections" to "authenticated";

grant update on table "public"."checklist_sections" to "authenticated";

grant delete on table "public"."checklist_sections" to "postgres";

grant insert on table "public"."checklist_sections" to "postgres";

grant references on table "public"."checklist_sections" to "postgres";

grant select on table "public"."checklist_sections" to "postgres";

grant trigger on table "public"."checklist_sections" to "postgres";

grant truncate on table "public"."checklist_sections" to "postgres";

grant update on table "public"."checklist_sections" to "postgres";

grant delete on table "public"."checklist_sections" to "service_role";

grant insert on table "public"."checklist_sections" to "service_role";

grant references on table "public"."checklist_sections" to "service_role";

grant select on table "public"."checklist_sections" to "service_role";

grant trigger on table "public"."checklist_sections" to "service_role";

grant truncate on table "public"."checklist_sections" to "service_role";

grant update on table "public"."checklist_sections" to "service_role";

grant delete on table "public"."checklist_template_items" to "anon";

grant insert on table "public"."checklist_template_items" to "anon";

grant references on table "public"."checklist_template_items" to "anon";

grant select on table "public"."checklist_template_items" to "anon";

grant trigger on table "public"."checklist_template_items" to "anon";

grant truncate on table "public"."checklist_template_items" to "anon";

grant update on table "public"."checklist_template_items" to "anon";

grant delete on table "public"."checklist_template_items" to "authenticated";

grant insert on table "public"."checklist_template_items" to "authenticated";

grant references on table "public"."checklist_template_items" to "authenticated";

grant select on table "public"."checklist_template_items" to "authenticated";

grant trigger on table "public"."checklist_template_items" to "authenticated";

grant truncate on table "public"."checklist_template_items" to "authenticated";

grant update on table "public"."checklist_template_items" to "authenticated";

grant delete on table "public"."checklist_template_items" to "postgres";

grant insert on table "public"."checklist_template_items" to "postgres";

grant references on table "public"."checklist_template_items" to "postgres";

grant select on table "public"."checklist_template_items" to "postgres";

grant trigger on table "public"."checklist_template_items" to "postgres";

grant truncate on table "public"."checklist_template_items" to "postgres";

grant update on table "public"."checklist_template_items" to "postgres";

grant delete on table "public"."checklist_template_items" to "service_role";

grant insert on table "public"."checklist_template_items" to "service_role";

grant references on table "public"."checklist_template_items" to "service_role";

grant select on table "public"."checklist_template_items" to "service_role";

grant trigger on table "public"."checklist_template_items" to "service_role";

grant truncate on table "public"."checklist_template_items" to "service_role";

grant update on table "public"."checklist_template_items" to "service_role";

grant delete on table "public"."checklist_template_sections" to "anon";

grant insert on table "public"."checklist_template_sections" to "anon";

grant references on table "public"."checklist_template_sections" to "anon";

grant select on table "public"."checklist_template_sections" to "anon";

grant trigger on table "public"."checklist_template_sections" to "anon";

grant truncate on table "public"."checklist_template_sections" to "anon";

grant update on table "public"."checklist_template_sections" to "anon";

grant delete on table "public"."checklist_template_sections" to "authenticated";

grant insert on table "public"."checklist_template_sections" to "authenticated";

grant references on table "public"."checklist_template_sections" to "authenticated";

grant select on table "public"."checklist_template_sections" to "authenticated";

grant trigger on table "public"."checklist_template_sections" to "authenticated";

grant truncate on table "public"."checklist_template_sections" to "authenticated";

grant update on table "public"."checklist_template_sections" to "authenticated";

grant delete on table "public"."checklist_template_sections" to "postgres";

grant insert on table "public"."checklist_template_sections" to "postgres";

grant references on table "public"."checklist_template_sections" to "postgres";

grant select on table "public"."checklist_template_sections" to "postgres";

grant trigger on table "public"."checklist_template_sections" to "postgres";

grant truncate on table "public"."checklist_template_sections" to "postgres";

grant update on table "public"."checklist_template_sections" to "postgres";

grant delete on table "public"."checklist_template_sections" to "service_role";

grant insert on table "public"."checklist_template_sections" to "service_role";

grant references on table "public"."checklist_template_sections" to "service_role";

grant select on table "public"."checklist_template_sections" to "service_role";

grant trigger on table "public"."checklist_template_sections" to "service_role";

grant truncate on table "public"."checklist_template_sections" to "service_role";

grant update on table "public"."checklist_template_sections" to "service_role";

grant delete on table "public"."checklist_template_sub_types" to "anon";

grant insert on table "public"."checklist_template_sub_types" to "anon";

grant references on table "public"."checklist_template_sub_types" to "anon";

grant select on table "public"."checklist_template_sub_types" to "anon";

grant trigger on table "public"."checklist_template_sub_types" to "anon";

grant truncate on table "public"."checklist_template_sub_types" to "anon";

grant update on table "public"."checklist_template_sub_types" to "anon";

grant delete on table "public"."checklist_template_sub_types" to "authenticated";

grant insert on table "public"."checklist_template_sub_types" to "authenticated";

grant references on table "public"."checklist_template_sub_types" to "authenticated";

grant select on table "public"."checklist_template_sub_types" to "authenticated";

grant trigger on table "public"."checklist_template_sub_types" to "authenticated";

grant truncate on table "public"."checklist_template_sub_types" to "authenticated";

grant update on table "public"."checklist_template_sub_types" to "authenticated";

grant delete on table "public"."checklist_template_sub_types" to "postgres";

grant insert on table "public"."checklist_template_sub_types" to "postgres";

grant references on table "public"."checklist_template_sub_types" to "postgres";

grant select on table "public"."checklist_template_sub_types" to "postgres";

grant trigger on table "public"."checklist_template_sub_types" to "postgres";

grant truncate on table "public"."checklist_template_sub_types" to "postgres";

grant update on table "public"."checklist_template_sub_types" to "postgres";

grant delete on table "public"."checklist_template_sub_types" to "service_role";

grant insert on table "public"."checklist_template_sub_types" to "service_role";

grant references on table "public"."checklist_template_sub_types" to "service_role";

grant select on table "public"."checklist_template_sub_types" to "service_role";

grant trigger on table "public"."checklist_template_sub_types" to "service_role";

grant truncate on table "public"."checklist_template_sub_types" to "service_role";

grant update on table "public"."checklist_template_sub_types" to "service_role";

grant delete on table "public"."checklist_template_types" to "anon";

grant insert on table "public"."checklist_template_types" to "anon";

grant references on table "public"."checklist_template_types" to "anon";

grant select on table "public"."checklist_template_types" to "anon";

grant trigger on table "public"."checklist_template_types" to "anon";

grant truncate on table "public"."checklist_template_types" to "anon";

grant update on table "public"."checklist_template_types" to "anon";

grant delete on table "public"."checklist_template_types" to "authenticated";

grant insert on table "public"."checklist_template_types" to "authenticated";

grant references on table "public"."checklist_template_types" to "authenticated";

grant select on table "public"."checklist_template_types" to "authenticated";

grant trigger on table "public"."checklist_template_types" to "authenticated";

grant truncate on table "public"."checklist_template_types" to "authenticated";

grant update on table "public"."checklist_template_types" to "authenticated";

grant delete on table "public"."checklist_template_types" to "postgres";

grant insert on table "public"."checklist_template_types" to "postgres";

grant references on table "public"."checklist_template_types" to "postgres";

grant select on table "public"."checklist_template_types" to "postgres";

grant trigger on table "public"."checklist_template_types" to "postgres";

grant truncate on table "public"."checklist_template_types" to "postgres";

grant update on table "public"."checklist_template_types" to "postgres";

grant delete on table "public"."checklist_template_types" to "service_role";

grant insert on table "public"."checklist_template_types" to "service_role";

grant references on table "public"."checklist_template_types" to "service_role";

grant select on table "public"."checklist_template_types" to "service_role";

grant trigger on table "public"."checklist_template_types" to "service_role";

grant truncate on table "public"."checklist_template_types" to "service_role";

grant update on table "public"."checklist_template_types" to "service_role";

grant delete on table "public"."checklist_templates" to "anon";

grant insert on table "public"."checklist_templates" to "anon";

grant references on table "public"."checklist_templates" to "anon";

grant select on table "public"."checklist_templates" to "anon";

grant trigger on table "public"."checklist_templates" to "anon";

grant truncate on table "public"."checklist_templates" to "anon";

grant update on table "public"."checklist_templates" to "anon";

grant delete on table "public"."checklist_templates" to "authenticated";

grant insert on table "public"."checklist_templates" to "authenticated";

grant references on table "public"."checklist_templates" to "authenticated";

grant select on table "public"."checklist_templates" to "authenticated";

grant trigger on table "public"."checklist_templates" to "authenticated";

grant truncate on table "public"."checklist_templates" to "authenticated";

grant update on table "public"."checklist_templates" to "authenticated";

grant delete on table "public"."checklist_templates" to "postgres";

grant insert on table "public"."checklist_templates" to "postgres";

grant references on table "public"."checklist_templates" to "postgres";

grant select on table "public"."checklist_templates" to "postgres";

grant trigger on table "public"."checklist_templates" to "postgres";

grant truncate on table "public"."checklist_templates" to "postgres";

grant update on table "public"."checklist_templates" to "postgres";

grant delete on table "public"."checklist_templates" to "service_role";

grant insert on table "public"."checklist_templates" to "service_role";

grant references on table "public"."checklist_templates" to "service_role";

grant select on table "public"."checklist_templates" to "service_role";

grant trigger on table "public"."checklist_templates" to "service_role";

grant truncate on table "public"."checklist_templates" to "service_role";

grant update on table "public"."checklist_templates" to "service_role";


  create policy "Allow all operations on checklist_answer_repairs"
  on "public"."checklist_answer_repairs"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all operations on checklist_answers"
  on "public"."checklist_answers"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Users can delete checklist_deviations"
  on "public"."checklist_deviations"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Users can insert checklist_deviations"
  on "public"."checklist_deviations"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Users can view checklist_deviations"
  on "public"."checklist_deviations"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow all operations on checklist_items"
  on "public"."checklist_items"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all operations on checklist_sections"
  on "public"."checklist_sections"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all operations on checklist_template_items"
  on "public"."checklist_template_items"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all operations on checklist_template_sections"
  on "public"."checklist_template_sections"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all operations on checklist_template_sub_types"
  on "public"."checklist_template_sub_types"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all operations on checklist_template_types"
  on "public"."checklist_template_types"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all operations on checklist_templates"
  on "public"."checklist_templates"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Profiles insert own"
  on "public"."profile"
  as permissive
  for insert
  to authenticated
with check ((id = auth.uid()));



  create policy "Profiles manage service_role"
  on "public"."profile"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Profiles read by company"
  on "public"."profile"
  as permissive
  for select
  to authenticated
using ((public.get_company_for_user(id) = public.get_company_for_user(auth.uid())));



  create policy "Profiles update own"
  on "public"."profile"
  as permissive
  for update
  to authenticated
using ((id = auth.uid()))
with check ((id = auth.uid()));



  create policy "Vehicles access by company"
  on "public"."vehicles"
  as permissive
  for all
  to authenticated, service_role
using ((company_id = public.get_company_for_user(auth.uid())))
with check ((company_id = public.get_company_for_user(auth.uid())));



