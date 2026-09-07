-- Ticket 594 — Cambio de flujo de trabajo del modulo Mantenimiento.
--
-- Se elimina del circuito el paso "Aprobar Fecha" de Operaciones: la fecha que
-- programa el taller es directamente la fecha en la que la unidad se debe llevar
-- a reparar, sin aprobacion intermedia.
--
-- Consecuencia sobre los datos: el estado 'scheduled' (fecha propuesta por el
-- taller, esperando aprobacion de Operaciones) deja de existir en el circuito.
-- Los pedidos que quedaron en ese estado ya tienen fecha asignada por el taller,
-- asi que esa fecha pasa a ser la definitiva y avanzan a 'date_confirmed'
-- ("Por Ingresar" en el taller / "Pendiente de ingreso a taller" en Operaciones).
--
-- Sin este UPDATE esos pedidos quedarian huerfanos: no se listan en ningun paso
-- del pipeline, porque el unico lugar donde se resolvian era el paso eliminado.
--
-- Idempotente: si no queda ninguna fila en 'scheduled', no hace nada.
--
-- NOTA: las columnas date_approved_by / date_approved_at / date_rejected_by /
-- date_rejected_at / date_rejection_reason NO se eliminan. Conservan el historial
-- de las aprobaciones y rechazos que ocurrieron mientras el paso existia; a partir
-- de ahora simplemente dejan de escribirse.

UPDATE maintenance_orders
SET status = 'date_confirmed',
    updated_at = now()
WHERE status = 'scheduled';
