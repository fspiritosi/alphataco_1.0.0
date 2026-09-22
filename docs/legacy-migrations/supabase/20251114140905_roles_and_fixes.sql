drop policy "Enable read access for all users" on "public"."roles";


  create table "public"."actions" (
    "id" uuid not null default gen_random_uuid(),
    "slug" text not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."actions" enable row level security;


  create table "public"."role_permissions" (
    "id" uuid not null default gen_random_uuid(),
    "role_id" bigint not null,
    "tab_id" uuid not null,
    "action_id" uuid not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."role_permissions" enable row level security;


  create table "public"."tabs" (
    "id" uuid not null default gen_random_uuid(),
    "module_id" uuid not null,
    "parent_tab_id" uuid,
    "slug" text not null,
    "name" text not null,
    "description" text,
    "order_index" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."tabs" enable row level security;


  create table "public"."user_permissions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "tab_id" uuid not null,
    "action_id" uuid not null,
    "is_granted" boolean default true,
    "assigned_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_permissions" enable row level security;


  create table "public"."user_roles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "role_id" bigint not null,
    "assigned_by" uuid,
    "assigned_at" timestamp with time zone default now()
      );


alter table "public"."user_roles" enable row level security;

alter table "public"."modules" add column "icon" text;

alter table "public"."modules" add column "is_active" boolean default true;

alter table "public"."modules" add column "order_index" integer default 0;

alter table "public"."modules" add column "slug" text;

alter table "public"."modules" add column "updated_at" timestamp with time zone default now();

alter table "public"."roles" add column "color" text;

alter table "public"."roles" add column "description" text;

alter table "public"."roles" add column "is_system" boolean default false;

alter table "public"."roles" add column "slug" text;

alter table "public"."roles" add column "updated_at" timestamp with time zone default now();

CREATE UNIQUE INDEX actions_pkey ON public.actions USING btree (id);

CREATE UNIQUE INDEX actions_slug_key ON public.actions USING btree (slug);

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);

CREATE INDEX idx_role_permissions_tab_id ON public.role_permissions USING btree (tab_id);

CREATE INDEX idx_tabs_module_id ON public.tabs USING btree (module_id);

CREATE INDEX idx_tabs_parent_tab_id ON public.tabs USING btree (parent_tab_id);

CREATE INDEX idx_user_permissions_tab_id ON public.user_permissions USING btree (tab_id);

CREATE INDEX idx_user_permissions_user_id ON public.user_permissions USING btree (user_id);

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);

CREATE UNIQUE INDEX modules_slug_key ON public.modules USING btree (slug);

CREATE UNIQUE INDEX role_permissions_pkey ON public.role_permissions USING btree (id);

CREATE UNIQUE INDEX role_permissions_role_id_tab_id_action_id_key ON public.role_permissions USING btree (role_id, tab_id, action_id);

CREATE UNIQUE INDEX roles_slug_key ON public.roles USING btree (slug);

CREATE UNIQUE INDEX tabs_module_id_slug_key ON public.tabs USING btree (module_id, slug);

CREATE UNIQUE INDEX tabs_pkey ON public.tabs USING btree (id);

CREATE UNIQUE INDEX user_permissions_pkey ON public.user_permissions USING btree (id);

CREATE UNIQUE INDEX user_permissions_user_id_tab_id_action_id_key ON public.user_permissions USING btree (user_id, tab_id, action_id);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

CREATE UNIQUE INDEX user_roles_user_id_role_id_key ON public.user_roles USING btree (user_id, role_id);

alter table "public"."actions" add constraint "actions_pkey" PRIMARY KEY using index "actions_pkey";

alter table "public"."role_permissions" add constraint "role_permissions_pkey" PRIMARY KEY using index "role_permissions_pkey";

alter table "public"."tabs" add constraint "tabs_pkey" PRIMARY KEY using index "tabs_pkey";

alter table "public"."user_permissions" add constraint "user_permissions_pkey" PRIMARY KEY using index "user_permissions_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."actions" add constraint "actions_slug_key" UNIQUE using index "actions_slug_key";

alter table "public"."modules" add constraint "modules_slug_key" UNIQUE using index "modules_slug_key";

alter table "public"."role_permissions" add constraint "role_permissions_action_id_fkey" FOREIGN KEY (action_id) REFERENCES public.actions(id) ON DELETE CASCADE not valid;

alter table "public"."role_permissions" validate constraint "role_permissions_action_id_fkey";

alter table "public"."role_permissions" add constraint "role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE not valid;

alter table "public"."role_permissions" validate constraint "role_permissions_role_id_fkey";

alter table "public"."role_permissions" add constraint "role_permissions_role_id_tab_id_action_id_key" UNIQUE using index "role_permissions_role_id_tab_id_action_id_key";

