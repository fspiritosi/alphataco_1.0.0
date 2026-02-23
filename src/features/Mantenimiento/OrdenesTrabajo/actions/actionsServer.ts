'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import type { WorkOrderDetail, WorkOrderItemDetail, WorkOrderRowData } from '../types';

const logger = new Logger('OrdenesTrabajo/actions');

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Obtiene todas las órdenes de trabajo con filtro opcional por estado
 */
export async function getWorkOrders(status?: string | string[]) {
  const supabase = await supabaseServer();

  let query = supabase.from('work_orders').select(
    `
      *,
      vehicles!inner (
        id,
        domain,
        serie,
        intern_number,
        types_of_vehicles (name)
      ),
      workshops!inner (
        id,
        name,
        type
      ),
      workshop_sectors (
        id,
        name
      ),
      work_order_items (
        id,
        status
      )
    `
  );

  // Filtrar por estado(s)
  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }
  }

  // Ordenar por fecha de creación descendente
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    logger.error('Error obteniendo órdenes de trabajo', { data: { error } });
    throw new Error(`Error al obtener órdenes de trabajo: ${error.message}`);
  }

  // Transformar a WorkOrderRowData
  const workOrders: WorkOrderRowData[] = (data || []).map((wo) => {
    const items = wo.work_order_items || [];
    const completedItems = items.filter((i: any) => i.status === 'completed').length;

    return {
      id: wo.id,
      orderNumber: wo.order_number,
      sequenceNumber: wo.sequence_number,
      status: wo.status as WorkOrderRowData['status'],
      priority: wo.priority as WorkOrderRowData['priority'],
      equipmentId: wo.equipment_id,
      vehicleDomain: (wo.vehicles as any)?.domain || null,
      vehicleSerie: (wo.vehicles as any)?.serie || null,
      vehicleInternNumber: (wo.vehicles as any)?.intern_number || null,
      vehicleType: (wo.vehicles as any)?.types_of_vehicles?.name || null,
      workshopId: wo.workshop_id,
      workshopName: (wo.workshops as any)?.name || '',
      workshopType: (wo.workshops as any)?.type || 'interno',
      sectorId: wo.sector_id,
      sectorName: (wo.workshop_sectors as any)?.name || null,
      plannedStartDate: wo.planned_start_date,
      plannedEndDate: wo.planned_end_date,
      actualStartDate: wo.actual_start_date,
      actualEndDate: wo.actual_end_date,
      totalItems: items.length,
      completedItems,
      notes: wo.notes,
      createdAt: wo.created_at,
      createdBy: wo.created_by,
      pausedAt: wo.paused_at,
      pauseReason: wo.pause_reason,
      totalPausedTime: wo.total_paused_time,
    };
  });

  return workOrders;
}

/**
 * Obtiene el detalle completo de una orden de trabajo
 */
