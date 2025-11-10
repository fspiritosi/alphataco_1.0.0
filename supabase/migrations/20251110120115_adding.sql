create type "public"."currency_enum" as enum ('USD', 'EUR', 'GBP', 'ARS');

alter table "public"."vehicles" add column "currency" public.currency_enum;

alter table "public"."vehicles" add column "price" numeric(15,2);


