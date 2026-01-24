create type "public"."work_order_item_status" as enum ('pending', 'in_progress', 'completed', 'cancelled');

create type "public"."work_order_status" as enum ('pending', 'in_progress', 'completed', 'cancelled');


  create table "public"."work_order_items" (
    "id" uuid not null default gen_random_uuid(),
    "work_order_id" uuid not null,
    "maintenance_order_item_id" uuid not null,
    "status" public.work_order_item_status not null default 'pending'::public.work_order_item_status,
    "technician_notes" text,
    "completed_at" timestamp with time zone,
    "completed_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."work_orders" (
    "id" uuid not null default gen_random_uuid(),
    "order_number" text not null,
    "sequence_number" integer not null,
    "company_id" uuid not null,
    "equipment_id" uuid not null,
    "workshop_id" uuid not null,
    "sector_id" uuid,
    "status" public.work_order_status not null default 'pending'::public.work_order_status,
    "planned_start_date" date not null,
    "planned_end_date" date not null,
    "actual_start_date" timestamp with time zone,
    "actual_end_date" timestamp with time zone,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "started_by" uuid,
    "started_at" timestamp with time zone,
    "completed_by" uuid,
    "completed_at" timestamp with time zone,
    "cancelled_by" uuid,
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" text
      );


alter table "public"."maintenance_order_items" add column "assigned_at" timestamp with time zone;

alter table "public"."maintenance_order_items" add column "assigned_by" uuid;

alter table "public"."maintenance_order_items" add column "assigned_sector_id" uuid;

alter table "public"."maintenance_order_items" add column "assigned_workshop_id" uuid;

alter table "public"."maintenance_order_items" add column "planned_end_date" date;

alter table "public"."maintenance_order_items" add column "planned_start_date" date;

alter table "public"."maintenance_order_items" add column "work_order_id" uuid;

alter table "public"."maintenance_order_items" alter column "maintenance_request_item_id" drop not null;

alter table "public"."maintenance_request_items" add column "description" text;

CREATE INDEX idx_moi_assigned_sector ON public.maintenance_order_items USING btree (assigned_sector_id);

CREATE INDEX idx_moi_assigned_workshop ON public.maintenance_order_items USING btree (assigned_workshop_id);

CREATE INDEX idx_moi_planned_dates ON public.maintenance_order_items USING btree (planned_start_date, planned_end_date);

CREATE INDEX idx_moi_work_order ON public.maintenance_order_items USING btree (work_order_id);

CREATE INDEX idx_work_order_items_maintenance_item ON public.work_order_items USING btree (maintenance_order_item_id);

CREATE INDEX idx_work_order_items_status ON public.work_order_items USING btree (status);

CREATE INDEX idx_work_order_items_work_order ON public.work_order_items USING btree (work_order_id);

CREATE INDEX idx_work_orders_company ON public.work_orders USING btree (company_id);

CREATE INDEX idx_work_orders_dates ON public.work_orders USING btree (planned_start_date, planned_end_date);

CREATE INDEX idx_work_orders_equipment ON public.work_orders USING btree (equipment_id);

CREATE INDEX idx_work_orders_sector ON public.work_orders USING btree (sector_id);

CREATE INDEX idx_work_orders_sequence ON public.work_orders USING btree (sequence_number DESC);

CREATE INDEX idx_work_orders_status ON public.work_orders USING btree (status);

CREATE INDEX idx_work_orders_workshop ON public.work_orders USING btree (workshop_id);

CREATE UNIQUE INDEX unique_maintenance_item_per_active_work_order ON public.work_order_items USING btree (maintenance_order_item_id, work_order_id);

CREATE UNIQUE INDEX work_order_items_pkey ON public.work_order_items USING btree (id);

CREATE UNIQUE INDEX work_orders_order_number_key ON public.work_orders USING btree (order_number);

CREATE UNIQUE INDEX work_orders_pkey ON public.work_orders USING btree (id);

alter table "public"."work_order_items" add constraint "work_order_items_pkey" PRIMARY KEY using index "work_order_items_pkey";