export async function getWorkOrderDetail(workOrderId: string): Promise<WorkOrderDetail | null> {
  const supabase = await supabaseServer();

  // Obtener la orden
  const { data: wo, error: woError } = await supabase
    .from('work_orders')
    .select(
      `
      *,
      vehicles!inner (
        id,
        domain,
        serie,
        intern_number,
        kilometer,
        engine_hours,
        condition,
        types_of_vehicles (name)
      ),
      workshops!inner (
        id,
        name,
        type
      ),
      workshop_sectors (
        id,
        name
      ),
      paused_by_profile:profile!work_orders_paused_by_fkey (
        fullname
      )
    `
    )
    .eq('id', workOrderId)
    .single();

  if (woError) {
    logger.error('Error obteniendo detalle de OT', { data: { error: woError } });
    return null;
  }

  // Obtener los items con sus detalles y repairs
  const { data: items, error: itemsError } = await supabase
    .from('work_order_items')
    .select(
      `
      *,
      work_order_item_repairs (
        id,
        repair_type_id,
        status,
        technician_notes,
        completed_at,
        completed_by,
        types_of_repairs (id, name)
      ),
      maintenance_order_items!inner (
        id,
        description,
        repair_type_id,
        types_of_repairs (id, name),
        maintenance_order_item_repair_types (
          repair_type_id,
          types_of_repairs (id, name)
        ),
        maintenance_request_items (
          id,
          description,
          driver_comment,
          validator_comment,
          checklist_deviations (
            id,
            item_code,
            item_label,
            section_code,
            driver_comment
          )
        )
      )
    `
    )
    .eq('work_order_id', workOrderId);

  if (itemsError) {
    logger.error('Error obteniendo items de OT', { data: { error: itemsError } });
  }

  // Transformar items
  const workOrderItems: WorkOrderItemDetail[] = (items || []).map((item) => {
    const moi = item.maintenance_order_items as any;
    const mri = moi?.maintenance_request_items;
    const deviation = mri?.checklist_deviations;

    // Extraer tipos de reparación de la tabla pivot (prioridad) o del campo legacy
    const pivotRepairTypes = moi?.maintenance_order_item_repair_types || [];
    const repairTypeIds: string[] =
      pivotRepairTypes.length > 0
        ? pivotRepairTypes.map((rt: any) => rt.repair_type_id).filter(Boolean)
        : moi?.repair_type_id
          ? [moi.repair_type_id]
          : [];
    const repairTypeNames: string[] =
      pivotRepairTypes.length > 0
        ? pivotRepairTypes.map((rt: any) => rt.types_of_repairs?.name).filter(Boolean)
        : moi?.types_of_repairs?.name
          ? [moi.types_of_repairs.name]
          : [];

    // Extraer trabajos individuales de work_order_item_repairs
    const rawRepairs = (item as any).work_order_item_repairs || [];
    const repairs: WorkOrderItemDetail['repairs'] = rawRepairs.map((r: any) => ({
      id: r.id,
      repairTypeId: r.repair_type_id,
      repairTypeName: r.types_of_repairs?.name || 'Sin nombre',
      status: r.status as WorkOrderItemDetail['status'],
      technicianNotes: r.technician_notes,
      completedAt: r.completed_at,
      completedBy: r.completed_by,
    }));

    const completedRepairs = repairs.filter((r) => r.status === 'completed').length;
    const totalRepairs = repairs.length;

    // Si no hay repairs en la nueva tabla, usar los legacy
    const effectiveRepairs =
      repairs.length > 0
        ? repairs
        : repairTypeIds.map((id, idx) => ({
            id: `legacy-${id}`,
            repairTypeId: id,
            repairTypeName: repairTypeNames[idx] || 'Sin nombre',
            status: item.status as WorkOrderItemDetail['status'],
            technicianNotes: null,
            completedAt: null,
            completedBy: null,
          }));

    return {
      id: item.id,
      status: item.status as WorkOrderItemDetail['status'],
      technicianNotes: item.technician_notes,
      completedAt: item.completed_at,
      maintenanceOrderItemId: item.maintenance_order_item_id,
      repairTypeId: moi?.repair_type_id || null,
      repairTypeName: moi?.types_of_repairs?.name || null,
      repairTypeIds,
      repairTypeNames,
      repairs: effectiveRepairs,
      totalRepairs: effectiveRepairs.length,
      completedRepairs: effectiveRepairs.filter((r) => r.status === 'completed').length,
      description: moi?.description || null,
      driverComment: mri?.driver_comment || deviation?.driver_comment || null,
      validatorComment: mri?.validator_comment || null,
      deviationId: deviation?.id || null,
      itemLabel: deviation?.item_label || moi?.types_of_repairs?.name || 'Sin descripción',
      itemCode: deviation?.item_code || null,
      sectionCode: deviation?.section_code || null,
    };
  });

  // Construir el detalle
  const workOrderDetail: WorkOrderDetail = {
    id: wo.id,
    orderNumber: wo.order_number,
    sequenceNumber: wo.sequence_number,
    status: wo.status as WorkOrderDetail['status'],
    priority: wo.priority as WorkOrderDetail['priority'],
    equipmentId: wo.equipment_id,
    vehicleDomain: (wo.vehicles as any)?.domain || null,
    vehicleSerie: (wo.vehicles as any)?.serie || null,
    vehicleInternNumber: (wo.vehicles as any)?.intern_number || null,
    vehicleType: (wo.vehicles as any)?.types_of_vehicles?.name || null,
    vehicleKilometer: (wo.vehicles as any)?.kilometer || null,
    vehicleEngineHours: (wo.vehicles as any)?.engine_hours ?? null,
    vehicleCondition: (wo.vehicles as any)?.condition || null,
    workshopId: wo.workshop_id,
    workshopName: (wo.workshops as any)?.name || '',
    workshopType: (wo.workshops as any)?.type || 'interno',
    sectorId: wo.sector_id,
    sectorName: (wo.workshop_sectors as any)?.name || null,
    plannedStartDate: wo.planned_start_date,
    plannedEndDate: wo.planned_end_date,
    actualStartDate: wo.actual_start_date,
    actualEndDate: wo.actual_end_date,
    // totalItems y completedItems ahora cuentan repairs individuales
    totalItems: workOrderItems.reduce((sum, item) => sum + item.totalRepairs, 0),
    completedItems: workOrderItems.reduce((sum, item) => sum + item.completedRepairs, 0),
    notes: wo.notes,
    createdAt: wo.created_at,
    createdBy: wo.created_by,
    items: workOrderItems,
    startedAt: wo.started_at,
    startedBy: wo.started_by,
    completedAt: wo.completed_at,
    completedBy: wo.completed_by,
    cancelledAt: wo.cancelled_at,
    cancelledBy: wo.cancelled_by,
    cancellationReason: wo.cancellation_reason,
    pausedAt: wo.paused_at,
    pausedBy: (wo as any).paused_by_profile?.fullname || wo.paused_by,
    pauseReason: wo.pause_reason,
    totalPausedTime: wo.total_paused_time,
  };

  return workOrderDetail;
}

