-- `user_permissions.company_id`: el permiso custom se otorga EN una empresa.
--
-- Es la otra mitad del agujero que cerró la Task 13a. Esa task le puso `company_id` a
-- `user_roles`, pero `get_user_permissions` combina DOS fuentes: los roles (ya por empresa)
-- y los permisos custom por usuario (`user_permissions`), que seguían siendo globales. O sea:
-- un permiso custom otorgado a un usuario en una empresa valía en TODAS las empresas donde
-- ese usuario entrara — exactamente el mismo agujero, abierto por el otro lado.
--
-- Base vacía por decisión de producto: no hay backfill.

-- DropIndex
DROP INDEX "user_permissions_user_id_tab_id_action_id_key";

-- AlterTable
ALTER TABLE "user_permissions" ADD COLUMN     "company_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "idx_user_permissions_company_id" ON "user_permissions"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_tab_id_action_id_company_id_key" ON "user_permissions"("user_id", "tab_id", "action_id", "company_id");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- get_user_permissions: la rama de permisos custom pasa a filtrar por empresa
-- (cambio doble con prisma/sql/permissions.sql). La firma no cambia (uuid, uuid),
-- así que alcanza con CREATE OR REPLACE.
-- ============================================================================

-- function get_user_permissions (origen: supabase/migrations/20260202113926_fixing-maintenance-flow.sql)
-- Task 13a: suma `p_company_id`. `user_roles` ganó `company_id`, así que un rol vale en la
-- empresa donde se otorgó y no en todas las del usuario.
-- Task 13b: `user_permissions` también ganó `company_id`. Las DOS fuentes que combina esta
-- función quedan acotadas a la empresa: un permiso custom otorgado en una empresa ya no vale
-- en las demás donde el usuario entre.
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
            AND up.company_id = p_company_id
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
