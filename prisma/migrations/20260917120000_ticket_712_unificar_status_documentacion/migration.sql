-- ═══════════════════════════════════════════════════════════════════════════
-- Ticket 712 (reclamo de RRHH): empleados con toda la documentacion presentada
-- y sin nada vencido seguian mostrandose como "Incompleto".
--
-- CAUSA RAIZ: convivian TRES formulas distintas para employees.status /
-- vehicles.status, y dos estaban mal:
--
--   A) update_status_trigger  -> mira el state de las filas vigentes (no
--      archivadas). Es la correcta y la que corre al subir un documento.
--   B) controlar_alertas_documentos_single_employee / _vehicle -> preguntaban si
--      existe algun document_type mandatory + activo SIN fila para el recurso,
--      pero sin evaluar special/conditions. Como siempre hay tipos especiales
--      que no le corresponden al recurso, esa rama caia SIEMPRE en 'Incompleto':
--      medido en PROD, la formula B devuelve 'Completo' en 0 de 583 empleados
--      activos y 0 de 349 equipos activos. No podia dar 'Completo' nunca.
--   C) recalculateResourceStatus (TypeScript) -> igual que B y ademas sin
--      filtrar archived_at, asi que los 64 documentos archivados vencidos
--      marcaban 'Completo con doc vencida' de forma falsa.
--
-- Efecto para el usuario: al editar un empleado, crearlo, o afectarlo a un
-- cliente corria la formula B y lo dejaba 'Incompleto' aunque tuviera todo
-- presentado. Quedaba pegado asi hasta que una subida de documento disparaba la
-- formula A. Eso explica el reclamo textual: "en otros casos los cambia
-- automaticamente en cuanto subimos el ultimo documento pendiente, pero en este
-- legajo no".
--
-- Ademas faltaba el trigger de DELETE: borrar una alerta pendiente no
-- recalculaba nada, por lo que el flujo "Verificar documentos" de Tipos de
-- Documentos (fixDocumentTypeConsistency) dejaba el status desactualizado.
--
-- QUE HACE ESTA MIGRACION
--   1. recalcular_status_documentacion(): unica definicion del status.
--   2. update_status_trigger(): delega en ella y sale temprano si la sentencia
--      no afecto ninguna fila.
--   3. Triggers AFTER DELETE statement-level sobre las dos tablas de documentos.
--   4. controlar_alertas_documentos_single_employee/_vehicle: usan la formula
--      unica y agrupan las sentencias del loop (de ~80 sentencias por recurso a
--      4), para que el trigger nuevo no se dispare 80 veces por recurso.
--   5. Reparacion de datos: al 2026-09-17 hay en PROD 53 empleados (5 activos:
--      legajos 719, 725, 732, 748, 806) y 6 equipos (1 activo: AG560RT) con
--      status 'Incompleto' teniendo todo presentado.
--
-- NO hay riesgo de recursion: recalcular_status_documentacion solo escribe la
-- columna status, y status no figura en la guarda WHEN de los triggers
-- controlar_alertas_employees / controlar_alertas_vehicles, por lo que ese
-- UPDATE no vuelve a disparar la reconciliacion de alertas.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Formula unica de status (reemplaza a las formulas B y C) ────────────
-- Un solo lugar donde vive la regla: el recurso esta 'Completo' cuando no le
-- queda ninguna fila vigente (no archivada) distinta de 'presentado'.
-- Solo escribe las filas cuyo status realmente cambia, para no generar WAL ni
-- disparar triggers de employees/vehicles al recalcular de mas.
CREATE OR REPLACE FUNCTION public.recalcular_status_documentacion(
  resource_ids uuid[],
  resource_type text
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  IF resource_ids IS NULL OR cardinality(resource_ids) = 0 THEN
    RETURN;
  END IF;

  IF resource_type = 'Persona' THEN
    UPDATE employees e
    SET status = calc.nuevo
    FROM (
      SELECT x.id,
        (CASE
          WHEN EXISTS (
            SELECT 1 FROM documents_employees d
            WHERE d.applies = x.id AND d.state = 'vencido' AND d.archived_at IS NULL
          ) THEN 'Completo con doc vencida'
          WHEN NOT EXISTS (
            SELECT 1 FROM documents_employees d
            WHERE d.applies = x.id AND d.state <> 'presentado' AND d.archived_at IS NULL
          ) THEN 'Completo'
          ELSE 'Incompleto'
        END)::status_type AS nuevo
      FROM employees x
      WHERE x.id = ANY(resource_ids)
    ) calc
    WHERE e.id = calc.id
      AND e.status IS DISTINCT FROM calc.nuevo;

  ELSIF resource_type = 'Equipos' THEN
    UPDATE vehicles v
    SET status = calc.nuevo
    FROM (
      SELECT x.id,
        (CASE
          WHEN EXISTS (
            SELECT 1 FROM documents_equipment d
            WHERE d.applies = x.id AND d.state = 'vencido' AND d.archived_at IS NULL
          ) THEN 'Completo con doc vencida'
          WHEN NOT EXISTS (
            SELECT 1 FROM documents_equipment d
            WHERE d.applies = x.id AND d.state <> 'presentado' AND d.archived_at IS NULL
          ) THEN 'Completo'
          ELSE 'Incompleto'
        END)::status_type AS nuevo
      FROM vehicles x
      WHERE x.id = ANY(resource_ids)
    ) calc
    WHERE v.id = calc.id
      AND v.status IS DISTINCT FROM calc.nuevo;
  END IF;
END;
$function$;

-- ─── 2. update_status_trigger: delega en la formula unica ───────────────────
-- affected_rows es la transition table: NEW TABLE en INSERT/UPDATE y OLD TABLE
-- en DELETE, por lo que la misma funcion sirve para los tres eventos.
-- El early return es importante: un trigger statement-level se dispara aunque
-- la sentencia no haya afectado filas, y las funciones de reconciliacion
-- ejecutan sentencias en vacio.
CREATE OR REPLACE FUNCTION public.update_status_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  ids uuid[];
BEGIN
  SELECT array_agg(DISTINCT applies) INTO ids
  FROM affected_rows
  WHERE applies IS NOT NULL;

  IF ids IS NULL THEN
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME = 'documents_employees' THEN
    PERFORM public.recalcular_status_documentacion(ids, 'Persona');
  ELSIF TG_TABLE_NAME = 'documents_equipment' THEN
    PERFORM public.recalcular_status_documentacion(ids, 'Equipos');
  END IF;

  RETURN NULL;
END;
$function$;

-- ─── 3. Triggers AFTER DELETE (faltaban) ────────────────────────────────────
-- Postgres no permite REFERENCING con mas de un evento en el mismo trigger
-- ("transition tables cannot be specified for triggers with more than one
-- event"), por eso va un trigger por evento sobre la misma funcion, igual que
-- los de INSERT y UPDATE.
DROP TRIGGER IF EXISTS trg_update_documents_employees_del ON public.documents_employees;
CREATE TRIGGER trg_update_documents_employees_del
  AFTER DELETE ON public.documents_employees
  REFERENCING OLD TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();

DROP TRIGGER IF EXISTS trg_update_documents_equipment_del ON public.documents_equipment;
CREATE TRIGGER trg_update_documents_equipment_del
  AFTER DELETE ON public.documents_equipment
  REFERENCING OLD TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();

-- ─── 4. Reconciliacion por recurso: formula unica + sentencias agrupadas ────
-- Misma logica de negocio que antes (ticket 358: si el documento ya no aplica,
-- sin archivo se borra y con archivo se archiva como historial; si vuelve a
-- aplicar se des-archiva). El cambio es COMO se ejecuta: el loop ahora solo
-- clasifica los tipos en arrays y las escrituras se hacen en 4 sentencias al
-- final, en vez de hasta 2 sentencias por cada tipo obligatorio (40 en Persona,
-- 9 en Equipos). Eso evita que los triggers statement-level se disparen decenas
-- de veces por recurso.
CREATE OR REPLACE FUNCTION public.controlar_alertas_documentos_single_employee(
  employee_id_param uuid,
  company_id_param uuid
)
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
  emp_active boolean;
  -- Clasificacion de los tipos recorridos en el loop:
  v_limpiar_vacias uuid[] := '{}';  -- baja sin doc de egreso, o ya no aplica
  v_archivar       uuid[] := '{}';  -- ya no aplica y tiene archivo -> historial
  v_desarchivar    uuid[] := '{}';  -- volvio a cumplir la condicion special
  v_crear_alerta   uuid[] := '{}';  -- aplica: alerta pendiente si no hay fila
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
      v_limpiar_vacias := array_append(v_limpiar_vacias, doc.id);
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
        -- 358: vuelve a aplicar -> re-activar lo archivado (conserva archivo/validity)
        v_desarchivar  := array_append(v_desarchivar, doc.id);
        v_crear_alerta := array_append(v_crear_alerta, doc.id);
      ELSE
        -- 358: ya no aplica. Sin archivo -> borrar (alerta vacia). Con archivo -> archivar.
        v_limpiar_vacias := array_append(v_limpiar_vacias, doc.id);
        v_archivar       := array_append(v_archivar, doc.id);
      END IF;
    ELSE
      v_crear_alerta := array_append(v_crear_alerta, doc.id);
    END IF;
  END LOOP;

  -- Escrituras agrupadas (una sentencia por tipo de operacion).
  IF cardinality(v_limpiar_vacias) > 0 THEN
    DELETE FROM documents_employees
    WHERE applies = employee_id_param
      AND id_document_types = ANY(v_limpiar_vacias)
      AND (document_path IS NULL OR document_path = '');
  END IF;

  IF cardinality(v_archivar) > 0 THEN
    UPDATE documents_employees SET archived_at = now()
    WHERE applies = employee_id_param
      AND id_document_types = ANY(v_archivar)
      AND document_path IS NOT NULL AND document_path <> ''
      AND archived_at IS NULL;
  END IF;

  IF cardinality(v_desarchivar) > 0 THEN
    UPDATE documents_employees SET archived_at = NULL
    WHERE applies = employee_id_param
      AND id_document_types = ANY(v_desarchivar)
      AND archived_at IS NOT NULL;
  END IF;

  IF cardinality(v_crear_alerta) > 0 THEN
    INSERT INTO documents_employees (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
    SELECT t.id, employee_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
    FROM unnest(v_crear_alerta) AS t(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM documents_employees
      WHERE id_document_types = t.id AND applies = employee_id_param
    );
  END IF;

  -- 712: una sola formula de status (antes habia una propia, que nunca podia
  -- dar 'Completo' porque contaba como faltantes los tipos especiales que no
  -- le corresponden al empleado).
  PERFORM public.recalcular_status_documentacion(ARRAY[employee_id_param], 'Persona');
END;
$function$;

CREATE OR REPLACE FUNCTION public.controlar_alertas_documentos_single_vehicle(
  vehicle_id_param uuid,
  company_id_param uuid
)
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
  veh_active boolean;
  v_limpiar_vacias uuid[] := '{}';
  v_archivar       uuid[] := '{}';
  v_desarchivar    uuid[] := '{}';
  v_crear_alerta   uuid[] := '{}';
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
      v_limpiar_vacias := array_append(v_limpiar_vacias, doc.id);
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
        v_desarchivar  := array_append(v_desarchivar, doc.id);
        v_crear_alerta := array_append(v_crear_alerta, doc.id);
      ELSE
        v_limpiar_vacias := array_append(v_limpiar_vacias, doc.id);
        v_archivar       := array_append(v_archivar, doc.id);
      END IF;
    ELSE
      v_crear_alerta := array_append(v_crear_alerta, doc.id);
    END IF;
  END LOOP;

  IF cardinality(v_limpiar_vacias) > 0 THEN
    DELETE FROM documents_equipment
    WHERE applies = vehicle_id_param
      AND id_document_types = ANY(v_limpiar_vacias)
      AND (document_path IS NULL OR document_path = '');
  END IF;

  IF cardinality(v_archivar) > 0 THEN
    UPDATE documents_equipment SET archived_at = now()
    WHERE applies = vehicle_id_param
      AND id_document_types = ANY(v_archivar)
      AND document_path IS NOT NULL AND document_path <> ''
      AND archived_at IS NULL;
  END IF;

  IF cardinality(v_desarchivar) > 0 THEN
    UPDATE documents_equipment SET archived_at = NULL
    WHERE applies = vehicle_id_param
      AND id_document_types = ANY(v_desarchivar)
      AND archived_at IS NOT NULL;
  END IF;

  IF cardinality(v_crear_alerta) > 0 THEN
    INSERT INTO documents_equipment (id_document_types, applies, validity, state, is_active, user_id, deny_reason, document_path)
    SELECT t.id, vehicle_id_param, NULL, 'pendiente', TRUE, user_id, NULL, NULL
    FROM unnest(v_crear_alerta) AS t(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM documents_equipment
      WHERE id_document_types = t.id AND applies = vehicle_id_param
    );
  END IF;

  PERFORM public.recalcular_status_documentacion(ARRAY[vehicle_id_param], 'Equipos');
END;
$function$;

-- ─── 5. Reparacion de datos ─────────────────────────────────────────────────
-- Recalcula el status de todos los recursos con la formula unica. Idempotente:
-- la funcion solo escribe las filas cuyo status difiere del calculado.
SELECT public.recalcular_status_documentacion(ARRAY(SELECT id FROM employees), 'Persona');
SELECT public.recalcular_status_documentacion(ARRAY(SELECT id FROM vehicles), 'Equipos');