alter table "public"."role_permissions" add constraint "role_permissions_tab_id_fkey" FOREIGN KEY (tab_id) REFERENCES public.tabs(id) ON DELETE CASCADE not valid;

alter table "public"."role_permissions" validate constraint "role_permissions_tab_id_fkey";

alter table "public"."roles" add constraint "roles_slug_key" UNIQUE using index "roles_slug_key";

alter table "public"."tabs" add constraint "tabs_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE not valid;

alter table "public"."tabs" validate constraint "tabs_module_id_fkey";

alter table "public"."tabs" add constraint "tabs_module_id_slug_key" UNIQUE using index "tabs_module_id_slug_key";

alter table "public"."tabs" add constraint "tabs_parent_tab_id_fkey" FOREIGN KEY (parent_tab_id) REFERENCES public.tabs(id) ON DELETE CASCADE not valid;

alter table "public"."tabs" validate constraint "tabs_parent_tab_id_fkey";

alter table "public"."user_permissions" add constraint "user_permissions_action_id_fkey" FOREIGN KEY (action_id) REFERENCES public.actions(id) ON DELETE CASCADE not valid;

alter table "public"."user_permissions" validate constraint "user_permissions_action_id_fkey";

alter table "public"."user_permissions" add constraint "user_permissions_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES auth.users(id) not valid;

alter table "public"."user_permissions" validate constraint "user_permissions_assigned_by_fkey";

alter table "public"."user_permissions" add constraint "user_permissions_tab_id_fkey" FOREIGN KEY (tab_id) REFERENCES public.tabs(id) ON DELETE CASCADE not valid;

alter table "public"."user_permissions" validate constraint "user_permissions_tab_id_fkey";

alter table "public"."user_permissions" add constraint "user_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_permissions" validate constraint "user_permissions_user_id_fkey";

alter table "public"."user_permissions" add constraint "user_permissions_user_id_tab_id_action_id_key" UNIQUE using index "user_permissions_user_id_tab_id_action_id_key";

alter table "public"."user_roles" add constraint "user_roles_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES auth.users(id) not valid;

alter table "public"."user_roles" validate constraint "user_roles_assigned_by_fkey";

