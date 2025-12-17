alter table "public"."vehicles" alter column "condition" drop default;

alter type "public"."condition_enum" rename to "condition_enum__old_version_to_be_dropped";

create type "public"."condition_enum" as enum ('operativo', 'no operativo', 'en reparacion', 'operativo condicionado', 'en preparacion');

alter table "public"."vehicles" alter column condition type "public"."condition_enum" using condition::text::"public"."condition_enum";

alter table "public"."vehicles" alter column "condition" set default 'operativo'::public.condition_enum;

drop type "public"."condition_enum__old_version_to_be_dropped";

alter table "public"."diagram_type" add column "computes_absenteeism" boolean not null default false;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.ad_ausentismo_diario(p_company_id uuid, p_date date)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_te integer;
  v_ta integer;
  v_ad numeric;
BEGIN
  v_te := te_total_empleados(p_company_id, p_date);
  v_ta := ta_total_ausentes(p_company_id, p_date);

  IF v_te = 0 THEN
    v_ad := 0;
  ELSE
    v_ad := ROUND((v_ta::numeric / v_te::numeric) * 100, 2);
  END IF;

  RETURN json_build_object(
    'date', p_date,
    'TE', v_te,
    'TA', v_ta,
    'AD', v_ad
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ea_total_equipos_aptos(p_company_id uuid, p_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total integer;
  -- IDs de tipos Tractor y Chasis
  v_tipo_tractor_id uuid := 'ea07ff34-13fb-4483-b5bc-8389e41c7d89';
  v_tipo_chasis_id uuid := '5dc2bc44-de86-4e1d-ae0c-87eafd60dccf';
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM vehicles v
  WHERE v.company_id = p_company_id
    AND v.is_active = true
    AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)  -- Filtrar por UUID de Tractor y Chasis
    AND v.condition <> 'en preparacion';

  RETURN COALESCE(v_total, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.eami_equipos_movimientos_internos(p_company_id uuid, p_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total integer;
  -- IDs de tipos Tractor y Chasis
  v_tipo_tractor_id uuid := 'ea07ff34-13fb-4483-b5bc-8389e41c7d89';
  v_tipo_chasis_id uuid := '5dc2bc44-de86-4e1d-ae0c-87eafd60dccf';
  -- ID del cliente GH - Movimientos Internos
  v_gh_movimientos_internos_id uuid := 'fecde2b8-f310-495d-9d70-847c9ebfa890';
BEGIN
  SELECT COUNT(DISTINCT drer.equipment_id) INTO v_total
  FROM dailyreportequipmentrelations drer
  JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
  JOIN dailyreport dr ON drw.daily_report_id = dr.id
  JOIN vehicles v ON v.id = drer.equipment_id
  WHERE v.company_id = p_company_id
    AND v.is_active = true
    AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)  -- Filtrar por UUID
    AND v.condition NOT IN ('en preparacion', 'no operativo')
    AND dr.date = p_date
    AND dr.is_active = true
    AND drw.customer_id = v_gh_movimientos_internos_id;  -- Usar customer_id del parte

  RETURN COALESCE(v_total, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.edo_disponibilidad_operacional_mantenimiento(p_company_id uuid, p_date date)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_ea integer;
  v_eno integer;
  v_edo numeric;
BEGIN
  v_ea := ea_total_equipos_aptos(p_company_id, p_date);
  v_eno := eno_total_equipos_no_operativos(p_company_id, p_date);

  IF v_ea = 0 THEN
    v_edo := 0;
  ELSE
    v_edo := ROUND((v_eno::numeric / v_ea::numeric) * 100, 2);
  END IF;

  RETURN json_build_object(
    'date', p_date,
    'EA', v_ea,
    'ENO', v_eno,
    'EDO', v_edo
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.emi_disponibilidad_operacional_mi(p_company_id uuid, p_date date)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_eoa integer;
  v_eami integer;
  v_emi numeric;
BEGIN
  v_eoa := eoa_total_equipos_operativos(p_company_id, p_date);
  v_eami := eami_equipos_movimientos_internos(p_company_id, p_date);

  IF v_eoa = 0 THEN
    v_emi := 0;
  ELSE
    v_emi := ROUND((v_eami::numeric / v_eoa::numeric) * 100, 2);
  END IF;

  RETURN json_build_object(
    'date', p_date,
    'EOA', v_eoa,
    'EAMI', v_eami,
    'EMI', v_emi
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.eno_total_equipos_no_operativos(p_company_id uuid, p_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total integer;
  -- IDs de tipos Tractor y Chasis
  v_tipo_tractor_id uuid := 'ea07ff34-13fb-4483-b5bc-8389e41c7d89';
  v_tipo_chasis_id uuid := '5dc2bc44-de86-4e1d-ae0c-87eafd60dccf';
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM vehicles v
  WHERE v.company_id = p_company_id
    AND v.is_active = true
    AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)  -- Filtrar por UUID de Tractor y Chasis
    AND v.condition = 'no operativo';

  RETURN COALESCE(v_total, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.eoa_total_equipos_operativos(p_company_id uuid, p_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total integer;
  -- IDs de tipos Tractor y Chasis
  v_tipo_tractor_id uuid := 'ea07ff34-13fb-4483-b5bc-8389e41c7d89';
  v_tipo_chasis_id uuid := '5dc2bc44-de86-4e1d-ae0c-87eafd60dccf';
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM vehicles v
  WHERE v.company_id = p_company_id
    AND v.is_active = true
    AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)  -- Filtrar por UUID de Tractor y Chasis
    AND v.condition NOT IN ('en preparacion', 'no operativo');

  RETURN COALESCE(v_total, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.eoc_disponibilidad_operacional_cliente(p_company_id uuid, p_date date)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_teoa integer;
  v_teoc integer;
  v_eoa integer;
  v_eami integer;
  v_eoc numeric;
  
  -- IDs de tipos Tractor y Chasis
  v_tipo_tractor_id uuid := 'ea07ff34-13fb-4483-b5bc-8389e41c7d89';
  v_tipo_chasis_id uuid := '5dc2bc44-de86-4e1d-ae0c-87eafd60dccf';
  
  -- ID del cliente GH - Movimientos Internos
  v_gh_movimientos_internos_id uuid := 'fecde2b8-f310-495d-9d70-847c9ebfa890';
BEGIN
  -- =====================================================
  -- EOA: Total de Equipos del Tipo Tractor y Chasis 
  -- con estado distinto a "En Preparación" y "NO Operativo"
  -- =====================================================
  SELECT COUNT(*) INTO v_eoa
  FROM vehicles v
  WHERE v.company_id = p_company_id
    AND v.is_active = true
    AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
    AND v.condition NOT IN ('en preparacion', 'no operativo');

  -- =====================================================
  -- EAMI: Total de Equipos Tractor y Chasis que en el parte 
  -- de operaciones estén asignados al cliente "GH - Movimientos Internos"
  -- =====================================================
  SELECT COUNT(DISTINCT drer.equipment_id) INTO v_eami
  FROM dailyreportequipmentrelations drer
  JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
  JOIN dailyreport dr ON drw.daily_report_id = dr.id
  JOIN vehicles v ON v.id = drer.equipment_id
  WHERE v.company_id = p_company_id
    AND v.is_active = true
    AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
    AND v.condition NOT IN ('en preparacion', 'no operativo')
    AND dr.date = p_date
    AND dr.is_active = true
    AND drw.customer_id = v_gh_movimientos_internos_id;

  -- =====================================================
  -- TEOA = EOA - EAMI (mínimo 0)
  -- =====================================================
  v_teoa := GREATEST(COALESCE(v_eoa, 0) - COALESCE(v_eami, 0), 0);

  -- =====================================================
  -- TEOC: Total de equipos del Tipo Tractor y Chasis que 
  -- en el parte de operaciones estén asignados a Clientes 
  -- que NO sean "GH - Movimientos Internos"
  -- =====================================================
  SELECT COUNT(DISTINCT drer.equipment_id) INTO v_teoc
  FROM dailyreportequipmentrelations drer
  JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
  JOIN dailyreport dr ON drw.daily_report_id = dr.id
  JOIN vehicles v ON v.id = drer.equipment_id
  WHERE v.company_id = p_company_id
    AND v.is_active = true
    AND v.type IN (v_tipo_tractor_id, v_tipo_chasis_id)
    AND v.condition NOT IN ('en preparacion', 'no operativo')
    AND dr.date = p_date
    AND dr.is_active = true
    AND drw.customer_id IS NOT NULL
    AND drw.customer_id <> v_gh_movimientos_internos_id;

  -- =====================================================
  -- EOC = (TEOC / TEOA) * 100
  -- =====================================================
  IF v_teoa = 0 THEN
    v_eoc := 0;
  ELSE
    v_eoc := ROUND((COALESCE(v_teoc, 0)::numeric / v_teoa::numeric) * 100, 2);
  END IF;

  RETURN json_build_object(
    'date', p_date,
    'TEOA', v_teoa,
    'TEOC', COALESCE(v_teoc, 0),
    'EOC', v_eoc
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pmi_personal_mi(p_company_id uuid, p_date date)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_tpa integer;
  v_tmi integer;
  v_pmi numeric;
BEGIN
  v_tpa := tpa_total_personal_apto(p_company_id, p_date);
  v_tmi := tmi_total_personal_mi(p_company_id, p_date);

  IF v_tpa = 0 THEN
    v_pmi := 0;
  ELSE
    v_pmi := ROUND((v_tmi::numeric / v_tpa::numeric) * 100, 2);
  END IF;

  RETURN json_build_object(
    'date', p_date,
    'TPA', v_tpa,
    'TMI', v_tmi,
    'PMI', v_pmi
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pp_productividad_personal(p_company_id uuid, p_date date)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_tpa integer;
  v_tmi integer;
  v_tpc integer;
  v_den integer;
  v_pp numeric;
BEGIN
  v_tpa := tpa_total_personal_apto(p_company_id, p_date);
  v_tmi := tmi_total_personal_mi(p_company_id, p_date);
  v_tpc := tpc_total_personal_clientes(p_company_id, p_date);
  v_den := GREATEST(v_tpa - v_tmi, 0);

  IF v_den = 0 THEN
    v_pp := 0;
  ELSE
    v_pp := ROUND((v_tpc::numeric / v_den::numeric) * 100, 2);
  END IF;

  RETURN json_build_object(
    'date', p_date,
    'TPA', v_tpa,
    'TMI', v_tmi,
    'TPC', v_tpc,
    'PP', v_pp
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ta_total_ausentes(p_company_id uuid, p_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total integer;
BEGIN
  SELECT COUNT(DISTINCT ed.employee_id) INTO v_total
  FROM employees_diagram ed
  JOIN employees e ON e.id = ed.employee_id
  JOIN diagram_type dt ON dt.id = ed.diagram_type
  WHERE e.company_id = p_company_id
    AND e.is_active = true
    AND dt.computes_absenteeism = true
    AND make_date(ed.year::int, ed.month::int, ed.day::int) = p_date;

  RETURN COALESCE(v_total, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.te_total_empleados(p_company_id uuid, p_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total integer;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM employees e
  WHERE e.company_id = p_company_id
    AND e.is_active = true; -- se asume is_active como "en nómina activa"

  RETURN COALESCE(v_total, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.teoa_total_equipos_operativos_ajustado(p_company_id uuid, p_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_eoa integer;
  v_eami integer;
BEGIN
  v_eoa := eoa_total_equipos_operativos(p_company_id, p_date);
  v_eami := eami_equipos_movimientos_internos(p_company_id, p_date);

  RETURN GREATEST(v_eoa - v_eami, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.teoc_equipos_operativos_en_clientes(p_company_id uuid, p_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total integer;
BEGIN
  SELECT COUNT(DISTINCT dreer.equipment_id) INTO v_total
  FROM dailyreportequipmentrelations dreer
  JOIN dailyreportrows drw ON dreer.daily_report_row_id = drw.id
  JOIN dailyreport dr ON drw.daily_report_id = dr.id
  JOIN dailyreport_customer_equipment_relations dcer ON dcer.daily_report_row_id = drw.id
  JOIN equipos_clientes ec ON ec.id = dcer.customer_equipment_id
  JOIN customers c ON c.id = ec.customer_id
  JOIN vehicles v ON v.id = dreer.equipment_id
  WHERE v.company_id = p_company_id
    AND v.is_active = true
    AND v.type_of_vehicle = 1
    AND v.condition NOT IN ('en preparacion', 'no operativo')
    AND dr.date = p_date
    AND c.name <> 'GH - Movimientos Internos';

  RETURN COALESCE(v_total, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tmi_total_personal_mi(p_company_id uuid, p_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total integer;
  v_gh_movimientos_internos_id uuid;
BEGIN
  -- Obtener el ID del cliente "GH - Movimientos Internos"
  SELECT id INTO v_gh_movimientos_internos_id
  FROM customers
  WHERE company_id = p_company_id
    AND name = 'GH - Movimientos Internos'
  LIMIT 1;

  -- Si no existe el cliente, retornar 0
  IF v_gh_movimientos_internos_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Contar empleados asignados a "GH - Movimientos Internos" en el parte
  SELECT COUNT(DISTINCT drer.employee_id) INTO v_total
  FROM dailyreportemployeerelations drer
  JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
  JOIN dailyreport dr ON drw.daily_report_id = dr.id
  JOIN employees e ON e.id = drer.employee_id
  JOIN category cat ON cat.id = e.category_id
  WHERE e.company_id = p_company_id
    AND e.is_active = true
    AND (
      cat.name IN ('Chofer de 1°', 'Chofer de 3°')
      OR cat.name ILIKE '%chofer%1°%'
      OR cat.name ILIKE '%chofer%3°%'
      OR cat.name ILIKE '%conductor%1°%'
      OR cat.name ILIKE '%conductor%3°%'
    )
    AND cat.is_active = true
    AND dr.date = p_date
    AND dr.is_active = true
    AND drw.customer_id = v_gh_movimientos_internos_id;  -- Usar customer_id del parte

  RETURN COALESCE(v_total, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tpa_total_personal_apto(p_company_id uuid, p_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total integer;
BEGIN
  SELECT COUNT(DISTINCT ed.employee_id) INTO v_total
  FROM employees_diagram ed
  INNER JOIN diagram_type dt ON ed.diagram_type = dt.id
  INNER JOIN employees e ON ed.employee_id = e.id
  INNER JOIN category cat ON cat.id = e.category_id
  WHERE e.company_id = p_company_id
    AND e.is_active = true
    AND ed.day = EXTRACT(DAY FROM p_date)
    AND ed.month = EXTRACT(MONTH FROM p_date)
    AND ed.year = EXTRACT(YEAR FROM p_date)
    AND dt.work_active = true
    AND dt.is_active = true
    AND (
      cat.name IN ('Chofer de 1°', 'Chofer de 3°')
      OR cat.name ILIKE '%chofer%1°%'
      OR cat.name ILIKE '%chofer%3°%'
      OR cat.name ILIKE '%conductor%1°%'
      OR cat.name ILIKE '%conductor%3°%'
    )
    AND cat.is_active = true;

  RETURN COALESCE(v_total, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tpc_total_personal_clientes(p_company_id uuid, p_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total integer;
  v_gh_movimientos_internos_id uuid;
BEGIN
  -- Obtener el ID del cliente "GH - Movimientos Internos"
  SELECT id INTO v_gh_movimientos_internos_id
  FROM customers
  WHERE company_id = p_company_id
    AND name = 'GH - Movimientos Internos'
  LIMIT 1;

  -- Contar empleados asignados a clientes que NO son "GH - Movimientos Internos"
  SELECT COUNT(DISTINCT drer.employee_id) INTO v_total
  FROM dailyreportemployeerelations drer
  JOIN dailyreportrows drw ON drer.daily_report_row_id = drw.id
  JOIN dailyreport dr ON drw.daily_report_id = dr.id
  JOIN employees e ON e.id = drer.employee_id
  JOIN category cat ON cat.id = e.category_id
  WHERE e.company_id = p_company_id
    AND e.is_active = true
    AND (
      cat.name IN ('Chofer de 1°', 'Chofer de 3°')
      OR cat.name ILIKE '%chofer%1°%'
      OR cat.name ILIKE '%chofer%3°%'
      OR cat.name ILIKE '%conductor%1°%'
      OR cat.name ILIKE '%conductor%3°%'
    )
    AND cat.is_active = true
    AND dr.date = p_date
    AND dr.is_active = true
    AND drw.customer_id IS NOT NULL
    AND (v_gh_movimientos_internos_id IS NULL OR drw.customer_id <> v_gh_movimientos_internos_id);  -- Usar customer_id del parte

  RETURN COALESCE(v_total, 0);
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


  create policy "Permitir todo"
  on "public"."daily_indicators"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER assign_owner_role_trigger AFTER INSERT ON public.company FOR EACH ROW EXECUTE FUNCTION public.assign_owner_role_on_company_creation();


