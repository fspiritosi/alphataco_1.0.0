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
      vehicles(id, domain, serie, intern_number, kilometer, engine_hours, condition, vehicle_type:type(id, name)),
      maintenance_requests(id, kilometer, engine_hours, created_at),
      maintenance_order_items(
        *,
        types_of_repairs(id, name, autorizable),
        workshop_sectors(id, name),
        workshops(id, name, type),
        work_orders(
          id, order_number, status, priority,
          work_order_items(
            id, status,
            work_order_item_repairs(
              id, status, repair_type_id,
              types_of_repairs(id, name, autorizable)
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
    // Default: show all relevant statuses
    query = query.in('status', ['in_workshop', 'pending_workshop_validation', 'pending_operations_validation']);
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
      vehicles(id, domain, serie, intern_number, kilometer, engine_hours, condition, vehicle_type:type(id, name)),
      maintenance_requests(id, kilometer, engine_hours, created_at),
      maintenance_order_items(
        *,
        types_of_repairs(id, name, autorizable),
        workshop_sectors(id, name),
        workshops(id, name, type),
        work_orders(
          id, order_number, status, priority,
          work_order_items(
            id, status,
            work_order_item_repairs(
              id, status, repair_type_id, is_operator_added, rejection_reason,
              types_of_repairs(id, name, autorizable)
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

  logger.info('Orden validada por operaciones - equipo operativo', { data: { orderId, notes } });
  revalidatePath('/dashboard/maintenance');
}

/**
 * Operations rejects order and sends back to workshop chief
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
