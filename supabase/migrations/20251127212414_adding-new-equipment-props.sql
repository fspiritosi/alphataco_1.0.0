create type "public"."cost_type_enum" as enum ('Directo', 'Indirecto');

alter table "public"."vehicles" add column "cost_type" public.cost_type_enum;

alter table "public"."vehicles" add column "sector" uuid;

alter table "public"."vehicles" add constraint "vehicles_sector_fkey" FOREIGN KEY (sector) REFERENCES public.hierarchy(id) not valid;

alter table "public"."vehicles" validate constraint "vehicles_sector_fkey";


