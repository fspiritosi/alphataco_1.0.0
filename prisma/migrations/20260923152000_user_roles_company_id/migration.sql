-- `user_roles.company_id`: el rol se otorga EN una empresa.
--
-- Hasta acá `user_roles` sólo tenía (user_id, role_id) y `get_user_permissions` unía sólo por
-- `user_id`: un rol asignado en una empresa valía en TODAS las del usuario. Por eso el alta de
-- empresa y el alta de usuario invitado tenían que acotar el grant a un bootstrap ("sólo si el
-- usuario no tiene ningún rol todavía"), con la consecuencia de producto de que a un invitado
-- que ya pertenecía a otra empresa no se le podía dar el rol elegido.
--
-- Base vacía por decisión de producto: no hay backfill.

-- DropIndex
DROP INDEX "user_roles_user_id_role_id_key";

-- AlterTable
ALTER TABLE "user_roles" ADD COLUMN     "company_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "idx_user_roles_company_id" ON "user_roles"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_company_id_key" ON "user_roles"("user_id", "role_id", "company_id");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Funciones de permisos: pasan a recibir la empresa (cambio doble con
-- prisma/sql/permissions.sql). Cambian de firma, así que hay que dropearlas primero.
-- ============================================================================

DROP FUNCTION IF EXISTS public.check_multiple_permissions(uuid, jsonb);
DROP FUNCTION IF EXISTS public.get_user_accessible_modules(uuid);
DROP FUNCTION IF EXISTS public.user_has_permission(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.get_user_permissions(uuid);

-- function check_multiple_permissions (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
-- Task 13a: suma `p_company_id` (los roles pasaron a ser por empresa).
CREATE OR REPLACE FUNCTION public.check_multiple_permissions(p_user_id uuid, p_company_id uuid, p_permissions jsonb)
 RETURNS TABLE(module_slug text, tab_slug text, action_slug text, has_permission boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    perm->>'module' as module_slug,
    perm->>'tab' as tab_slug,
    perm->>'action' as action_slug,
    EXISTS (
      SELECT 1 
      FROM public.get_user_permissions(p_user_id, p_company_id) up
      WHERE up.module_slug = perm->>'module'
        AND up.tab_slug = perm->>'tab'
        AND up.action_slug = perm->>'action'
        AND up.is_granted = true
    ) as has_permission
  FROM jsonb_array_elements(p_permissions) as perm;
END;
$function$;

-- function get_user_accessible_modules (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
-- Task 13a: suma `p_company_id` (los roles pasaron a ser por empresa).
CREATE OR REPLACE FUNCTION public.get_user_accessible_modules(p_user_id uuid, p_company_id uuid)
 RETURNS TABLE(module_id uuid, module_slug text, module_name text, module_icon text)
 LANGUAGE plpgsql
 STABLE
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
            FROM public.get_user_permissions(p_user_id, p_company_id) up
            WHERE up.module_id = m.id
                AND up.action_slug = 'view'  -- Only count 'view' permissions
        )
    ORDER BY m.id;
END;
$function$;

-- function get_user_permissions (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
-- Task 13a: suma `p_company_id`. `user_roles` ganó `company_id`, así que un rol vale en la
-- empresa donde se otorgó y no en todas las del usuario. Los permisos custom
-- (`user_permissions`) siguen siendo globales: esa tabla todavía no tiene `company_id`.
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid, p_company_id uuid)
 RETURNS TABLE(module_id uuid, module_slug text, module_name text, tab_id uuid, tab_slug text, tab_name text, action_id uuid, action_slug text, action_name text, source text, is_granted boolean, role_id bigint, role_name text, role_color text)
 LANGUAGE plpgsql
 STABLE
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
            AND ur.company_id = p_company_id
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
$function$;

-- function user_has_permission (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
-- Task 13a: suma `p_company_id` (los roles pasaron a ser por empresa).
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_company_id uuid, p_module_slug text, p_tab_slug text, p_action_slug text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_has_permission boolean;
BEGIN
    -- Check if user has the permission (from role or custom)
    SELECT EXISTS (
        SELECT 1
        FROM public.get_user_permissions(p_user_id, p_company_id) up
        WHERE up.module_slug = p_module_slug
            AND up.tab_slug = p_tab_slug
            AND up.action_slug = p_action_slug
            AND up.is_granted = true
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$function$;
