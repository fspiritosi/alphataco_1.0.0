-- Ticket 686 — Equipamientos con la condicion en "-"
--
-- Sintoma reportado por el cliente: algunos equipamientos aparecen con la condicion
-- vacia y, al no tener condicion asignada, NO se pueden usar desde el parte de
-- operaciones.
--
-- Causa: `vehicles.condition` tiene DEFAULT 'operativo', pero `other_equipment.condition`
-- nunca lo tuvo. El alta por formulario fuerza el valor en codigo, asi que los registros
-- afectados son los que entraron por otro camino (importaciones o ediciones previas).
-- Al 2026-09-10 hay 14 filas afectadas en DEV sobre 1425 (0 en `vehicles`, que si tiene default).
--
-- 1) Backfill: poner OPERATIVO a todos los que quedaron sin condicion.
UPDATE other_equipment
SET condition = 'operativo'::condition_enum
WHERE condition IS NULL;

-- 2) Default a nivel de columna, para que un INSERT que omita el campo no vuelva a
--    dejar la condicion vacia. Espeja el comportamiento que ya tiene `vehicles`.
ALTER TABLE other_equipment
ALTER COLUMN condition SET DEFAULT 'operativo'::condition_enum;