// =============================================================================
// ACCIONES
// =============================================================================

/**
 * Inicia una orden de trabajo (pending → in_progress)
 */
export async function startWorkOrder(workOrderId: string) {
  const supabase = await supabaseServer();

  logger.info('Iniciando orden de trabajo', { data: { workOrderId } });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // Verificar estado actual
  const { data: wo, error: checkError } = await supabase
    .from('work_orders')
    .select('status')
    .eq('id', workOrderId)
    .single();

  if (checkError || !wo) {
    throw new Error('Orden de trabajo no encontrada');
  }

  if (wo.status !== 'pending') {
    throw new Error(`No se puede iniciar una orden en estado "${wo.status}"`);
  }

  // Actualizar estado
  const { data, error } = await supabase
    .from('work_orders')
    .update({
      status: 'in_progress',
      actual_start_date: new Date().toISOString(),
      started_by: user.id,
      started_at: new Date().toISOString(),
    })
    .eq('id', workOrderId)
    .select()
    .single();

  if (error) {
    logger.error('Error iniciando OT', { data: { error } });
    throw new Error(`Error al iniciar orden: ${error.message}`);
  }

  logger.info('Orden de trabajo iniciada', { data: { workOrderId } });

  return data;
}

/**
 * Completa un item de la orden de trabajo
 */
export async function completeWorkOrderItem(itemId: string, technicianNotes?: string) {
  const supabase = await supabaseServer();

  logger.info('Completando item de OT', { data: { itemId } });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  const { data, error } = await supabase
    .from('work_order_items')
    .update({
      status: 'completed',
      technician_notes: technicianNotes || null,
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    logger.error('Error completando item', { data: { error } });
    throw new Error(`Error al completar item: ${error.message}`);
  }

  return data;
}

/**
 * Completa un trabajo individual (tipo de reparación) de un item de OT
 * @param repairId ID del work_order_item_repair
 * @param technicianNotes Notas opcionales del técnico
 */
export async function completeWorkOrderItemRepair(repairId: string, technicianNotes?: string) {
  const supabase = await supabaseServer();

  logger.info('Completando trabajo de reparación', { data: { repairId } });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // Verificar que el repair existe y obtener el work_order_item_id
  const { data: repair, error: checkError } = await supabase
    .from('work_order_item_repairs')
    .select('id, work_order_item_id, status')
    .eq('id', repairId)
    .single();

  if (checkError || !repair) {
    throw new Error('Trabajo de reparación no encontrado');
  }

  if (repair.status === 'completed') {
    throw new Error('Este trabajo ya está completado');
  }

  // Actualizar el repair
  const { data, error } = await supabase
    .from('work_order_item_repairs')
    .update({
      status: 'completed',
      technician_notes: technicianNotes || null,
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    })
    .eq('id', repairId)
    .select()
    .single();

  if (error) {
    logger.error('Error completando trabajo', { data: { error } });
    throw new Error(`Error al completar trabajo: ${error.message}`);
  }

  // Verificar si todos los repairs del item están completados
  const { data: allRepairs } = await supabase
    .from('work_order_item_repairs')
    .select('status')
    .eq('work_order_item_id', repair.work_order_item_id);

  const allCompleted = allRepairs?.every((r) => r.status === 'completed');

  // Si todos los repairs están completados, marcar el work_order_item como completado
  if (allCompleted) {
    await supabase
      .from('work_order_items')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
      })
      .eq('id', repair.work_order_item_id);

    logger.info('Todos los trabajos del item completados, item marcado como completado', {
      data: { workOrderItemId: repair.work_order_item_id },
    });
  }

  logger.info('Trabajo de reparación completado', { data: { repairId } });

  return data;
}

