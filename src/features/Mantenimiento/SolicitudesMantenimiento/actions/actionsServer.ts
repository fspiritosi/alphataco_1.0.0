'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import type { ApproveRequestItemsInput, MaintenanceRequestFilters, RejectRequestInput } from '../../types';

const serverLogger = new Logger('SolicitudesMantenimiento/actions');

/**
 * Obtiene las solicitudes de mantenimiento con filtros opcionales
 */
export async function getMaintenanceRequests(filters?: MaintenanceRequestFilters) {
  const supabase = await supabaseServer();

  let query = supabase
    .from('maintenance_requests')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number),
      employees(id, firstname, lastname),
      checklist_answers(id, created_at, answer_data),
      maintenance_request_items(
        *,
        checklist_deviations(id, item_code, item_label, section_code),
        types_of_repairs(id, name)
      )
    `
    )
    .order('created_at', { ascending: false });

  // Aplicar filtros
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.equipment_id) {
    query = query.eq('equipment_id', filters.equipment_id);
  }
  if (filters?.from_date) {
    query = query.gte('created_at', filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lte('created_at', filters.to_date);
  }

  const { data, error } = await query;

  if (error) {
    serverLogger.error('Error al obtener solicitudes de mantenimiento', { data: { error } });
    throw error;
  }

  return data || [];
}

export type MaintenanceRequestsData = Awaited<ReturnType<typeof getMaintenanceRequests>>;
export type MaintenanceRequestData = MaintenanceRequestsData[number];

/**
 * Obtiene una solicitud de mantenimiento por ID
 */
export async function getMaintenanceRequestById(requestId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number),
      employees(id, firstname, lastname),
      checklist_answers(id, created_at),
      maintenance_request_items(
        *,
        checklist_deviations(id, item_code, item_label, section_code),
        types_of_repairs(id, name)
      )
    `
    )
    .eq('id', requestId)
    .single();

  if (error) {
    serverLogger.error('Error al obtener solicitud de mantenimiento', { data: { error, requestId } });
    throw error;
  }

  return data;
}

/**
 * Crea una solicitud de mantenimiento desde desvíos de checklist
 *
 * @param input.deviationItems - Array de objetos con deviationId y opcionalmente repairTypeId
 *                               Si el chofer ya asignó tipos de reparación, se guardan aquí
 */
export async function createMaintenanceRequest(input: {
  checklistAnswerId: string;
  equipmentId: string;
  employeeId?: string;
  userId?: string;
  kilometer?: string;
  /** @deprecated Use deviationItems instead */
  deviationIds?: string[];
  /** Items de desvío con tipo de reparación opcional (asignado por el chofer) */
  deviationItems?: Array<{
    deviationId: string;
    repairTypeId?: string;
  }>;
}) {
  const supabase = await supabaseServer();

  serverLogger.info('Creando solicitud de mantenimiento', { data: input });

  // Crear la solicitud
  const { data: request, error: requestError } = await supabase
    .from('maintenance_requests')
    .insert({
      checklist_answer_id: input.checklistAnswerId,
      equipment_id: input.equipmentId,
      employee_id: input.employeeId || null,
      user_id: input.userId || null,
      kilometer: input.kilometer || null,
      status: 'pending_approval',
    })
    .select()
    .single();

  if (requestError) {
    serverLogger.error('Error al crear solicitud de mantenimiento', { data: { error: requestError } });
    throw requestError;
  }

  // Crear los items de la solicitud
  // Soporta tanto el formato antiguo (deviationIds) como el nuevo (deviationItems con repairTypeId)
  let items: Array<{
    maintenance_request_id: string;
    checklist_deviation_id: string;
    repair_type_id: string | null;
    status: 'pending';
  }>;

  if (input.deviationItems && input.deviationItems.length > 0) {
    // Nuevo formato: con tipos de reparación asignados por el chofer
    items = input.deviationItems.map((item) => ({
      maintenance_request_id: request.id,
      checklist_deviation_id: item.deviationId,
      repair_type_id: item.repairTypeId || null,
      status: 'pending' as const,
    }));
  } else if (input.deviationIds && input.deviationIds.length > 0) {
    // Formato antiguo: solo IDs de desvíos, sin tipos de reparación
    items = input.deviationIds.map((deviationId) => ({
      maintenance_request_id: request.id,
      checklist_deviation_id: deviationId,
      repair_type_id: null,
      status: 'pending' as const,
    }));
  } else {
    serverLogger.error('No se proporcionaron desvíos para la solicitud');
    // Rollback: eliminar la solicitud creada
    await supabase.from('maintenance_requests').delete().eq('id', request.id);
    throw new Error('Debe proporcionar al menos un desvío');
  }

  const { error: itemsError } = await supabase.from('maintenance_request_items').insert(items);

  if (itemsError) {
    serverLogger.error('Error al crear items de solicitud', { data: { error: itemsError } });
    // Rollback: eliminar la solicitud creada
    await supabase.from('maintenance_requests').delete().eq('id', request.id);
    throw itemsError;
  }

  serverLogger.info('Solicitud de mantenimiento creada exitosamente', { data: { requestId: request.id } });

  return request;
}

