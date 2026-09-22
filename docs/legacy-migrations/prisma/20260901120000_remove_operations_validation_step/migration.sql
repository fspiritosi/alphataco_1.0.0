-- Reunion del 31/08/2026: se elimina la validacion de Operaciones del circuito.
--
-- Palabras del cliente: "operaciones ya no tiene que dar mas el ok de esto... ese
-- paso se va, ¿sabes por que? porque no lo hacen, porque ellos mismos no lo hacen".
-- Operaciones queda solo con aprobar solicitudes y crear pedidos; de la validacion
-- del jefe de taller en adelante, el circuito lo cierra el taller.
--
-- Efecto en los datos: las ordenes que quedaron esperando esa validacion ya tienen
-- el trabajo TERMINADO (su work_order esta en 'completed'), asi que solo les faltaba
-- un OK que ya no existe. Se cierran.

-- ── 1. Cerrar las ordenes que esperaban la validacion de Operaciones ──────────
-- Se sella `operations_validated_at` con el momento en que el taller valido, para
-- que el historial no muestre un cierre sin fecha.
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

-- ── 2. Devolver a operativo los recursos que ya no tienen ordenes en taller ───
-- Al cerrar esas ordenes el equipo debe volver a estar disponible, salvo que le
-- quede otra orden abierta en el taller.
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
