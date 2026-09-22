-- Ticket 358 (y corrección de regresión del 295): ampliar la guarda WHEN de
-- controlar_alertas_employees / controlar_alertas_vehicles a TODAS las columnas
-- que participan de los `conditions` de document_types (verificadas contra prod).
--
-- Antes: WHEN (is_active OR company_id) — demasiado estrecho: cambiar la función,
-- categoría, posición, centro de costo, convenio o gremio NO re-evaluaba los
-- documentos requeridos del empleado (ni generaba/limpiaba alertas ni recomputaba status).
--
-- Se mantiene FOR EACH ROW (no statement-level) porque ningún flujo masivo del código
-- toca estas columnas: reassignVehiclesToOwner cambia owner_id y recalculateResourceStatus
-- cambia status, ambos FUERA de la lista -> WHEN=false -> 0 recálculo. Así se conserva la
-- ganancia de performance del 295 (el UPDATE de solo-status no dispara el recálculo pesado).
-- NOTA: las condiciones many_to_many (contractor_employee / empleado_aptitudes) viven en
-- tablas pivote y NO son columnas del recurso; su re-evaluación queda fuera de esta guarda.

-- ─── employees ───────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS controlar_alertas_employees ON public.employees;
CREATE TRIGGER controlar_alertas_employees
  AFTER UPDATE ON public.employees
  FOR EACH ROW
  WHEN (
    old.is_active            IS DISTINCT FROM new.is_active
    OR old.company_id        IS DISTINCT FROM new.company_id
    OR old.company_position  IS DISTINCT FROM new.company_position
    OR old.category_id       IS DISTINCT FROM new.category_id
    OR old.cost_center_id    IS DISTINCT FROM new.cost_center_id
    OR old.covenants_id      IS DISTINCT FROM new.covenants_id
    OR old.guild_id          IS DISTINCT FROM new.guild_id
    OR old.hierarchical_position IS DISTINCT FROM new.hierarchical_position
  )
  EXECUTE FUNCTION public.trg_controlar_alertas_employees();

-- ─── vehicles ────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS controlar_alertas_vehicles ON public.vehicles;
CREATE TRIGGER controlar_alertas_vehicles
  AFTER UPDATE ON public.vehicles
  FOR EACH ROW
  WHEN (
    old.is_active        IS DISTINCT FROM new.is_active
    OR old.company_id    IS DISTINCT FROM new.company_id
    OR old.type          IS DISTINCT FROM new.type
    OR old.type_of_vehicle IS DISTINCT FROM new.type_of_vehicle
    OR old."subType"     IS DISTINCT FROM new."subType"
  )
  EXECUTE FUNCTION public.trg_controlar_alertas_vehicles();