/**
 * Actualiza las notas del técnico en un item
 */
export async function updateItemNotes(itemId: string, technicianNotes: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('work_order_items')
    .update({ technician_notes: technicianNotes })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    logger.error('Error actualizando notas', { data: { error } });
    throw new Error(`Error al actualizar notas: ${error.message}`);
  }

  return data;
}

/**
 * Completa una orden de trabajo (in_progress → completed)
 * Todos los trabajos (repairs) deben estar completados
 */
export async function completeWorkOrder(workOrderId: string) {
  const supabase = await supabaseServer();

  logger.info('Completando orden de trabajo', { data: { workOrderId } });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // Obtener items y sus repairs
  const { data: items, error: itemsError } = await supabase
    .from('work_order_items')
    .select('id, status, work_order_item_repairs(id, status)')
    .eq('work_order_id', workOrderId);

  if (itemsError) {
    throw new Error('Error verificando items');
  }

  // Verificar repairs pendientes
  const allRepairs = items?.flatMap((item) => (item as any).work_order_item_repairs || []) || [];
  const pendingRepairs = allRepairs.filter((r: any) => r.status !== 'completed' && r.status !== 'cancelled');

  if (pendingRepairs.length > 0) {
    throw new Error(`Hay ${pendingRepairs.length} trabajo(s) de reparación sin completar`);
  }

  // Si no hay repairs (OT legacy), verificar items
  if (allRepairs.length === 0) {
    const pendingItems = items?.filter((i) => i.status !== 'completed' && i.status !== 'cancelled');
    if (pendingItems && pendingItems.length > 0) {
      throw new Error(`Hay ${pendingItems.length} item(s) sin completar`);
    }
  }

  // Actualizar estado
  const { data, error } = await supabase
    .from('work_orders')
    .update({
      status: 'completed',
      actual_end_date: new Date().toISOString(),
      completed_by: user.id,
      completed_at: new Date().toISOString(),
    })
    .eq('id', workOrderId)
    .select()
    .single();

  if (error) {
    logger.error('Error completando OT', { data: { error } });
    throw new Error(`Error al completar orden: ${error.message}`);
  }

  // Actualizar estado del maintenance_order a 'completed' si todos sus items tienen OT completada
  // TODO: Implementar lógica para actualizar maintenance_order cuando corresponda

  logger.info('Orden de trabajo completada', { data: { workOrderId } });

  return data;
}

/**
 * Cancela una orden de trabajo
 */
export async function cancelWorkOrder(workOrderId: string, reason: string) {
  const supabase = await supabaseServer();

  logger.info('Cancelando orden de trabajo', { data: { workOrderId, reason } });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  if (!reason || reason.trim().length < 5) {
    throw new Error('Debe proporcionar una razón de cancelación (mínimo 5 caracteres)');
  }

  // Actualizar estado de la OT
  const { data: wo, error: woError } = await supabase
    .from('work_orders')
    .update({
      status: 'cancelled',
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason.trim(),
    })
    .eq('id', workOrderId)
    .select()
    .single();

  if (woError) {
    logger.error('Error cancelando OT', { data: { error: woError } });
    throw new Error(`Error al cancelar orden: ${woError.message}`);
  }

  // Cancelar todos los items pendientes
  const { error: itemsError } = await supabase
    .from('work_order_items')
    .update({ status: 'cancelled' })
    .eq('work_order_id', workOrderId)
    .neq('status', 'completed');

  if (itemsError) {
    logger.warn('Error cancelando items de OT', { data: { error: itemsError } });
  }

  // Limpiar referencia en maintenance_order_items para que puedan ser reasignados
  const { error: moiError } = await supabase
    .from('maintenance_order_items')
    .update({ work_order_id: null })
    .eq('work_order_id', workOrderId);

  if (moiError) {
    logger.warn('Error limpiando referencia de OT en items', { data: { error: moiError } });
  }

  logger.info('Orden de trabajo cancelada', { data: { workOrderId } });

  return wo;
}

