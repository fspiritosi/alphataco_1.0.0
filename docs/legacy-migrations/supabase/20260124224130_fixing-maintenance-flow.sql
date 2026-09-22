
  create table "public"."maintenance_order_item_repair_types" (
    "id" uuid not null default gen_random_uuid(),
    "maintenance_order_item_id" uuid not null,
    "repair_type_id" uuid not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."checklist_deviations" add column "driver_comment" text;

alter table "public"."checklist_deviations" add column "is_critical" boolean default false;

alter table "public"."maintenance_order_items" add column "is_critical" boolean default false;

alter table "public"."maintenance_request_items" add column "driver_comment" text;

alter table "public"."maintenance_requests" add column "supervisor_id" uuid;

alter table "public"."workshop_sectors" add column "max_capacity" integer;

CREATE INDEX idx_moi_repair_types_item ON public.maintenance_order_item_repair_types USING btree (maintenance_order_item_id);

CREATE INDEX idx_moi_repair_types_type ON public.maintenance_order_item_repair_types USING btree (repair_type_id);

CREATE UNIQUE INDEX maintenance_order_item_repair_maintenance_order_item_id_rep_key ON public.maintenance_order_item_repair_types USING btree (maintenance_order_item_id, repair_type_id);

CREATE UNIQUE INDEX maintenance_order_item_repair_types_pkey ON public.maintenance_order_item_repair_types USING btree (id);

alter table "public"."maintenance_order_item_repair_types" add constraint "maintenance_order_item_repair_types_pkey" PRIMARY KEY using index "maintenance_order_item_repair_types_pkey";

alter table "public"."maintenance_order_item_repair_types" add constraint "maintenance_order_item_repair_maintenance_order_item_id_rep_key" UNIQUE using index "maintenance_order_item_repair_maintenance_order_item_id_rep_key";

alter table "public"."maintenance_order_item_repair_types" add constraint "maintenance_order_item_repair_ty_maintenance_order_item_id_fkey" FOREIGN KEY (maintenance_order_item_id) REFERENCES public.maintenance_order_items(id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_order_item_repair_types" validate constraint "maintenance_order_item_repair_ty_maintenance_order_item_id_fkey";

alter table "public"."maintenance_order_item_repair_types" add constraint "maintenance_order_item_repair_types_repair_type_id_fkey" FOREIGN KEY (repair_type_id) REFERENCES public.types_of_repairs(id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_order_item_repair_types" validate constraint "maintenance_order_item_repair_types_repair_type_id_fkey";

alter table "public"."maintenance_requests" add constraint "maintenance_requests_supervisor_id_fkey" FOREIGN KEY (supervisor_id) REFERENCES public.profile(id) not valid;

alter table "public"."maintenance_requests" validate constraint "maintenance_requests_supervisor_id_fkey";

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

grant delete on table "public"."maintenance_order_item_repair_types" to "anon";

grant insert on table "public"."maintenance_order_item_repair_types" to "anon";

grant references on table "public"."maintenance_order_item_repair_types" to "anon";

grant select on table "public"."maintenance_order_item_repair_types" to "anon";

grant trigger on table "public"."maintenance_order_item_repair_types" to "anon";

grant truncate on table "public"."maintenance_order_item_repair_types" to "anon";

grant update on table "public"."maintenance_order_item_repair_types" to "anon";

grant delete on table "public"."maintenance_order_item_repair_types" to "authenticated";

grant insert on table "public"."maintenance_order_item_repair_types" to "authenticated";

grant references on table "public"."maintenance_order_item_repair_types" to "authenticated";

grant select on table "public"."maintenance_order_item_repair_types" to "authenticated";

grant trigger on table "public"."maintenance_order_item_repair_types" to "authenticated";

grant truncate on table "public"."maintenance_order_item_repair_types" to "authenticated";

grant update on table "public"."maintenance_order_item_repair_types" to "authenticated";

grant delete on table "public"."maintenance_order_item_repair_types" to "postgres";

grant insert on table "public"."maintenance_order_item_repair_types" to "postgres";

grant references on table "public"."maintenance_order_item_repair_types" to "postgres";

grant select on table "public"."maintenance_order_item_repair_types" to "postgres";

grant trigger on table "public"."maintenance_order_item_repair_types" to "postgres";

grant truncate on table "public"."maintenance_order_item_repair_types" to "postgres";

grant update on table "public"."maintenance_order_item_repair_types" to "postgres";

grant delete on table "public"."maintenance_order_item_repair_types" to "service_role";

grant insert on table "public"."maintenance_order_item_repair_types" to "service_role";

grant references on table "public"."maintenance_order_item_repair_types" to "service_role";

grant select on table "public"."maintenance_order_item_repair_types" to "service_role";

grant trigger on table "public"."maintenance_order_item_repair_types" to "service_role";

grant truncate on table "public"."maintenance_order_item_repair_types" to "service_role";

grant update on table "public"."maintenance_order_item_repair_types" to "service_role";

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


