'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import type { ApproveWorkshopEntryInput, MaintenanceOrderFilters, ScheduleOrderInput } from '../../types';

const serverLogger = new Logger('PedidosMantenimiento/actions');

/**
 * Obtiene los pedidos de mantenimiento con filtros opcionales
 */
export async function getMaintenanceOrders(filters?: MaintenanceOrderFilters) {
  const supabase = await supabaseServer();

  let query = supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, kilometer, condition),
      maintenance_requests(id, kilometer, created_at),
      maintenance_order_items(
        *,
        maintenance_request_items(
          *,
          checklist_deviations(id, item_code, item_label, section_code)
        ),
        types_of_repairs(id, name)
      )
    `
    )
    .in('status', ['pending_scheduling', 'date_confirmed'])
    .order('created_at', { ascending: false });

  // Aplicar filtros
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.equipment_id) {
    query = query.eq('equipment_id', filters.equipment_id);
  }
  if (filters?.scheduled_from) {
    query = query.gte('scheduled_date', filters.scheduled_from);
  }
  if (filters?.scheduled_to) {
    query = query.lte('scheduled_date', filters.scheduled_to);
  }

  const { data, error } = await query;

  if (error) {
    serverLogger.error('Error al obtener pedidos de mantenimiento', { data: { error } });
    throw error;
  }

  return data || [];
}

export type MaintenanceOrdersData = Awaited<ReturnType<typeof getMaintenanceOrders>>;
export type MaintenanceOrderData = MaintenanceOrdersData[number];

/**
 * Obtiene un pedido de mantenimiento por ID
 */
export async function getMaintenanceOrderById(orderId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, kilometer, condition),
      maintenance_requests(id, kilometer, created_at),
      maintenance_order_items(
        *,
        maintenance_request_items(
          *,
          checklist_deviations(id, item_code, item_label, section_code)
        ),
        types_of_repairs(id, name)
      )
    `
    )
    .eq('id', orderId)
    .single();

  if (error) {
    serverLogger.error('Error al obtener pedido de mantenimiento', { data: { error, orderId } });
    throw error;
  }

  return data;
}

/**
 * Planifica un pedido de mantenimiento asignando una fecha
 */
export async function scheduleMaintenanceOrder(input: ScheduleOrderInput) {
  const supabase = await supabaseServer();

  serverLogger.info('Planificando pedido de mantenimiento', {
    data: { orderId: input.orderId, scheduledDate: input.scheduledDate },
  });

  // Obtener el usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('maintenance_orders')
    .update({
      status: 'scheduled',
      scheduled_date: input.scheduledDate,
      scheduled_by: user?.id || null,
      scheduled_at: new Date().toISOString(),
    })
    .eq('id', input.orderId)
    .select()
    .single();

  if (error) {
    serverLogger.error('Error al planificar pedido', { data: { error, orderId: input.orderId } });
    throw error;
  }

  serverLogger.info('Pedido planificado exitosamente', { data: { orderId: input.orderId } });

  return data;
}

/**
 * Aprueba la entrada a taller de un pedido de mantenimiento
 * - Actualiza el estado del pedido a 'in_workshop'
 * - Actualiza el kilometraje y condición del vehículo a 'no_operativo'
 */
export async function approveWorkshopEntryFromOrder(input: ApproveWorkshopEntryInput) {
  const supabase = await supabaseServer();

  serverLogger.info('Aprobando entrada a taller', {
    data: { orderId: input.orderId, kilometer: input.kilometer },
  });

  // Obtener el pedido para saber el equipment_id
  const { data: order, error: orderError } = await supabase
    .from('maintenance_orders')
    .select('equipment_id')
    .eq('id', input.orderId)
    .single();

  if (orderError || !order) {
    serverLogger.error('Error al obtener pedido', { data: { orderError, orderId: input.orderId } });
    throw orderError || new Error('Pedido no encontrado');
  }

  // Obtener el usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Actualizar el pedido a 'in_workshop'
  const { error: updateOrderError } = await supabase
    .from('maintenance_orders')
    .update({
      status: 'in_workshop',
      workshop_entry_date: new Date().toISOString(),
      workshop_approved_by: user?.id || null,
    })
    .eq('id', input.orderId);

  if (updateOrderError) {
    serverLogger.error('Error al actualizar pedido', { data: { updateOrderError, orderId: input.orderId } });
    throw updateOrderError;
  }

  // Actualizar el vehículo: kilometraje y condición
  const { error: updateVehicleError } = await supabase
    .from('vehicles')
    .update({
      kilometer: input.kilometer,
      condition: 'no operativo',
    })
    .eq('id', order.equipment_id);

  if (updateVehicleError) {
    serverLogger.error('Error al actualizar vehículo', {
      data: { updateVehicleError, equipmentId: order.equipment_id },
    });
    throw updateVehicleError;
  }

  serverLogger.info('Entrada a taller aprobada exitosamente', { data: { orderId: input.orderId } });

  return { success: true };
}
