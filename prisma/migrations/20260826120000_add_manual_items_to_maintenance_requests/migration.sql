-- Ticket 592 — Carga manual de items en el pedido de mantenimiento.
--
-- Hasta ahora un item de solicitud SIEMPRE nacia de un desvio de checklist. El
-- formulario nuevo permite crear el pedido sin pasar por un checklist, cargando
-- directamente las reparaciones que se necesitan.
--
-- 1. free_text: item de reparacion escrito a mano por el solicitante, para lo que
--    no existe como tipo de reparacion en el sistema ("no encontre el item que
--    quiero"). El taller despues lo asocia al tipo que corresponda, o lo crea.
--
-- 2. images: fotos del item. Espeja la columna homonima que ya existe en
--    maintenance_order_items, para que al aprobar la solicitud se copien a la
--    orden sin transformacion. Los archivos viven en el bucket 'repair-images'.
--
-- 3. checklist_deviation_id pasa a NULLABLE: los items de carga manual no
--    provienen de ningun checklist. Los items existentes conservan su valor.
--    El unique (maintenance_request_id, checklist_deviation_id) se mantiene y
--    sigue siendo correcto: en Postgres NULL != NULL, asi que una misma solicitud
--    puede tener varios items manuales sin colisionar entre si.
--
-- Ningun dato existente se modifica: las tres operaciones son aditivas o de
-- relajacion de constraint.

ALTER TABLE "maintenance_request_items"
  ADD COLUMN "free_text" TEXT,
  ADD COLUMN "images" TEXT[],
  ALTER COLUMN "checklist_deviation_id" DROP NOT NULL;
