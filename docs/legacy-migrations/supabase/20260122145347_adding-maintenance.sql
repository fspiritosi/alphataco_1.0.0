create type "public"."workshop_type" as enum ('interno', 'externo');

alter table "public"."maintenance_orders" drop constraint "maintenance_orders_status_check";


  create table "public"."maintenance_order_status_history" (
    "id" uuid not null default gen_random_uuid(),
    "maintenance_order_id" uuid not null,
    "previous_status" text,
    "new_status" text not null,
    "changed_by" uuid,
    "changed_at" timestamp with time zone not null default now(),
    "notes" text,
    "rejection_reason" text,
    "scheduled_date" date
      );


alter table "public"."maintenance_order_status_history" enable row level security;


  create table "public"."workshop_sectors" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null,
    "description" text,
    "is_active" boolean not null default true,
    "workshop_id" uuid not null
      );


alter table "public"."workshop_sectors" enable row level security;


  create table "public"."workshops" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null,
    "address" text,
    "city" bigint,
    "province" bigint,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "type" public.workshop_type not null default 'interno'::public.workshop_type,
    "provider_name" text,
    "provider_phone" text,
    "provider_email" text,
    "is_active" boolean not null default true,
    "company_id" uuid not null
      );


alter table "public"."workshops" enable row level security;

alter table "public"."maintenance_orders" add column "date_approved_at" timestamp with time zone;

alter table "public"."maintenance_orders" add column "date_approved_by" uuid;

alter table "public"."maintenance_orders" add column "date_rejected_at" timestamp with time zone;

alter table "public"."maintenance_orders" add column "date_rejected_by" uuid;

alter table "public"."maintenance_orders" add column "date_rejection_reason" text;

CREATE INDEX idx_status_history_changed_at ON public.maintenance_order_status_history USING btree (changed_at DESC);

CREATE INDEX idx_status_history_order_id ON public.maintenance_order_status_history USING btree (maintenance_order_id);

CREATE INDEX idx_workshop_sectors_is_active ON public.workshop_sectors USING btree (is_active);

CREATE INDEX idx_workshop_sectors_workshop_id ON public.workshop_sectors USING btree (workshop_id);

CREATE INDEX idx_workshops_company_id ON public.workshops USING btree (company_id);

CREATE INDEX idx_workshops_is_active ON public.workshops USING btree (is_active);

CREATE INDEX idx_workshops_type ON public.workshops USING btree (type);

CREATE UNIQUE INDEX maintenance_order_status_history_pkey ON public.maintenance_order_status_history USING btree (id);

CREATE UNIQUE INDEX workshop_sectors_pkey ON public.workshop_sectors USING btree (id);

CREATE UNIQUE INDEX workshops_pkey ON public.workshops USING btree (id);

alter table "public"."maintenance_order_status_history" add constraint "maintenance_order_status_history_pkey" PRIMARY KEY using index "maintenance_order_status_history_pkey";

alter table "public"."workshop_sectors" add constraint "workshop_sectors_pkey" PRIMARY KEY using index "workshop_sectors_pkey";

alter table "public"."workshops" add constraint "workshops_pkey" PRIMARY KEY using index "workshops_pkey";

alter table "public"."maintenance_order_status_history" add constraint "maintenance_order_status_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES public.profile(id) not valid;

alter table "public"."maintenance_order_status_history" validate constraint "maintenance_order_status_history_changed_by_fkey";

