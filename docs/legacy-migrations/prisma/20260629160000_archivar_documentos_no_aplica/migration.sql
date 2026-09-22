-- Ticket 358: cuando un documento deja de aplicar a un empleado/equipo (cambió la función,
-- categoría, etc.), si YA tiene archivo (presentado/vencido) NO se borra: se ARCHIVA
-- (archived_at) para conservarlo como HISTORIAL en el detalle, sin solicitarlo ni contarlo
-- como vencido/pendiente. Si el recurso vuelve a cumplir la condición, se RE-ACTIVA.
-- Las alertas vacías (sin archivo) que dejan de aplicar se siguen borrando (no hay historial).

-- ─── 1. Columna de archivado (NULL = vigente) ───────────────────────────────
ALTER TABLE public.documents_employees  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.documents_equipment  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS documents_employees_archived_at_idx ON public.documents_employees (archived_at);
CREATE INDEX IF NOT EXISTS documents_equipment_archived_at_idx ON public.documents_equipment (archived_at);

-- ─── 2. controlar_alertas_documentos_single_employee: archivar/re-activar + status ──
CREATE OR REPLACE FUNCTION public.controlar_alertas_documentos_single_employee(employee_id_param uuid, company_id_param uuid)
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  employee_matches boolean;
  emp_active boolean;
BEGIN
  BEGIN
    user_jwt := auth.jwt();
    user_id := user_jwt->>'sub';
  EXCEPTION WHEN OTHERS THEN
    user_id := NULL;
  END;

  SELECT is_active INTO emp_active FROM employees WHERE id = employee_id_param;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Persona' AND is_active = true
  LOOP
    -- Empleado dado de baja + tipo NO de baja: no debe tener alerta; limpiar la vacia.
    IF NOT (COALESCE(doc.down_document, false) OR COALESCE(emp_active, true)) THEN
      DELETE FROM documents_employees
      WHERE id_document_types = doc.id
        AND applies = employee_id_param
        AND (document_path IS NULL OR document_path = '');
      CONTINUE;
    END IF;

    IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
      SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
      where_sql := build_employee_where_alias(conditions_jsonb, 'e');

      IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN
        CONTINUE;
      END IF;

      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM employees e WHERE e.id = %L AND e.company_id = %L AND %s)',
        employee_id_param, company_id_param, where_sql
      ) INTO employee_matches;

      IF employee_matches THEN
        -- 358: vuelve a aplicar -> re-activar lo que estuviese archivado (conserva archivo/validity)
        UPDATE documents_employees SET archived_at = NULL
        WHERE id_document_types = doc.id AND applies = employee_id_param AND archived_at IS NOT NULL;
        -- crear alerta pendiente si no existe ninguna fila
        INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
        SELECT doc.id, employee_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM documents_employees
          WHERE id_document_types = doc.id AND applies = employee_id_param
        );
      ELSE
        -- 358: ya no aplica. Sin archivo -> borrar (alerta vacia). Con archivo -> archivar (historial).
        DELETE FROM documents_employees
        WHERE id_document_types = doc.id
          AND applies = employee_id_param
          AND (document_path IS NULL OR document_path = '');
        UPDATE documents_employees SET archived_at = now()
        WHERE id_document_types = doc.id
          AND applies = employee_id_param
          AND document_path IS NOT NULL AND document_path <> ''
          AND archived_at IS NULL;
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

  -- Status: excluir documentos archivados (no vigentes para la funcion/condicion actual)
  UPDATE employees e
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM documents_employees de
      WHERE de.applies = employee_id_param AND de.state = 'vencido' AND de.archived_at IS NULL
    ) THEN 'Completo con doc vencida'::status_type
    WHEN EXISTS (
      SELECT 1 FROM document_types dt
      WHERE dt.mandatory = true AND dt.applies = 'Persona' AND dt.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM documents_employees de2
          WHERE de2.id_document_types = dt.id AND de2.applies = employee_id_param AND de2.archived_at IS NULL
        )
    ) THEN 'Incompleto'::status_type
    ELSE 'Completo'::status_type
  END
  WHERE e.id = employee_id_param;
END;
$function$;

