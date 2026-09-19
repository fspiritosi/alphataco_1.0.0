-- ============================================================================
-- Deuda técnica Fase 2 (task 2.1): eliminar el circuito legacy de reparaciones
--
-- El código ya no lee ni escribe repair_solicitudes, repairlogs ni
-- checklist_answer_repairs (se borraron RepairEntry / RepairRequests /
-- RepairSolicitudes, el QR viejo /maintenance/[id] y las rutas
-- /api/repairs y /api/repair_solicitud). El único flujo vivo es
-- maintenance_requests -> maintenance_orders -> work_orders.
--
-- Objetos dependientes encontrados (grep en supabase/migrations y
-- prisma/migrations) y qué se hace con cada uno:
--
--   1. VISTA public.equipments_with_pending_deviations
--      Su WHERE excluía los desvíos "resueltos" por el circuito viejo
--      (anti-join contra checklist_answer_repairs). Se redefine con
--      CREATE OR REPLACE VIEW sin esa rama, conservando exactamente las mismas
--      columnas, para que DROP TABLE no necesite CASCADE. Queda sólo el criterio
--      vivo: el desvío no pertenece a ningún maintenance_request_items.
--
--   2. TRIGGER trigger_log_repair_changes ON repair_solicitudes
--      + FUNCTION public.log_repair_changes()
--      El trigger cae con la tabla; la función se borra explícitamente después
--      (sólo insertaba en repairlogs).
--
--   3. POLICIES "Permitir autenticados" (repair_solicitudes), "Permitir todo"
--      (repairlogs) y "Allow all operations on checklist_answer_repairs":
--      caen con sus tablas, no requieren DROP aparte.
--
--   4. FKs repairlogs.repair_id -> repair_solicitudes y
--      checklist_answer_repairs.repair_solicitud_id -> repair_solicitudes:
--      se dropean primero las tablas hijas, así no hace falta CASCADE.
--
--   El enum public.repair_state queda huérfano pero se conserva: no rompe nada
--   y su eliminación queda fuera del alcance de esta migración.
--
-- Impacto de datos: los desvíos que sólo estaban "resueltos" por una
-- repair_solicitud vieja (fila en checklist_answer_repairs) vuelven a contar
-- como pendientes en "Equipos con Desvíos". Verificar antes de aplicar:
--   SELECT count(*) FROM public.checklist_answer_repairs;
-- ============================================================================

-- 1. Vista sin la dependencia al circuito viejo (mismas columnas y orden)
CREATE OR REPLACE VIEW public.equipments_with_pending_deviations AS
 SELECT DISTINCT v.id,
    v.domain,
    v.serie,
    v.intern_number,
    v.company_id,
    tv.name AS type_name,
    count(DISTINCT cd.id) AS deviation_count,
    max(cd.created_at) AS last_deviation_date
   FROM ((public.checklist_deviations cd
     JOIN public.vehicles v ON ((cd.equipment_id = v.id)))
     LEFT JOIN public.types_of_vehicles tv ON ((v.type_of_vehicle = tv.id)))
  WHERE (NOT (EXISTS ( SELECT 1
           FROM public.maintenance_request_items mri
          WHERE (mri.checklist_deviation_id = cd.id))))
  GROUP BY v.id, v.domain, v.serie, v.intern_number, v.company_id, tv.name
 HAVING (count(DISTINCT cd.id) > 0)
  ORDER BY (max(cd.created_at)) DESC;

-- 2. Tablas (hijas primero; trigger y policies caen con ellas)
DROP TABLE IF EXISTS public.checklist_answer_repairs;
DROP TABLE IF EXISTS public.repairlogs;
DROP TABLE IF EXISTS public.repair_solicitudes;

-- 3. Función del trigger, ya sin tabla que la dispare
DROP FUNCTION IF EXISTS public.log_repair_changes();
