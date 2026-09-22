create table "public"."_prisma_migrations" (
  "id" character varying(36) not null,
  "checksum" character varying(64) not null,
  "finished_at" timestamp with time zone,
  "migration_name" character varying(255) not null,
  "logs" text,
  "rolled_back_at" timestamp with time zone,
  "started_at" timestamp with time zone not null default now(),
  "applied_steps_count" integer not null default 0
);

CREATE UNIQUE INDEX _prisma_migrations_pkey ON public._prisma_migrations USING btree (id);

alter table "public"."_prisma_migrations" add constraint "_prisma_migrations_pkey" PRIMARY KEY using index "_prisma_migrations_pkey";

grant delete on table "public"."_prisma_migrations" to "anon";
grant insert on table "public"."_prisma_migrations" to "anon";
grant references on table "public"."_prisma_migrations" to "anon";
grant select on table "public"."_prisma_migrations" to "anon";
grant trigger on table "public"."_prisma_migrations" to "anon";
grant truncate on table "public"."_prisma_migrations" to "anon";
grant update on table "public"."_prisma_migrations" to "anon";

grant delete on table "public"."_prisma_migrations" to "authenticated";
grant insert on table "public"."_prisma_migrations" to "authenticated";
grant references on table "public"."_prisma_migrations" to "authenticated";
grant select on table "public"."_prisma_migrations" to "authenticated";
grant trigger on table "public"."_prisma_migrations" to "authenticated";
grant truncate on table "public"."_prisma_migrations" to "authenticated";
grant update on table "public"."_prisma_migrations" to "authenticated";

grant delete on table "public"."_prisma_migrations" to "service_role";
grant insert on table "public"."_prisma_migrations" to "service_role";
grant references on table "public"."_prisma_migrations" to "service_role";
grant select on table "public"."_prisma_migrations" to "service_role";
grant trigger on table "public"."_prisma_migrations" to "service_role";
grant truncate on table "public"."_prisma_migrations" to "service_role";
grant update on table "public"."_prisma_migrations" to "service_role";
