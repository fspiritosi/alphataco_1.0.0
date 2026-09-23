'use server';

import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { withMaintenanceActor } from '@/features/Mantenimiento/shared/maintenance-actor';
import { assertRepairInScope } from '@/features/OperatorPanel/actions/perimeter';

/**
 * Tareas de una OT: completar, descompletar, notas del técnico y devolución al jefe de taller.
 *
 * Las cuatro recibían un `repairId` del cliente y escribían por ese id sin mirar nada más: sin
 * RLS, el id de una tarea de otro sector o de otra empresa entraba derecho.
 * `assertRepairInScope` lo resuelve por la OT a la que cuelga y lo contrasta contra los
 * sectores asignados al operario.
 *
 * La escritura y su entrada de historial van en una transacción con actor, así el
 * `performed_by` queda con el `profile.id` del operario (antes iba el id de sesión, que es un
 * `credential_id` y no existe como `profile.id` fuera de los datos heredados).
 */

/** Marca la tarea como completada. Requiere que la OT ya esté iniciada. */
export async function completeRepair(repairId: string) {
  const { operator, repair } = await assertRepairInScope(repairId);

  if (repair.work_order_status === 'pending') {
    throw new Error('No se puede completar la tarea: primero debe iniciar la Orden de Trabajo');
  }

  await withMaintenanceActor(operator.profileId, async (tx) => {
    await tx.work_order_item_repairs.update({
      where: { id: repairId },
      data: { status: 'completed', completed_at: new Date(), completed_by: operator.profileId },
    });

    await logActivity(tx, {
      workOrderId: repair.work_order_id,
      actionType: ACTIVITY_LOG.REPAIR_COMPLETED,
      performedBy: operator.profileId,
      metadata: { repairId, repairTypeName: repair.repair_type_name },
    });
  });
}

/** Vuelve la tarea a "en progreso" y borra la marca de completada. */
export async function uncompleteRepair(repairId: string) {
  const { operator, repair } = await assertRepairInScope(repairId);

  await withMaintenanceActor(operator.profileId, async (tx) => {
    await tx.work_order_item_repairs.update({
      where: { id: repairId },
      data: { status: 'in_progress', completed_at: null, completed_by: null },
    });

    await logActivity(tx, {
      workOrderId: repair.work_order_id,
      actionType: ACTIVITY_LOG.REPAIR_UNCOMPLETED,
      performedBy: operator.profileId,
      metadata: { repairId, repairTypeName: repair.repair_type_name },
    });
  });
}

/** Guarda las notas del técnico sobre la tarea. */
export async function updateTechnicianNotes(repairId: string, notes: string) {
  const { operator, repair } = await assertRepairInScope(repairId);

  await withMaintenanceActor(operator.profileId, async (tx) => {
    await tx.work_order_item_repairs.update({
      where: { id: repairId },
      data: { technician_notes: notes, technician_notes_by: operator.profileId },
    });

    await logActivity(tx, {
      workOrderId: repair.work_order_id,
      actionType: ACTIVITY_LOG.REPAIR_TECHNICIAN_NOTES_UPDATED,
      performedBy: operator.profileId,
      metadata: {
        repairId,
        repairTypeName: repair.repair_type_name,
        notesPreview: notes.slice(0, 100),
      },
    });
  });
}

/** Devuelve la tarea al jefe de taller para que la reasigne. */
export async function returnTask(repairId: string, returnReason: string) {
  const { operator, repair } = await assertRepairInScope(repairId);

  await withMaintenanceActor(operator.profileId, async (tx) => {
    await tx.work_order_item_repairs.update({
      where: { id: repairId },
      data: { status: 'reassignment_requested', return_reason: returnReason },
    });

    await logActivity(tx, {
      workOrderId: repair.work_order_id,
      actionType: ACTIVITY_LOG.REPAIR_RETURNED_TO_CHIEF,
      performedBy: operator.profileId,
      metadata: {
        repairId,
        repairTypeName: repair.repair_type_name,
        return_reason: returnReason,
      },
    });
  });
}
