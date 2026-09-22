set check_function_bodies = off;

create or replace view "public"."equipments_with_pending_deviations" as  SELECT DISTINCT v.id,
    v.domain,
    v.serie,
    v.intern_number,
    v.company_id,
    tv.name AS type_name,
    count(DISTINCT cd.id) AS deviation_count
   FROM ((public.checklist_deviations cd
     JOIN public.vehicles v ON ((cd.equipment_id = v.id)))
     LEFT JOIN public.types_of_vehicles tv ON ((v.type_of_vehicle = tv.id)))
  WHERE (NOT (EXISTS ( SELECT 1
           FROM public.checklist_answer_repairs car
          WHERE ((car.checklist_answer_id = cd.checklist_answer_id) AND (car.item_code = cd.item_code)))))
  GROUP BY v.id, v.domain, v.serie, v.intern_number, v.company_id, tv.name
 HAVING (count(DISTINCT cd.id) > 0)
  ORDER BY (count(DISTINCT cd.id)) DESC;


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

grant delete on table "public"."checklist_answer_repairs" to "postgres";

grant insert on table "public"."checklist_answer_repairs" to "postgres";

grant references on table "public"."checklist_answer_repairs" to "postgres";

grant select on table "public"."checklist_answer_repairs" to "postgres";

grant trigger on table "public"."checklist_answer_repairs" to "postgres";

grant truncate on table "public"."checklist_answer_repairs" to "postgres";

grant update on table "public"."checklist_answer_repairs" to "postgres";

grant delete on table "public"."checklist_answers" to "postgres";

grant insert on table "public"."checklist_answers" to "postgres";

grant references on table "public"."checklist_answers" to "postgres";

grant select on table "public"."checklist_answers" to "postgres";

grant trigger on table "public"."checklist_answers" to "postgres";

grant truncate on table "public"."checklist_answers" to "postgres";

grant update on table "public"."checklist_answers" to "postgres";

grant delete on table "public"."checklist_items" to "postgres";

grant insert on table "public"."checklist_items" to "postgres";

grant references on table "public"."checklist_items" to "postgres";

grant select on table "public"."checklist_items" to "postgres";

grant trigger on table "public"."checklist_items" to "postgres";

grant truncate on table "public"."checklist_items" to "postgres";

grant update on table "public"."checklist_items" to "postgres";

grant delete on table "public"."checklist_sections" to "postgres";

grant insert on table "public"."checklist_sections" to "postgres";

grant references on table "public"."checklist_sections" to "postgres";

grant select on table "public"."checklist_sections" to "postgres";

grant trigger on table "public"."checklist_sections" to "postgres";

grant truncate on table "public"."checklist_sections" to "postgres";

grant update on table "public"."checklist_sections" to "postgres";

grant delete on table "public"."checklist_template_items" to "postgres";

grant insert on table "public"."checklist_template_items" to "postgres";

grant references on table "public"."checklist_template_items" to "postgres";

grant select on table "public"."checklist_template_items" to "postgres";

grant trigger on table "public"."checklist_template_items" to "postgres";

grant truncate on table "public"."checklist_template_items" to "postgres";

grant update on table "public"."checklist_template_items" to "postgres";

grant delete on table "public"."checklist_template_sections" to "postgres";

grant insert on table "public"."checklist_template_sections" to "postgres";

grant references on table "public"."checklist_template_sections" to "postgres";

grant select on table "public"."checklist_template_sections" to "postgres";

grant trigger on table "public"."checklist_template_sections" to "postgres";

grant truncate on table "public"."checklist_template_sections" to "postgres";

grant update on table "public"."checklist_template_sections" to "postgres";

grant delete on table "public"."checklist_template_sub_types" to "postgres";

grant insert on table "public"."checklist_template_sub_types" to "postgres";

grant references on table "public"."checklist_template_sub_types" to "postgres";

grant select on table "public"."checklist_template_sub_types" to "postgres";

grant trigger on table "public"."checklist_template_sub_types" to "postgres";

grant truncate on table "public"."checklist_template_sub_types" to "postgres";

grant update on table "public"."checklist_template_sub_types" to "postgres";

grant delete on table "public"."checklist_template_types" to "postgres";

grant insert on table "public"."checklist_template_types" to "postgres";

grant references on table "public"."checklist_template_types" to "postgres";

grant select on table "public"."checklist_template_types" to "postgres";

grant trigger on table "public"."checklist_template_types" to "postgres";

grant truncate on table "public"."checklist_template_types" to "postgres";

grant update on table "public"."checklist_template_types" to "postgres";

grant delete on table "public"."checklist_templates" to "postgres";

grant insert on table "public"."checklist_templates" to "postgres";

grant references on table "public"."checklist_templates" to "postgres";

grant select on table "public"."checklist_templates" to "postgres";

grant trigger on table "public"."checklist_templates" to "postgres";

grant truncate on table "public"."checklist_templates" to "postgres";

grant update on table "public"."checklist_templates" to "postgres";


