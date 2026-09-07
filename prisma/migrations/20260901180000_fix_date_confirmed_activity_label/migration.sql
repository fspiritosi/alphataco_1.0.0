-- Reunion del 31/08/2026: el historial decia "Fecha aprobada por operaciones" en el
-- evento de confirmacion de fecha. Palabras del cliente (minuto 09:48): "esto ya no
-- existe mas... esto de que operaciones me lo dice no existe mas, en realidad es fecha
-- confirmada por taller".
--
-- El texto NO estaba en el codigo TypeScript sino hardcodeado dentro de este trigger,
-- por eso no aparecia al buscarlo en src/.
--
-- Los ~894 registros historicos con el texto viejo NO se tocan: son el testimonio real
-- de cuando Operaciones si aprobaba la fecha. Reescribirlos falsearia el historial.
-- Solo cambia el texto de los eventos nuevos.

CREATE OR REPLACE FUNCTION public.log_maintenance_order_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO maintenance_activity_log (
      maintenance_order_id,
      maintenance_request_id,  -- NUEVO: También guardar la solicitud vinculada
      action_type,
      performed_by,
      previous_status,
      new_status,
      notes,
      rejection_reason,
      metadata
    ) VALUES (
      NEW.id,
      NEW.maintenance_request_id,  -- NUEVO: Incluir el ID de la solicitud
      -- action_type
      CASE NEW.status
        WHEN 'pending_scheduling' THEN
          CASE WHEN TG_OP = 'INSERT' THEN 'created'
               WHEN OLD.status = 'scheduled' THEN 'date_rejected'
               ELSE 'status_changed'
          END
        WHEN 'scheduled' THEN 'scheduled'
        WHEN 'date_confirmed' THEN 'date_confirmed'
        WHEN 'in_workshop' THEN 'workshop_entry'
        WHEN 'completed' THEN 'completed'
        WHEN 'rejected' THEN 'rejected'
        ELSE 'status_changed'
      END,
      -- performed_by
      COALESCE(
        CASE NEW.status
          WHEN 'pending_scheduling' THEN
            CASE WHEN TG_OP = 'INSERT' THEN auth.uid()
                 WHEN OLD.status = 'scheduled' THEN NEW.date_rejected_by
                 ELSE auth.uid()
            END
          WHEN 'scheduled' THEN NEW.scheduled_by
          WHEN 'date_confirmed' THEN NEW.date_approved_by
          WHEN 'in_workshop' THEN NEW.workshop_approved_by
          WHEN 'completed' THEN auth.uid()
          WHEN 'rejected' THEN NEW.rejected_by
          ELSE auth.uid()
        END,
        auth.uid()
      ),
      -- previous_status
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      -- new_status
      NEW.status,
      -- notes
      CASE NEW.status
        WHEN 'pending_scheduling' THEN
          CASE WHEN TG_OP = 'INSERT' THEN 'Pedido creado'
               WHEN OLD.status = 'scheduled' THEN 'Fecha rechazada - requiere reprogramación'
               ELSE 'Cambio de estado'
          END
        WHEN 'scheduled' THEN 'Fecha programada'
        WHEN 'date_confirmed' THEN 'Fecha confirmada por taller'
        WHEN 'in_workshop' THEN 'Equipo ingresado al taller'
        WHEN 'completed' THEN 'Pedido completado'
        WHEN 'rejected' THEN 'Pedido rechazado'
        ELSE 'Cambio de estado'
      END,
      -- rejection_reason
      CASE 
        WHEN NEW.status = 'pending_scheduling' AND OLD.status = 'scheduled' 
          THEN NEW.date_rejection_reason
        WHEN NEW.status = 'rejected' 
          THEN NEW.rejection_reason
        ELSE NULL 
      END,
      -- metadata
      CASE NEW.status
        WHEN 'pending_scheduling' THEN
          CASE WHEN TG_OP = 'INSERT' THEN
            jsonb_build_object(
              'source', NEW.source,
              'equipment_id', NEW.equipment_id,
              'maintenance_request_id', NEW.maintenance_request_id
            )
          WHEN OLD.status = 'scheduled' THEN
            jsonb_build_object(
              'date_rejected_by', NEW.date_rejected_by,
              'date_rejected_at', NEW.date_rejected_at,
              'previous_scheduled_date', OLD.scheduled_date
            )
          ELSE '{}'::jsonb
          END
        WHEN 'scheduled' THEN
          jsonb_build_object(
            'scheduled_date', NEW.scheduled_date,
            'scheduled_by', NEW.scheduled_by,
            'scheduled_at', NEW.scheduled_at
          )
        WHEN 'date_confirmed' THEN
          jsonb_build_object(
            'scheduled_date', NEW.scheduled_date,
            'date_approved_by', NEW.date_approved_by,
            'date_approved_at', NEW.date_approved_at
          )
        WHEN 'in_workshop' THEN
          jsonb_build_object(
            'workshop_entry_date', NEW.workshop_entry_date,
            'workshop_approved_by', NEW.workshop_approved_by,
            'kilometer_at_entry', NEW.kilometer_at_entry
          )
        WHEN 'completed' THEN
          jsonb_build_object(
            'completed_at', NOW(),
            'total_duration_days', EXTRACT(DAY FROM (NOW() - NEW.created_at))
          )
        WHEN 'rejected' THEN
          jsonb_build_object(
            'rejected_by', NEW.rejected_by,
            'rejected_at', NEW.rejected_at,
            'rejection_reason', NEW.rejection_reason
          )
        ELSE 
          jsonb_build_object(
            'scheduled_date', NEW.scheduled_date,
            'kilometer_at_entry', NEW.kilometer_at_entry
          )
      END
    );
  END IF;
  RETURN NEW;
END;
$function$

