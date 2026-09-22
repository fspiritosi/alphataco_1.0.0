set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_max_order_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    max_num INTEGER;
BEGIN
    -- Extraer el número máximo de todos los números de pedido
    SELECT COALESCE(
        MAX(CAST(
            SUBSTRING(numero_pedido FROM 'PED-0*([0-9]+)') AS INTEGER
        )),
        0
    ) INTO max_num
    FROM preparte
    WHERE numero_pedido IS NOT NULL;

    -- Formatear y retornar
    RETURN 'PED-' || LPAD(max_num::TEXT, 4, '0');
END;
$function$
;

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
                AND up.action_slug = 'view'  -- Only count 'view' permissions
        )
    ORDER BY m.id;
END;
$function$
;


