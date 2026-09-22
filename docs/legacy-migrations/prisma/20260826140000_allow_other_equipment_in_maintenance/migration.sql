-- Ticket 596 — Incorporar los EQUIPAMIENTOS (other_equipment) al circuito de mantenimiento.
--
-- Hasta ahora una solicitud/pedido de mantenimiento SIEMPRE era de un vehiculo
-- (`equipment_id` NOT NULL hacia `vehicles`). Los equipamientos —contenedores,
-- piletas, trailers, bombas— viven en `other_equipment`, una tabla aparte, y por
-- eso no podian entrar al circuito.
--
-- Modelo elegido: polimorfismo explicito con dos FK excluyentes. Una fila apunta
-- a un vehiculo O a un equipamiento, nunca a los dos ni a ninguno. Se prefirio
-- esto antes que una columna generica (`resource_type` + `resource_id`) para no
-- perder la integridad referencial: con FK reales, borrar el recurso sigue
-- arrastrando sus pedidos, y Prisma puede resolver la relacion en los `select`.
--
-- El CHECK es la pieza que sostiene la invariante. Sin el, `equipment_id`
-- nullable permitiria filas huerfanas sin ningun recurso asociado, que es
-- justamente lo que romperia todos los listados.
--
-- Datos existentes: ninguna fila se modifica. Todas tienen `equipment_id` no
-- nulo y `other_equipment_id` nulo, asi que ya cumplen el CHECK.

-- ── maintenance_requests ─────────────────────────────────────────────────────
ALTER TABLE "maintenance_requests"
  ADD COLUMN "other_equipment_id" UUID,
  ALTER COLUMN "equipment_id" DROP NOT NULL;

ALTER TABLE "maintenance_requests"
  ADD CONSTRAINT "maintenance_requests_other_equipment_id_fkey"
  FOREIGN KEY ("other_equipment_id") REFERENCES "other_equipment"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- Exactamente uno de los dos: XOR entre "hay vehiculo" y "hay equipamiento"
ALTER TABLE "maintenance_requests"
  ADD CONSTRAINT "chk_maintenance_requests_single_resource"
  CHECK (("equipment_id" IS NOT NULL) <> ("other_equipment_id" IS NOT NULL));

CREATE INDEX "idx_maintenance_requests_other_equipment"
  ON "maintenance_requests" ("other_equipment_id");

-- ── maintenance_orders ───────────────────────────────────────────────────────
ALTER TABLE "maintenance_orders"
  ADD COLUMN "other_equipment_id" UUID,
  ALTER COLUMN "equipment_id" DROP NOT NULL;

ALTER TABLE "maintenance_orders"
  ADD CONSTRAINT "maintenance_orders_other_equipment_id_fkey"
  FOREIGN KEY ("other_equipment_id") REFERENCES "other_equipment"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "maintenance_orders"
  ADD CONSTRAINT "chk_maintenance_orders_single_resource"
  CHECK (("equipment_id" IS NOT NULL) <> ("other_equipment_id" IS NOT NULL));

CREATE INDEX "idx_maintenance_orders_other_equipment"
  ON "maintenance_orders" ("other_equipment_id");

-- ── work_orders ──────────────────────────────────────────────────────────────
-- La OT es el ultimo eslabon del circuito: sin esto un equipamiento podria ser
-- programado y llegar al taller, pero al generarle la orden de trabajo la FK lo
-- rechazaria. El error aparecería recien en produccion, cuando alguien intente
-- trabajar sobre una pileta ya ingresada.
ALTER TABLE "work_orders"
  ADD COLUMN "other_equipment_id" UUID,
  ALTER COLUMN "equipment_id" DROP NOT NULL;

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_other_equipment_id_fkey"
  FOREIGN KEY ("other_equipment_id") REFERENCES "other_equipment"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "work_orders"
  ADD CONSTRAINT "chk_work_orders_single_resource"
  CHECK (("equipment_id" IS NOT NULL) <> ("other_equipment_id" IS NOT NULL));

CREATE INDEX "idx_work_orders_other_equipment"
  ON "work_orders" ("other_equipment_id");