/**
 * Actualiza las notas generales de la orden de trabajo
 */
export async function updateWorkOrderNotes(workOrderId: string, notes: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('work_orders').update({ notes }).eq('id', workOrderId).select().single();

  if (error) {
    logger.error('Error actualizando notas de OT', { data: { error } });
    throw new Error(`Error al actualizar notas: ${error.message}`);
  }

  return data;
}

/**
 * Pausa una orden de trabajo en progreso (in_progress → paused)
 * Guarda el timestamp de pausa para calcular el tiempo pausado
 */
export async function pauseWorkOrder(workOrderId: string, reason: string) {
  const supabase = await supabaseServer();

  logger.info('Pausando orden de trabajo', { data: { workOrderId, reason } });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // Verificar estado actual
  const { data: wo, error: checkError } = await supabase
    .from('work_orders')
    .select('status')
    .eq('id', workOrderId)
    .single();

  if (checkError || !wo) {
    throw new Error('Orden de trabajo no encontrada');
  }

  if (wo.status !== 'in_progress') {
    throw new Error(
      `No se puede pausar una orden en estado "${wo.status}". Solo se pueden pausar órdenes "En Proceso".`
    );
  }

  // Actualizar estado a pausado
  const { data, error } = await supabase
    .from('work_orders')
    .update({
      status: 'paused',
      paused_at: new Date().toISOString(),
      paused_by: user.id,
      pause_reason: reason.trim() || null,
    })
    .eq('id', workOrderId)
    .select()
    .single();

  if (error) {
    logger.error('Error pausando OT', { data: { error } });
    throw new Error(`Error al pausar orden: ${error.message}`);
  }

  logger.info('Orden de trabajo pausada', { data: { workOrderId } });

  return data;
}

/**
 * Reanuda una orden de trabajo pausada (paused → in_progress)
 * Calcula y acumula el tiempo pausado
 */
export async function resumeWorkOrder(workOrderId: string) {
  const supabase = await supabaseServer();

  logger.info('Reanudando orden de trabajo', { data: { workOrderId } });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // Obtener datos actuales de la OT
  const { data: wo, error: checkError } = await supabase
    .from('work_orders')
    .select('status, paused_at, total_paused_time')
    .eq('id', workOrderId)
    .single();

  if (checkError || !wo) {
    throw new Error('Orden de trabajo no encontrada');
  }

  if (wo.status !== 'paused') {
    throw new Error(
      `No se puede reanudar una orden en estado "${wo.status}". Solo se pueden reanudar órdenes "Pausadas".`
    );
  }

  // Calcular tiempo pausado en esta sesión
  const pausedAt = wo.paused_at ? new Date(wo.paused_at) : new Date();
  const now = new Date();
  const pausedSeconds = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);

  // Actualizar usando SQL para sumar el intervalo
  const { data, error } = await supabase.rpc('resume_work_order', {
    p_work_order_id: workOrderId,
    p_paused_seconds: pausedSeconds,
  });

  if (error) {
    // Si la función RPC no existe, hacer update manual
    logger.warn('RPC resume_work_order no disponible, usando update manual', { data: { error } });

    const { data: manualData, error: manualError } = await supabase
      .from('work_orders')
      .update({
        status: 'in_progress',
        paused_at: null,
        paused_by: null,
        // No podemos sumar el intervalo directamente sin RPC, pero al menos cambiamos el estado
      })
      .eq('id', workOrderId)
      .select()
      .single();

    if (manualError) {
      logger.error('Error reanudando OT', { data: { error: manualError } });
      throw new Error(`Error al reanudar orden: ${manualError.message}`);
    }

    logger.info('Orden de trabajo reanudada (sin acumular tiempo)', { data: { workOrderId } });
    return manualData;
  }

  logger.info('Orden de trabajo reanudada', { data: { workOrderId, pausedSeconds } });

  return data;
}