alter table "public"."work_orders" add constraint "work_orders_pkey" PRIMARY KEY using index "work_orders_pkey";

alter table "public"."maintenance_order_items" add constraint "maintenance_order_items_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES public.profile(id) not valid;

alter table "public"."maintenance_order_items" validate constraint "maintenance_order_items_assigned_by_fkey";

alter table "public"."maintenance_order_items" add constraint "maintenance_order_items_assigned_sector_id_fkey" FOREIGN KEY (assigned_sector_id) REFERENCES public.workshop_sectors(id) ON DELETE SET NULL not valid;

alter table "public"."maintenance_order_items" validate constraint "maintenance_order_items_assigned_sector_id_fkey";

alter table "public"."maintenance_order_items" add constraint "maintenance_order_items_assigned_workshop_id_fkey" FOREIGN KEY (assigned_workshop_id) REFERENCES public.workshops(id) ON DELETE SET NULL not valid;

alter table "public"."maintenance_order_items" validate constraint "maintenance_order_items_assigned_workshop_id_fkey";

alter table "public"."maintenance_order_items" add constraint "maintenance_order_items_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE SET NULL not valid;

alter table "public"."maintenance_order_items" validate constraint "maintenance_order_items_work_order_id_fkey";

alter table "public"."work_order_items" add constraint "unique_maintenance_item_per_active_work_order" UNIQUE using index "unique_maintenance_item_per_active_work_order";

alter table "public"."work_order_items" add constraint "work_order_items_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES public.profile(id) not valid;

alter table "public"."work_order_items" validate constraint "work_order_items_completed_by_fkey";

alter table "public"."work_order_items" add constraint "work_order_items_maintenance_order_item_id_fkey" FOREIGN KEY (maintenance_order_item_id) REFERENCES public.maintenance_order_items(id) ON DELETE CASCADE not valid;

alter table "public"."work_order_items" validate constraint "work_order_items_maintenance_order_item_id_fkey";

alter table "public"."work_order_items" add constraint "work_order_items_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE not valid;

alter table "public"."work_order_items" validate constraint "work_order_items_work_order_id_fkey";

alter table "public"."work_orders" add constraint "work_orders_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES public.profile(id) not valid;

alter table "public"."work_orders" validate constraint "work_orders_cancelled_by_fkey";

alter table "public"."work_orders" add constraint "work_orders_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE CASCADE not valid;

alter table "public"."work_orders" validate constraint "work_orders_company_id_fkey";

alter table "public"."work_orders" add constraint "work_orders_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES public.profile(id) not valid;

alter table "public"."work_orders" validate constraint "work_orders_completed_by_fkey";

alter table "public"."work_orders" add constraint "work_orders_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profile(id) not valid;

alter table "public"."work_orders" validate constraint "work_orders_created_by_fkey";

alter table "public"."work_orders" add constraint "work_orders_dates_check" CHECK ((planned_end_date >= planned_start_date)) not valid;

alter table "public"."work_orders" validate constraint "work_orders_dates_check";

alter table "public"."work_orders" add constraint "work_orders_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES public.vehicles(id) ON DELETE CASCADE not valid;

alter table "public"."work_orders" validate constraint "work_orders_equipment_id_fkey";

alter table "public"."work_orders" add constraint "work_orders_order_number_key" UNIQUE using index "work_orders_order_number_key";

alter table "public"."work_orders" add constraint "work_orders_sector_id_fkey" FOREIGN KEY (sector_id) REFERENCES public.workshop_sectors(id) ON DELETE SET NULL not valid;

alter table "public"."work_orders" validate constraint "work_orders_sector_id_fkey";

alter table "public"."work_orders" add constraint "work_orders_started_by_fkey" FOREIGN KEY (started_by) REFERENCES public.profile(id) not valid;

alter table "public"."work_orders" validate constraint "work_orders_started_by_fkey";