/**
 * Aprueba items de una solicitud y crea el pedido de mantenimiento
 */
export async function approveMaintenanceRequestItems(input: ApproveRequestItemsInput) {
  const supabase = await supabaseServer();

  serverLogger.info('Aprobando items de solicitud', {
    data: {
      requestId: input.requestId,
      approvedCount: input.approvedItems.length,
      rejectedCount: input.rejectedItems.length,
    },
  });

  // Obtener el usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Optimización: Agrupar items aprobados por repairTypeId para reducir queries
  const approvedByRepairType = input.approvedItems.reduce(
    (acc, item) => {
      const key = item.repairTypeId || 'null';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item.itemId);
      return acc;
    },
    {} as Record<string, string[]>
  );

  // Actualizar items aprobados en batch por repairTypeId
  const approvePromises = Object.entries(approvedByRepairType).map(async ([repairTypeId, itemIds]) => {
    const { error } = await supabase
      .from('maintenance_request_items')
      .update({
        status: 'approved',
        repair_type_id: repairTypeId === 'null' ? null : repairTypeId,
      })
      .in('id', itemIds);

    if (error) {
      serverLogger.error('Error al aprobar items', { data: { error, itemIds } });
      throw error;
    }
  });

  // Actualizar items rechazados en paralelo (cada uno puede tener diferente razón)
  const rejectPromises = input.rejectedItems.map(async (item) => {
    const { error } = await supabase
      .from('maintenance_request_items')
      .update({
        status: 'rejected',
        rejection_reason: item.reason,
      })
      .eq('id', item.itemId);

    if (error) {
      serverLogger.error('Error al rechazar item', { data: { error, itemId: item.itemId } });
      throw error;
    }
  });

  // Ejecutar todas las actualizaciones en paralelo
  await Promise.all([...approvePromises, ...rejectPromises]);

  // Obtener la solicitud para crear el pedido
  const { data: request, error: requestError } = await supabase
    .from('maintenance_requests')
    .select('*, items:maintenance_request_items(*)')
    .eq('id', input.requestId)
    .single();

  if (requestError) {
    serverLogger.error('Error al obtener solicitud', { data: { error: requestError } });
    throw requestError;
  }

  // Actualizar estado de la solicitud
  const { error: updateError } = await supabase
    .from('maintenance_requests')
    .update({
      status: 'approved',
      approved_by: user?.id || null,
      approved_at: new Date().toISOString(),
    })
    .eq('id', input.requestId);

  if (updateError) {
    serverLogger.error('Error al actualizar estado de solicitud', { data: { error: updateError } });
    throw updateError;
  }

  // Crear pedido de mantenimiento si hay items aprobados
  if (input.approvedItems.length > 0) {
    const { data: order, error: orderError } = await supabase
      .from('maintenance_orders')
      .insert({
        maintenance_request_id: input.requestId,
        equipment_id: request.equipment_id,
        status: 'pending_scheduling',
      })
      .select()
      .single();

    if (orderError) {
      serverLogger.error('Error al crear pedido de mantenimiento', { data: { error: orderError } });
      throw orderError;
    }

    // Crear items del pedido (ya es un batch insert)
    const orderItems = input.approvedItems.map((item) => ({
      maintenance_order_id: order.id,
      maintenance_request_item_id: item.itemId,
      repair_type_id: item.repairTypeId || null,
    }));

    const { error: orderItemsError } = await supabase.from('maintenance_order_items').insert(orderItems);

    if (orderItemsError) {
      serverLogger.error('Error al crear items del pedido', { data: { error: orderItemsError } });
      throw orderItemsError;
    }

    serverLogger.info('Pedido de mantenimiento creado', { data: { orderId: order.id } });
  }

  return { success: true };
}