/**
 * Completa múltiples trabajos de reparación de una vez
 * @param repairIds IDs de los work_order_item_repairs a completar
 */
export async function completeMultipleRepairs(repairIds: string[]) {
  const supabase = await supabaseServer();

  logger.info('Completando múltiples trabajos de reparación', { data: { count: repairIds.length } });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  if (repairIds.length === 0) {
    throw new Error('Debe seleccionar al menos un trabajo para completar');
  }

  const now = new Date().toISOString();

  // Actualizar todos los repairs seleccionados
  const { error } = await supabase
    .from('work_order_item_repairs')
    .update({
      status: 'completed',
      completed_at: now,
      completed_by: user.id,
    })
    .in('id', repairIds)
    .eq('status', 'pending');

  if (error) {
    logger.error('Error completando trabajos', { data: { error } });
    throw new Error(`Error al completar trabajos: ${error.message}`);
  }

  // Obtener los work_order_item_ids afectados
  const { data: repairs } = await supabase
    .from('work_order_item_repairs')
    .select('work_order_item_id')
    .in('id', repairIds);

  const workOrderItemIds = [...new Set(repairs?.map((r) => r.work_order_item_id) || [])];

  // Verificar cada item si todos sus repairs están completados
  for (const itemId of workOrderItemIds) {
    const { data: allRepairs } = await supabase
      .from('work_order_item_repairs')
      .select('status')
      .eq('work_order_item_id', itemId);

    const allCompleted = allRepairs?.every((r) => r.status === 'completed');

    if (allCompleted) {
      await supabase
        .from('work_order_items')
        .update({
          status: 'completed',
          completed_at: now,
          completed_by: user.id,
        })
        .eq('id', itemId);
    }
  }

  logger.info('Múltiples trabajos completados', { data: { count: repairIds.length } });

  return { completed: repairIds.length };
}

/**
 * Completa parcialmente una orden de trabajo (in_progress → completed_partial)
 * Al menos un trabajo debe estar completado, pero quedan pendientes
 */
export async function completeWorkOrderPartial(workOrderId: string, reason?: string) {
  const supabase = await supabaseServer();

  logger.info('Completando parcialmente orden de trabajo', { data: { workOrderId } });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // Obtener items y sus repairs
  const { data: items, error: itemsError } = await supabase
    .from('work_order_items')
    .select('id, status, work_order_item_repairs(id, status)')
    .eq('work_order_id', workOrderId);

  if (itemsError) {
    throw new Error('Error verificando items');
  }

  // Contar repairs completados y pendientes
  const allRepairs = items?.flatMap((item) => (item as any).work_order_item_repairs || []) || [];
  const completedRepairs = allRepairs.filter((r: any) => r.status === 'completed');
  const pendingRepairs = allRepairs.filter((r: any) => r.status !== 'completed' && r.status !== 'cancelled');

  if (completedRepairs.length === 0) {
    throw new Error('Debe completar al menos un trabajo antes de finalizar parcialmente');
  }

  if (pendingRepairs.length === 0) {
    throw new Error('No hay trabajos pendientes. Use "Completar Orden" en su lugar.');
  }

  // Actualizar estado
  const { data, error } = await supabase
    .from('work_orders')
    .update({
      status: 'completed_partial',
      actual_end_date: new Date().toISOString(),
      completed_by: user.id,
      completed_at: new Date().toISOString(),
      notes: reason ? `[Finalizado con pendientes] ${reason}` : '[Finalizado con pendientes]',
    })
    .eq('id', workOrderId)
    .select()
    .single();

  if (error) {
    logger.error('Error completando parcialmente OT', { data: { error } });
    throw new Error(`Error al completar parcialmente: ${error.message}`);
  }

  logger.info('Orden de trabajo completada parcialmente', {
    data: { workOrderId, completedRepairs: completedRepairs.length, pendingRepairs: pendingRepairs.length },
  });

  return data;
}

// =============================================================================
// TIPOS DE RETORNO
// =============================================================================

export type GetWorkOrdersResult = Awaited<ReturnType<typeof getWorkOrders>>;
export type GetWorkOrderDetailResult = Awaited<ReturnType<typeof getWorkOrderDetail>>;