alter table "public"."work_orders" add constraint "work_orders_workshop_id_fkey" FOREIGN KEY (workshop_id) REFERENCES public.workshops(id) ON DELETE RESTRICT not valid;

alter table "public"."work_orders" validate constraint "work_orders_workshop_id_fkey";

set check_function_bodies = off;

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
          WHERE ((mri.checklist_deviation_id = cd.id) AND (mri.repair_type_id IS NOT NULL))))))
  GROUP BY v.id, v.domain, v.serie, v.intern_number, v.company_id, tv.name
 HAVING (count(DISTINCT cd.id) > 0)
  ORDER BY (count(DISTINCT cd.id)) DESC;


grant delete on table "public"."work_order_items" to "anon";

grant insert on table "public"."work_order_items" to "anon";

grant references on table "public"."work_order_items" to "anon";

grant select on table "public"."work_order_items" to "anon";

grant trigger on table "public"."work_order_items" to "anon";

grant truncate on table "public"."work_order_items" to "anon";

grant update on table "public"."work_order_items" to "anon";

grant delete on table "public"."work_order_items" to "authenticated";

grant insert on table "public"."work_order_items" to "authenticated";

grant references on table "public"."work_order_items" to "authenticated";

grant select on table "public"."work_order_items" to "authenticated";

grant trigger on table "public"."work_order_items" to "authenticated";

grant truncate on table "public"."work_order_items" to "authenticated";

grant update on table "public"."work_order_items" to "authenticated";

grant delete on table "public"."work_order_items" to "postgres";

grant insert on table "public"."work_order_items" to "postgres";

grant references on table "public"."work_order_items" to "postgres";

grant select on table "public"."work_order_items" to "postgres";

grant trigger on table "public"."work_order_items" to "postgres";

grant truncate on table "public"."work_order_items" to "postgres";

grant update on table "public"."work_order_items" to "postgres";

grant delete on table "public"."work_order_items" to "service_role";

grant insert on table "public"."work_order_items" to "service_role";

grant references on table "public"."work_order_items" to "service_role";

grant select on table "public"."work_order_items" to "service_role";

grant trigger on table "public"."work_order_items" to "service_role";

grant truncate on table "public"."work_order_items" to "service_role";

grant update on table "public"."work_order_items" to "service_role";

grant delete on table "public"."work_orders" to "anon";

grant insert on table "public"."work_orders" to "anon";

grant references on table "public"."work_orders" to "anon";

grant select on table "public"."work_orders" to "anon";

grant trigger on table "public"."work_orders" to "anon";

grant truncate on table "public"."work_orders" to "anon";

grant update on table "public"."work_orders" to "anon";

grant delete on table "public"."work_orders" to "authenticated";

grant insert on table "public"."work_orders" to "authenticated";

grant references on table "public"."work_orders" to "authenticated";

grant select on table "public"."work_orders" to "authenticated";

grant trigger on table "public"."work_orders" to "authenticated";

grant truncate on table "public"."work_orders" to "authenticated";

grant update on table "public"."work_orders" to "authenticated";

grant delete on table "public"."work_orders" to "postgres";

grant insert on table "public"."work_orders" to "postgres";

grant references on table "public"."work_orders" to "postgres";

grant select on table "public"."work_orders" to "postgres";

grant trigger on table "public"."work_orders" to "postgres";

grant truncate on table "public"."work_orders" to "postgres";

grant update on table "public"."work_orders" to "postgres";

grant delete on table "public"."work_orders" to "service_role";

grant insert on table "public"."work_orders" to "service_role";

grant references on table "public"."work_orders" to "service_role";

grant select on table "public"."work_orders" to "service_role";

grant trigger on table "public"."work_orders" to "service_role";

grant truncate on table "public"."work_orders" to "service_role";

grant update on table "public"."work_orders" to "service_role";

CREATE TRIGGER trigger_work_order_items_updated_at BEFORE UPDATE ON public.work_order_items FOR EACH ROW EXECUTE FUNCTION public.update_work_orders_updated_at();

CREATE TRIGGER trigger_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_work_orders_updated_at();


