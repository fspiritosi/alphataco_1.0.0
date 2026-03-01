'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const logger = new Logger('MaintenanceOrders/actions');

/**
 * Obtiene ordenes de mantenimiento con items agrupables por sector y secuencia.
 * Cada orden incluye items, sus sectores, tareas de reparacion y progreso.
 */
export async function getMaintenanceOrders(statusFilter?: string | string[]) {
  const supabase = await supabaseServer();

  let query = supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, kilometer, condition, vehicle_type:type(id, name)),
      maintenance_requests(id, kilometer, created_at, source),
      maintenance_order_items(
        *,
        types_of_repairs(id, name, autorizable),
        workshop_sectors(id, name),
        workshops(id, name, type),
        maintenance_request_items:maintenance_request_item_id(
          driver_comment, validator_comment, description,
          checklist_deviations(id, item_code, item_label)
        ),
        work_orders(
          id, order_number, status, priority,
          work_order_items(
            id, status, maintenance_order_item_id,
            work_order_item_repairs(
              id, status, repair_type_id, is_diagnostico, is_operator_added,
              types_of_repairs(id, name, autorizable, criticity)
            )
          )
        )
      )
    `
    )
    .order('created_at', { ascending: false });

  // Apply status filter
  if (statusFilter) {
    if (Array.isArray(statusFilter)) {
      query = query.in('status', statusFilter);
    } else {
      query = query.eq('status', statusFilter);
    }
  } else {
    // Default: show all relevant statuses (used by initial load and "Todas" tab)
    query = query.in('status', [
      'in_workshop',
      'pending_workshop_validation',
      'pending_operations_validation',
      'operations_rejected',
      'completed',
    ]);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error al obtener ordenes de mantenimiento', { data: { error } });
    throw error;
  }

  return data || [];
}

export type MaintenanceOrdersData = Awaited<ReturnType<typeof getMaintenanceOrders>>;
export type MaintenanceOrderData = MaintenanceOrdersData[number];

/**
 * Obtiene el detalle completo de una orden, con items agrupados por sector.
 */
export async function getMaintenanceOrderDetail(orderId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, kilometer, condition, vehicle_type:type(id, name)),
      maintenance_requests(id, kilometer, created_at, source),
      maintenance_order_items(
        *,
        types_of_repairs(id, name, autorizable),
        workshop_sectors(id, name),
        workshops(id, name, type),
        maintenance_request_items:maintenance_request_item_id(
          driver_comment, validator_comment, description,
          checklist_deviations(id, item_code, item_label)
        ),
        work_orders(
          id, order_number, status, priority,
          work_order_items(
            id, status,
            work_order_item_repairs(
              id, status, repair_type_id, is_diagnostico, is_operator_added, rejection_reason,
              types_of_repairs(id, name, autorizable, criticity)
            )
          )
        )
      )
    `
    )
    .eq('id', orderId)
    .single();

  if (error) {
    logger.error('Error al obtener detalle de orden', { data: { error, orderId } });
    throw error;
  }

  return data;
}

export type MaintenanceOrderDetailData = Awaited<ReturnType<typeof getMaintenanceOrderDetail>>;

/**
 * Workshop chief validates order and sends to operations
 */
export async function workshopChiefValidateOrder(orderId: string, notes?: string) {
  const supabase = await supabaseServer();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    logger.error('Error al obtener usuario', { data: { userError } });
    throw new Error('Usuario no autenticado');
  }

  const { error } = await supabase
    .from('maintenance_orders')
    .update({
      status: 'pending_operations_validation',
      workshop_approved_by: user.id,
      workshop_validated_at: new Date().toISOString(),
      workshop_validation_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    logger.error('Error al validar orden (workshop chief)', { data: { error, orderId } });
    throw error;
  }

  // Audit log
  await supabase.from('maintenance_activity_log').insert({
    maintenance_order_id: orderId,
    action_type: 'workshop_approved',
    performed_by: user.id,
    previous_status: 'pending_workshop_validation',
    new_status: 'pending_operations_validation',
    notes: notes || 'Aprobado por jefe de taller',
  });

  logger.info('Orden validada por jefe de taller', { data: { orderId, notes } });
  revalidatePath('/dashboard/maintenance');
}

/**
 * Workshop chief returns order to workshop (reopens work orders)
 */
