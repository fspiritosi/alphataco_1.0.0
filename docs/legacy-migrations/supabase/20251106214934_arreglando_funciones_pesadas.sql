drop trigger if exists "add_new_document_trigger" on "public"."document_types";

drop policy "Enable read access for all users" on "public"."documents_employees";

drop policy "Employees access by company" on "public"."employees";

drop function if exists "public"."controlar_alertas_documentos"(tipo_documento_id uuid);

alter type "public"."contract_type_enum" rename to "contract_type_enum__old_version_to_be_dropped";

create type "public"."contract_type_enum" as enum ('Leasing', 'Alquiler', 'Prendado');

alter type "public"."contract_type_vehicles_enum" rename to "contract_type_vehicles_enum__old_version_to_be_dropped";

create type "public"."contract_type_vehicles_enum" as enum ('Leasing', 'Alquiler', 'Propio', 'Prendado');


  create table "public"."equipment_owner_contract_types" (
    "id" uuid not null default gen_random_uuid(),
    "equipment_owner_id" uuid not null,
    "contract_type" public.contract_type_enum not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."equipment_owner_contract_types" enable row level security;

alter table "public"."equipment_owners" alter column contract_type type "public"."contract_type_enum" using contract_type::text::"public"."contract_type_enum";

alter table "public"."vehicles" alter column type_of_contract type "public"."contract_type_vehicles_enum" using type_of_contract::text::"public"."contract_type_vehicles_enum";

drop type "public"."contract_type_enum__old_version_to_be_dropped";

drop type "public"."contract_type_vehicles_enum__old_version_to_be_dropped";

CREATE UNIQUE INDEX equipment_owner_contract_type_equipment_owner_id_contract_t_key ON public.equipment_owner_contract_types USING btree (equipment_owner_id, contract_type);

CREATE UNIQUE INDEX equipment_owner_contract_types_pkey ON public.equipment_owner_contract_types USING btree (id);

CREATE INDEX idx_equipment_owner_contract_types_owner ON public.equipment_owner_contract_types USING btree (equipment_owner_id);

alter table "public"."equipment_owner_contract_types" add constraint "equipment_owner_contract_types_pkey" PRIMARY KEY using index "equipment_owner_contract_types_pkey";

alter table "public"."equipment_owner_contract_types" add constraint "equipment_owner_contract_type_equipment_owner_id_contract_t_key" UNIQUE using index "equipment_owner_contract_type_equipment_owner_id_contract_t_key";

alter table "public"."equipment_owner_contract_types" add constraint "equipment_owner_contract_types_equipment_owner_id_fkey" FOREIGN KEY (equipment_owner_id) REFERENCES public.equipment_owners(id) ON DELETE CASCADE not valid;

alter table "public"."equipment_owner_contract_types" validate constraint "equipment_owner_contract_types_equipment_owner_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.controlar_alertas_documentos_single_employee(employee_id_param uuid, company_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  employee_matches boolean;
BEGIN
  BEGIN
    user_jwt := auth.jwt();
    user_id := user_jwt->>'sub';
  EXCEPTION WHEN OTHERS THEN
    user_id := NULL;
  END;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Persona'
  LOOP
    IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
      SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
      where_sql := build_employee_where_alias(conditions_jsonb, 'e');
      
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM employees e WHERE e.id = %L AND e.company_id = %L AND %s)',
        employee_id_param, company_id_param, where_sql
      ) INTO employee_matches;
      
      IF employee_matches THEN
        INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, employee_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_employees 
          WHERE id_document_types = doc.id AND applies = employee_id_param
        );
      ELSE
        DELETE FROM documents_employees
        WHERE id_document_types = doc.id
          AND applies = employee_id_param
          AND (document_path IS NULL OR document_path = '');
      END IF;
    ELSE
      INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, employee_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_employees 
        WHERE id_document_types = doc.id AND applies = employee_id_param
      );
    END IF;
  END LOOP;
  
  UPDATE employees e
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM documents_employees de
      WHERE de.applies = employee_id_param AND de.state = 'vencido'
    ) THEN 'Completo con doc vencida'::status_type
    WHEN EXISTS (
      SELECT 1 FROM document_types dt
      WHERE dt.mandatory = true AND dt.applies = 'Persona'
        AND NOT EXISTS (
          SELECT 1 FROM documents_employees de2
          WHERE de2.id_document_types = dt.id AND de2.applies = employee_id_param
        )
    ) THEN 'Incompleto'::status_type
    ELSE 'Completo'::status_type
  END
  WHERE e.id = employee_id_param;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.controlar_alertas_documentos_single_vehicle(vehicle_id_param uuid, company_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  vehicle_matches boolean;
BEGIN
  BEGIN
    user_jwt := auth.jwt();
    user_id := user_jwt->>'sub';
  EXCEPTION WHEN OTHERS THEN
    user_id := NULL;
  END;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Equipos'
  LOOP
    IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
      SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
      where_sql := build_vehicle_where_alias(conditions_jsonb, 'v');
      
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id = %L AND v.company_id = %L AND %s)',
        vehicle_id_param, company_id_param, where_sql
      ) INTO vehicle_matches;
      
      IF vehicle_matches THEN
        INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, vehicle_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_equipment 
          WHERE id_document_types = doc.id AND applies = vehicle_id_param
        );
      ELSE
        DELETE FROM documents_equipment
        WHERE id_document_types = doc.id
          AND applies = vehicle_id_param
          AND (document_path IS NULL OR document_path = '');
      END IF;
    ELSE
      INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, vehicle_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_equipment 
        WHERE id_document_types = doc.id AND applies = vehicle_id_param
      );
    END IF;
  END LOOP;
  
  UPDATE vehicles v
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM documents_equipment de
      WHERE de.applies = vehicle_id_param AND de.state = 'vencido'
    ) THEN 'Completo con doc vencida'::status_type
    WHEN EXISTS (
      SELECT 1 FROM document_types dt
      WHERE dt.mandatory = true AND dt.applies = 'Equipos'
        AND NOT EXISTS (
          SELECT 1 FROM documents_equipment de2
          WHERE de2.id_document_types = dt.id AND de2.applies = vehicle_id_param
        )
    ) THEN 'Incompleto'::status_type
    ELSE 'Completo'::status_type
  END
  WHERE v.id = vehicle_id_param;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.controlar_alertas_single_document_all_employees(document_type_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  company_id_var uuid;
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  employee_record RECORD;
  employee_matches boolean;
BEGIN
  user_jwt := auth.jwt();
  company_id_var := user_jwt->'app_metadata'->>'company';
  user_id := user_jwt->>'sub';

  SELECT * INTO doc FROM document_types
  WHERE id = document_type_id_param AND mandatory = true AND applies = 'Persona';
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  IF current_setting('myapp.inside_single_document_batch', true) = 'true' THEN
    RETURN;
  END IF;
  
  PERFORM set_config('myapp.inside_single_document_batch', 'true', true);
  
  IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
    SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
    where_sql := build_employee_where_alias(conditions_jsonb, 'e');
    
    FOR employee_record IN
      SELECT id FROM employees WHERE company_id = company_id_var
    LOOP
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM employees e WHERE e.id = %L AND e.company_id = %L AND %s)',
        employee_record.id, company_id_var, where_sql
      ) INTO employee_matches;
      
      IF employee_matches THEN
        INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, employee_record.id, NULL, 'pendiente', TRUE, user_id, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_employees 
          WHERE id_document_types = doc.id AND applies = employee_record.id
        );
      ELSE
        DELETE FROM documents_employees
        WHERE id_document_types = doc.id
          AND applies = employee_record.id
          AND (document_path IS NULL OR document_path = '');
      END IF;
      
      UPDATE employees e
      SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM documents_employees de
          WHERE de.applies = employee_record.id AND de.state = 'vencido'
        ) THEN 'Completo con doc vencida'::status_type
        WHEN EXISTS (
          SELECT 1 FROM document_types dt
          WHERE dt.mandatory = true AND dt.applies = 'Persona'
            AND NOT EXISTS (
              SELECT 1 FROM documents_employees de2
              WHERE de2.id_document_types = dt.id AND de2.applies = employee_record.id
            )
        ) THEN 'Incompleto'::status_type
        ELSE 'Completo'::status_type
      END
      WHERE e.id = employee_record.id;
    END LOOP;
  ELSE
    FOR employee_record IN
      SELECT id FROM employees WHERE company_id = company_id_var
    LOOP
      INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, employee_record.id, NULL, 'pendiente', TRUE, user_id, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_employees 
        WHERE id_document_types = doc.id AND applies = employee_record.id
      );
      
      UPDATE employees e
      SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM documents_employees de
          WHERE de.applies = employee_record.id AND de.state = 'vencido'
        ) THEN 'Completo con doc vencida'::status_type
        WHEN EXISTS (
          SELECT 1 FROM document_types dt
          WHERE dt.mandatory = true AND dt.applies = 'Persona'
            AND NOT EXISTS (
              SELECT 1 FROM documents_employees de2
              WHERE de2.id_document_types = dt.id AND de2.applies = employee_record.id
            )
        ) THEN 'Incompleto'::status_type
        ELSE 'Completo'::status_type
      END
      WHERE e.id = employee_record.id;
    END LOOP;
  END IF;
  
  PERFORM set_config('myapp.inside_single_document_batch', 'false', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.controlar_alertas_single_document_all_vehicles(document_type_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  company_id_var uuid;
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  vehicle_record RECORD;
  vehicle_matches boolean;
BEGIN
  user_jwt := auth.jwt();
  company_id_var := user_jwt->'app_metadata'->>'company';
  user_id := user_jwt->>'sub';

  SELECT * INTO doc FROM document_types
  WHERE id = document_type_id_param AND mandatory = true AND applies = 'Equipos';
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  IF current_setting('myapp.inside_single_document_batch_vehicles', true) = 'true' THEN
    RETURN;
  END IF;
  
  PERFORM set_config('myapp.inside_single_document_batch_vehicles', 'true', true);
  
  IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
    SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
    where_sql := build_vehicle_where_alias(conditions_jsonb, 'v');
    
    FOR vehicle_record IN
      SELECT id FROM vehicles WHERE company_id = company_id_var
    LOOP
      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id = %L AND v.company_id = %L AND %s)',
        vehicle_record.id, company_id_var, where_sql
      ) INTO vehicle_matches;
      
      IF vehicle_matches THEN
        INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, vehicle_record.id, NULL, 'pendiente', TRUE, user_id, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_equipment 
          WHERE id_document_types = doc.id AND applies = vehicle_record.id
        );
      ELSE
        DELETE FROM documents_equipment
        WHERE id_document_types = doc.id
          AND applies = vehicle_record.id
          AND (document_path IS NULL OR document_path = '');
      END IF;
      
      UPDATE vehicles v
      SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM documents_equipment de
          WHERE de.applies = vehicle_record.id AND de.state = 'vencido'
        ) THEN 'Completo con doc vencida'::status_type
        WHEN EXISTS (
          SELECT 1 FROM document_types dt
          WHERE dt.mandatory = true AND dt.applies = 'Equipos'
            AND NOT EXISTS (
              SELECT 1 FROM documents_equipment de2
              WHERE de2.id_document_types = dt.id AND de2.applies = vehicle_record.id
            )
        ) THEN 'Incompleto'::status_type
        ELSE 'Completo'::status_type
      END
      WHERE v.id = vehicle_record.id;
    END LOOP;
  ELSE
    FOR vehicle_record IN
      SELECT id FROM vehicles WHERE company_id = company_id_var
    LOOP
      INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
      SELECT doc.id, vehicle_record.id, NULL, 'pendiente', TRUE, user_id, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM documents_equipment 
        WHERE id_document_types = doc.id AND applies = vehicle_record.id
      );
      
      UPDATE vehicles v
      SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM documents_equipment de
          WHERE de.applies = vehicle_record.id AND de.state = 'vencido'
        ) THEN 'Completo con doc vencida'::status_type
        WHEN EXISTS (
          SELECT 1 FROM document_types dt
          WHERE dt.mandatory = true AND dt.applies = 'Equipos'
            AND NOT EXISTS (
              SELECT 1 FROM documents_equipment de2
              WHERE de2.id_document_types = dt.id AND de2.applies = vehicle_record.id
            )
        ) THEN 'Incompleto'::status_type
        ELSE 'Completo'::status_type
      END
      WHERE v.id = vehicle_record.id;
    END LOOP;
  END IF;
  
  PERFORM set_config('myapp.inside_single_document_batch_vehicles', 'false', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.add_new_document()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.mandatory THEN
    IF NEW.applies = 'Persona' THEN
      PERFORM controlar_alertas_single_document_all_employees(NEW.id);
    ELSIF NEW.applies = 'Equipos' THEN
      PERFORM controlar_alertas_single_document_all_vehicles(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.after_dailyreportrows_update_optimized()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
    affected_reports UUID[];
    v_report_id UUID;
    row_record RECORD;
    tiene_filas BOOLEAN;
    todas_completas BOOLEAN;
    tiene_recursos BOOLEAN;
BEGIN
    -- Recopilar todos los report_ids únicos afectados en esta transacción
    -- Esto funciona tanto para 1 fila como para múltiples filas
    SELECT ARRAY_AGG(DISTINCT daily_report_id) 
    INTO affected_reports
    FROM (
        SELECT NEW.daily_report_id AS daily_report_id
        UNION
        SELECT OLD.daily_report_id AS daily_report_id WHERE TG_OP = 'UPDATE'
    ) reports
    WHERE daily_report_id IS NOT NULL;
    IF affected_reports IS NOT NULL AND array_length(affected_reports, 1) > 0 THEN
 
    -- Procesar cada reporte afectado UNA SOLA VEZ
    FOREACH v_report_id IN ARRAY affected_reports
    LOOP
        -- Actualizar filas 'sin_recursos_asignados' que ahora tienen recursos
        UPDATE dailyreportrows
        SET status = 'pendiente',
            updated_at = NOW()
        WHERE id IN (
            SELECT dr.id
            FROM dailyreportrows dr
            WHERE dr.status = 'sin_recursos_asignados'
              AND dr.daily_report_id = v_report_id
              AND EXISTS (
                  SELECT 1 FROM dailyreportemployeerelations 
                  WHERE daily_report_row_id = dr.id
                  UNION
                  SELECT 1 FROM dailyreportequipmentrelations 
                  WHERE daily_report_row_id = dr.id
              )
        );

        -- Continuar con la lógica de cierre SOLO para reportes pasados y abiertos
        IF EXISTS (
            SELECT 1 
            FROM dailyreport 
            WHERE id = v_report_id
              AND date < CURRENT_DATE 
              AND status IN ('abierto', 'cerrado_incompleto')
        ) THEN
            -- Verificar si el reporte tiene filas asociadas
            SELECT EXISTS (SELECT 1 FROM dailyreportrows WHERE daily_report_id = v_report_id) INTO tiene_filas;
            
            IF NOT tiene_filas THEN
                -- Si no tiene filas, marcarlo como cerrado_completo
                UPDATE dailyreport 
                SET status = 'cerrado_completo', 
                    updated_at = NOW() 
                WHERE id = v_report_id;
            ELSE
                -- Verificar si todas las filas están completas
                SELECT NOT EXISTS (
                    SELECT 1 
                    FROM dailyreportrows 
                    WHERE daily_report_id = v_report_id 
                    AND (
                        status NOT IN ('ejecutado', 'reprogramado', 'cancelado')
                        OR (status = 'ejecutado' AND (document_path IS NULL OR document_path = ''))
                    )
                ) INTO todas_completas;
                
                -- Actualizar el estado según corresponda
                IF todas_completas THEN
                    UPDATE dailyreport 
                    SET status = 'cerrado_completo', 
                        updated_at = NOW() 
                    WHERE id = v_report_id;
                ELSE
                    UPDATE dailyreport 
                    SET status = 'cerrado_incompleto', 
                        updated_at = NOW() 
                    WHERE id = v_report_id;
                END IF;
            END IF;
        END IF;
    END LOOP;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;$function$
;

CREATE OR REPLACE FUNCTION public.select_distinct_values(p_table_name text, p_column_path text, p_join_mappings jsonb DEFAULT NULL::jsonb, p_multi_join_paths jsonb DEFAULT NULL::jsonb, p_filters jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(col_value text, col_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    query TEXT;
    parts TEXT[];
    current_table TEXT;
    current_column TEXT;
    join_clause TEXT := '';
    where_clause TEXT := '';
    table_alias_counter INTEGER := 1;
    i INTEGER;
    target_table TEXT;
    fk_column TEXT;
    mapping_key TEXT;
    mapping_value TEXT;
    processed_mappings JSONB;
    join_info JSONB;
    joins_array_length INTEGER;
    parsed_multi_join_paths JSONB;
    parsed_filters JSONB;
    filter_key TEXT;
    filter_value TEXT;
    filter_conditions TEXT[] := ARRAY[]::TEXT[];
    -- 🔑 NUEVO: Mapeo de tablas a aliases
    table_aliases JSONB := '{}'::JSONB;
    filter_table TEXT;
    filter_column TEXT;
    filter_parts TEXT[];
BEGIN
    RAISE LOG '[SELECT_DISTINCT_VALUES] === INICIO DE EJECUCIÓN ===';
    RAISE LOG '[SELECT_DISTINCT_VALUES] Parámetros de entrada:';
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_table_name: %', p_table_name;
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_column_path: %', p_column_path;
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_join_mappings: %', p_join_mappings;
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_multi_join_paths: %', p_multi_join_paths;
    RAISE LOG '[SELECT_DISTINCT_VALUES] - p_filters: %', p_filters;
    
    -- 🔑 NUEVO: Inicializar mapeo de tabla principal
    table_aliases := jsonb_set(table_aliases, ARRAY[p_table_name], to_jsonb(p_table_name));
    
    -- Si se proporciona multi_join_paths, usar la nueva lógica
    IF p_multi_join_paths IS NOT NULL AND p_multi_join_paths != 'null'::jsonb THEN
        RAISE LOG '[SELECT_DISTINCT_VALUES] Usando multi_join_paths';
        
        -- Parsear el JSON si viene como string
        BEGIN
            IF jsonb_typeof(p_multi_join_paths) = 'string' THEN
                parsed_multi_join_paths := (p_multi_join_paths #>> '{}')::JSONB;
                RAISE LOG '[SELECT_DISTINCT_VALUES] JSON parseado desde string: %', parsed_multi_join_paths;
            ELSE
                parsed_multi_join_paths := p_multi_join_paths;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error al parsear p_multi_join_paths: %. Valor recibido: %', SQLERRM, p_multi_join_paths;
        END;
        
        -- Validar que el parámetro tenga la estructura correcta
        IF NOT (parsed_multi_join_paths ? 'joins' AND parsed_multi_join_paths ? 'final_column') THEN
            RAISE EXCEPTION 'p_multi_join_paths debe contener "joins" y "final_column". Recibido: %', parsed_multi_join_paths;
        END IF;
        
        -- Obtener la longitud del array de joins de forma segura
        joins_array_length := jsonb_array_length(parsed_multi_join_paths->'joins');
        
        IF joins_array_length IS NULL OR joins_array_length = 0 THEN
            RAISE EXCEPTION 'El array "joins" en p_multi_join_paths está vacío o es NULL';
        END IF;
        
        current_table := p_table_name;
        
        -- Construir JOINs múltiples basados en el array de joins
        FOR i IN 0..joins_array_length - 1 LOOP
            join_info := parsed_multi_join_paths->'joins'->i;
            
            -- Validar que el join_info tenga todas las propiedades necesarias
            IF NOT (join_info ? 'from_table' AND join_info ? 'to_table' AND join_info ? 'from_column' AND join_info ? 'to_column') THEN
                RAISE EXCEPTION 'Cada elemento del array "joins" debe contener: from_table, to_table, from_column, to_column';
            END IF;
            
            join_clause := join_clause || format(' LEFT JOIN %I t%s ON %I.%I::TEXT = t%s.%I::TEXT',
                join_info->>'to_table', 
                table_alias_counter,
                current_table,
                join_info->>'from_column',
                table_alias_counter,
                join_info->>'to_column'
            );
            
            -- 🔑 NUEVO: Registrar alias de tabla
            table_aliases := jsonb_set(table_aliases, ARRAY[join_info->>'to_table'], to_jsonb('t' || table_alias_counter));
            
            RAISE LOG '[SELECT_DISTINCT_VALUES] JOIN construido: %', join_clause;
            RAISE LOG '[SELECT_DISTINCT_VALUES] Alias registrado: % -> t%', join_info->>'to_table', table_alias_counter;
            
            current_table := 't' || table_alias_counter;
            table_alias_counter := table_alias_counter + 1;
        END LOOP;
        
        -- Extraer tabla y columna final
        parts := string_to_array(parsed_multi_join_paths->>'final_column', '.');
        IF array_length(parts, 1) = 2 THEN
            current_table := 't' || (table_alias_counter - 1); -- Usar el último alias
            current_column := parts[2];
        ELSE
            current_column := parsed_multi_join_paths->>'final_column';
        END IF;
        
    ELSE
        -- Lógica existente sin cambios para join_mappings
        BEGIN
            IF p_join_mappings IS NOT NULL AND jsonb_typeof(p_join_mappings) = 'string' THEN
                processed_mappings := (p_join_mappings #>> '{}')::JSONB;
                RAISE LOG '[SELECT_DISTINCT_VALUES] Convertido string JSON interno a JSONB: %', processed_mappings;
            ELSE
                processed_mappings := p_join_mappings;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error al procesar p_join_mappings: %. Valor recibido: %', SQLERRM, p_join_mappings;
        END;
        
        -- Dividir el column_path en partes
        parts := string_to_array(p_column_path, '.');
        current_table := p_table_name;
        
        -- Si hay más de una parte, es una relación anidada
        IF array_length(parts, 1) > 1 THEN
            RAISE LOG '[SELECT_DISTINCT_VALUES] Partes anidadas detectadas: %', array_to_string(parts, ', ');
            RAISE LOG '[SELECT_DISTINCT_VALUES] Procesando relación anidada...';
            
            -- Procesar cada nivel de la relación
            FOR i IN 1..array_length(parts, 1)-1 LOOP
                RAISE LOG '[SELECT_DISTINCT_VALUES] Procesando nivel %: buscando tabla destino para columna %', i, parts[i];
                
                -- Buscar en los mappings
                target_table := NULL;
                fk_column := NULL;
                
                -- Iterar sobre los mappings para encontrar la relación
                IF processed_mappings IS NOT NULL THEN
                    FOR mapping_key, mapping_value IN SELECT * FROM jsonb_each_text(processed_mappings) LOOP
                        RAISE LOG '[SELECT_DISTINCT_VALUES] Evaluando mapping: % -> %', mapping_key, mapping_value;
                        
                        -- CORREGIDO: Formato correcto {"tabla_destino": "columna_fk"}
                        IF mapping_key = parts[i] THEN
                            target_table := mapping_key;
                            fk_column := mapping_value;
                            RAISE LOG '[SELECT_DISTINCT_VALUES] Formato correcto detectado: tabla_destino=%, columna_fk=%', target_table, fk_column;
                            EXIT;
                        END IF;
                        
                        -- Formato legacy: {"columna_fk": "tabla_destino"}
                        IF mapping_value = parts[i] THEN
                            target_table := mapping_value;
                            fk_column := mapping_key;
                            RAISE LOG '[SELECT_DISTINCT_VALUES] Formato legacy detectado: tabla_destino=%, columna_fk=%', target_table, fk_column;
                            RAISE WARNING '[SELECT_DISTINCT_VALUES] Usando formato legacy de join_mappings. Se recomienda usar: {"%": "%"}', parts[i], target_table;
                            EXIT;
                        END IF;
                    END LOOP;
                END IF;
                
                -- Si no se encontró mapping, buscar por foreign key
                IF target_table IS NULL THEN
                    SELECT 
                        ccu.table_name,
                        kcu.column_name
                    INTO target_table, fk_column
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_name = current_table
                      AND kcu.column_name = parts[i]
                    LIMIT 1;
                    
                    IF target_table IS NOT NULL THEN
                        RAISE LOG '[SELECT_DISTINCT_VALUES] Relación encontrada por FK: tabla_destino=%, columna_fk=%', target_table, fk_column;
                    END IF;
                END IF;
                
                -- Si aún no se encontró, error
                IF target_table IS NULL THEN
                    RAISE EXCEPTION 'No se encontró clave foránea para la columna % en la tabla % y no hay mapping disponible', parts[i], current_table;
                END IF;
                
                -- Validar que la tabla destino existe
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = target_table AND table_schema = 'public') THEN
                    RAISE EXCEPTION 'La tabla destino % no existe', target_table;
                END IF;
                
                -- Validar que la columna FK existe en la tabla actual
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = current_table AND column_name = fk_column AND table_schema = 'public') THEN
                    RAISE EXCEPTION 'La columna % no existe en la tabla %', fk_column, current_table;
                END IF;
                
                -- Construir el JOIN
                join_clause := join_clause || format(' LEFT JOIN %I t%s ON %I.%I::TEXT = t%s.id::TEXT',
                    target_table, table_alias_counter, current_table, fk_column, table_alias_counter);
                
                -- 🔑 NUEVO: Registrar alias de tabla
                table_aliases := jsonb_set(table_aliases, ARRAY[target_table], to_jsonb('t' || table_alias_counter));
                
                RAISE LOG '[SELECT_DISTINCT_VALUES] JOIN construido: %', join_clause;
                RAISE LOG '[SELECT_DISTINCT_VALUES] Alias registrado: % -> t%', target_table, table_alias_counter;
                
                current_table := 't' || table_alias_counter;
                table_alias_counter := table_alias_counter + 1;
            END LOOP;
            
            current_column := parts[array_length(parts, 1)];
        ELSE
            current_column := p_column_path;
        END IF;
    END IF;
    
    -- 🔑 MODIFICADO: Procesar filtros con soporte para relaciones
    IF p_filters IS NOT NULL AND p_filters != 'null'::jsonb AND jsonb_typeof(p_filters) != 'null' THEN
        RAISE LOG '[SELECT_DISTINCT_VALUES] Procesando filtros: %', p_filters;
        
        -- Parsear el JSON si viene como string
        BEGIN
            IF jsonb_typeof(p_filters) = 'string' THEN
                parsed_filters := (p_filters #>> '{}')::JSONB;
                RAISE LOG '[SELECT_DISTINCT_VALUES] Filtros parseados desde string: %', parsed_filters;
            ELSE
                parsed_filters := p_filters;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error al parsear p_filters: %. Valor recibido: %', SQLERRM, p_filters;
        END;
        
        -- Verificar que parsed_filters no sea null antes de iterar
        IF parsed_filters IS NOT NULL AND jsonb_typeof(parsed_filters) = 'object' THEN
            -- Iterar sobre cada filtro
            FOR filter_key, filter_value IN SELECT * FROM jsonb_each_text(parsed_filters) LOOP
                RAISE LOG '[SELECT_DISTINCT_VALUES] Aplicando filtro: % = %', filter_key, filter_value;
                
                -- 🔑 NUEVO: Determinar tabla y columna del filtro
                filter_parts := string_to_array(filter_key, '.');
                IF array_length(filter_parts, 1) = 2 THEN
                    -- Filtro con tabla.columna
                    filter_table := filter_parts[1];
                    filter_column := filter_parts[2];
                    
                    -- Buscar el alias de la tabla
                    IF table_aliases ? filter_table THEN
                        filter_table := table_aliases ->> filter_table;
                        RAISE LOG '[SELECT_DISTINCT_VALUES] Usando alias para tabla %: %', filter_parts[1], filter_table;
                    ELSE
                        -- Si no hay alias, usar el nombre original
                        filter_table := filter_parts[1];
                        RAISE LOG '[SELECT_DISTINCT_VALUES] No se encontró alias para tabla %, usando nombre original', filter_table;
                    END IF;
                ELSE
                    -- Filtro simple, usar tabla principal
                    filter_table := p_table_name;
                    filter_column := filter_key;
                END IF;
                
                -- Construir condición de filtro
                IF filter_value = 'null' THEN
                    filter_conditions := array_append(filter_conditions, format('%I.%I IS NULL', filter_table, filter_column));
                ELSIF filter_value = 'not_null' THEN
                    filter_conditions := array_append(filter_conditions, format('%I.%I IS NOT NULL', filter_table, filter_column));
                ELSIF filter_value IN ('true', 'false') THEN
                    -- Para valores booleanos
                    filter_conditions := array_append(filter_conditions, format('%I.%I = %s', filter_table, filter_column, filter_value));
                ELSE
                    -- Para valores de texto
                    filter_conditions := array_append(filter_conditions, format('%I.%I::TEXT = %L', filter_table, filter_column, filter_value));
                END IF;
                
                RAISE LOG '[SELECT_DISTINCT_VALUES] Condición de filtro construida: %', filter_conditions[array_length(filter_conditions, 1)];
            END LOOP;
        END IF;
        
        -- Construir cláusula WHERE
        IF array_length(filter_conditions, 1) > 0 THEN
            where_clause := ' WHERE ' || array_to_string(filter_conditions, ' AND ');
            RAISE LOG '[SELECT_DISTINCT_VALUES] Cláusula WHERE construida: %', where_clause;
        END IF;
    ELSE
        RAISE LOG '[SELECT_DISTINCT_VALUES] No se aplicarán filtros (p_filters es null o vacío)';
    END IF;
    
    -- Construir la consulta final
    query := format('SELECT COALESCE(%I.%I::TEXT, ''null'') as col_value, COUNT(*) as col_count FROM %I%s%s GROUP BY COALESCE(%I.%I::TEXT, ''null'') ORDER BY col_value ASC',
        current_table, current_column, p_table_name, join_clause, where_clause, current_table, current_column);
    
    RAISE LOG '[SELECT_DISTINCT_VALUES] Consulta SQL generada: %', query;
    
    -- Ejecutar la consulta
    RETURN QUERY EXECUTE query;
    
    RAISE LOG '[SELECT_DISTINCT_VALUES] === FIN DE EJECUCIÓN ===';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_controlar_alertas_employees()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF current_setting('myapp.inside_controlar_alertas', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  PERFORM set_config('myapp.inside_controlar_alertas', 'true', true);
  PERFORM controlar_alertas_documentos_single_employee(NEW.id, NEW.company_id);
  PERFORM set_config('myapp.inside_controlar_alertas', 'false', true);
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_controlar_alertas_vehicles()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF current_setting('myapp.inside_controlar_alertas_vehicles', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  PERFORM set_config('myapp.inside_controlar_alertas_vehicles', 'true', true);
  PERFORM controlar_alertas_documentos_single_vehicle(NEW.id, NEW.company_id);
  PERFORM set_config('myapp.inside_controlar_alertas_vehicles', 'false', true);
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_document_types_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.mandatory THEN
    IF NEW.applies = 'Persona' THEN
      PERFORM controlar_alertas_single_document_all_employees(NEW.id);
    ELSIF NEW.applies = 'Equipos' THEN
      PERFORM controlar_alertas_single_document_all_vehicles(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_document_types_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.mandatory OR (OLD.mandatory AND NEW.conditions IS DISTINCT FROM OLD.conditions) THEN
    IF NEW.applies = 'Persona' THEN
      PERFORM controlar_alertas_single_document_all_employees(NEW.id);
    ELSIF NEW.applies = 'Equipos' THEN
      PERFORM controlar_alertas_single_document_all_vehicles(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."equipment_owner_contract_types" to "anon";

grant insert on table "public"."equipment_owner_contract_types" to "anon";

grant references on table "public"."equipment_owner_contract_types" to "anon";

grant select on table "public"."equipment_owner_contract_types" to "anon";

grant trigger on table "public"."equipment_owner_contract_types" to "anon";

grant truncate on table "public"."equipment_owner_contract_types" to "anon";

grant update on table "public"."equipment_owner_contract_types" to "anon";

grant delete on table "public"."equipment_owner_contract_types" to "authenticated";

grant insert on table "public"."equipment_owner_contract_types" to "authenticated";

grant references on table "public"."equipment_owner_contract_types" to "authenticated";

grant select on table "public"."equipment_owner_contract_types" to "authenticated";

grant trigger on table "public"."equipment_owner_contract_types" to "authenticated";

grant truncate on table "public"."equipment_owner_contract_types" to "authenticated";

grant update on table "public"."equipment_owner_contract_types" to "authenticated";

grant delete on table "public"."equipment_owner_contract_types" to "service_role";

grant insert on table "public"."equipment_owner_contract_types" to "service_role";

grant references on table "public"."equipment_owner_contract_types" to "service_role";

grant select on table "public"."equipment_owner_contract_types" to "service_role";

grant trigger on table "public"."equipment_owner_contract_types" to "service_role";

grant truncate on table "public"."equipment_owner_contract_types" to "service_role";

grant update on table "public"."equipment_owner_contract_types" to "service_role";


  create policy "test_single_record"
  on "public"."documents_employees"
  as permissive
  for select
  to public
using (true);



  create policy "Employees same company access"
  on "public"."employees"
  as permissive
  for select
  to authenticated
using ((company_id = public.get_company_for_user(auth.uid())));



  create policy "Enable all operations for authenticated users"
  on "public"."equipment_owner_contract_types"
  as permissive
  for all
  to public
using (true)
with check (true);


CREATE TRIGGER add_new_document_trigger AFTER INSERT ON public.document_types FOR EACH ROW EXECUTE FUNCTION public.add_new_document();


