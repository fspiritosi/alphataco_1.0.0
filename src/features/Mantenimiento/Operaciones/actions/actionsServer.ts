'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import type { ApproveWorkshopEntryInput, RejectOperationInput } from '../../types';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const serverLogger = new Logger('Operaciones/actions');

/**
 * Obtiene las operaciones planificadas (pedidos con status 'scheduled')
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con rol de sistema: ven TODAS las operaciones
 * - Usuarios sin rol de sistema: solo ven operaciones cuya solicitud tiene supervisor_id = su user_id
 */
export async function getMaintenanceOperations() {
  const supabase = await supabaseServer();

  // Obtener información del filtro de supervisor
  const filterInfo = await getSupervisorFilterInfo();

  let query = supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, condition, kilometer),
      maintenance_requests!inner(id, kilometer, created_at, supervisor_id, source),
      maintenance_order_items(
        *,
        maintenance_request_items(
          *,
          checklist_deviations(
            id,
            item_code,
            item_label,
            section_code,
            driver_comment,
            checklist_answers(
              id,
              employee:employees(id, firstname, lastname),
              user:profile!checklist_answers_user_id_fkey(id, fullname, email)
            )
          )
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

  // Aplicar filtro de supervisor si corresponde
  if (filterInfo?.shouldFilterBySupervisor) {
    query = query.eq('maintenance_requests.supervisor_id', filterInfo.userId);
  }

  const { data, error } = await query;

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
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con rol de sistema: ven TODOS los pedidos
 * - Usuarios sin rol de sistema: solo ven pedidos cuya solicitud tiene supervisor_id = su user_id
 */
export async function getOrdersForWorkshop() {
  const supabase = await supabaseServer();

  // Obtener información del filtro de supervisor
  const filterInfo = await getSupervisorFilterInfo();

  let query = supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, condition, kilometer),
      maintenance_requests!inner(id, kilometer, created_at, supervisor_id, source),
      maintenance_order_items(
        *,
        maintenance_request_items(
          *,
          checklist_deviations(
            id,
            item_code,
            item_label,
            section_code,
            driver_comment,
            checklist_answers(
              id,
              employee:employees(id, firstname, lastname),
              user:profile!checklist_answers_user_id_fkey(id, fullname, email)
            )
          )
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
    .order('scheduled_date', { ascending: true }); // Ordenar por fecha planificada

  // Aplicar filtro de supervisor si corresponde
  if (filterInfo?.shouldFilterBySupervisor) {
    query = query.eq('maintenance_requests.supervisor_id', filterInfo.userId);
  }

  const { data, error } = await query;

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

/**
 * Obtiene el historial de actividades de un pedido de mantenimiento
 * Incluye información del usuario que realizó cada acción
 */
export async function getMaintenanceOrderActivityLog(orderId: string) {
  const supabase = await supabaseServer();

  serverLogger.debug('Obteniendo historial de actividades', { data: { orderId } });

  const { data, error } = await supabase
    .from('maintenance_activity_log')
    .select(
      `
      *,
      performer:profile!maintenance_activity_log_performed_by_fkey(
        id,
        fullname,
        email
      )
    `
    )
    .eq('maintenance_order_id', orderId)
    .order('performed_at', { ascending: true });

  if (error) {
    serverLogger.error('Error al obtener historial de actividades', { data: { error, orderId } });
    throw error;
  }

  return data || [];
}

export type MaintenanceActivityLogData = Awaited<ReturnType<typeof getMaintenanceOrderActivityLog>>;
export type MaintenanceActivityLogEntry = MaintenanceActivityLogData[number];

/**
 * Obtiene el historial de actividades de una solicitud de mantenimiento
 */
export async function getMaintenanceRequestActivityLog(requestId: string) {
  const supabase = await supabaseServer();

  serverLogger.debug('Obteniendo historial de actividades de solicitud', { data: { requestId } });

  const { data, error } = await supabase
    .from('maintenance_activity_log')
    .select(
      `
      *,
      performer:profile!maintenance_activity_log_performed_by_fkey(
        id,
        fullname,
        email
      )
    `
    )
    .eq('maintenance_request_id', requestId)
    .order('performed_at', { ascending: true });

  if (error) {
    serverLogger.error('Error al obtener historial de actividades de solicitud', { data: { error, requestId } });
    throw error;
  }

  return data || [];
}

/**
 * Tipo del origen de una solicitud de mantenimiento
 */
export type MaintenanceRequestOrigin = {
  type: 'checklist' | 'manual';
  // Datos del checklist (si aplica)
  checklist?: {
    id: string;
    fecha: string | null;
    hora: string | null;
    chofer: string | null;
    kilometraje: string | null;
    createdAt: string | null;
    respondedBy: {
      id: string;
      fullname: string | null;
      email: string | null;
    } | null;
  };
  // Datos del creador manual (si aplica)
  manualCreator?: {
    id: string;
    fullname: string | null;
    email: string | null;
  } | null;
  createdAt: string | null;
};

/**
 * Obtiene el historial COMPLETO de una solicitud de mantenimiento, incluyendo:
 * - El origen (checklist o manual)
 * - El historial de actividades
 */
export async function getMaintenanceRequestFullActivityLog(requestId: string) {
  const supabase = await supabaseServer();

  serverLogger.debug('Obteniendo historial completo de solicitud', { data: { requestId } });

  // 1. Obtener la solicitud con información del origen
  const { data: request, error: requestError } = await supabase
    .from('maintenance_requests')
    .select(
      `
      id,
      source,
      created_at,
      checklist_answer_id,
      user_id,
      checklist_answers(
        id,
        answer_data,
        created_at,
        user:profile!checklist_answers_user_id_fkey(
          id,
          fullname,
          email
        ),
        employee:employees(
          id,
          firstname,
          lastname
        )
      ),
      created_by_user:profile!maintenance_requests_user_id_fkey(
        id,
        fullname,
        email
      )
    `
    )
    .eq('id', requestId)
    .single();

  if (requestError) {
    serverLogger.error('Error al obtener solicitud', { data: { error: requestError, requestId } });
    throw requestError;
  }

  // 2. Obtener el historial de actividades
  const { data: activityLog, error: logError } = await supabase
    .from('maintenance_activity_log')
    .select(
      `
      *,
      performer:profile!maintenance_activity_log_performed_by_fkey(
        id,
        fullname,
        email
      )
    `
    )
    .eq('maintenance_request_id', requestId)
    .order('performed_at', { ascending: true });

  if (logError) {
    serverLogger.error('Error al obtener historial de actividades', { data: { error: logError, requestId } });
    throw logError;
  }

  // 3. Construir información del origen
  let origin: MaintenanceRequestOrigin;

  if (request?.source === 'manual' || !request?.checklist_answer_id) {
    // Origen manual (sin checklist)
    origin = {
      type: 'manual',
      manualCreator: request?.created_by_user
        ? {
            id: request.created_by_user.id,
            fullname: request.created_by_user.fullname,
            email: request.created_by_user.email,
          }
        : null,
      createdAt: request?.created_at || null,
    };
  } else {
    // Origen desde checklist
    const answerData = request?.checklist_answers?.answer_data as {
      fecha?: string;
      hora?: string;
      chofer?: string;
      kilometraje?: string;
    } | null;

    const checklistUser = request?.checklist_answers?.user;

    origin = {
      type: 'checklist',
      checklist: {
        id: request.checklist_answer_id,
        fecha: answerData?.fecha || null,
        hora: answerData?.hora || null,
        chofer: answerData?.chofer || null,
        kilometraje: answerData?.kilometraje || null,
        createdAt: request?.checklist_answers?.created_at || null,
        respondedBy: checklistUser
          ? {
              id: checklistUser.id,
              fullname: checklistUser.fullname,
              email: checklistUser.email,
            }
          : null,
      },
      createdAt: request?.created_at || null,
    };
  }

  return {
    origin,
    history: activityLog || [],
  };
}

export type MaintenanceRequestFullActivityLog = Awaited<ReturnType<typeof getMaintenanceRequestFullActivityLog>>;

/**
 * Obtiene el historial COMPLETO de un pedido de mantenimiento (maintenance_order), incluyendo:
 * - El origen (checklist o manual) desde la solicitud asociada
 * - El historial de actividades de la solicitud
 * - El historial de actividades del pedido
 */
export async function getMaintenanceOrderFullActivityLog(orderId: string, requestId?: string) {
  const supabase = await supabaseServer();

  serverLogger.debug('Obteniendo historial completo de pedido', { data: { orderId, requestId } });

  // Si no tenemos el requestId, lo obtenemos del order
  let maintenanceRequestId = requestId;
  if (!maintenanceRequestId) {
    const { data: order } = await supabase
      .from('maintenance_orders')
      .select('maintenance_request_id')
      .eq('id', orderId)
      .single();

    maintenanceRequestId = order?.maintenance_request_id || undefined;
  }

  // 1. Obtener el origen desde la solicitud
  let origin: MaintenanceRequestOrigin | null = null;

  if (maintenanceRequestId) {
    const { data: request } = await supabase
      .from('maintenance_requests')
      .select(
        `
        id,
        source,
        created_at,
        checklist_answer_id,
        user_id,
        checklist_answers(
          id,
          answer_data,
          created_at,
          user:profile!checklist_answers_user_id_fkey(
            id,
            fullname,
            email
          ),
          employee:employees(
            id,
            firstname,
            lastname
          )
        ),
        created_by_user:profile!maintenance_requests_user_id_fkey(
          id,
          fullname,
          email
        )
      `
      )
      .eq('id', maintenanceRequestId)
      .single();

    if (request) {
      if (request.source === 'manual' || !request.checklist_answer_id) {
        origin = {
          type: 'manual',
          manualCreator: request.created_by_user
            ? {
                id: request.created_by_user.id,
                fullname: request.created_by_user.fullname,
                email: request.created_by_user.email,
              }
            : null,
          createdAt: request.created_at || null,
        };
      } else {
        const answerData = request.checklist_answers?.answer_data as {
          fecha?: string;
          hora?: string;
          chofer?: string;
          kilometraje?: string;
        } | null;

        const checklistUser = request.checklist_answers?.user;

        origin = {
          type: 'checklist',
          checklist: {
            id: request.checklist_answer_id,
            fecha: answerData?.fecha || null,
            hora: answerData?.hora || null,
            chofer: answerData?.chofer || null,
            kilometraje: answerData?.kilometraje || null,
            createdAt: request.checklist_answers?.created_at || null,
            respondedBy: checklistUser
              ? {
                  id: checklistUser.id,
                  fullname: checklistUser.fullname,
                  email: checklistUser.email,
                }
              : null,
          },
          createdAt: request.created_at || null,
        };
      }
    }
  }

  // 2. Obtener logs de la solicitud
  let requestLogs: Awaited<ReturnType<typeof getMaintenanceRequestActivityLog>> = [];
  if (maintenanceRequestId) {
    const { data: reqLogs } = await supabase
      .from('maintenance_activity_log')
      .select(
        `
        *,
        performer:profile!maintenance_activity_log_performed_by_fkey(
          id,
          fullname,
          email
        )
      `
      )
      .eq('maintenance_request_id', maintenanceRequestId)
      .order('performed_at', { ascending: true });

    requestLogs = reqLogs || [];
  }

  // 3. Obtener logs del pedido (maintenance_order)
  const { data: orderLogs } = await supabase
    .from('maintenance_activity_log')
    .select(
      `
      *,
      performer:profile!maintenance_activity_log_performed_by_fkey(
        id,
        fullname,
        email
      )
    `
    )
    .eq('maintenance_order_id', orderId)
    .order('performed_at', { ascending: true });

  // 4. Combinar, eliminar duplicados y ordenar todos los logs cronológicamente
  // Un log puede tener tanto maintenance_request_id como maintenance_order_id,
  // así que usamos un Map para eliminar duplicados por id
  const logsMap = new Map<string, (typeof requestLogs)[number]>();

  for (const log of requestLogs) {
    logsMap.set(log.id, log);
  }

  for (const log of orderLogs || []) {
    if (!logsMap.has(log.id)) {
      logsMap.set(log.id, log);
    }
  }

  const allLogs = Array.from(logsMap.values()).sort((a, b) => {
    return new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime();
  });

  return {
    origin,
    history: allLogs,
  };
}

export type MaintenanceOrderFullActivityLog = Awaited<ReturnType<typeof getMaintenanceOrderFullActivityLog>>;

/**
 * Obtiene el historial de actividades de una orden de trabajo
 */
export async function getWorkOrderActivityLog(workOrderId: string) {
  const supabase = await supabaseServer();

  serverLogger.debug('Obteniendo historial de actividades de orden de trabajo', { data: { workOrderId } });

  const { data, error } = await supabase
    .from('maintenance_activity_log')
    .select(
      `
      *,
      performer:profile!maintenance_activity_log_performed_by_fkey(
        id,
        fullname,
        email
      )
    `
    )
    .eq('work_order_id', workOrderId)
    .order('performed_at', { ascending: true });

  if (error) {
    serverLogger.error('Error al obtener historial de actividades de orden de trabajo', {
      data: { error, workOrderId },
    });
    throw error;
  }

  return data || [];
}

/**
 * Obtiene el historial COMPLETO de una orden de trabajo, incluyendo:
 * - El historial de la solicitud/pedido original (maintenance_order)
 * - El historial específico de la orden de trabajo
 * - Información de otras OTs derivadas de la misma solicitud
 */
export async function getWorkOrderFullActivityLog(workOrderId: string) {
  const supabase = await supabaseServer();

  serverLogger.debug('Obteniendo historial completo de orden de trabajo', { data: { workOrderId } });

  // 1. Obtener la work_order con sus relaciones para encontrar el maintenance_order
  const { data: workOrder, error: woError } = await supabase
    .from('work_orders')
    .select(
      `
      id,
      order_number,
      status,
      created_at,
      work_order_items(
        maintenance_order_item_id,
        maintenance_order_items(
          maintenance_order_id,
          maintenance_orders(
            id,
            maintenance_request_id,
            equipment_id,
            vehicles(domain, intern_number)
          )
        )
      )
    `
    )
    .eq('id', workOrderId)
    .single();

  if (woError) {
    serverLogger.error('Error al obtener work_order', { data: { error: woError, workOrderId } });
    throw woError;
  }

  // Extraer el maintenance_order_id de la relación
  const maintenanceOrderId = workOrder?.work_order_items?.[0]?.maintenance_order_items?.maintenance_order_id;
  const maintenanceRequestId =
    workOrder?.work_order_items?.[0]?.maintenance_order_items?.maintenance_orders?.maintenance_request_id;

  // 2. Obtener el historial del pedido/solicitud (maintenance_order)
  let orderHistory: Awaited<ReturnType<typeof getMaintenanceOrderActivityLog>> = [];
  if (maintenanceOrderId) {
    const { data: orderLog, error: orderError } = await supabase
      .from('maintenance_activity_log')
      .select(
        `
        *,
        performer:profile!maintenance_activity_log_performed_by_fkey(
          id,
          fullname,
          email
        )
      `
      )
      .eq('maintenance_order_id', maintenanceOrderId)
      .order('performed_at', { ascending: true });

    if (!orderError && orderLog) {
      orderHistory = orderLog;
    }
  }

  // 3. Obtener el historial específico de esta work_order
  const { data: workOrderLog, error: woLogError } = await supabase
    .from('maintenance_activity_log')
    .select(
      `
      *,
      performer:profile!maintenance_activity_log_performed_by_fkey(
        id,
        fullname,
        email
      )
    `
    )
    .eq('work_order_id', workOrderId)
    .order('performed_at', { ascending: true });

  if (woLogError) {
    serverLogger.error('Error al obtener historial de work_order', { data: { error: woLogError, workOrderId } });
    throw woLogError;
  }

  // 4. Obtener otras OTs derivadas del mismo maintenance_order (si existe)
  let siblingWorkOrders: { id: string; order_number: string; status: string }[] = [];
  if (maintenanceOrderId) {
    const { data: siblings } = await supabase
      .from('work_orders')
      .select(
        `
        id,
        order_number,
        status,
        work_order_items!inner(
          maintenance_order_items!inner(
            maintenance_order_id
          )
        )
      `
      )
      .neq('id', workOrderId);

    if (siblings) {
      // Filtrar las que tienen el mismo maintenance_order_id
      siblingWorkOrders = siblings
        .filter((wo) =>
          wo.work_order_items?.some((woi) => woi.maintenance_order_items?.maintenance_order_id === maintenanceOrderId)
        )
        .map((wo) => ({
          id: wo.id,
          order_number: wo.order_number,
          status: wo.status as string,
        }));
    }
  }

  // 5. Combinar y marcar la fuente de cada registro
  const combinedHistory = [
    ...orderHistory.map((entry) => ({
      ...entry,
      source: 'order' as const,
      sourceLabel: 'Pedido de Mantenimiento',
    })),
    ...((workOrderLog || []) as typeof orderHistory).map((entry) => ({
      ...entry,
      source: 'work_order' as const,
      sourceLabel: `OT: ${workOrder?.order_number || 'N/A'}`,
    })),
  ].sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime());

  return {
    history: combinedHistory,
    workOrder: {
      id: workOrder?.id,
      orderNumber: workOrder?.order_number,
      status: workOrder?.status,
    },
    maintenanceOrderId,
    maintenanceRequestId,
    siblingWorkOrders,
    vehicleInfo: workOrder?.work_order_items?.[0]?.maintenance_order_items?.maintenance_orders?.vehicles,
  };
}

export type WorkOrderFullActivityLog = Awaited<ReturnType<typeof getWorkOrderFullActivityLog>>;
