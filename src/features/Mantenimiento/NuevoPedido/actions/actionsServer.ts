'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';

const serverLogger = new Logger('Mantenimiento/NuevoPedido/actions');

/**
 * Tipo para crear un item de pedido de mantenimiento directo
 */
export type CreateMaintenanceOrderItemInput = {
  repair_type_id: string;
  description?: string;
  images?: string[];
};

/**
 * Tipo para crear un pedido de mantenimiento directo
 */
export type CreateMaintenanceOrderDirectInput = {
  equipment_id: string;
  kilometer?: string;
  items: CreateMaintenanceOrderItemInput[];
};

/**
 * Crea un pedido de mantenimiento directamente sin pasar por solicitud
 * El pedido se crea con status 'pending_scheduling' para que taller le asigne fecha
 */
export async function createMaintenanceOrderDirect(input: CreateMaintenanceOrderDirectInput) {
  const supabase = await supabaseServer();

  serverLogger.info('Creando pedido de mantenimiento directo', {
    data: { equipment_id: input.equipment_id, itemsCount: input.items.length },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Crear el maintenance_order
  const { data: order, error: orderError } = await supabase
    .from('maintenance_orders')
    .insert({
      equipment_id: input.equipment_id,
      maintenance_request_id: null, // Sin solicitud previa
      status: 'pending_scheduling',
      kilometer_at_entry: input.kilometer || null,
    })
    .select()
    .single();

  if (orderError) {
    serverLogger.error('Error al crear pedido de mantenimiento', { data: { error: orderError } });
    throw new Error(`Error al crear pedido: ${orderError.message}`);
  }

  // 2. Crear los maintenance_order_items
  const orderItems = input.items.map((item) => ({
    maintenance_order_id: order.id,
    maintenance_request_item_id: null, // Sin item de solicitud previa
    repair_type_id: item.repair_type_id,
    description: item.description || null,
    images: item.images || null,
  }));

  const { data: items, error: itemsError } = await supabase.from('maintenance_order_items').insert(orderItems).select();

  if (itemsError) {
    serverLogger.error('Error al crear items del pedido', { data: { error: itemsError } });
    // Intentar eliminar la orden creada para mantener consistencia
    await supabase.from('maintenance_orders').delete().eq('id', order.id);
    throw new Error(`Error al crear items del pedido: ${itemsError.message}`);
  }

  // 3. Actualizar el kilometraje del vehículo si se proporcionó
  if (input.kilometer) {
    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({ kilometer: input.kilometer })
      .eq('id', input.equipment_id);

    if (vehicleError) {
      serverLogger.warn('No se pudo actualizar kilometraje del vehículo', {
        data: { error: vehicleError },
      });
    }
  }

  serverLogger.info('Pedido de mantenimiento creado exitosamente', {
    data: { orderId: order.id, itemsCreated: items.length },
  });

  return { order, items };
}

/**
 * Verifica si ya existe un pedido de mantenimiento pendiente para un equipo
 * con el mismo tipo de reparación
 */
export async function checkExistingMaintenanceOrder(equipmentId: string, repairTypeId: string): Promise<boolean> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('maintenance_order_items')
    .select(
      `
      id,
      maintenance_orders!inner(
        id,
        equipment_id,
        status
      )
    `
    )
    .eq('repair_type_id', repairTypeId)
    .eq('maintenance_orders.equipment_id', equipmentId)
    .in('maintenance_orders.status', ['pending_scheduling', 'scheduled', 'date_confirmed', 'in_workshop']);

  if (error) {
    serverLogger.error('Error verificando pedidos existentes', { data: { error } });
    return false;
  }

  return (data?.length ?? 0) > 0;
}

export type CreateMaintenanceOrderDirectResult = Awaited<ReturnType<typeof createMaintenanceOrderDirect>>;

/**
 * Obtiene los templates de checklist disponibles para un equipo específico
 * basándose en su type y/o subType
 */
export async function getChecklistTemplatesForEquipment(equipmentId: string) {
  const supabase = await supabaseServer();

  serverLogger.debug('Obteniendo templates de checklist para equipo', { data: { equipmentId } });

  // 1. Obtener type y subType del equipo
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, type, subType')
    .eq('id', equipmentId)
    .single();

  if (vehicleError || !vehicle) {
    serverLogger.error('Error al obtener equipo', { data: { error: vehicleError, equipmentId } });
    throw new Error('No se pudo obtener información del equipo');
  }

  // 2. Obtener templates activos con sus secciones e items
  const { data: templates, error: templatesError } = await supabase
    .from('checklist_templates')
    .select(
      `
      id,
      name,
      code,
      checklist_template_types(type_id),
      checklist_template_sub_types(sub_type_id),
      checklist_template_sections(
        id,
        code,
        name,
        order_index,
        checklist_template_items(
          id,
          code,
          label,
          is_critical,
          order_index
        )
      )
    `
    )
    .eq('is_active', true)
    .order('name');

  if (templatesError) {
    serverLogger.error('Error al obtener templates', { data: { error: templatesError } });
    throw new Error('No se pudieron obtener los templates de checklist');
  }

  // 3. Filtrar templates que aplican al type o subType del equipo
  const filteredTemplates = (templates || []).filter((template) => {
    const types = template.checklist_template_types || [];
    const subTypes = template.checklist_template_sub_types || [];

    // Si el template no tiene restricciones de tipo, aplica a todos
    if (types.length === 0 && subTypes.length === 0) {
      return true;
    }

    // Verificar si coincide por type
    const matchesType = types.some((t) => t.type_id === vehicle.type);
    // Verificar si coincide por subType
    const matchesSubType = subTypes.some((st) => st.sub_type_id === vehicle.subType);

    return matchesType || matchesSubType;
  });

  serverLogger.debug('Templates filtrados', {
    data: {
      equipmentId,
      vehicleType: vehicle.type,
      vehicleSubType: vehicle.subType,
      totalTemplates: templates?.length || 0,
      filteredCount: filteredTemplates.length,
    },
  });

  return filteredTemplates;
}

export type ChecklistTemplatesForEquipment = Awaited<ReturnType<typeof getChecklistTemplatesForEquipment>>;
export type ChecklistTemplateForEquipment = ChecklistTemplatesForEquipment[number];

/**
 * Tipo para crear desvíos desde el formulario de Nuevo Pedido
 */
export type CreateDeviationFromNuevoPedido = {
  itemId: string;
  itemCode: string;
  itemLabel: string;
  sectionCode: string;
  isCritical: boolean;
  comment?: string;
};

/**
 * Crea un pedido de mantenimiento desde desvíos seleccionados en el formulario de Nuevo Pedido
 *
 * Flujo:
 * 1. Crea checklist_deviations con status implícito "aprobado"
 * 2. Crea maintenance_request con status 'approved' (ya aprobada, source='manual')
 * 3. Crea maintenance_request_items vinculados a los desvíos
 * 4. Crea maintenance_order con status 'pending_scheduling'
 * 5. Crea maintenance_order_items vinculados a los request_items
 * 6. Registra la actividad en maintenance_activity_log
 */
export async function createMaintenanceOrderFromDeviations(input: {
  equipmentId: string;
  supervisorId: string;
  kilometer?: string;
  deviations: CreateDeviationFromNuevoPedido[];
}) {
  const supabase = await supabaseServer();

  serverLogger.info('Creando pedido desde Nuevo Pedido', {
    data: {
      equipmentId: input.equipmentId,
      supervisorId: input.supervisorId,
      deviationsCount: input.deviations.length,
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // 1. Crear checklist_deviations
  const deviationInserts = input.deviations.map((d) => ({
    equipment_id: input.equipmentId,
    item_code: d.itemCode,
    item_label: d.itemLabel,
    section_code: d.sectionCode,
    is_critical: d.isCritical,
    driver_comment: d.comment || null,
    created_by_user_id: user.id,
    // Sin checklist_answer_id porque es manual
  }));

  const { data: createdDeviations, error: devError } = await supabase
    .from('checklist_deviations')
    .insert(deviationInserts)
    .select();

  if (devError || !createdDeviations) {
    serverLogger.error('Error al crear desvíos', { data: { error: devError } });
    throw new Error('Error al crear los desvíos');
  }

  // 2. Crear maintenance_request con status aprobado y source='manual'
  const { data: request, error: reqError } = await supabase
    .from('maintenance_requests')
    .insert({
      equipment_id: input.equipmentId,
      supervisor_id: input.supervisorId,
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      user_id: user.id,
      kilometer: input.kilometer || null,
      source: 'manual',
    })
    .select()
    .single();

  if (reqError || !request) {
    serverLogger.error('Error al crear solicitud', { data: { error: reqError } });
    // Rollback: eliminar desvíos creados
    await supabase
      .from('checklist_deviations')
      .delete()
      .in(
        'id',
        createdDeviations.map((d) => d.id)
      );
    throw new Error('Error al crear la solicitud de mantenimiento');
  }

  // 3. Crear maintenance_request_items vinculados a los desvíos
  const requestItemInserts = createdDeviations.map((dev, idx) => ({
    maintenance_request_id: request.id,
    checklist_deviation_id: dev.id,
    status: 'approved' as const,
    description: input.deviations[idx]?.comment || null,
    driver_comment: input.deviations[idx]?.comment || null,
  }));

  const { data: requestItems, error: reqItemsError } = await supabase
    .from('maintenance_request_items')
    .insert(requestItemInserts)
    .select();

  if (reqItemsError || !requestItems) {
    serverLogger.error('Error al crear items de solicitud', { data: { error: reqItemsError } });
    // Rollback
    await supabase.from('maintenance_requests').delete().eq('id', request.id);
    await supabase
      .from('checklist_deviations')
      .delete()
      .in(
        'id',
        createdDeviations.map((d) => d.id)
      );
    throw new Error('Error al crear los items de la solicitud');
  }

  // 4. Crear maintenance_order con source='manual'
  const { data: order, error: orderError } = await supabase
    .from('maintenance_orders')
    .insert({
      equipment_id: input.equipmentId,
      maintenance_request_id: request.id,
      status: 'pending_scheduling',
      kilometer_at_entry: input.kilometer || null,
      source: 'manual',
    })
    .select()
    .single();

  if (orderError || !order) {
    serverLogger.error('Error al crear pedido', { data: { error: orderError } });
    // Rollback
    await supabase.from('maintenance_request_items').delete().eq('maintenance_request_id', request.id);
    await supabase.from('maintenance_requests').delete().eq('id', request.id);
    await supabase
      .from('checklist_deviations')
      .delete()
      .in(
        'id',
        createdDeviations.map((d) => d.id)
      );
    throw new Error('Error al crear el pedido de mantenimiento');
  }

  // 5. Crear maintenance_order_items vinculados a request_items
  const orderItemInserts = requestItems.map((ri, idx) => ({
    maintenance_order_id: order.id,
    maintenance_request_item_id: ri.id,
    description: input.deviations[idx]?.comment || null,
    is_critical: input.deviations[idx]?.isCritical || false,
  }));

  const { error: orderItemsError } = await supabase.from('maintenance_order_items').insert(orderItemInserts);

  if (orderItemsError) {
    serverLogger.error('Error al crear items del pedido', { data: { error: orderItemsError } });
    // Rollback completo
    await supabase.from('maintenance_orders').delete().eq('id', order.id);
    await supabase.from('maintenance_request_items').delete().eq('maintenance_request_id', request.id);
    await supabase.from('maintenance_requests').delete().eq('id', request.id);
    await supabase
      .from('checklist_deviations')
      .delete()
      .in(
        'id',
        createdDeviations.map((d) => d.id)
      );
    throw new Error('Error al crear los items del pedido');
  }

  // 6. Registrar actividad en maintenance_activity_log
  await supabase.from('maintenance_activity_log').insert({
    maintenance_request_id: request.id,
    maintenance_order_id: order.id,
    action_type: 'created',
    performed_by: user.id,
    notes: 'Pedido creado manualmente desde Nuevo Pedido',
    metadata: {
      source: 'manual',
      supervisor_id: input.supervisorId,
      deviations_count: input.deviations.length,
    },
  });

  serverLogger.info('Pedido creado exitosamente desde Nuevo Pedido', {
    data: {
      requestId: request.id,
      orderId: order.id,
      deviationsCreated: createdDeviations.length,
    },
  });

  return { request, order };
}

export type CreateMaintenanceOrderFromDeviationsResult = Awaited<
  ReturnType<typeof createMaintenanceOrderFromDeviations>
>;

/**
 * Crea una solicitud de mantenimiento con status pending_approval (para cuando el creador NO es el supervisor)
 *
 * Flujo:
 * 1. Crea checklist_deviations
 * 2. Crea maintenance_request con status 'pending_approval' (necesita aprobación del supervisor)
 * 3. Crea maintenance_request_items vinculados a los desvíos
 * 4. Registra la actividad en maintenance_activity_log
 * 5. NO crea maintenance_order - eso se hace cuando el supervisor aprueba
 */
export async function createMaintenanceRequestPendingApproval(input: {
  equipmentId: string;
  supervisorId: string;
  kilometer?: string;
  deviations: CreateDeviationFromNuevoPedido[];
}) {
  const supabase = await supabaseServer();

  serverLogger.info('Creando solicitud de mantenimiento pendiente de aprobación', {
    data: {
      equipmentId: input.equipmentId,
      supervisorId: input.supervisorId,
      deviationsCount: input.deviations.length,
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // 1. Crear checklist_deviations
  const deviationInserts = input.deviations.map((d) => ({
    equipment_id: input.equipmentId,
    item_code: d.itemCode,
    item_label: d.itemLabel,
    section_code: d.sectionCode,
    is_critical: d.isCritical,
    driver_comment: d.comment || null,
    created_by_user_id: user.id,
    // Sin checklist_answer_id porque es manual
  }));

  const { data: createdDeviations, error: devError } = await supabase
    .from('checklist_deviations')
    .insert(deviationInserts)
    .select();

  if (devError || !createdDeviations) {
    serverLogger.error('Error al crear desvíos', { data: { error: devError } });
    throw new Error('Error al crear los desvíos');
  }

  // 2. Crear maintenance_request con status pending_approval (NO aprobado aún)
  const { data: request, error: reqError } = await supabase
    .from('maintenance_requests')
    .insert({
      equipment_id: input.equipmentId,
      supervisor_id: input.supervisorId,
      status: 'pending_approval', // Pendiente de aprobación
      user_id: user.id,
      kilometer: input.kilometer || null,
      source: 'manual',
      // Sin approved_by ni approved_at ya que está pendiente
    })
    .select()
    .single();

  if (reqError || !request) {
    serverLogger.error('Error al crear solicitud', { data: { error: reqError } });
    // Rollback: eliminar desvíos creados
    await supabase
      .from('checklist_deviations')
      .delete()
      .in(
        'id',
        createdDeviations.map((d) => d.id)
      );
    throw new Error('Error al crear la solicitud de mantenimiento');
  }

  // 3. Crear maintenance_request_items vinculados a los desvíos
  const requestItemInserts = createdDeviations.map((dev, idx) => ({
    maintenance_request_id: request.id,
    checklist_deviation_id: dev.id,
    status: 'pending' as const, // Pendiente de aprobación
    description: input.deviations[idx]?.comment || null,
    driver_comment: input.deviations[idx]?.comment || null,
  }));

  const { data: requestItems, error: reqItemsError } = await supabase
    .from('maintenance_request_items')
    .insert(requestItemInserts)
    .select();

  if (reqItemsError || !requestItems) {
    serverLogger.error('Error al crear items de solicitud', { data: { error: reqItemsError } });
    // Rollback
    await supabase.from('maintenance_requests').delete().eq('id', request.id);
    await supabase
      .from('checklist_deviations')
      .delete()
      .in(
        'id',
        createdDeviations.map((d) => d.id)
      );
    throw new Error('Error al crear los items de la solicitud');
  }

  // 4. Registrar actividad en maintenance_activity_log
  await supabase.from('maintenance_activity_log').insert({
    maintenance_request_id: request.id,
    action_type: 'created',
    performed_by: user.id,
    notes: 'Solicitud creada manualmente desde Nuevo Pedido - Pendiente de aprobación del supervisor',
    metadata: {
      source: 'manual',
      supervisor_id: input.supervisorId,
      deviations_count: input.deviations.length,
      requires_approval: true,
    },
  });

  serverLogger.info('Solicitud creada exitosamente - Pendiente de aprobación', {
    data: {
      requestId: request.id,
      deviationsCreated: createdDeviations.length,
      supervisorId: input.supervisorId,
    },
  });

  return { request, requestItems };
}

export type CreateMaintenanceRequestPendingApprovalResult = Awaited<
  ReturnType<typeof createMaintenanceRequestPendingApproval>
>;

/**
 * Obtiene el usuario actual del servidor para verificar si es supervisor
 */
export async function getCurrentUserForSupervisorCheck() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Obtener información del perfil del usuario
  const { data: profile, error: profileError } = await supabase
    .from('profile')
    .select('id, fullname, email')
    .eq('credential_id', user.id)
    .single();

  if (profileError || !profile) {
    serverLogger.warn('No se pudo obtener el perfil del usuario', { data: { error: profileError } });
    return {
      id: user.id,
      fullname: user.email || 'Usuario',
      email: user.email || '',
    };
  }

  return {
    id: user.id,
    fullname: profile.fullname || user.email || 'Usuario',
    email: profile.email || user.email || '',
  };
}

export type CurrentUserForSupervisorCheck = Awaited<ReturnType<typeof getCurrentUserForSupervisorCheck>>;
