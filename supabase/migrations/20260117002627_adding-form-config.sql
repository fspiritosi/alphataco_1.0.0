
  create table "public"."maintenance_order_items" (
    "id" uuid not null default gen_random_uuid(),
    "maintenance_order_id" uuid not null,
    "maintenance_request_item_id" uuid not null,
    "repair_type_id" uuid,
    "description" text,
    "images" text[],
    "created_at" timestamp with time zone default now()
      );


alter table "public"."maintenance_order_items" enable row level security;


  create table "public"."maintenance_orders" (
    "id" uuid not null default gen_random_uuid(),
    "maintenance_request_id" uuid,
    "equipment_id" uuid not null,
    "status" text not null default 'pending_scheduling'::text,
    "scheduled_date" date,
    "scheduled_by" uuid,
    "scheduled_at" timestamp with time zone,
    "rejection_reason" text,
    "rejected_by" uuid,
    "rejected_at" timestamp with time zone,
    "workshop_entry_date" timestamp with time zone,
    "workshop_approved_by" uuid,
    "kilometer_at_entry" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."maintenance_orders" enable row level security;


  create table "public"."maintenance_request_items" (
    "id" uuid not null default gen_random_uuid(),
    "maintenance_request_id" uuid not null,
    "checklist_deviation_id" uuid not null,
    "repair_type_id" uuid,
    "status" text not null default 'pending'::text,
    "rejection_reason" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."maintenance_request_items" enable row level security;


  create table "public"."maintenance_requests" (
    "id" uuid not null default gen_random_uuid(),
    "checklist_answer_id" uuid not null,
    "equipment_id" uuid not null,
    "employee_id" uuid,
    "user_id" uuid,
    "status" text not null default 'pending_approval'::text,
    "rejection_reason" text,
    "rejected_by" uuid,
    "rejected_at" timestamp with time zone,
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "kilometer" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."maintenance_requests" enable row level security;

CREATE INDEX idx_maintenance_order_items_order ON public.maintenance_order_items USING btree (maintenance_order_id);

CREATE INDEX idx_maintenance_order_items_request_item ON public.maintenance_order_items USING btree (maintenance_request_item_id);

CREATE INDEX idx_maintenance_orders_equipment ON public.maintenance_orders USING btree (equipment_id);

CREATE INDEX idx_maintenance_orders_request ON public.maintenance_orders USING btree (maintenance_request_id);

CREATE INDEX idx_maintenance_orders_scheduled_date ON public.maintenance_orders USING btree (scheduled_date);

CREATE INDEX idx_maintenance_orders_status ON public.maintenance_orders USING btree (status);

CREATE INDEX idx_maintenance_request_items_deviation ON public.maintenance_request_items USING btree (checklist_deviation_id);

CREATE INDEX idx_maintenance_request_items_request ON public.maintenance_request_items USING btree (maintenance_request_id);

CREATE INDEX idx_maintenance_request_items_status ON public.maintenance_request_items USING btree (status);

CREATE INDEX idx_maintenance_requests_checklist ON public.maintenance_requests USING btree (checklist_answer_id);

CREATE INDEX idx_maintenance_requests_equipment ON public.maintenance_requests USING btree (equipment_id);

CREATE INDEX idx_maintenance_requests_status ON public.maintenance_requests USING btree (status);

CREATE UNIQUE INDEX maintenance_order_items_pkey ON public.maintenance_order_items USING btree (id);

CREATE UNIQUE INDEX maintenance_orders_pkey ON public.maintenance_orders USING btree (id);

CREATE UNIQUE INDEX maintenance_request_items_maintenance_request_id_checklist__key ON public.maintenance_request_items USING btree (maintenance_request_id, checklist_deviation_id);

CREATE UNIQUE INDEX maintenance_request_items_pkey ON public.maintenance_request_items USING btree (id);

CREATE UNIQUE INDEX maintenance_requests_pkey ON public.maintenance_requests USING btree (id);

alter table "public"."maintenance_order_items" add constraint "maintenance_order_items_pkey" PRIMARY KEY using index "maintenance_order_items_pkey";

alter table "public"."maintenance_orders" add constraint "maintenance_orders_pkey" PRIMARY KEY using index "maintenance_orders_pkey";

alter table "public"."maintenance_request_items" add constraint "maintenance_request_items_pkey" PRIMARY KEY using index "maintenance_request_items_pkey";

alter table "public"."maintenance_requests" add constraint "maintenance_requests_pkey" PRIMARY KEY using index "maintenance_requests_pkey";

alter table "public"."maintenance_order_items" add constraint "maintenance_order_items_maintenance_order_id_fkey" FOREIGN KEY (maintenance_order_id) REFERENCES public.maintenance_orders(id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_order_items" validate constraint "maintenance_order_items_maintenance_order_id_fkey";

alter table "public"."maintenance_order_items" add constraint "maintenance_order_items_maintenance_request_item_id_fkey" FOREIGN KEY (maintenance_request_item_id) REFERENCES public.maintenance_request_items(id) not valid;

alter table "public"."maintenance_order_items" validate constraint "maintenance_order_items_maintenance_request_item_id_fkey";

alter table "public"."maintenance_order_items" add constraint "maintenance_order_items_repair_type_id_fkey" FOREIGN KEY (repair_type_id) REFERENCES public.types_of_repairs(id) not valid;

alter table "public"."maintenance_order_items" validate constraint "maintenance_order_items_repair_type_id_fkey";

alter table "public"."maintenance_orders" add constraint "maintenance_orders_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES public.vehicles(id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_orders" validate constraint "maintenance_orders_equipment_id_fkey";

alter table "public"."maintenance_orders" add constraint "maintenance_orders_maintenance_request_id_fkey" FOREIGN KEY (maintenance_request_id) REFERENCES public.maintenance_requests(id) not valid;

alter table "public"."maintenance_orders" validate constraint "maintenance_orders_maintenance_request_id_fkey";

alter table "public"."maintenance_orders" add constraint "maintenance_orders_rejected_by_fkey" FOREIGN KEY (rejected_by) REFERENCES public.profile(id) not valid;

alter table "public"."maintenance_orders" validate constraint "maintenance_orders_rejected_by_fkey";

alter table "public"."maintenance_orders" add constraint "maintenance_orders_scheduled_by_fkey" FOREIGN KEY (scheduled_by) REFERENCES public.profile(id) not valid;

alter table "public"."maintenance_orders" validate constraint "maintenance_orders_scheduled_by_fkey";

alter table "public"."maintenance_orders" add constraint "maintenance_orders_status_check" CHECK ((status = ANY (ARRAY['pending_scheduling'::text, 'scheduled'::text, 'in_workshop'::text, 'completed'::text, 'rejected'::text]))) not valid;

alter table "public"."maintenance_orders" validate constraint "maintenance_orders_status_check";

alter table "public"."maintenance_orders" add constraint "maintenance_orders_workshop_approved_by_fkey" FOREIGN KEY (workshop_approved_by) REFERENCES public.profile(id) not valid;

alter table "public"."maintenance_orders" validate constraint "maintenance_orders_workshop_approved_by_fkey";

alter table "public"."maintenance_request_items" add constraint "maintenance_request_items_checklist_deviation_id_fkey" FOREIGN KEY (checklist_deviation_id) REFERENCES public.checklist_deviations(id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_request_items" validate constraint "maintenance_request_items_checklist_deviation_id_fkey";

alter table "public"."maintenance_request_items" add constraint "maintenance_request_items_maintenance_request_id_checklist__key" UNIQUE using index "maintenance_request_items_maintenance_request_id_checklist__key";

alter table "public"."maintenance_request_items" add constraint "maintenance_request_items_maintenance_request_id_fkey" FOREIGN KEY (maintenance_request_id) REFERENCES public.maintenance_requests(id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_request_items" validate constraint "maintenance_request_items_maintenance_request_id_fkey";

alter table "public"."maintenance_request_items" add constraint "maintenance_request_items_repair_type_id_fkey" FOREIGN KEY (repair_type_id) REFERENCES public.types_of_repairs(id) not valid;

alter table "public"."maintenance_request_items" validate constraint "maintenance_request_items_repair_type_id_fkey";

alter table "public"."maintenance_request_items" add constraint "maintenance_request_items_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."maintenance_request_items" validate constraint "maintenance_request_items_status_check";

alter table "public"."maintenance_requests" add constraint "maintenance_requests_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES public.profile(id) not valid;

alter table "public"."maintenance_requests" validate constraint "maintenance_requests_approved_by_fkey";

alter table "public"."maintenance_requests" add constraint "maintenance_requests_checklist_answer_id_fkey" FOREIGN KEY (checklist_answer_id) REFERENCES public.checklist_answers(id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_requests" validate constraint "maintenance_requests_checklist_answer_id_fkey";

alter table "public"."maintenance_requests" add constraint "maintenance_requests_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) not valid;

alter table "public"."maintenance_requests" validate constraint "maintenance_requests_employee_id_fkey";

alter table "public"."maintenance_requests" add constraint "maintenance_requests_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES public.vehicles(id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_requests" validate constraint "maintenance_requests_equipment_id_fkey";

alter table "public"."maintenance_requests" add constraint "maintenance_requests_rejected_by_fkey" FOREIGN KEY (rejected_by) REFERENCES public.profile(id) not valid;

alter table "public"."maintenance_requests" validate constraint "maintenance_requests_rejected_by_fkey";

alter table "public"."maintenance_requests" add constraint "maintenance_requests_status_check" CHECK ((status = ANY (ARRAY['pending_approval'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."maintenance_requests" validate constraint "maintenance_requests_status_check";

alter table "public"."maintenance_requests" add constraint "maintenance_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profile(id) not valid;

alter table "public"."maintenance_requests" validate constraint "maintenance_requests_user_id_fkey";

grant delete on table "public"."maintenance_order_items" to "anon";

grant insert on table "public"."maintenance_order_items" to "anon";

grant references on table "public"."maintenance_order_items" to "anon";

grant select on table "public"."maintenance_order_items" to "anon";

grant trigger on table "public"."maintenance_order_items" to "anon";

grant truncate on table "public"."maintenance_order_items" to "anon";

grant update on table "public"."maintenance_order_items" to "anon";

grant delete on table "public"."maintenance_order_items" to "authenticated";

grant insert on table "public"."maintenance_order_items" to "authenticated";

grant references on table "public"."maintenance_order_items" to "authenticated";

grant select on table "public"."maintenance_order_items" to "authenticated";

grant trigger on table "public"."maintenance_order_items" to "authenticated";

grant truncate on table "public"."maintenance_order_items" to "authenticated";

grant update on table "public"."maintenance_order_items" to "authenticated";

grant delete on table "public"."maintenance_order_items" to "postgres";

grant insert on table "public"."maintenance_order_items" to "postgres";

grant references on table "public"."maintenance_order_items" to "postgres";

grant select on table "public"."maintenance_order_items" to "postgres";

grant trigger on table "public"."maintenance_order_items" to "postgres";

grant truncate on table "public"."maintenance_order_items" to "postgres";

grant update on table "public"."maintenance_order_items" to "postgres";

grant delete on table "public"."maintenance_order_items" to "service_role";

grant insert on table "public"."maintenance_order_items" to "service_role";

grant references on table "public"."maintenance_order_items" to "service_role";

grant select on table "public"."maintenance_order_items" to "service_role";

grant trigger on table "public"."maintenance_order_items" to "service_role";

grant truncate on table "public"."maintenance_order_items" to "service_role";

grant update on table "public"."maintenance_order_items" to "service_role";

grant delete on table "public"."maintenance_orders" to "anon";

grant insert on table "public"."maintenance_orders" to "anon";

grant references on table "public"."maintenance_orders" to "anon";

grant select on table "public"."maintenance_orders" to "anon";

grant trigger on table "public"."maintenance_orders" to "anon";

grant truncate on table "public"."maintenance_orders" to "anon";

grant update on table "public"."maintenance_orders" to "anon";

grant delete on table "public"."maintenance_orders" to "authenticated";

grant insert on table "public"."maintenance_orders" to "authenticated";

grant references on table "public"."maintenance_orders" to "authenticated";

grant select on table "public"."maintenance_orders" to "authenticated";

grant trigger on table "public"."maintenance_orders" to "authenticated";

grant truncate on table "public"."maintenance_orders" to "authenticated";

grant update on table "public"."maintenance_orders" to "authenticated";

grant delete on table "public"."maintenance_orders" to "postgres";

grant insert on table "public"."maintenance_orders" to "postgres";

grant references on table "public"."maintenance_orders" to "postgres";

grant select on table "public"."maintenance_orders" to "postgres";

grant trigger on table "public"."maintenance_orders" to "postgres";

grant truncate on table "public"."maintenance_orders" to "postgres";

grant update on table "public"."maintenance_orders" to "postgres";

grant delete on table "public"."maintenance_orders" to "service_role";

grant insert on table "public"."maintenance_orders" to "service_role";

grant references on table "public"."maintenance_orders" to "service_role";

grant select on table "public"."maintenance_orders" to "service_role";

grant trigger on table "public"."maintenance_orders" to "service_role";

grant truncate on table "public"."maintenance_orders" to "service_role";

grant update on table "public"."maintenance_orders" to "service_role";

grant delete on table "public"."maintenance_request_items" to "anon";

grant insert on table "public"."maintenance_request_items" to "anon";

grant references on table "public"."maintenance_request_items" to "anon";

grant select on table "public"."maintenance_request_items" to "anon";

grant trigger on table "public"."maintenance_request_items" to "anon";

grant truncate on table "public"."maintenance_request_items" to "anon";

grant update on table "public"."maintenance_request_items" to "anon";

grant delete on table "public"."maintenance_request_items" to "authenticated";

grant insert on table "public"."maintenance_request_items" to "authenticated";

grant references on table "public"."maintenance_request_items" to "authenticated";

grant select on table "public"."maintenance_request_items" to "authenticated";

grant trigger on table "public"."maintenance_request_items" to "authenticated";

grant truncate on table "public"."maintenance_request_items" to "authenticated";

grant update on table "public"."maintenance_request_items" to "authenticated";

grant delete on table "public"."maintenance_request_items" to "postgres";

grant insert on table "public"."maintenance_request_items" to "postgres";

grant references on table "public"."maintenance_request_items" to "postgres";

grant select on table "public"."maintenance_request_items" to "postgres";

grant trigger on table "public"."maintenance_request_items" to "postgres";

grant truncate on table "public"."maintenance_request_items" to "postgres";

grant update on table "public"."maintenance_request_items" to "postgres";

grant delete on table "public"."maintenance_request_items" to "service_role";

grant insert on table "public"."maintenance_request_items" to "service_role";

grant references on table "public"."maintenance_request_items" to "service_role";

grant select on table "public"."maintenance_request_items" to "service_role";

grant trigger on table "public"."maintenance_request_items" to "service_role";

grant truncate on table "public"."maintenance_request_items" to "service_role";

grant update on table "public"."maintenance_request_items" to "service_role";

grant delete on table "public"."maintenance_requests" to "anon";

grant insert on table "public"."maintenance_requests" to "anon";

grant references on table "public"."maintenance_requests" to "anon";

grant select on table "public"."maintenance_requests" to "anon";

grant trigger on table "public"."maintenance_requests" to "anon";

grant truncate on table "public"."maintenance_requests" to "anon";

grant update on table "public"."maintenance_requests" to "anon";

grant delete on table "public"."maintenance_requests" to "authenticated";

grant insert on table "public"."maintenance_requests" to "authenticated";

grant references on table "public"."maintenance_requests" to "authenticated";

grant select on table "public"."maintenance_requests" to "authenticated";

grant trigger on table "public"."maintenance_requests" to "authenticated";

grant truncate on table "public"."maintenance_requests" to "authenticated";

grant update on table "public"."maintenance_requests" to "authenticated";

grant delete on table "public"."maintenance_requests" to "postgres";

grant insert on table "public"."maintenance_requests" to "postgres";

grant references on table "public"."maintenance_requests" to "postgres";

grant select on table "public"."maintenance_requests" to "postgres";

grant trigger on table "public"."maintenance_requests" to "postgres";

grant truncate on table "public"."maintenance_requests" to "postgres";

grant update on table "public"."maintenance_requests" to "postgres";

grant delete on table "public"."maintenance_requests" to "service_role";

grant insert on table "public"."maintenance_requests" to "service_role";

grant references on table "public"."maintenance_requests" to "service_role";

grant select on table "public"."maintenance_requests" to "service_role";

grant trigger on table "public"."maintenance_requests" to "service_role";

grant truncate on table "public"."maintenance_requests" to "service_role";

grant update on table "public"."maintenance_requests" to "service_role";

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


  create policy "Anon can view maintenance order items"
  on "public"."maintenance_order_items"
  as permissive
  for select
  to anon
using (true);



  create policy "Users can insert maintenance order items"
  on "public"."maintenance_order_items"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Users can update maintenance order items"
  on "public"."maintenance_order_items"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Users can view maintenance order items"
  on "public"."maintenance_order_items"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Anon can view maintenance orders"
  on "public"."maintenance_orders"
  as permissive
  for select
  to anon
using (true);



  create policy "Users can insert maintenance orders"
  on "public"."maintenance_orders"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Users can update maintenance orders"
  on "public"."maintenance_orders"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Users can view maintenance orders"
  on "public"."maintenance_orders"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Anon can insert maintenance request items"
  on "public"."maintenance_request_items"
  as permissive
  for insert
  to anon
with check (true);



  create policy "Anon can view maintenance request items"
  on "public"."maintenance_request_items"
  as permissive
  for select
  to anon
using (true);



  create policy "Users can insert maintenance request items"
  on "public"."maintenance_request_items"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Users can update maintenance request items"
  on "public"."maintenance_request_items"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Users can view maintenance request items"
  on "public"."maintenance_request_items"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Anon can insert maintenance requests"
  on "public"."maintenance_requests"
  as permissive
  for insert
  to anon
with check (true);



  create policy "Anon can view maintenance requests"
  on "public"."maintenance_requests"
  as permissive
  for select
  to anon
using (true);



  create policy "Users can insert maintenance requests"
  on "public"."maintenance_requests"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Users can update maintenance requests"
  on "public"."maintenance_requests"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Users can view maintenance requests"
  on "public"."maintenance_requests"
  as permissive
  for select
  to authenticated
using (true);


CREATE TRIGGER update_maintenance_orders_updated_at BEFORE UPDATE ON public.maintenance_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();