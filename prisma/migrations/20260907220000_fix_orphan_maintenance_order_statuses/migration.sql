-- Ticket 652 — repara los pedidos que quedaron en estados que el circuito ya no resuelve.
--
-- POR QUE HACE FALTA UN SEGUNDO BACKFILL
-- Las migraciones 20260825220000 y 20260901120000 ya hacian esta correccion, pero se
-- aplicaron en produccion el 27/08 y el 31/08, mientras que el CODIGO que escribia
-- esos estados siguio vivo en `main` hasta el release del 07/09. Durante esa semana
-- produccion siguio generandolos: al momento de este backfill quedaban 5 `scheduled`
-- (creados el 06/09) y 27 `pending_operations_validation`.
--
-- Esos pedidos no aparecen en NINGUN paso de NINGUN pipeline — ni Operaciones, ni
-- Taller, ni Seguimiento — asi que son invisibles para el usuario.
--
-- Ahora que el codigo nuevo esta desplegado ningun flujo puede volver a escribir esos
-- estados, asi que esta correccion es definitiva. El script es idempotente: si no
-- queda ninguna fila en esos estados, no hace nada.

-- ── 1. Taller puso fecha, el supervisor nunca la aprobo ──────────────────────
-- Criterio del ticket: "lo esperable es que quede con fecha programada".
-- Mismo UPDATE que 20260825220000.
UPDATE maintenance_orders
SET status = 'date_confirmed',
    updated_at = now()
WHERE status = 'scheduled';

-- ── 2. Trabajo terminado esperando una validacion que ya no existe ───────────
-- Criterio del ticket: "no queden colgados esperando aprobacion de supervisor
-- cuando esto ya no se puede hacer". Estas ordenes ya entraron al taller y tienen
-- TODAS sus OTs cerradas, o sea que solo les faltaba el OK eliminado del circuito.
-- Mismos campos y misma nota que 20260901120000, para que el historial se lea igual
-- que el de las ordenes que cerro aquella migracion.
UPDATE maintenance_orders
SET status = 'completed',
    operations_validated_at = COALESCE(operations_validated_at, workshop_validated_at, now()),
    operations_validated_by = COALESCE(operations_validated_by, workshop_approved_by),
    operations_validation_notes = COALESCE(
      operations_validation_notes,
      'Cerrada automaticamente: se elimino la validacion de Operaciones del circuito'
    ),
    updated_at = now()
WHERE status = 'pending_operations_validation';

-- ── 3. Devolver a operativo los recursos sin ordenes abiertas en taller ──────
-- Identica a 20260901120000: el equipo vuelve a estar disponible al cerrarse su
-- orden, salvo que le quede otra `in_workshop`.
UPDATE vehicles v
SET condition = 'operativo'
WHERE v.condition = 'no operativo'
  AND EXISTS (
    SELECT 1 FROM maintenance_orders mo
    WHERE mo.equipment_id = v.id
      AND mo.operations_validation_notes = 'Cerrada automaticamente: se elimino la validacion de Operaciones del circuito'
  )
  AND NOT EXISTS (
    SELECT 1 FROM maintenance_orders mo2
    WHERE mo2.equipment_id = v.id AND mo2.status = 'in_workshop'
  );

UPDATE other_equipment oe
SET condition = 'operativo'
WHERE oe.condition = 'no operativo'
  AND EXISTS (
    SELECT 1 FROM maintenance_orders mo
    WHERE mo.other_equipment_id = oe.id
      AND mo.operations_validation_notes = 'Cerrada automaticamente: se elimino la validacion de Operaciones del circuito'
  )
  AND NOT EXISTS (
    SELECT 1 FROM maintenance_orders mo2
    WHERE mo2.other_equipment_id = oe.id AND mo2.status = 'in_workshop'
  );
