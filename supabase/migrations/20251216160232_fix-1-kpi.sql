set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_kpi_range(p_kpi_code text, p_company_id uuid, p_from_date date, p_to_date date)
 RETURNS TABLE(snapshot_date date, indicator numeric, raw_data jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_current_date date;
  v_result jsonb;
  v_indicator numeric;
BEGIN
  -- Iterar sobre cada día del rango
  v_current_date := p_from_date;
  
  WHILE v_current_date <= p_to_date LOOP
    -- Llamar a la función correspondiente según el código del KPI
    CASE p_kpi_code
      WHEN 'KPI-0001' THEN
        -- Ausentismo Diario (AD)
        SELECT ad_ausentismo_diario(p_company_id, v_current_date) INTO v_result;
        v_indicator := COALESCE((v_result->>'AD')::numeric, 0);
        
      WHEN 'KPI-0002' THEN
        -- Personal en Movimientos Internos (PMI)
        SELECT pmi_personal_mi(p_company_id, v_current_date) INTO v_result;
        v_indicator := COALESCE((v_result->>'PMI')::numeric, 0);
        
      WHEN 'KPI-0003' THEN
        -- Productividad Personal (PP)
        SELECT pp_productividad_personal(p_company_id, v_current_date) INTO v_result;
        v_indicator := COALESCE((v_result->>'PP')::numeric, 0);
        
      WHEN 'KPI-0004' THEN
        -- Disponibilidad Operacional Mantenimiento (EDO)
        SELECT edo_disponibilidad_operacional_mantenimiento(p_company_id, v_current_date) INTO v_result;
        v_indicator := COALESCE((v_result->>'EDO')::numeric, 0);
        
      WHEN 'KPI-0005' THEN
        -- Equipos en Movimientos Internos (EMI)
        SELECT emi_disponibilidad_operacional_mi(p_company_id, v_current_date) INTO v_result;
        v_indicator := COALESCE((v_result->>'EMI')::numeric, 0);
        
      WHEN 'KPI-0006' THEN
        -- Equipos Operativos en Cliente (EOC)
        SELECT eoc_disponibilidad_operacional_cliente(p_company_id, v_current_date) INTO v_result;
        v_indicator := COALESCE((v_result->>'EOC')::numeric, 0);
        
      ELSE
        v_result := '{}'::jsonb;
        v_indicator := 0;
    END CASE;
    
    -- Retornar la fila
    RETURN QUERY SELECT v_current_date, v_indicator, v_result;
    
    -- Avanzar al siguiente día
    v_current_date := v_current_date + interval '1 day';
  END LOOP;
  
  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_owner_role_on_company_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_owner_role_id BIGINT;
  v_user_id UUID;
BEGIN
  -- Verificar que la empresa tiene un owner_id
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.owner_id;

  -- Obtener el ID del rol OWNER
  SELECT id INTO v_owner_role_id
  FROM roles
  WHERE slug = 'owner'
  LIMIT 1;

  -- Si no existe el rol OWNER, no hacer nada (evitar errores)
  IF v_owner_role_id IS NULL THEN
    RAISE WARNING 'Rol OWNER no encontrado. No se asignará rol automáticamente.';
    RETURN NEW;
  END IF;

  -- Asignar el rol OWNER al usuario si no lo tiene ya
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_user_id, v_owner_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- Asegurar que el usuario tenga acceso a la empresa en share_company_users
  -- (solo si no existe ya)
  IF NOT EXISTS (
    SELECT 1 
    FROM share_company_users 
    WHERE company_id = NEW.id AND profile_id = v_user_id
  ) THEN
    INSERT INTO share_company_users (company_id, profile_id)
    VALUES (NEW.id, v_user_id);
  END IF;

  RETURN NEW;
END;
$function$
;