export async function workshopChiefReturnOrder(orderId: string, reason: string) {
  const supabase = await supabaseServer();

  // 1. Update order status back to in_workshop
  const { error: orderError } = await supabase
    .from('maintenance_orders')
    .update({
      status: 'in_workshop',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (orderError) {
    logger.error('Error al devolver orden al taller', { data: { orderError, orderId } });
    throw orderError;
  }

  // 2. Find and reopen completed/completed_partial work orders
  const { data: workOrders, error: woError } = await supabase
    .from('work_orders')
    .select('id, status')
    .eq('maintenance_order_id', orderId)
    .in('status', ['completed', 'completed_partial']);

  if (woError) {
    logger.error('Error al buscar OT para reabrir', { data: { woError, orderId } });
  } else if (workOrders && workOrders.length > 0) {
    const { error: reopenError } = await supabase
      .from('work_orders')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .in(
        'id',
        workOrders.map((wo) => wo.id)
      );

    if (reopenError) {
      logger.error('Error al reabrir OT', { data: { reopenError, orderId } });
    }
  }

  logger.info('Orden devuelta al taller', { data: { orderId, reason } });
  revalidatePath('/dashboard/maintenance');
}

/**
 * Operations validates order and marks as completed
 */
export async function operationsValidateOrder(orderId: string, notes?: string) {
  const supabase = await supabaseServer();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    logger.error('Error al obtener usuario', { data: { userError } });
    throw new Error('Usuario no autenticado');
  }

  // Get equipment_id before updating
  const { data: orderData, error: orderError } = await supabase
    .from('maintenance_orders')
    .select('equipment_id')
    .eq('id', orderId)
    .single();

  if (orderError) {
    logger.error('Error al obtener orden', { data: { orderError, orderId } });
    throw orderError;
  }

  const { error } = await supabase
    .from('maintenance_orders')
    .update({
      status: 'completed',
      operations_validated_by: user.id,
      operations_validated_at: new Date().toISOString(),
      operations_validation_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    logger.error('Error al validar orden (operaciones)', { data: { error, orderId } });
    throw error;
  }

  // Restore vehicle condition to 'operativo' after final validation
  if (orderData?.equipment_id) {
    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({ condition: 'operativo' })
      .eq('id', orderData.equipment_id);

    if (vehicleError) {
      logger.error('Error al restaurar condición del vehículo', {
        data: { vehicleError, equipmentId: orderData.equipment_id },
      });
    } else {
      logger.info('Vehículo restaurado a operativo', { data: { equipmentId: orderData.equipment_id } });
    }
  }

  // Audit log
  await supabase.from('maintenance_activity_log').insert({
    maintenance_order_id: orderId,
    action_type: 'operations_approved',
    performed_by: user.id,
    previous_status: 'pending_operations_validation',
    new_status: 'completed',
    notes: notes || 'Aprobado por operaciones - cierre final',
  });

  logger.info('Orden validada por operaciones - cierre final', { data: { orderId, notes } });
  revalidatePath('/dashboard/maintenance');
}

/**
 * Operations rejects order and sends back to workshop chief (bulk - legacy)
 */
export async function operationsRejectOrder(orderId: string, reason: string) {
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('maintenance_orders')
    .update({
      status: 'pending_workshop_validation',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    logger.error('Error al rechazar orden (operaciones)', { data: { error, orderId } });
    throw error;
  }

  logger.info('Orden rechazada por operaciones', { data: { orderId, reason } });
  revalidatePath('/dashboard/maintenance');
}

// ============================================================================
// GRANULAR ITEM-LEVEL REJECTION ACTIONS
// ============================================================================

interface RejectionItem {
  repairId: string;
  comment: string;
}

/**
 * Workshop chief rejects specific repair items and sends back to operator.
 * - Sets selected repairs to status='rejected' with rejection_reason
 * - Reopens affected work orders to 'in_progress'
 * - Sets maintenance order back to 'in_workshop'
 * - Logs to maintenance_activity_log with metadata
 */
export async function workshopChiefRejectItems(orderId: string, rejections: RejectionItem[]) {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Usuario no autenticado');

  if (!rejections.length) throw new Error('Debe seleccionar al menos un item');

  // 1. Get repair details for metadata (name, sector)
  const repairIds = rejections.map((r) => r.repairId);
  const { data: repairDetails, error: repairError } = await supabase
    .from('work_order_item_repairs')
    .select(
      `
      id,
      types_of_repairs(id, name),
      work_order_item_id,
      work_order_items!inner(
        id, work_order_id,
        maintenance_order_items!inner(
          id, assigned_sector_id,
          workshop_sectors(id, name)
        )
      )
    `
    )
    .in('id', repairIds);

  if (repairError) {
    logger.error('Error al obtener detalles de repairs', { data: { repairError } });
    throw repairError;
  }

  // 2. Mark each repair as rejected with individual comment
  for (const rejection of rejections) {
    const { error: updateError } = await supabase
      .from('work_order_item_repairs')
      .update({
        status: 'rejected',
        rejection_reason: rejection.comment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rejection.repairId);

    if (updateError) {
      logger.error('Error al rechazar repair', { data: { updateError, repairId: rejection.repairId } });
      throw updateError;
    }
  }

  // 3. Reopen affected work orders
  const affectedWoIds = new Set<string>();
  (repairDetails || []).forEach((repair) => {
    const woi = repair.work_order_items;
    if (woi && !Array.isArray(woi)) {
      affectedWoIds.add(woi.work_order_id);
    }
  });

  if (affectedWoIds.size > 0) {
    const { error: reopenError } = await supabase
      .from('work_orders')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .in('id', Array.from(affectedWoIds));

    if (reopenError) {
      logger.error('Error al reabrir OTs', { data: { reopenError } });
    }
  }

  // 4. Set maintenance order back to in_workshop
  const { error: orderError } = await supabase
    .from('maintenance_orders')
    .update({ status: 'in_workshop', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (orderError) {
    logger.error('Error al actualizar status de orden', { data: { orderError } });
    throw orderError;
  }

  // 5. Build metadata and insert audit log
  const rejectedItems = rejections.map((rejection) => {
    const detail = (repairDetails || []).find((r) => r.id === rejection.repairId);
    const woi = detail?.work_order_items;
    const moi = woi && !Array.isArray(woi) ? woi.maintenance_order_items : null;
    const sector = moi && !Array.isArray(moi) ? moi.workshop_sectors : null;
    return {
      repair_id: rejection.repairId,
      repair_name:
        detail?.types_of_repairs && !Array.isArray(detail.types_of_repairs)
          ? detail.types_of_repairs.name || 'Sin nombre'
          : 'Sin nombre',
      sector_name: sector && !Array.isArray(sector) ? sector.name || 'Sin sector' : 'Sin sector',
      comment: rejection.comment,
    };
  });

  await supabase.from('maintenance_activity_log').insert({
    maintenance_order_id: orderId,
    action_type: 'workshop_item_rejected',
    performed_by: user.id,
    previous_status: 'pending_workshop_validation',
    new_status: 'in_workshop',
    notes: `${rejections.length} item(s) rechazado(s) por jefe de taller`,
    metadata: { rejected_items: rejectedItems },
  });

  logger.info('Items rechazados por jefe de taller', { data: { orderId, count: rejections.length } });
  revalidatePath('/dashboard/maintenance');
}

/**
 * Operations rejects specific items (granular).
 * - Sets order to 'operations_rejected'
 * - Does NOT change repair statuses (workshop chief decides)
 * - Logs to maintenance_activity_log with metadata
 */
export async function operationsRejectItems(orderId: string, rejections: RejectionItem[]) {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Usuario no autenticado');

  if (!rejections.length) throw new Error('Debe seleccionar al menos un item');

  // 1. Get repair details for metadata
  const repairIds = rejections.map((r) => r.repairId);
  const { data: repairDetails, error: repairError } = await supabase
    .from('work_order_item_repairs')
    .select(
      `
      id,
      types_of_repairs(id, name),
      work_order_item_id,
      work_order_items!inner(
        id,
        maintenance_order_items!inner(
          id, assigned_sector_id,
          workshop_sectors(id, name)
        )
      )
    `
    )
    .in('id', repairIds);

  if (repairError) {
    logger.error('Error al obtener detalles de repairs', { data: { repairError } });
    throw repairError;
  }

  // 2. Set order to operations_rejected
  const { error: orderError } = await supabase
    .from('maintenance_orders')
    .update({ status: 'operations_rejected', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (orderError) {
    logger.error('Error al cambiar status a operations_rejected', { data: { orderError } });
    throw orderError;
  }

  // 3. Build metadata and insert audit log
  const rejectedItems = rejections.map((rejection) => {
    const detail = (repairDetails || []).find((r) => r.id === rejection.repairId);
    const woi = detail?.work_order_items;
    const moi = woi && !Array.isArray(woi) ? woi.maintenance_order_items : null;
    const sector = moi && !Array.isArray(moi) ? moi.workshop_sectors : null;
    return {
      repair_id: rejection.repairId,
      repair_name:
        detail?.types_of_repairs && !Array.isArray(detail.types_of_repairs)
          ? detail.types_of_repairs.name || 'Sin nombre'
          : 'Sin nombre',
      sector_name: sector && !Array.isArray(sector) ? sector.name || 'Sin sector' : 'Sin sector',
      comment: rejection.comment,
    };
  });

  await supabase.from('maintenance_activity_log').insert({
    maintenance_order_id: orderId,
    action_type: 'operations_item_rejected',
    performed_by: user.id,
    previous_status: 'pending_operations_validation',
    new_status: 'operations_rejected',
    notes: `${rejections.length} item(s) rechazado(s) por operaciones`,
    metadata: { rejected_items: rejectedItems },
  });

  logger.info('Items rechazados por operaciones', { data: { orderId, count: rejections.length } });
  revalidatePath('/dashboard/maintenance');
}

/**
 * Workshop chief handles operations rejection.
 * - If agree: marks repairs as rejected, reopens WOs, sets order to in_workshop
 * - If disagree: sends back to pending_operations_validation
 */
export async function workshopChiefHandleOperationsRejection(orderId: string, agree: boolean, comment?: string) {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Usuario no autenticado');

  if (agree) {
    // Read the last operations_item_rejected log to get repair IDs
    const { data: lastLog, error: logError } = await supabase
      .from('maintenance_activity_log')
      .select('metadata')
      .eq('maintenance_order_id', orderId)
      .eq('action_type', 'operations_item_rejected')
      .order('performed_at', { ascending: false })
      .limit(1)
      .single();

    if (logError) {
      logger.error('Error al obtener log de rechazo de operaciones', { data: { logError } });
      throw logError;
    }

    const metadata = lastLog?.metadata as { rejected_items?: Array<{ repair_id: string; comment: string }> } | null;
    const rejectedItems = metadata?.rejected_items || [];

    if (rejectedItems.length === 0) {
      throw new Error('No se encontraron items rechazados por operaciones');
    }

    // Mark repairs as rejected
    const repairIds = rejectedItems.map((item) => item.repair_id);

    for (const item of rejectedItems) {
      await supabase
        .from('work_order_item_repairs')
        .update({
          status: 'rejected',
          rejection_reason: item.comment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.repair_id);
    }

    // Get affected WO IDs and reopen them
    const { data: woItems } = await supabase
      .from('work_order_item_repairs')
      .select('work_order_items!inner(work_order_id)')
      .in('id', repairIds);

    const affectedWoIds = new Set<string>();
    (woItems || []).forEach((repair) => {
      const woi = repair.work_order_items;
      if (woi && !Array.isArray(woi)) {
        affectedWoIds.add(woi.work_order_id);
      }
    });

    if (affectedWoIds.size > 0) {
      await supabase
        .from('work_orders')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .in('id', Array.from(affectedWoIds));
    }

    // Set order to in_workshop
    await supabase
      .from('maintenance_orders')
      .update({ status: 'in_workshop', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    // Audit log
    await supabase.from('maintenance_activity_log').insert({
      maintenance_order_id: orderId,
      action_type: 'workshop_agreed_ops_rejection',
      performed_by: user.id,
      previous_status: 'operations_rejected',
      new_status: 'in_workshop',
      notes: comment || 'Jefe de taller de acuerdo con rechazo de operaciones',
      metadata: { original_rejected_items: rejectedItems },
    });

    logger.info('Jefe de taller de acuerdo con rechazo de operaciones', { data: { orderId } });
  } else {
    // Disagree - send back to operations
    if (!comment?.trim()) throw new Error('Debe indicar el motivo de desacuerdo');

    await supabase
      .from('maintenance_orders')
      .update({ status: 'pending_operations_validation', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    // Audit log
    await supabase.from('maintenance_activity_log').insert({
      maintenance_order_id: orderId,
      action_type: 'workshop_disagreed_ops_rejection',
      performed_by: user.id,
      previous_status: 'operations_rejected',
      new_status: 'pending_operations_validation',
      notes: comment,
    });

    logger.info('Jefe de taller en desacuerdo con rechazo de operaciones', { data: { orderId, comment } });
  }

  revalidatePath('/dashboard/maintenance');
}

/**
 * Get validation history for an order from maintenance_activity_log
 */
export async function getValidationHistory(orderId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('maintenance_activity_log')
    .select(
      `
      id, action_type, performed_at, previous_status, new_status, notes, rejection_reason, metadata,
      performed_by_profile:performed_by(id, fullname)
    `
    )
    .eq('maintenance_order_id', orderId)
    .in('action_type', [
      'workshop_item_rejected',
      'operations_item_rejected',
      'workshop_agreed_ops_rejection',
      'workshop_disagreed_ops_rejection',
      'workshop_approved',
      'operations_approved',
      'status_change',
    ])
    .order('performed_at', { ascending: false });

  if (error) {
    logger.error('Error al obtener historial de validaciones', { data: { error, orderId } });
    throw error;
  }

  return data || [];
}

export type ValidationHistoryData = Awaited<ReturnType<typeof getValidationHistory>>;
export type ValidationHistoryEntry = ValidationHistoryData[number];

/**
 * Actualiza el orden de ejecucion de los sectores (OTs) dentro de una OM.
 * Solo se puede modificar cuando la OM esta en estado in_workshop.
 * Recibe un array de { sectorId, sequenceOrder } y actualiza todos los
 * maintenance_order_items de cada sector con el nuevo orden.
 */
export async function updateSectorExecutionOrder(
  orderId: string,
  sectorOrders: Array<{ sectorId: string; sequenceOrder: number }>
) {
  const supabase = await supabaseServer();

  // Validate order is in_workshop
  const { data: order, error: orderError } = await supabase
    .from('maintenance_orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error('No se encontró la orden de mantenimiento');
  }

  if (order.status !== 'in_workshop') {
    throw new Error('Solo se puede cambiar el orden cuando la OM está en taller');
  }

  // Update each sector's items with the new sequence order
  for (const { sectorId, sequenceOrder } of sectorOrders) {
    const { error } = await supabase
      .from('maintenance_order_items')
      .update({ sector_sequence_order: sequenceOrder })
      .eq('maintenance_order_id', orderId)
      .eq('assigned_sector_id', sectorId);

    if (error) {
      logger.error('Error al actualizar orden de sector', { data: { error, orderId, sectorId, sequenceOrder } });
      throw error;
    }
  }

  logger.info('Orden de ejecucion de sectores actualizado', { data: { orderId, sectorOrders } });
  revalidatePath('/dashboard/maintenance');
}

/**
 * Completa manualmente una OT de taller externo
 */
export async function completeExternalWorkOrder(workOrderId: string) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('work_orders')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: user?.id || null,
    })
    .eq('id', workOrderId);

  if (error) {
    logger.error('Error al completar OT externa', { data: { error, workOrderId } });
    throw error;
  }

  // Check if all work orders for the parent maintenance order are now closed
  // Get the maintenance_order_id through work_order_items
  const { data: woItem } = await supabase
    .from('work_order_items')
    .select('maintenance_order_items(maintenance_order_id)')
    .eq('work_order_id', workOrderId)
    .limit(1)
    .single();

  const maintenanceOrderId = woItem?.maintenance_order_items?.maintenance_order_id;

  if (maintenanceOrderId) {
    const { data: allItems } = await supabase
      .from('maintenance_order_items')
      .select('work_orders(id, status)')
      .eq('maintenance_order_id', maintenanceOrderId);

    const allWOs = (allItems || [])
      .map((item) => item.work_orders)
      .filter((wo): wo is NonNullable<typeof wo> => wo !== null);

    const allClosed =
      allWOs.length > 0 && allWOs.every((wo) => wo.status === 'completed' || wo.status === 'completed_partial');

    if (allClosed) {
      await supabase
        .from('maintenance_orders')
        .update({ status: 'pending_workshop_validation' })
        .eq('id', maintenanceOrderId);

      logger.info('Maintenance order ready for workshop validation (external WO completed)', {
        data: { maintenanceOrderId, workOrderId },
      });
    }
  }

  logger.info('OT externa completada', { data: { workOrderId } });
  revalidatePath('/dashboard/maintenance');
}
