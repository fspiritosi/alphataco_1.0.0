drop policy "Vehicles access by company" on "public"."vehicles";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_multiple_permissions(p_user_id uuid, p_permissions jsonb)
 RETURNS TABLE(module_slug text, tab_slug text, action_slug text, has_permission boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    perm->>'module' as module_slug,
    perm->>'tab' as tab_slug,
    perm->>'action' as action_slug,
    EXISTS (
      SELECT 1 
      FROM public.get_user_permissions(p_user_id) up
      WHERE up.module_slug = perm->>'module'
        AND up.tab_slug = perm->>'tab'
        AND up.action_slug = perm->>'action'
        AND up.is_granted = true
    ) as has_permission
  FROM jsonb_array_elements(p_permissions) as perm;
END;
$function$
;


  create policy "Vehicles access by company"
  on "public"."vehicles"
  as permissive
  for all
  to public
using ((company_id = ( SELECT public.get_company_for_user(auth.uid()) AS get_company_for_user)));



