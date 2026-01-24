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
      )
    `
    )
    .eq('id', workOrderId)
    .single();

  if (woError) {
    logger.error('Error obteniendo detalle de OT', { data: { error: woError } });
    return null;
  }

  // Obtener los items con sus detalles
  const { data: items, error: itemsError } = await supabase
    .from('work_order_items')
    .select(
      `
      *,
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
      description: moi?.description || null,
      driverComment: mri?.driver_comment || deviation?.driver_comment || null,
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
    equipmentId: wo.equipment_id,
    vehicleDomain: (wo.vehicles as any)?.domain || null,
    vehicleSerie: (wo.vehicles as any)?.serie || null,
    vehicleInternNumber: (wo.vehicles as any)?.intern_number || null,
    vehicleType: (wo.vehicles as any)?.types_of_vehicles?.name || null,
    vehicleKilometer: (wo.vehicles as any)?.kilometer || null,
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
    totalItems: workOrderItems.length,
    completedItems: workOrderItems.filter((i) => i.status === 'completed').length,
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
 * Todos los items deben estar completados
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

  // Verificar que todos los items estén completados
  const { data: items, error: itemsError } = await supabase
    .from('work_order_items')
    .select('id, status')
    .eq('work_order_id', workOrderId);

  if (itemsError) {
    throw new Error('Error verificando items');
  }

  const pendingItems = items?.filter((i) => i.status !== 'completed' && i.status !== 'cancelled');
  if (pendingItems && pendingItems.length > 0) {
    throw new Error(`Hay ${pendingItems.length} item(s) sin completar`);
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

// =============================================================================
// TIPOS DE RETORNO
// =============================================================================

export type GetWorkOrdersResult = Awaited<ReturnType<typeof getWorkOrders>>;
export type GetWorkOrderDetailResult = Awaited<ReturnType<typeof getWorkOrderDetail>>;
