
  create table "public"."sub_type_compatible_items" (
    "id" uuid not null default gen_random_uuid(),
    "sub_type_id" uuid not null,
    "compatible_item_id" uuid not null,
    "item_type" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."sub_type_compatible_items" enable row level security;


  create table "public"."type_hitch_types" (
    "id" uuid not null default gen_random_uuid(),
    "type_id" uuid not null,
    "compatible_type_id" uuid not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."type_hitch_types" enable row level security;

alter table "public"."checklist_answers" add column "ut_checklist_answer_id" uuid;

alter table "public"."type" add column "has_hitch" boolean default false;

alter table "public"."type" add column "is_tractor_unit" boolean default false;

CREATE INDEX idx_sub_type_compatible_items_compatible_item_id ON public.sub_type_compatible_items USING btree (compatible_item_id);

CREATE INDEX idx_sub_type_compatible_items_sub_type_id ON public.sub_type_compatible_items USING btree (sub_type_id);

CREATE INDEX idx_type_hitch_types_compatible_type_id ON public.type_hitch_types USING btree (compatible_type_id);

CREATE INDEX idx_type_hitch_types_type_id ON public.type_hitch_types USING btree (type_id);

CREATE UNIQUE INDEX sub_type_compatible_items_pkey ON public.sub_type_compatible_items USING btree (id);

CREATE UNIQUE INDEX sub_type_compatible_items_unique ON public.sub_type_compatible_items USING btree (sub_type_id, compatible_item_id, item_type);

CREATE UNIQUE INDEX type_hitch_types_pkey ON public.type_hitch_types USING btree (id);

CREATE UNIQUE INDEX type_hitch_types_type_id_compatible_type_id_key ON public.type_hitch_types USING btree (type_id, compatible_type_id);

alter table "public"."sub_type_compatible_items" add constraint "sub_type_compatible_items_pkey" PRIMARY KEY using index "sub_type_compatible_items_pkey";

alter table "public"."type_hitch_types" add constraint "type_hitch_types_pkey" PRIMARY KEY using index "type_hitch_types_pkey";

alter table "public"."checklist_answers" add constraint "checklist_answers_ut_checklist_answer_id_fkey" FOREIGN KEY (ut_checklist_answer_id) REFERENCES public.checklist_answers(id) ON DELETE SET NULL not valid;

alter table "public"."checklist_answers" validate constraint "checklist_answers_ut_checklist_answer_id_fkey";

alter table "public"."sub_type_compatible_items" add constraint "sub_type_compatible_items_item_type_check" CHECK ((item_type = ANY (ARRAY['sub_type'::text, 'type'::text]))) not valid;

alter table "public"."sub_type_compatible_items" validate constraint "sub_type_compatible_items_item_type_check";

alter table "public"."sub_type_compatible_items" add constraint "sub_type_compatible_items_sub_type_id_fkey" FOREIGN KEY (sub_type_id) REFERENCES public.sub_type(id) ON DELETE CASCADE not valid;

alter table "public"."sub_type_compatible_items" validate constraint "sub_type_compatible_items_sub_type_id_fkey";

alter table "public"."sub_type_compatible_items" add constraint "sub_type_compatible_items_unique" UNIQUE using index "sub_type_compatible_items_unique";

alter table "public"."type_hitch_types" add constraint "type_hitch_types_compatible_type_id_fkey" FOREIGN KEY (compatible_type_id) REFERENCES public.type(id) ON DELETE CASCADE not valid;

alter table "public"."type_hitch_types" validate constraint "type_hitch_types_compatible_type_id_fkey";

alter table "public"."type_hitch_types" add constraint "type_hitch_types_type_id_compatible_type_id_key" UNIQUE using index "type_hitch_types_type_id_compatible_type_id_key";

alter table "public"."type_hitch_types" add constraint "type_hitch_types_type_id_fkey" FOREIGN KEY (type_id) REFERENCES public.type(id) ON DELETE CASCADE not valid;

alter table "public"."type_hitch_types" validate constraint "type_hitch_types_type_id_fkey";

grant delete on table "public"."sub_type_compatible_items" to "anon";

grant insert on table "public"."sub_type_compatible_items" to "anon";

grant references on table "public"."sub_type_compatible_items" to "anon";

grant select on table "public"."sub_type_compatible_items" to "anon";

grant trigger on table "public"."sub_type_compatible_items" to "anon";

grant truncate on table "public"."sub_type_compatible_items" to "anon";

grant update on table "public"."sub_type_compatible_items" to "anon";

grant delete on table "public"."sub_type_compatible_items" to "authenticated";

grant insert on table "public"."sub_type_compatible_items" to "authenticated";

grant references on table "public"."sub_type_compatible_items" to "authenticated";

grant select on table "public"."sub_type_compatible_items" to "authenticated";

grant trigger on table "public"."sub_type_compatible_items" to "authenticated";

grant truncate on table "public"."sub_type_compatible_items" to "authenticated";

grant update on table "public"."sub_type_compatible_items" to "authenticated";

grant delete on table "public"."sub_type_compatible_items" to "postgres";

grant insert on table "public"."sub_type_compatible_items" to "postgres";

grant references on table "public"."sub_type_compatible_items" to "postgres";

grant select on table "public"."sub_type_compatible_items" to "postgres";

grant trigger on table "public"."sub_type_compatible_items" to "postgres";

grant truncate on table "public"."sub_type_compatible_items" to "postgres";

grant update on table "public"."sub_type_compatible_items" to "postgres";

grant delete on table "public"."sub_type_compatible_items" to "service_role";

grant insert on table "public"."sub_type_compatible_items" to "service_role";

grant references on table "public"."sub_type_compatible_items" to "service_role";

grant select on table "public"."sub_type_compatible_items" to "service_role";

grant trigger on table "public"."sub_type_compatible_items" to "service_role";

grant truncate on table "public"."sub_type_compatible_items" to "service_role";

grant update on table "public"."sub_type_compatible_items" to "service_role";

grant delete on table "public"."type_hitch_types" to "anon";

grant insert on table "public"."type_hitch_types" to "anon";

grant references on table "public"."type_hitch_types" to "anon";

grant select on table "public"."type_hitch_types" to "anon";

grant trigger on table "public"."type_hitch_types" to "anon";

grant truncate on table "public"."type_hitch_types" to "anon";

grant update on table "public"."type_hitch_types" to "anon";

grant delete on table "public"."type_hitch_types" to "authenticated";

grant insert on table "public"."type_hitch_types" to "authenticated";

grant references on table "public"."type_hitch_types" to "authenticated";

grant select on table "public"."type_hitch_types" to "authenticated";

grant trigger on table "public"."type_hitch_types" to "authenticated";

grant truncate on table "public"."type_hitch_types" to "authenticated";

grant update on table "public"."type_hitch_types" to "authenticated";

grant delete on table "public"."type_hitch_types" to "postgres";

grant insert on table "public"."type_hitch_types" to "postgres";

grant references on table "public"."type_hitch_types" to "postgres";

grant select on table "public"."type_hitch_types" to "postgres";

grant trigger on table "public"."type_hitch_types" to "postgres";

grant truncate on table "public"."type_hitch_types" to "postgres";

grant update on table "public"."type_hitch_types" to "postgres";

grant delete on table "public"."type_hitch_types" to "service_role";

grant insert on table "public"."type_hitch_types" to "service_role";

grant references on table "public"."type_hitch_types" to "service_role";

grant select on table "public"."type_hitch_types" to "service_role";

grant trigger on table "public"."type_hitch_types" to "service_role";

grant truncate on table "public"."type_hitch_types" to "service_role";

grant update on table "public"."type_hitch_types" to "service_role";


  create policy "Users can delete sub_type_compatible_items"
  on "public"."sub_type_compatible_items"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Users can insert sub_type_compatible_items"
  on "public"."sub_type_compatible_items"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Users can read sub_type_compatible_items"
  on "public"."sub_type_compatible_items"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Users can update sub_type_compatible_items"
  on "public"."sub_type_compatible_items"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Permitir todo"
  on "public"."type_hitch_types"
  as permissive
  for all
  to authenticated
using (true);