alter table "public"."user_roles" add constraint "user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_role_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_role_id_key" UNIQUE using index "user_roles_user_id_role_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_user_accessible_modules(p_user_id uuid)
 RETURNS TABLE(module_id uuid, module_slug text, module_name text, module_icon text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        m.id,
        m.slug,
        m.name,
        m.icon
    FROM public.modules m
    WHERE m.is_active = true
        AND EXISTS (
            SELECT 1
            FROM public.get_user_permissions(p_user_id) up
            WHERE up.module_id = m.id
        )
    ORDER BY m.order_index, m.name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
 RETURNS TABLE(module_id uuid, module_slug text, module_name text, tab_id uuid, tab_slug text, tab_name text, action_id uuid, action_slug text, action_name text, source text, is_granted boolean, role_id bigint, role_name text, role_color text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH user_role_permissions AS (
        -- Get permissions from user's roles
        SELECT DISTINCT
            m.id as module_id,
            m.slug as module_slug,
            m.name as module_name,
            t.id as tab_id,
            t.slug as tab_slug,
            t.name as tab_name,
            a.id as action_id,
            a.slug as action_slug,
            a.name as action_name,
            'role' as source,
            true as is_granted,
            r.id as role_id,
            r.name as role_name,
            r.color as role_color
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.tabs t ON rp.tab_id = t.id
        JOIN public.modules m ON t.module_id = m.id
        JOIN public.actions a ON rp.action_id = a.id
        WHERE ur.user_id = p_user_id
            AND m.is_active = true
            AND t.is_active = true
            AND r.is_active = true
    ),
    user_custom_permissions AS (
        -- Get custom permissions (overrides)
        SELECT
            m.id as module_id,
            m.slug as module_slug,
            m.name as module_name,
            t.id as tab_id,
            t.slug as tab_slug,
            t.name as tab_name,
            a.id as action_id,
            a.slug as action_slug,
            a.name as action_name,
            'custom' as source,
            up.is_granted,
            NULL::bigint as role_id,
            NULL::text as role_name,
            NULL::text as role_color
        FROM public.user_permissions up
        JOIN public.tabs t ON up.tab_id = t.id
        JOIN public.modules m ON t.module_id = m.id
        JOIN public.actions a ON up.action_id = a.id
        WHERE up.user_id = p_user_id
            AND m.is_active = true
            AND t.is_active = true
    )
    -- Combine both, with custom permissions taking precedence
    SELECT DISTINCT ON (
        COALESCE(ucp.module_id, urp.module_id), 
        COALESCE(ucp.tab_id, urp.tab_id), 
        COALESCE(ucp.action_id, urp.action_id)
    )
        COALESCE(ucp.module_id, urp.module_id),
        COALESCE(ucp.module_slug, urp.module_slug),
        COALESCE(ucp.module_name, urp.module_name),
        COALESCE(ucp.tab_id, urp.tab_id),
        COALESCE(ucp.tab_slug, urp.tab_slug),
        COALESCE(ucp.tab_name, urp.tab_name),
        COALESCE(ucp.action_id, urp.action_id),
        COALESCE(ucp.action_slug, urp.action_slug),
        COALESCE(ucp.action_name, urp.action_name),
        COALESCE(ucp.source, urp.source),
        COALESCE(ucp.is_granted, urp.is_granted),
        COALESCE(ucp.role_id, urp.role_id),
        COALESCE(ucp.role_name, urp.role_name),
        COALESCE(ucp.role_color, urp.role_color)
    FROM user_role_permissions urp
    FULL OUTER JOIN user_custom_permissions ucp 
        ON urp.tab_id = ucp.tab_id AND urp.action_id = ucp.action_id
    WHERE COALESCE(ucp.is_granted, urp.is_granted) = true
    ORDER BY 
        COALESCE(ucp.module_id, urp.module_id), 
        COALESCE(ucp.tab_id, urp.tab_id), 
        COALESCE(ucp.action_id, urp.action_id), 
        ucp.source NULLS LAST;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_module_slug text, p_tab_slug text, p_action_slug text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_has_permission boolean;
BEGIN
    -- Check if user has the permission (from role or custom)
    SELECT EXISTS (
        SELECT 1
        FROM public.get_user_permissions(p_user_id) up
        WHERE up.module_slug = p_module_slug
            AND up.tab_slug = p_tab_slug
            AND up.action_slug = p_action_slug
            AND up.is_granted = true
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_services_summary_by_type(p_company_id uuid, save_to_history boolean DEFAULT false)
 RETURNS TABLE(type_service text, service_count bigint, percentage numeric)
 LANGUAGE plpgsql
AS $function$BEGIN
  RETURN QUERY
  WITH service_summary AS (
    SELECT 
      COALESCE(dr.type_service::TEXT, 'sin_tipo') AS type_service,
      COUNT(*) AS count_services
    FROM dailyreportrows dr
    INNER JOIN dailyreport d 
      ON dr.daily_report_id = d.id
    WHERE d.company_id = p_company_id
      AND d.date = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
    GROUP BY dr.type_service
  ),
  total_services AS (
    SELECT SUM(count_services) AS total 
    FROM service_summary
  )
  SELECT 
    ss.type_service,
    ss.count_services AS service_count,
    CASE 
      WHEN ts.total > 0 
        THEN ROUND((ss.count_services::NUMERIC / ts.total::NUMERIC) * 100, 2)
      ELSE 0
    END AS percentage
  FROM service_summary ss
  CROSS JOIN total_services ts
  ORDER BY ss.count_services DESC;
END;$function$
;

grant delete on table "public"."actions" to "anon";

grant insert on table "public"."actions" to "anon";

grant references on table "public"."actions" to "anon";

grant select on table "public"."actions" to "anon";

grant trigger on table "public"."actions" to "anon";

grant truncate on table "public"."actions" to "anon";

grant update on table "public"."actions" to "anon";

grant delete on table "public"."actions" to "authenticated";

grant insert on table "public"."actions" to "authenticated";

grant references on table "public"."actions" to "authenticated";

grant select on table "public"."actions" to "authenticated";

grant trigger on table "public"."actions" to "authenticated";

grant truncate on table "public"."actions" to "authenticated";

grant update on table "public"."actions" to "authenticated";

grant delete on table "public"."actions" to "service_role";

grant insert on table "public"."actions" to "service_role";

grant references on table "public"."actions" to "service_role";

grant select on table "public"."actions" to "service_role";

grant trigger on table "public"."actions" to "service_role";

grant truncate on table "public"."actions" to "service_role";

grant update on table "public"."actions" to "service_role";

grant delete on table "public"."role_permissions" to "anon";

grant insert on table "public"."role_permissions" to "anon";

grant references on table "public"."role_permissions" to "anon";

grant select on table "public"."role_permissions" to "anon";

grant trigger on table "public"."role_permissions" to "anon";

grant truncate on table "public"."role_permissions" to "anon";

grant update on table "public"."role_permissions" to "anon";

grant delete on table "public"."role_permissions" to "authenticated";

grant insert on table "public"."role_permissions" to "authenticated";

grant references on table "public"."role_permissions" to "authenticated";

grant select on table "public"."role_permissions" to "authenticated";

grant trigger on table "public"."role_permissions" to "authenticated";

grant truncate on table "public"."role_permissions" to "authenticated";

grant update on table "public"."role_permissions" to "authenticated";

grant delete on table "public"."role_permissions" to "service_role";

grant insert on table "public"."role_permissions" to "service_role";

grant references on table "public"."role_permissions" to "service_role";

grant select on table "public"."role_permissions" to "service_role";

grant trigger on table "public"."role_permissions" to "service_role";

grant truncate on table "public"."role_permissions" to "service_role";

grant update on table "public"."role_permissions" to "service_role";

grant delete on table "public"."tabs" to "anon";

grant insert on table "public"."tabs" to "anon";

grant references on table "public"."tabs" to "anon";

grant select on table "public"."tabs" to "anon";

grant trigger on table "public"."tabs" to "anon";

grant truncate on table "public"."tabs" to "anon";

grant update on table "public"."tabs" to "anon";

grant delete on table "public"."tabs" to "authenticated";

grant insert on table "public"."tabs" to "authenticated";

grant references on table "public"."tabs" to "authenticated";

grant select on table "public"."tabs" to "authenticated";

grant trigger on table "public"."tabs" to "authenticated";

grant truncate on table "public"."tabs" to "authenticated";

grant update on table "public"."tabs" to "authenticated";

grant delete on table "public"."tabs" to "service_role";

grant insert on table "public"."tabs" to "service_role";

grant references on table "public"."tabs" to "service_role";

grant select on table "public"."tabs" to "service_role";

grant trigger on table "public"."tabs" to "service_role";

grant truncate on table "public"."tabs" to "service_role";

grant update on table "public"."tabs" to "service_role";

grant delete on table "public"."user_permissions" to "anon";

grant insert on table "public"."user_permissions" to "anon";

grant references on table "public"."user_permissions" to "anon";

grant select on table "public"."user_permissions" to "anon";

grant trigger on table "public"."user_permissions" to "anon";

grant truncate on table "public"."user_permissions" to "anon";

grant update on table "public"."user_permissions" to "anon";

grant delete on table "public"."user_permissions" to "authenticated";

grant insert on table "public"."user_permissions" to "authenticated";

grant references on table "public"."user_permissions" to "authenticated";

grant select on table "public"."user_permissions" to "authenticated";

grant trigger on table "public"."user_permissions" to "authenticated";

grant truncate on table "public"."user_permissions" to "authenticated";

grant update on table "public"."user_permissions" to "authenticated";

grant delete on table "public"."user_permissions" to "service_role";

grant insert on table "public"."user_permissions" to "service_role";

grant references on table "public"."user_permissions" to "service_role";

grant select on table "public"."user_permissions" to "service_role";

grant trigger on table "public"."user_permissions" to "service_role";

grant truncate on table "public"."user_permissions" to "service_role";

grant update on table "public"."user_permissions" to "service_role";

grant delete on table "public"."user_roles" to "anon";

grant insert on table "public"."user_roles" to "anon";

grant references on table "public"."user_roles" to "anon";

grant select on table "public"."user_roles" to "anon";

grant trigger on table "public"."user_roles" to "anon";

grant truncate on table "public"."user_roles" to "anon";

grant update on table "public"."user_roles" to "anon";

grant delete on table "public"."user_roles" to "authenticated";

grant insert on table "public"."user_roles" to "authenticated";

grant references on table "public"."user_roles" to "authenticated";

grant select on table "public"."user_roles" to "authenticated";

grant trigger on table "public"."user_roles" to "authenticated";

grant truncate on table "public"."user_roles" to "authenticated";

grant update on table "public"."user_roles" to "authenticated";

grant delete on table "public"."user_roles" to "service_role";

grant insert on table "public"."user_roles" to "service_role";

grant references on table "public"."user_roles" to "service_role";

grant select on table "public"."user_roles" to "service_role";

grant trigger on table "public"."user_roles" to "service_role";

grant truncate on table "public"."user_roles" to "service_role";

grant update on table "public"."user_roles" to "service_role";


  create policy "BORRAR ESTO MAS ADELANTE"
  on "public"."actions"
  as permissive
  for all
  to authenticated
using (true);



  create policy "BORRAR ESTO MAS ADELANTE"
  on "public"."modules"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "BORRAR ESTO MAS ADELANTE"
  on "public"."role_permissions"
  as permissive
  for all
  to authenticated
using (true);



  create policy "BORRAR ESTA"
  on "public"."roles"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "BORRAR ESTO MAS ADELANTE"
  on "public"."tabs"
  as permissive
  for all
  to authenticated
using (true);



  create policy "BORRAR ESTO MAS ADELANTE"
  on "public"."user_permissions"
  as permissive
  for all
  to authenticated
using (true);



  create policy "BORRAR ESTO MAS ADELANTE"
  on "public"."user_roles"
  as permissive
  for all
  to authenticated
using (true);



