-- ─────────────────────────────────────────────────────────────────────────────
-- 1. update_status_trigger → STATEMENT-LEVEL (compartida por employees y equipment)
--    Recalcula el status de TODOS los recursos afectados en un solo UPDATE set-based.
--    Cubre INSERT y UPDATE. Corrige la lógica de "vencido" (mira si el recurso tiene
--    ALGUN documento vencido, no solo la fila tocada).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_status_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'documents_employees' THEN
    UPDATE employees e SET status = CASE
      WHEN EXISTS (SELECT 1 FROM documents_employees d WHERE d.applies = e.id AND d.state = 'vencido')
        THEN 'Completo con doc vencida'
      WHEN NOT EXISTS (SELECT 1 FROM documents_employees d WHERE d.applies = e.id AND d.state <> 'presentado')
        THEN 'Completo'
      ELSE 'Incompleto'
    END::status_type
    WHERE e.id IN (SELECT DISTINCT applies FROM affected_rows WHERE applies IS NOT NULL);
  ELSIF TG_TABLE_NAME = 'documents_equipment' THEN
    UPDATE vehicles v SET status = CASE
      WHEN EXISTS (SELECT 1 FROM documents_equipment d WHERE d.applies = v.id AND d.state = 'vencido')
        THEN 'Completo con doc vencida'
      WHEN NOT EXISTS (SELECT 1 FROM documents_equipment d WHERE d.applies = v.id AND d.state <> 'presentado')
        THEN 'Completo'
      ELSE 'Incompleto'
    END::status_type
    WHERE v.id IN (SELECT DISTINCT applies FROM affected_rows WHERE applies IS NOT NULL);
  END IF;
  RETURN NULL;
END; $$;

-- Nota: Postgres no permite REFERENCING NEW TABLE con "INSERT OR UPDATE" en un mismo
-- trigger ("transition tables cannot be specified for triggers with more than one event").
-- Por eso se crea un trigger statement-level por evento, ambos sobre la misma función.
DROP TRIGGER IF EXISTS trg_update_documents_employees ON public.documents_employees;
DROP TRIGGER IF EXISTS trg_update_documents_employees_ins ON public.documents_employees;
CREATE TRIGGER trg_update_documents_employees
  AFTER UPDATE ON public.documents_employees
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();
CREATE TRIGGER trg_update_documents_employees_ins
  AFTER INSERT ON public.documents_employees
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();

DROP TRIGGER IF EXISTS trg_update_documents_equipment ON public.documents_equipment;
DROP TRIGGER IF EXISTS trg_update_documents_equipment_ins ON public.documents_equipment;
CREATE TRIGGER trg_update_documents_equipment
  AFTER UPDATE ON public.documents_equipment
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();
CREATE TRIGGER trg_update_documents_equipment_ins
  AFTER INSERT ON public.documents_equipment
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.update_status_trigger();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. log_document_*_changes → STATEMENT-LEVEL (un solo INSERT...SELECT por lote)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_document_employee_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO documents_employees_logs (documents_employees_id, modified_by, updated_at)
  SELECT id, user_id, now() FROM affected_rows WHERE user_id IS NOT NULL;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS document_employee_changes_trigger ON public.documents_employees;
CREATE TRIGGER document_employee_changes_trigger
  AFTER INSERT ON public.documents_employees
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.log_document_employee_changes();

CREATE OR REPLACE FUNCTION public.log_document_equipment_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO documents_equipment_logs (documents_equipment_id, modified_by, updated_at)
  SELECT id, user_id, now() FROM affected_rows WHERE user_id IS NOT NULL;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS document_equipment_changes_trigger ON public.documents_equipment;
CREATE TRIGGER document_equipment_changes_trigger
  AFTER INSERT ON public.documents_equipment
  REFERENCING NEW TABLE AS affected_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.log_document_equipment_changes();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. controlar_alertas_employees / _vehicles → GUARDA DE COLUMNA
--    Que el recálculo pesado de alertas NO se dispare cuando solo cambia `status`.
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS controlar_alertas_employees ON public.employees;
CREATE TRIGGER controlar_alertas_employees
  AFTER UPDATE ON public.employees
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active OR OLD.company_id IS DISTINCT FROM NEW.company_id)
  EXECUTE FUNCTION public.trg_controlar_alertas_employees();

DROP TRIGGER IF EXISTS controlar_alertas_vehicles ON public.vehicles;
CREATE TRIGGER controlar_alertas_vehicles
  AFTER UPDATE ON public.vehicles
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active OR OLD.company_id IS DISTINCT FROM NEW.company_id)
  EXECUTE FUNCTION public.trg_controlar_alertas_vehicles();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Eliminar el sistema de notificaciones muerto (trigger + función)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS document_update_trigger ON public.documents_employees;
DROP TRIGGER IF EXISTS equipment_update_trigger ON public.documents_equipment;
DROP FUNCTION IF EXISTS public.notify_document_update();