/**
 * Asigna tipos de reparación a los items de una solicitud de mantenimiento
 * Usado por el chofer después de completar el checklist para asignar cada desvío a una reparación
 *
 * @param input.equipmentId - ID del equipo (para validación)
 * @param input.assignments - Array de asignaciones: cada desvío con su tipo de reparación
 */
export async function assignRepairTypesToDeviations(input: {
  equipmentId: string;
  assignments: Array<{
    deviationId: string;
    repairTypeId: string;
  }>;
}): Promise<{ ok: true; success: true } | { ok: false; error: string }> {
  const supabase = await supabaseServer();

  serverLogger.info('Asignando tipos de reparación a desvíos', {
    data: { equipmentId: input.equipmentId, assignmentsCount: input.assignments.length },
  });

  if (!input.equipmentId || !input.assignments || input.assignments.length === 0) {
    return { ok: false, error: 'Datos inválidos para asignar tipos de reparación' };
  }

  try {
    // Buscar los maintenance_request_items que corresponden a estos desvíos
    const deviationIds = input.assignments.map((a) => a.deviationId);

    const { data: items, error: fetchError } = await supabase
      .from('maintenance_request_items')
      .select('id, checklist_deviation_id, maintenance_request_id')
      .in('checklist_deviation_id', deviationIds);

    if (fetchError) {
      serverLogger.error('Error al buscar items de solicitud', { data: { error: fetchError } });
      return { ok: false, error: 'Error al buscar los items de la solicitud' };
    }

    if (!items || items.length === 0) {
      serverLogger.warn('No se encontraron items para los desvíos proporcionados');
      return { ok: false, error: 'No se encontraron items de solicitud para los desvíos' };
    }

    // Actualizar cada item con su tipo de reparación
    const updatePromises = input.assignments.map(async (assignment) => {
      const item = items.find((i) => i.checklist_deviation_id === assignment.deviationId);
      if (!item) {
        serverLogger.warn('Item no encontrado para desvío', { data: { deviationId: assignment.deviationId } });
        return;
      }

      const { error: updateError } = await supabase
        .from('maintenance_request_items')
        .update({ repair_type_id: assignment.repairTypeId })
        .eq('id', item.id);

      if (updateError) {
        serverLogger.error('Error al actualizar item', { data: { error: updateError, itemId: item.id } });
        throw updateError;
      }
    });

    await Promise.all(updatePromises);

    serverLogger.info('Tipos de reparación asignados exitosamente', {
      data: { equipmentId: input.equipmentId, itemsUpdated: items.length },
    });

    return { ok: true, success: true };
  } catch (error) {
    serverLogger.error('Error al asignar tipos de reparación', { data: { error } });
    return { ok: false, error: 'Error inesperado al asignar tipos de reparación' };
  }
}

/**
 * Rechaza una solicitud de mantenimiento completa
 */
export async function rejectMaintenanceRequest(input: RejectRequestInput) {
  const supabase = await supabaseServer();

  serverLogger.info('Rechazando solicitud de mantenimiento', {
    data: { requestId: input.requestId, reason: input.reason },
  });

  // Obtener el usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Actualizar todos los items como rechazados
  const { error: itemsError } = await supabase
    .from('maintenance_request_items')
    .update({
      status: 'rejected',
      rejection_reason: input.reason,
    })
    .eq('maintenance_request_id', input.requestId);

  if (itemsError) {
    serverLogger.error('Error al rechazar items', { data: { error: itemsError } });
    throw itemsError;
  }

  // Actualizar estado de la solicitud
  const { error: updateError } = await supabase
    .from('maintenance_requests')
    .update({
      status: 'rejected',
      rejection_reason: input.reason,
      rejected_by: user?.id || null,
      rejected_at: new Date().toISOString(),
    })
    .eq('id', input.requestId);

  if (updateError) {
    serverLogger.error('Error al actualizar estado de solicitud', { data: { error: updateError } });
    throw updateError;
  }

  serverLogger.info('Solicitud rechazada exitosamente', { data: { requestId: input.requestId } });

  return { success: true };
}
