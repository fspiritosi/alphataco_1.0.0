'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import type { ApproveWorkshopEntryInput, RejectOperationInput } from '../../types';

const serverLogger = new Logger('Operaciones/actions');

/**
 * Obtiene las operaciones planificadas (pedidos con status 'scheduled')
 */
export async function getMaintenanceOperations() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, condition, kilometer),
      maintenance_requests(id, kilometer, created_at),
      maintenance_order_items(
        *,
        maintenance_request_items(
          *,
          checklist_deviations(id, item_code, item_label, section_code, driver_comment)
        ),
        types_of_repairs(id, name),
        maintenance_order_item_repair_types(
          repair_type_id,
          types_of_repairs(id, name)
        )
      )
    `
    )
    .eq('status', 'scheduled')
    .order('scheduled_date', { ascending: true });

  if (error) {
    serverLogger.error('Error al obtener operaciones', { data: { error } });
    throw error;
  }

  return data || [];
}

export type MaintenanceOperationsData = Awaited<ReturnType<typeof getMaintenanceOperations>>;
export type MaintenanceOperationData = MaintenanceOperationsData[number];

/**
 * Obtiene los pedidos con fecha confirmada (date_confirmed) y los que ya están en taller (in_workshop)
 * Para que el usuario tenga visibilidad de todos los equipos en taller
 */
export async function getOrdersForWorkshop() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, condition, kilometer),
      maintenance_requests(id, kilometer, created_at),
      maintenance_order_items(
        *,
        maintenance_request_items(
          *,
          checklist_deviations(id, item_code, item_label, section_code, driver_comment)
        ),
        types_of_repairs(id, name),
        maintenance_order_item_repair_types(
          repair_type_id,
          types_of_repairs(id, name)
        )
      )
    `
    )
    .in('status', ['date_confirmed', 'in_workshop'])
    .order('scheduled_date', { ascending: true }); // Ordenar por fecha planificada

  if (error) {
    serverLogger.error('Error al obtener pedidos para taller', { data: { error } });
    throw error;
  }

  return data || [];
}

export type OrdersForWorkshopData = Awaited<ReturnType<typeof getOrdersForWorkshop>>;
export type OrderForWorkshopData = OrdersForWorkshopData[number];

/**
 * Rechaza una operación y la devuelve al estado de pedido pendiente
 */
export async function rejectMaintenanceOperation(input: RejectOperationInput) {
  const supabase = await supabaseServer();

  serverLogger.info('Rechazando operación', { data: { orderId: input.orderId, reason: input.reason } });

  // Obtener el usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('maintenance_orders')
    .update({
      status: 'pending_scheduling',
      scheduled_date: null,
      scheduled_by: null,
      scheduled_at: null,
      rejection_reason: input.reason,
      rejected_by: user?.id || null,
      rejected_at: new Date().toISOString(),
    })
    .eq('id', input.orderId)
    .select()
    .single();

  if (error) {
    serverLogger.error('Error al rechazar operación', { data: { error, orderId: input.orderId } });
    throw error;
  }

  serverLogger.info('Operación rechazada, vuelve a pedido pendiente', { data: { orderId: input.orderId } });

  return data;
}

/**
 * Aprueba la entrada al taller y actualiza el kilometraje y condición del equipo
 */
export async function approveWorkshopEntry(input: ApproveWorkshopEntryInput) {
  const supabase = await supabaseServer();

  serverLogger.info('Aprobando entrada a taller', { data: { orderId: input.orderId, kilometer: input.kilometer } });

  // Obtener el usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Obtener el pedido para saber el equipment_id
  const { data: order, error: orderError } = await supabase
    .from('maintenance_orders')
    .select('equipment_id')
    .eq('id', input.orderId)
    .single();

  if (orderError) {
    serverLogger.error('Error al obtener pedido', { data: { error: orderError } });
    throw orderError;
  }

  // Actualizar el pedido
  const { error: updateOrderError } = await supabase
    .from('maintenance_orders')
    .update({
      status: 'in_workshop',
      workshop_entry_date: new Date().toISOString(),
      workshop_approved_by: user?.id || null,
      kilometer_at_entry: input.kilometer,
    })
    .eq('id', input.orderId);

  if (updateOrderError) {
    serverLogger.error('Error al actualizar pedido', { data: { error: updateOrderError } });
    throw updateOrderError;
  }

  // Actualizar el equipo: condición a 'no operativo' y kilometraje
  const { error: updateVehicleError } = await supabase
    .from('vehicles')
    .update({
      condition: 'no operativo',
      kilometer: input.kilometer,
    })
    .eq('id', order.equipment_id);

  if (updateVehicleError) {
    serverLogger.error('Error al actualizar equipo', { data: { error: updateVehicleError } });
    throw updateVehicleError;
  }

  serverLogger.info('Entrada a taller aprobada, equipo actualizado', {
    data: {
      orderId: input.orderId,
      equipmentId: order.equipment_id,
      kilometer: input.kilometer,
    },
  });

  return { success: true };
}
