'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { getSupervisorFilterInfo } from '../utils/supervisorFilter';

const serverLogger = new Logger('Mantenimiento/actions');

/**
 * Obtiene los pedidos de mantenimiento que están en el taller (in_workshop)
 * Para la vista de Planificación
 * Incluye información de órdenes de trabajo asociadas
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con rol de sistema: ven TODOS los pedidos
 * - Usuarios sin rol de sistema: solo ven pedidos cuya solicitud tiene supervisor_id = su user_id
 */
export async function getMaintenanceOrdersInWorkshop() {
  const supabase = await supabaseServer();

  // Obtener información del filtro de supervisor
  const filterInfo = await getSupervisorFilterInfo();

  let query = supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, condition, vehicle_type:type(id, name)),
      maintenance_requests!inner(id, kilometer, created_at, supervisor_id, source),
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
        ),
        work_orders(id, order_number, status, priority, workshop_id, sector_id, workshops(id, name), workshop_sectors(id, name))
      )
    `
    )
    .eq('status', 'in_workshop')
    .order('created_at', { ascending: false });

  // Aplicar filtro de supervisor si corresponde
  if (filterInfo?.shouldFilterBySupervisor) {
    query = query.eq('maintenance_requests.supervisor_id', filterInfo.userId);
  }

  const { data, error } = await query;

  if (error) {
    serverLogger.error('Error al obtener pedidos en taller', { data: { error } });
    throw error;
  }

  return data || [];
}

export type MaintenanceOrdersInWorkshopData = Awaited<ReturnType<typeof getMaintenanceOrdersInWorkshop>>;
export type MaintenanceOrderInWorkshopData = MaintenanceOrdersInWorkshopData[number];

/**
 * Obtiene los pedidos de mantenimiento pendientes de aprobación de fecha
 * y los ya confirmados para la vista de Pendientes de Ejecutar
 *
 * Estados incluidos:
 * - 'scheduled': Pendientes de aprobación (pueden aprobar/rechazar)
 * - 'date_confirmed': Ya confirmados (solo visualización)
 *
 * Ordenamiento: scheduled primero, luego date_confirmed, ambos por fecha ascendente
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con rol de sistema: ven TODOS los pedidos
 * - Usuarios sin rol de sistema: solo ven pedidos cuya solicitud tiene supervisor_id = su user_id
 */
export async function getMaintenanceOrdersPendingApproval() {
  const supabase = await supabaseServer();

  // Obtener información del filtro de supervisor
  const filterInfo = await getSupervisorFilterInfo();

  let query = supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, condition, vehicle_type:type(id, name)),
      maintenance_requests!inner(id, kilometer, created_at, supervisor_id, source),
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
    .in('status', ['scheduled', 'date_confirmed'])
    .order('status', { ascending: false }) // scheduled (s) antes que date_confirmed (d) - desc porque s > d alfabéticamente
    .order('scheduled_date', { ascending: true });

  // Aplicar filtro de supervisor si corresponde
  if (filterInfo?.shouldFilterBySupervisor) {
    query = query.eq('maintenance_requests.supervisor_id', filterInfo.userId);
  }

  const { data, error } = await query;

  if (error) {
    serverLogger.error('Error al obtener pedidos pendientes de aprobación', { data: { error } });
    throw error;
  }

  return data || [];
}

export type MaintenanceOrdersPendingApprovalData = Awaited<ReturnType<typeof getMaintenanceOrdersPendingApproval>>;
export type MaintenanceOrderPendingApprovalData = MaintenanceOrdersPendingApprovalData[number];

/**
 * Aprueba la fecha planificada de un pedido de mantenimiento
 * Cambia el estado a 'date_confirmed' para permitir la entrada al taller
 */
export async function approveMaintenanceOrderDate(orderId: string) {
  const supabase = await supabaseServer();

  serverLogger.info('Aprobando fecha de pedido', { data: { orderId } });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('maintenance_orders')
    .update({
      status: 'date_confirmed',
      date_approved_by: user?.id || null,
      date_approved_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    serverLogger.error('Error al aprobar fecha', { data: { error, orderId } });
    throw error;
  }

  serverLogger.info('Fecha aprobada exitosamente', { data: { orderId } });
  return data;
}

/**
 * Rechaza la fecha planificada de un pedido de mantenimiento
 * Cambia el estado a 'pending_scheduling' y guarda el motivo
 */
export async function rejectMaintenanceOrderDate(orderId: string, rejectionReason: string) {
  const supabase = await supabaseServer();

  serverLogger.info('Rechazando fecha de pedido', { data: { orderId, rejectionReason } });

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
      date_rejection_reason: rejectionReason,
      date_rejected_by: user?.id || null,
      date_rejected_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    serverLogger.error('Error al rechazar fecha', { data: { error, orderId } });
    throw error;
  }

  serverLogger.info('Fecha rechazada exitosamente', { data: { orderId } });
  return data;
}

/**
 * Obtiene los pedidos de mantenimiento con fecha confirmada
 * Listos para aprobar entrada al taller
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con rol de sistema: ven TODOS los pedidos
 * - Usuarios sin rol de sistema: solo ven pedidos cuya solicitud tiene supervisor_id = su user_id
 */
export async function getMaintenanceOrdersDateConfirmed() {
  const supabase = await supabaseServer();

  // Obtener información del filtro de supervisor
  const filterInfo = await getSupervisorFilterInfo();

  let query = supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, type, condition, kilometer),
      maintenance_requests!inner(id, kilometer, created_at, supervisor_id, source),
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
    .eq('status', 'date_confirmed')
    .order('scheduled_date', { ascending: true });

  // Aplicar filtro de supervisor si corresponde
  if (filterInfo?.shouldFilterBySupervisor) {
    query = query.eq('maintenance_requests.supervisor_id', filterInfo.userId);
  }

  const { data, error } = await query;

  if (error) {
    serverLogger.error('Error al obtener pedidos con fecha confirmada', { data: { error } });
    throw error;
  }

  return data || [];
}

export type MaintenanceOrdersDateConfirmedData = Awaited<ReturnType<typeof getMaintenanceOrdersDateConfirmed>>;
