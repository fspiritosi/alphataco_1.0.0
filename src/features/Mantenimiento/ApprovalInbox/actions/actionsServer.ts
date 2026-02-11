'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';

const logger = new Logger('ApprovalInbox/actions');

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Obtiene tareas pendientes de aprobacion (status: pending_approval)
 * Estas son tareas agregadas por operarios con tipos de reparacion autorizables
 */
export async function getPendingApprovalTasks() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('work_order_item_repairs')
    .select(
      `
      *,
      types_of_repairs:repair_type_id(id, name, autorizable),
      work_order_items:work_order_item_id(
        id,
        maintenance_order_items:maintenance_order_item_id(
          id,
          maintenance_order_id,
          assigned_sector_id,
          description,
          workshop_sectors(id, name),
          maintenance_request_items:maintenance_request_item_id(driver_comment, description),
          maintenance_orders:maintenance_order_id(
            id,
            order_number,
            equipment_id,
            vehicles:equipment_id(id, domain, serie, intern_number)
          )
        )
      ),
      added_by_user:added_by(id, email, fullname)
    `
    )
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error al obtener tareas pendientes de aprobacion', { data: { error } });
    throw error;
  }

  return data || [];
}

export type PendingTasksData = Awaited<ReturnType<typeof getPendingApprovalTasks>>;
export type PendingTaskData = PendingTasksData[number];

/**
 * Obtiene tareas devueltas por reasignacion (status: reassignment_requested)
 */
export async function getReturnedTasks() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('work_order_item_repairs')
    .select(
      `
      *,
      types_of_repairs:repair_type_id(id, name),
      work_order_items:work_order_item_id(
        id,
        maintenance_order_items:maintenance_order_item_id(
          id,
          maintenance_order_id,
          assigned_sector_id,
          description,
          workshop_sectors(id, name),
          maintenance_request_items:maintenance_request_item_id(driver_comment, description),
          maintenance_orders:maintenance_order_id(
            id,
            order_number,
            equipment_id,
            vehicles:equipment_id(id, domain, serie, intern_number)
          )
        )
      ),
      original_sector:original_sector_id(id, name)
    `
    )
    .eq('status', 'reassignment_requested')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error al obtener tareas devueltas', { data: { error } });
    throw error;
  }

  return data || [];
}

export type ReturnedTasksData = Awaited<ReturnType<typeof getReturnedTasks>>;
export type ReturnedTaskData = ReturnedTasksData[number];

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Aprueba una tarea pendiente de autorizacion
 */
export async function approveTask(taskId: string) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuario no autenticado');

  const { error } = await supabase
    .from('work_order_item_repairs')
    .update({
      status: 'pending',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', taskId);

  if (error) {
    logger.error('Error al aprobar tarea', { data: { error, taskId } });
    throw new Error(`Error al aprobar tarea: ${error.message}`);
  }

  logger.info('Tarea aprobada', { data: { taskId } });
}

/**
 * Rechaza una tarea pendiente de autorizacion
 */
export async function rejectTask(taskId: string, reason: string) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuario no autenticado');

  const { error } = await supabase
    .from('work_order_item_repairs')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', taskId);

  if (error) {
    logger.error('Error al rechazar tarea', { data: { error, taskId } });
    throw new Error(`Error al rechazar tarea: ${error.message}`);
  }

  logger.info('Tarea rechazada', { data: { taskId, reason } });
}

/**
 * Reasigna una tarea devuelta a un nuevo sector
 */
export async function reassignTaskToSector(taskId: string, newSectorId: string) {
  const supabase = await supabaseServer();

  // Primero obtener el work_order_item para actualizar el maintenance_order_item
  const { data: repair, error: fetchError } = await supabase
    .from('work_order_item_repairs')
    .select('work_order_item_id, work_order_items(maintenance_order_item_id)')
    .eq('id', taskId)
    .single();

  if (fetchError || !repair) {
    throw new Error('Tarea no encontrada');
  }

  // Actualizar el status de la reparacion
  const { error: updateRepairError } = await supabase
    .from('work_order_item_repairs')
    .update({ status: 'pending' })
    .eq('id', taskId);

  if (updateRepairError) {
    logger.error('Error al reasignar tarea', { data: { error: updateRepairError } });
    throw new Error(`Error al reasignar: ${updateRepairError.message}`);
  }

  // Actualizar el sector del maintenance_order_item si existe
  const moItemId = (repair.work_order_items as { maintenance_order_item_id: string | null })?.maintenance_order_item_id;
  if (moItemId) {
    await supabase.from('maintenance_order_items').update({ assigned_sector_id: newSectorId }).eq('id', moItemId);
  }

  logger.info('Tarea reasignada a nuevo sector', { data: { taskId, newSectorId } });
}