alter table "public"."maintenance_order_status_history" add constraint "maintenance_order_status_history_maintenance_order_id_fkey" FOREIGN KEY (maintenance_order_id) REFERENCES public.maintenance_orders(id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_order_status_history" validate constraint "maintenance_order_status_history_maintenance_order_id_fkey";

alter table "public"."maintenance_orders" add constraint "maintenance_orders_date_approved_by_fkey" FOREIGN KEY (date_approved_by) REFERENCES public.profile(id) not valid;

alter table "public"."maintenance_orders" validate constraint "maintenance_orders_date_approved_by_fkey";

alter table "public"."maintenance_orders" add constraint "maintenance_orders_date_rejected_by_fkey" FOREIGN KEY (date_rejected_by) REFERENCES public.profile(id) not valid;

alter table "public"."maintenance_orders" validate constraint "maintenance_orders_date_rejected_by_fkey";

alter table "public"."workshop_sectors" add constraint "workshop_sectors_workshop_id_fkey" FOREIGN KEY (workshop_id) REFERENCES public.workshops(id) ON DELETE CASCADE not valid;

alter table "public"."workshop_sectors" validate constraint "workshop_sectors_workshop_id_fkey";

alter table "public"."workshops" add constraint "workshops_city_fkey" FOREIGN KEY (city) REFERENCES public.cities(id) not valid;

alter table "public"."workshops" validate constraint "workshops_city_fkey";

alter table "public"."workshops" add constraint "workshops_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE CASCADE not valid;

alter table "public"."workshops" validate constraint "workshops_company_id_fkey";

alter table "public"."workshops" add constraint "workshops_province_fkey" FOREIGN KEY (province) REFERENCES public.provinces(id) not valid;

alter table "public"."workshops" validate constraint "workshops_province_fkey";

alter table "public"."maintenance_orders" add constraint "maintenance_orders_status_check" CHECK ((status = ANY (ARRAY['pending_scheduling'::text, 'scheduled'::text, 'date_confirmed'::text, 'date_rejected'::text, 'in_workshop'::text, 'completed'::text, 'rejected'::text]))) not valid;

alter table "public"."maintenance_orders" validate constraint "maintenance_orders_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.log_maintenance_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Solo registrar si el status cambió o es un INSERT
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO maintenance_order_status_history (
      maintenance_order_id,
      previous_status,
      new_status,
      changed_by,
      changed_at,
      rejection_reason,
      scheduled_date,
      notes
    ) VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status,
      COALESCE(
        -- Intentar obtener el usuario de los campos de auditoría según el nuevo estado
        CASE NEW.status
          WHEN 'scheduled' THEN NEW.scheduled_by
          WHEN 'date_confirmed' THEN NEW.date_approved_by
          WHEN 'in_workshop' THEN NEW.workshop_approved_by  -- Corregido: era workshop_entry_by
          ELSE NULL
        END,
        -- Fallback: intentar obtener del contexto de auth
        auth.uid()
      ),
      NOW(),
      -- Capturar razón de rechazo si existe
      CASE 
        WHEN NEW.status = 'pending_scheduling' AND TG_OP = 'UPDATE' AND OLD.status = 'scheduled' 
        THEN NEW.date_rejection_reason
        ELSE NULL
      END,
      NEW.scheduled_date,
      -- Generar nota descriptiva automática
      CASE NEW.status
        WHEN 'pending_scheduling' THEN 
          CASE 
            WHEN TG_OP = 'INSERT' THEN 'Pedido creado - pendiente de programación'
            WHEN OLD.status = 'scheduled' THEN 'Fecha rechazada - requiere reprogramación'
            ELSE 'Estado cambiado a pendiente de programación'
          END
        WHEN 'scheduled' THEN 'Fecha de mantenimiento programada'
        WHEN 'date_confirmed' THEN 'Fecha aprobada por operaciones'
        WHEN 'in_workshop' THEN 'Equipo ingresado al taller'
        WHEN 'completed' THEN 'Mantenimiento completado'
        WHEN 'rejected' THEN 'Pedido rechazado'
        ELSE 'Cambio de estado'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

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


grant delete on table "public"."maintenance_order_items" to "postgres";

grant insert on table "public"."maintenance_order_items" to "postgres";

grant references on table "public"."maintenance_order_items" to "postgres";

grant select on table "public"."maintenance_order_items" to "postgres";

grant trigger on table "public"."maintenance_order_items" to "postgres";

grant truncate on table "public"."maintenance_order_items" to "postgres";

grant update on table "public"."maintenance_order_items" to "postgres";

grant delete on table "public"."maintenance_order_status_history" to "anon";

grant insert on table "public"."maintenance_order_status_history" to "anon";

grant references on table "public"."maintenance_order_status_history" to "anon";

grant select on table "public"."maintenance_order_status_history" to "anon";

grant trigger on table "public"."maintenance_order_status_history" to "anon";

grant truncate on table "public"."maintenance_order_status_history" to "anon";

grant update on table "public"."maintenance_order_status_history" to "anon";

grant delete on table "public"."maintenance_order_status_history" to "authenticated";

grant insert on table "public"."maintenance_order_status_history" to "authenticated";

grant references on table "public"."maintenance_order_status_history" to "authenticated";

grant select on table "public"."maintenance_order_status_history" to "authenticated";

grant trigger on table "public"."maintenance_order_status_history" to "authenticated";

grant truncate on table "public"."maintenance_order_status_history" to "authenticated";

grant update on table "public"."maintenance_order_status_history" to "authenticated";

grant delete on table "public"."maintenance_order_status_history" to "postgres";

grant insert on table "public"."maintenance_order_status_history" to "postgres";

grant references on table "public"."maintenance_order_status_history" to "postgres";

grant select on table "public"."maintenance_order_status_history" to "postgres";

grant trigger on table "public"."maintenance_order_status_history" to "postgres";

grant truncate on table "public"."maintenance_order_status_history" to "postgres";

grant update on table "public"."maintenance_order_status_history" to "postgres";

grant delete on table "public"."maintenance_order_status_history" to "service_role";

grant insert on table "public"."maintenance_order_status_history" to "service_role";

grant references on table "public"."maintenance_order_status_history" to "service_role";

grant select on table "public"."maintenance_order_status_history" to "service_role";

grant trigger on table "public"."maintenance_order_status_history" to "service_role";

grant truncate on table "public"."maintenance_order_status_history" to "service_role";

grant update on table "public"."maintenance_order_status_history" to "service_role";

grant delete on table "public"."maintenance_orders" to "postgres";

grant insert on table "public"."maintenance_orders" to "postgres";

grant references on table "public"."maintenance_orders" to "postgres";

grant select on table "public"."maintenance_orders" to "postgres";

grant trigger on table "public"."maintenance_orders" to "postgres";

grant truncate on table "public"."maintenance_orders" to "postgres";

grant update on table "public"."maintenance_orders" to "postgres";

grant delete on table "public"."maintenance_request_items" to "postgres";

grant insert on table "public"."maintenance_request_items" to "postgres";

grant references on table "public"."maintenance_request_items" to "postgres";

grant select on table "public"."maintenance_request_items" to "postgres";

grant trigger on table "public"."maintenance_request_items" to "postgres";

grant truncate on table "public"."maintenance_request_items" to "postgres";

grant update on table "public"."maintenance_request_items" to "postgres";

grant delete on table "public"."maintenance_requests" to "postgres";

grant insert on table "public"."maintenance_requests" to "postgres";

grant references on table "public"."maintenance_requests" to "postgres";

grant select on table "public"."maintenance_requests" to "postgres";

grant trigger on table "public"."maintenance_requests" to "postgres";

grant truncate on table "public"."maintenance_requests" to "postgres";

grant update on table "public"."maintenance_requests" to "postgres";

grant delete on table "public"."sub_type_compatible_items" to "postgres";

grant insert on table "public"."sub_type_compatible_items" to "postgres";

grant references on table "public"."sub_type_compatible_items" to "postgres";

grant select on table "public"."sub_type_compatible_items" to "postgres";

grant trigger on table "public"."sub_type_compatible_items" to "postgres";

grant truncate on table "public"."sub_type_compatible_items" to "postgres";

grant update on table "public"."sub_type_compatible_items" to "postgres";

grant delete on table "public"."type_hitch_types" to "postgres";

grant insert on table "public"."type_hitch_types" to "postgres";

grant references on table "public"."type_hitch_types" to "postgres";

grant select on table "public"."type_hitch_types" to "postgres";

grant trigger on table "public"."type_hitch_types" to "postgres";

grant truncate on table "public"."type_hitch_types" to "postgres";

grant update on table "public"."type_hitch_types" to "postgres";

grant delete on table "public"."workshop_sectors" to "anon";

grant insert on table "public"."workshop_sectors" to "anon";

grant references on table "public"."workshop_sectors" to "anon";

grant select on table "public"."workshop_sectors" to "anon";

grant trigger on table "public"."workshop_sectors" to "anon";

grant truncate on table "public"."workshop_sectors" to "anon";

grant update on table "public"."workshop_sectors" to "anon";

grant delete on table "public"."workshop_sectors" to "authenticated";

grant insert on table "public"."workshop_sectors" to "authenticated";

grant references on table "public"."workshop_sectors" to "authenticated";

grant select on table "public"."workshop_sectors" to "authenticated";

grant trigger on table "public"."workshop_sectors" to "authenticated";

grant truncate on table "public"."workshop_sectors" to "authenticated";

grant update on table "public"."workshop_sectors" to "authenticated";

grant delete on table "public"."workshop_sectors" to "postgres";

grant insert on table "public"."workshop_sectors" to "postgres";

grant references on table "public"."workshop_sectors" to "postgres";

grant select on table "public"."workshop_sectors" to "postgres";

grant trigger on table "public"."workshop_sectors" to "postgres";

grant truncate on table "public"."workshop_sectors" to "postgres";

grant update on table "public"."workshop_sectors" to "postgres";

grant delete on table "public"."workshop_sectors" to "service_role";

grant insert on table "public"."workshop_sectors" to "service_role";

grant references on table "public"."workshop_sectors" to "service_role";

grant select on table "public"."workshop_sectors" to "service_role";

grant trigger on table "public"."workshop_sectors" to "service_role";

grant truncate on table "public"."workshop_sectors" to "service_role";

grant update on table "public"."workshop_sectors" to "service_role";

grant delete on table "public"."workshops" to "anon";

grant insert on table "public"."workshops" to "anon";

grant references on table "public"."workshops" to "anon";

grant select on table "public"."workshops" to "anon";

grant trigger on table "public"."workshops" to "anon";

grant truncate on table "public"."workshops" to "anon";

grant update on table "public"."workshops" to "anon";

grant delete on table "public"."workshops" to "authenticated";

grant insert on table "public"."workshops" to "authenticated";

grant references on table "public"."workshops" to "authenticated";

grant select on table "public"."workshops" to "authenticated";

grant trigger on table "public"."workshops" to "authenticated";

grant truncate on table "public"."workshops" to "authenticated";

grant update on table "public"."workshops" to "authenticated";

grant delete on table "public"."workshops" to "postgres";

grant insert on table "public"."workshops" to "postgres";

grant references on table "public"."workshops" to "postgres";

grant select on table "public"."workshops" to "postgres";

grant trigger on table "public"."workshops" to "postgres";

grant truncate on table "public"."workshops" to "postgres";

grant update on table "public"."workshops" to "postgres";

grant delete on table "public"."workshops" to "service_role";

grant insert on table "public"."workshops" to "service_role";

grant references on table "public"."workshops" to "service_role";

grant select on table "public"."workshops" to "service_role";

grant trigger on table "public"."workshops" to "service_role";

grant truncate on table "public"."workshops" to "service_role";

grant update on table "public"."workshops" to "service_role";


  create policy "Sistema puede insertar historial"
  on "public"."maintenance_order_status_history"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Usuarios autenticados pueden ver historial de estados"
  on "public"."maintenance_order_status_history"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Workshop sectors access by company"
  on "public"."workshop_sectors"
  as permissive
  for all
  to authenticated, service_role
using ((workshop_id IN ( SELECT workshops.id
   FROM public.workshops
  WHERE (workshops.company_id = public.get_company_for_user(auth.uid())))));



  create policy "Workshops access by company"
  on "public"."workshops"
  as permissive
  for all
  to authenticated, service_role
using ((company_id = public.get_company_for_user(auth.uid())));


CREATE TRIGGER trigger_log_maintenance_order_status AFTER INSERT OR UPDATE OF status ON public.maintenance_orders FOR EACH ROW EXECUTE FUNCTION public.log_maintenance_order_status_change();

-- CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();

-- CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

-- CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

-- CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

-- CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();

-- CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

-- CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