-- ─── 3. controlar_alertas_documentos_single_vehicle: idem ───────────────────
CREATE OR REPLACE FUNCTION public.controlar_alertas_documentos_single_vehicle(vehicle_id_param uuid, company_id_param uuid)
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE
  user_jwt jsonb;
  user_id uuid;
  doc RECORD;
  where_sql text;
  conditions_jsonb jsonb;
  vehicle_matches boolean;
  veh_active boolean;
BEGIN
  BEGIN
    user_jwt := auth.jwt();
    user_id := user_jwt->>'sub';
  EXCEPTION WHEN OTHERS THEN
    user_id := NULL;
  END;

  SELECT is_active INTO veh_active FROM vehicles WHERE id = vehicle_id_param;

  FOR doc IN
    SELECT * FROM document_types
    WHERE mandatory = true AND applies = 'Equipos' AND is_active = true
  LOOP
    IF NOT (COALESCE(doc.down_document, false) OR COALESCE(veh_active, true)) THEN
      DELETE FROM documents_equipment
      WHERE id_document_types = doc.id
        AND applies = vehicle_id_param
        AND (document_path IS NULL OR document_path = '');
      CONTINUE;
    END IF;

    IF doc.special AND doc.conditions IS NOT NULL AND array_length(doc.conditions, 1) > 0 THEN
      SELECT array_to_json(doc.conditions)::jsonb INTO conditions_jsonb;
      where_sql := build_vehicle_where_alias(conditions_jsonb, 'v');

      IF where_sql IS NULL OR where_sql = '' OR where_sql = 'TRUE' THEN
        CONTINUE;
      END IF;

      EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM vehicles v WHERE v.id = %L AND v.company_id = %L AND %s)',
        vehicle_id_param, company_id_param, where_sql
      ) INTO vehicle_matches;

      IF vehicle_matches THEN
        UPDATE documents_equipment SET archived_at = NULL
        WHERE id_document_types = doc.id AND applies = vehicle_id_param AND archived_at IS NOT NULL;
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
        UPDATE documents_equipment SET archived_at = now()
        WHERE id_document_types = doc.id
          AND applies = vehicle_id_param
          AND document_path IS NOT NULL AND document_path <> ''
          AND archived_at IS NULL;
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
      WHERE de.applies = vehicle_id_param AND de.state = 'vencido' AND de.archived_at IS NULL
    ) THEN 'Completo con doc vencida'::status_type
    WHEN EXISTS (
      SELECT 1 FROM document_types dt
      WHERE dt.mandatory = true AND dt.applies = 'Equipos' AND dt.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM documents_equipment de2
          WHERE de2.id_document_types = dt.id AND de2.applies = vehicle_id_param AND de2.archived_at IS NULL
        )
    ) THEN 'Incompleto'::status_type
    ELSE 'Completo'::status_type
  END
  WHERE v.id = vehicle_id_param;
END;
$function$;

-- ─── 4. update_status_trigger (statement-level): excluir archivados del status ──
CREATE OR REPLACE FUNCTION public.update_status_trigger()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF TG_TABLE_NAME = 'documents_employees' THEN
    UPDATE employees e SET status = CASE
      WHEN EXISTS (SELECT 1 FROM documents_employees d WHERE d.applies = e.id AND d.state = 'vencido' AND d.archived_at IS NULL)
        THEN 'Completo con doc vencida'
      WHEN NOT EXISTS (SELECT 1 FROM documents_employees d WHERE d.applies = e.id AND d.state <> 'presentado' AND d.archived_at IS NULL)
        THEN 'Completo'
      ELSE 'Incompleto'
    END::status_type
    WHERE e.id IN (SELECT DISTINCT applies FROM affected_rows WHERE applies IS NOT NULL);
  ELSIF TG_TABLE_NAME = 'documents_equipment' THEN
    UPDATE vehicles v SET status = CASE
      WHEN EXISTS (SELECT 1 FROM documents_equipment d WHERE d.applies = v.id AND d.state = 'vencido' AND d.archived_at IS NULL)
        THEN 'Completo con doc vencida'
      WHEN NOT EXISTS (SELECT 1 FROM documents_equipment d WHERE d.applies = v.id AND d.state <> 'presentado' AND d.archived_at IS NULL)
        THEN 'Completo'
      ELSE 'Incompleto'
    END::status_type
    WHERE v.id IN (SELECT DISTINCT applies FROM affected_rows WHERE applies IS NOT NULL);
  END IF;
  RETURN NULL;
END;
$function$;
