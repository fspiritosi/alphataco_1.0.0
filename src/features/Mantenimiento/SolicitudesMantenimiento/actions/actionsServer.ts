'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import type { ApproveRequestItemsInput, MaintenanceRequestFilters, RejectRequestInput } from '../../types';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const serverLogger = new Logger('SolicitudesMantenimiento/actions');

/**
 * Obtiene las solicitudes de mantenimiento con filtros opcionales
 * Incluye información de maintenance_orders para saber el estado del pedido
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con rol de sistema: ven TODAS las solicitudes
 * - Usuarios sin rol de sistema: solo ven solicitudes donde supervisor_id = su user_id
 */
export async function getMaintenanceRequests(filters?: MaintenanceRequestFilters) {
  const supabase = await supabaseServer();

  // Obtener información del filtro de supervisor
  const filterInfo = await getSupervisorFilterInfo();

  let query = supabase
    .from('maintenance_requests')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, kilometer, engine_hours, condition),
      employees(id, firstname, lastname),
      profile!maintenance_requests_user_id_fkey(id, fullname),
      supervisor:profile!maintenance_requests_supervisor_id_fkey(id, fullname, email),
      checklist_answers(id, created_at, answer_data),
      maintenance_request_items(
        *,
        checklist_deviations(id, item_code, item_label, section_code, is_critical, driver_comment),
        types_of_repairs(id, name)
      ),
      maintenance_orders(
        id,
        status,
        scheduled_date,
        date_approved_at,
        date_approved_by
      )
    `
    )
    // Solo mostrar solicitudes pendientes de aprobación y rechazadas
    .in('status', ['pending_approval', 'rejected'])
    .order('created_at', { ascending: false });

  // Aplicar filtro de supervisor si corresponde
  if (filterInfo?.shouldFilterBySupervisor) {
    query = query.eq('supervisor_id', filterInfo.userId);
  }

  // Aplicar filtros adicionales
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
 * NUEVO FLUJO (v2):
 * - El chofer NO asigna tipos de reparación, solo comentarios por desvío
 * - El chofer selecciona un supervisor de turno
 * - Los tipos de reparación se asignan después, antes de entrar al taller
 *
 * @param input.supervisorId - ID del supervisor de turno (asignado por el chofer)
 * @param input.deviationItems - Array de objetos con deviationId y driver_comment (sin repairTypeId)
 */
export async function createMaintenanceRequest(input: {
  checklistAnswerId: string;
  equipmentId: string;
  employeeId?: string;
  userId?: string;
  kilometer?: string;
  /** Supervisor de turno asignado por el chofer */
  supervisorId?: string;
  /** @deprecated Use deviationItems instead */
  deviationIds?: string[];
  /** Items de desvío con comentario del chofer (sin tipo de reparación) */
  deviationItems?: Array<{
    deviationId: string;
    /** @deprecated El tipo de reparación ya no se asigna en este paso */
    repairTypeId?: string;
    /** Comentario del chofer describiendo el desvío */
    driverComment?: string;
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
      supervisor_id: input.supervisorId || null,
      status: 'pending_approval',
    })
    .select()
    .single();

  if (requestError) {
    serverLogger.error('Error al crear solicitud de mantenimiento', { data: { error: requestError } });
    throw requestError;
  }

  serverLogger.debug('maintenance_request creada', { data: { requestId: request.id } });

  // Crear los items de la solicitud
  // Soporta tanto el formato antiguo (deviationIds) como el nuevo (deviationItems con driverComment)
  let items: Array<{
    maintenance_request_id: string;
    checklist_deviation_id: string;
    repair_type_id: string | null;
    driver_comment: string | null;
    status: 'pending';
  }>;

  if (input.deviationItems && input.deviationItems.length > 0) {
    serverLogger.debug('Usando formato NUEVO (deviationItems)');
    // Nuevo formato: con comentarios del chofer (sin tipos de reparación)
    items = input.deviationItems.map((item) => ({
      maintenance_request_id: request.id,
      checklist_deviation_id: item.deviationId,
      repair_type_id: item.repairTypeId || null, // Mantener por compatibilidad, pero no se usa
      driver_comment: item.driverComment || null,
      status: 'pending' as const,
    }));
  } else if (input.deviationIds && input.deviationIds.length > 0) {
    serverLogger.debug('Usando formato ANTIGUO (deviationIds)');
    // Formato antiguo: solo IDs de desvíos, sin tipos de reparación ni comentarios
    items = input.deviationIds.map((deviationId) => ({
      maintenance_request_id: request.id,
      checklist_deviation_id: deviationId,
      repair_type_id: null,
      driver_comment: null,
      status: 'pending' as const,
    }));
  } else {
    serverLogger.error('No se proporcionaron desvíos para la solicitud');
    // Rollback: eliminar la solicitud creada
    await supabase.from('maintenance_requests').delete().eq('id', request.id);
    throw new Error('Debe proporcionar al menos un desvío');
  }

  serverLogger.debug('Items a insertar', { data: { count: items.length } });

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
 *
 * NOTA: Los tipos de reparación NO se asignan en este paso.
 * Se asignan posteriormente en la etapa de Planificación (AsignarTallerDialog).
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

  // Actualizar items aprobados (sin tipos de reparación - se asignan en Planificación)
  const approvePromises = input.approvedItems.map(async (item) => {
    const { error } = await supabase
      .from('maintenance_request_items')
      .update({
        status: 'approved',
        validator_comment: item.validatorComment || null,
      })
      .eq('id', item.itemId);

    if (error) {
      serverLogger.error('Error al aprobar item', { data: { error, itemId: item.itemId } });
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
        validator_comment: item.validatorComment || null,
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
        kilometer_at_entry: request.kilometer || null,
      })
      .select()
      .single();

    if (orderError) {
      serverLogger.error('Error al crear pedido de mantenimiento', { data: { error: orderError } });
      throw orderError;
    }

    // Actualizar el kilometraje del vehículo si la solicitud tiene km
    if (request.kilometer) {
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ kilometer: request.kilometer })
        .eq('id', request.equipment_id);

      if (vehicleError) {
        serverLogger.warn('No se pudo actualizar kilometraje del vehículo al generar pedido', {
          data: { error: vehicleError },
        });
      }
    }

    // Crear items del pedido SIN tipos de reparación
    // Los tipos se asignarán en la etapa de Planificación
    const orderItems = input.approvedItems.map((item) => ({
      maintenance_order_id: order.id,
      maintenance_request_item_id: item.itemId,
      repair_type_id: null, // Se asigna en Planificación
      is_critical: false,
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
    description?: string;
  }>;
}): Promise<{ ok: true; success: true } | { ok: false; error: string }> {
  const supabase = await supabaseServer();

  serverLogger.info('Asignando tipos de reparación a desvíos', {
    data: { equipmentId: input.equipmentId, assignmentsCount: input.assignments.length },
  });

  if (!input.equipmentId || !input.assignments || input.assignments.length === 0) {
    serverLogger.warn('Datos inválidos para asignar tipos de reparación');
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
      serverLogger.warn('No se encontraron items para los desvíos proporcionados', {
        data: { deviationIds },
      });
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
        .update({
          repair_type_id: assignment.repairTypeId,
          description: assignment.description || null,
        })
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
 * Crea o actualiza una solicitud de mantenimiento desde desvíos.
 * - Si los desvíos NO tienen solicitud: crea una nueva solicitud
 * - Si los desvíos YA tienen solicitud: actualiza el supervisor y comentarios
 *
 * Usado desde el modal de desvíos críticos y desde la tabla de "Equipos con Desvíos"
 */
export async function createOrUpdateMaintenanceRequest(input: {
  equipmentId: string;
  supervisorId: string;
  deviations: Array<{
    deviationId: string;
    comment?: string;
  }>;
  /** Requerido si se va a crear una nueva solicitud */
  checklistAnswerId?: string;
  employeeId?: string;
  userId?: string;
  kilometer?: string;
}): Promise<{ ok: true; requestId?: string; created: boolean } | { ok: false; error: string }> {
  const supabase = await supabaseServer();

  serverLogger.info('createOrUpdateMaintenanceRequest - Iniciando', {
    data: {
      equipmentId: input.equipmentId,
      supervisorId: input.supervisorId,
      deviationsCount: input.deviations.length,
      hasChecklistAnswerId: !!input.checklistAnswerId,
    },
  });

  try {
    const deviationIds = input.deviations.map((d) => d.deviationId);

    // 1. Verificar si los desvíos ya tienen solicitud de mantenimiento
    const { data: existingItems, error: checkError } = await supabase
      .from('maintenance_request_items')
      .select('id, maintenance_request_id, checklist_deviation_id')
      .in('checklist_deviation_id', deviationIds);

    if (checkError) {
      serverLogger.error('Error verificando solicitudes existentes', { data: { error: checkError } });
      return { ok: false, error: 'Error al verificar solicitudes existentes' };
    }

    // 2. Si ya existen items, actualizar la solicitud existente
    if (existingItems && existingItems.length > 0) {
      const requestId = existingItems[0].maintenance_request_id;

      // Actualizar supervisor
      const { error: updateRequestError } = await supabase
        .from('maintenance_requests')
        .update({ supervisor_id: input.supervisorId })
        .eq('id', requestId);

      if (updateRequestError) {
        serverLogger.error('Error actualizando supervisor', { data: { error: updateRequestError } });
        return { ok: false, error: 'Error al actualizar el supervisor' };
      }

      // Actualizar comentarios en los desvíos y items
      for (const deviation of input.deviations) {
        if (deviation.comment) {
          await supabase
            .from('checklist_deviations')
            .update({ driver_comment: deviation.comment })
            .eq('id', deviation.deviationId);

          await supabase
            .from('maintenance_request_items')
            .update({ driver_comment: deviation.comment })
            .eq('checklist_deviation_id', deviation.deviationId);
        }
      }

      serverLogger.info('Solicitud existente actualizada', { data: { requestId } });
      return { ok: true, requestId, created: false };
    }

    // 3. Si NO existen items, crear nueva solicitud
    // Necesitamos el checklistAnswerId para crear la solicitud
    if (!input.checklistAnswerId) {
      // Intentar obtenerlo del primer desvío
      const { data: deviationData, error: devError } = await supabase
        .from('checklist_deviations')
        .select('checklist_answer_id')
        .eq('id', deviationIds[0])
        .single();

      if (devError || !deviationData?.checklist_answer_id) {
        serverLogger.error('No se pudo obtener checklist_answer_id', { data: { error: devError } });
        return { ok: false, error: 'No se pudo determinar el checklist de origen' };
      }

      input.checklistAnswerId = deviationData.checklist_answer_id;
    }

    // Obtener user_id del auth si no se pasó desde el cliente
    let userId = input.userId || null;
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    }

    // Crear la solicitud
    const { data: newRequest, error: createError } = await supabase
      .from('maintenance_requests')
      .insert({
        checklist_answer_id: input.checklistAnswerId,
        equipment_id: input.equipmentId,
        employee_id: input.employeeId || null,
        user_id: userId,
        kilometer: input.kilometer || null,
        supervisor_id: input.supervisorId,
        status: 'pending_approval',
      })
      .select()
      .single();

    if (createError || !newRequest) {
      serverLogger.error('Error creando solicitud', { data: { error: createError } });
      return { ok: false, error: 'Error al crear la solicitud de mantenimiento' };
    }

    // Crear los items de la solicitud
    const items = input.deviations.map((d) => ({
      maintenance_request_id: newRequest.id,
      checklist_deviation_id: d.deviationId,
      repair_type_id: null,
      driver_comment: d.comment || null,
      status: 'pending' as const,
    }));

    const { error: itemsError } = await supabase.from('maintenance_request_items').insert(items);

    if (itemsError) {
      serverLogger.error('Error creando items de solicitud', { data: { error: itemsError } });
      // Rollback
      await supabase.from('maintenance_requests').delete().eq('id', newRequest.id);
      return { ok: false, error: 'Error al crear los items de la solicitud' };
    }

    // Actualizar comentarios en los desvíos
    for (const deviation of input.deviations) {
      if (deviation.comment) {
        await supabase
          .from('checklist_deviations')
          .update({ driver_comment: deviation.comment })
          .eq('id', deviation.deviationId);
      }
    }

    serverLogger.info('Nueva solicitud creada', { data: { requestId: newRequest.id } });
    return { ok: true, requestId: newRequest.id, created: true };
  } catch (error) {
    serverLogger.error('Error inesperado en createOrUpdateMaintenanceRequest', { data: { error } });
    return { ok: false, error: 'Error inesperado al procesar la solicitud' };
  }
}

/**
 * Actualiza los comentarios de los desvíos y el supervisor de una solicitud
 * Usado por el chofer después de completar el checklist
 * @deprecated Usar createOrUpdateMaintenanceRequest en su lugar
 */
export async function updateDeviationCommentsAndSupervisor(input: {
  equipmentId: string;
  supervisorId: string;
  comments: Array<{
    deviationId: string;
    comment: string;
  }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await supabaseServer();

  serverLogger.info('Actualizando comentarios de desvíos y supervisor', {
    data: {
      equipmentId: input.equipmentId,
      supervisorId: input.supervisorId,
      commentsCount: input.comments.length,
    },
  });

  try {
    // 1. Actualizar los comentarios en checklist_deviations
    for (const item of input.comments) {
      const { error: updateDeviationError } = await supabase
        .from('checklist_deviations')
        .update({ driver_comment: item.comment })
        .eq('id', item.deviationId);

      if (updateDeviationError) {
        serverLogger.error('Error al actualizar comentario de desvío', {
          data: { error: updateDeviationError, deviationId: item.deviationId },
        });
      }
    }

    // 2. Obtener los IDs de las solicitudes de mantenimiento que contienen estos desvíos
    const deviationIds = input.comments.map((c) => c.deviationId);
    const { data: requestItems, error: fetchError } = await supabase
      .from('maintenance_request_items')
      .select('maintenance_request_id, checklist_deviation_id')
      .in('checklist_deviation_id', deviationIds);

    if (fetchError) {
      serverLogger.error('Error al buscar items de solicitud', { data: { error: fetchError } });
      return { ok: false, error: 'Error al buscar las solicitudes de mantenimiento' };
    }

    // 3. Actualizar el supervisor y los comentarios en las solicitudes
    const uniqueRequestIds = [...new Set(requestItems?.map((item) => item.maintenance_request_id) || [])];

    for (const requestId of uniqueRequestIds) {
      // Actualizar supervisor_id en la solicitud
      const { error: updateRequestError } = await supabase
        .from('maintenance_requests')
        .update({ supervisor_id: input.supervisorId })
        .eq('id', requestId);

      if (updateRequestError) {
        serverLogger.error('Error al actualizar supervisor de solicitud', {
          data: { error: updateRequestError, requestId },
        });
      }
    }

    // 4. Actualizar los comentarios en maintenance_request_items
    for (const item of input.comments) {
      const { error: updateItemError } = await supabase
        .from('maintenance_request_items')
        .update({ driver_comment: item.comment })
        .eq('checklist_deviation_id', item.deviationId);

      if (updateItemError) {
        serverLogger.error('Error al actualizar comentario de item', {
          data: { error: updateItemError, deviationId: item.deviationId },
        });
      }
    }

    serverLogger.info('Comentarios y supervisor actualizados exitosamente', {
      data: { requestsUpdated: uniqueRequestIds.length, commentsUpdated: input.comments.length },
    });

    return { ok: true };
  } catch (error) {
    serverLogger.error('Error inesperado al actualizar comentarios', { data: { error } });
    return { ok: false, error: 'Error inesperado al actualizar los comentarios' };
  }
}

/**
 * Rechaza una solicitud de mantenimiento completa
 * @deprecated Usar rejectMaintenanceRequestItems para rechazar items específicos
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

/**
 * Rechaza items específicos de una solicitud de mantenimiento
 * Permite rechazo selectivo (item por item) con un motivo común
 */
export async function rejectMaintenanceRequestItems(input: { requestId: string; itemIds: string[]; reason: string }) {
  const supabase = await supabaseServer();

  serverLogger.info('Rechazando items de solicitud', {
    data: { requestId: input.requestId, itemCount: input.itemIds.length, reason: input.reason },
  });

  // Obtener el usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Actualizar solo los items seleccionados como rechazados
  const { error: itemsError } = await supabase
    .from('maintenance_request_items')
    .update({
      status: 'rejected',
      rejection_reason: input.reason,
    })
    .in('id', input.itemIds);

  if (itemsError) {
    serverLogger.error('Error al rechazar items', { data: { error: itemsError } });
    throw itemsError;
  }

  // Verificar si quedan items pendientes en la solicitud
  const { data: remainingItems, error: checkError } = await supabase
    .from('maintenance_request_items')
    .select('id, status')
    .eq('maintenance_request_id', input.requestId);

  if (checkError) {
    serverLogger.error('Error al verificar items restantes', { data: { error: checkError } });
  }

  const pendingItems = remainingItems?.filter((item) => item.status === 'pending') || [];
  const allRejected = remainingItems?.every((item) => item.status === 'rejected') || false;

  // Si todos los items están rechazados, actualizar el estado de la solicitud
  if (allRejected && remainingItems && remainingItems.length > 0) {
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
    }
  }

  serverLogger.info('Items rechazados exitosamente', {
    data: {
      requestId: input.requestId,
      rejectedCount: input.itemIds.length,
      pendingCount: pendingItems.length,
      allRejected,
    },
  });

  return { success: true, pendingCount: pendingItems.length, allRejected };
}
