'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { DIAGNOSTICO_REPAIR_TYPE_ID } from '../../utils/constants';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const logger = new Logger('OrderManagement/actions');

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Obtiene los pedidos de mantenimiento en taller (in_workshop)
 * para la vista de Gestion de Ordenes del Jefe de Taller.
 * Incluye items con tipos de reparacion y datos del equipo.
 */
export async function getMaintenanceOrdersForManagement() {
  const supabase = await supabaseServer();

  const filterInfo = await getSupervisorFilterInfo();

  let query = supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, condition, kilometer, vehicle_type:type(id, name)),
      maintenance_requests!inner(id, kilometer, created_at, supervisor_id, source),
      maintenance_order_items(
        *,
        rejected_by_profile:rejected_by(id, fullname),
        workshop_chief_comment_profile:workshop_chief_comment_by(id, fullname),
        maintenance_request_items(
          *,
          driver_comment_profile:driver_comment_by(id, fullname),
          validator_comment_profile:validator_comment_by(id, fullname),
          supervisor_comment_profile:supervisor_comment_by(id, fullname),
          checklist_deviations(id, item_code, item_label, section_code, driver_comment)
        ),
        types_of_repairs(id, name, autorizable),
        maintenance_order_item_repair_types(
          repair_type_id,
          types_of_repairs(id, name, autorizable)
        ),
        workshop_sectors(id, name)
      )
    `
    )
    .eq('status', 'in_workshop')
    .order('created_at', { ascending: false });

  if (filterInfo?.shouldFilterBySupervisor) {
    query = query.eq('maintenance_requests.supervisor_id', filterInfo.userId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error al obtener pedidos para gestion', { data: { error } });
    throw error;
  }

  return data || [];
}

export type OrderManagementData = Awaited<ReturnType<typeof getMaintenanceOrdersForManagement>>;
export type OrderManagementItem = OrderManagementData[number];

/**
 * Obtiene un pedido específico con el detalle necesario para la gestión.
 * Usado desde Órdenes de Mantenimiento al hacer click en "Gestionar".
 */
export async function getOrderForManagement(orderId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('maintenance_orders')
    .select(
      `
      *,
      vehicles(id, domain, serie, intern_number, condition, kilometer, vehicle_type:type(id, name)),
      maintenance_requests!inner(id, kilometer, created_at, supervisor_id, source),
      maintenance_order_items(
        *,
        rejected_by_profile:rejected_by(id, fullname),
        workshop_chief_comment_profile:workshop_chief_comment_by(id, fullname),
        maintenance_request_items(
          *,
          driver_comment_profile:driver_comment_by(id, fullname),
          validator_comment_profile:validator_comment_by(id, fullname),
          supervisor_comment_profile:supervisor_comment_by(id, fullname),
          checklist_deviations(id, item_code, item_label, section_code, driver_comment)
        ),
        types_of_repairs(id, name, autorizable),
        maintenance_order_item_repair_types(
          repair_type_id,
          types_of_repairs(id, name, autorizable)
        ),
        workshop_sectors(id, name)
      )
    `
    )
    .eq('id', orderId)
    .single();

  if (error) {
    logger.error('Error al obtener pedido para gestion', { data: { error, orderId } });
    throw error;
  }

  return data;
}

/**
 * Obtiene todos los sectores activos de todos los talleres
 */
export async function getActiveWorkshopSectors() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('workshop_sectors')
    .select('id, name, workshop_id, max_capacity')
    .eq('is_active', true)
    .order('name');

  if (error) {
    logger.error('Error al obtener sectores', { data: { error } });
    throw error;
  }

  return data || [];
}

export type WorkshopSector = Awaited<ReturnType<typeof getActiveWorkshopSectors>>[number];

/**
 * Obtiene talleres externos activos
 */
export async function getActiveExternalWorkshops() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('workshops')
    .select('id, name, provider_name')
    .eq('type', 'externo')
    .eq('is_active', true)
    .order('name');

  if (error) {
    logger.error('Error al obtener talleres externos', { data: { error } });
    throw error;
  }

  return data || [];
}

export type ExternalWorkshop = Awaited<ReturnType<typeof getActiveExternalWorkshops>>[number];

// =============================================================================
// MUTATIONS
// =============================================================================

export interface AssignSectorInput {
  maintenanceOrderItemIds: string[];
  sectorId: string;
  sequenceOrder: number;
}

/**
 * Asigna items a un sector con un orden de secuencia.
 * Ademas, crea automaticamente un item DIAGNOSTICO para cada sector asignado.
 */
export async function assignItemsToSectors(maintenanceOrderId: string, assignments: AssignSectorInput[]) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuario no autenticado');

  logger.info('Asignando items a sectores', {
    data: { maintenanceOrderId, assignmentCount: assignments.length },
  });

  // Procesar cada asignacion de sector
  for (const assignment of assignments) {
    // Actualizar items existentes con sector y secuencia
    const { error: updateError } = await supabase
      .from('maintenance_order_items')
      .update({
        assigned_sector_id: assignment.sectorId,
        sector_sequence_order: assignment.sequenceOrder,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      })
      .in('id', assignment.maintenanceOrderItemIds);

    if (updateError) {
      logger.error('Error asignando sector a items', { data: { error: updateError } });
      throw new Error(`Error al asignar sector: ${updateError.message}`);
    }

    // Verificar si ya existe un item DIAGNOSTICO para este sector + orden
    const { data: existingDiag } = await supabase
      .from('maintenance_order_items')
      .select('id')
      .eq('maintenance_order_id', maintenanceOrderId)
      .eq('assigned_sector_id', assignment.sectorId)
      .eq('is_diagnostico', true)
      .limit(1);

    // Crear item DIAGNOSTICO si no existe
    if (!existingDiag || existingDiag.length === 0) {
      const { error: diagError } = await supabase.from('maintenance_order_items').insert({
        maintenance_order_id: maintenanceOrderId,
        assigned_sector_id: assignment.sectorId,
        sector_sequence_order: assignment.sequenceOrder,
        is_diagnostico: true,
        description: 'DIAGNOSTICO',
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      });

      if (diagError) {
        logger.warn('Error creando item DIAGNOSTICO', { data: { error: diagError } });
      }
    }
  }

  logger.info('Items asignados a sectores exitosamente', {
    data: { maintenanceOrderId },
  });
}

/**
 * Agrega un nuevo item manualmente a un pedido de mantenimiento.
 * Soporta multiples tipos de reparacion via tabla pivot.
 */
export async function addItemToOrder(
  maintenanceOrderId: string,
  data: {
    description: string;
    repairTypeIds?: string[];
  }
) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuario no autenticado');

  const { data: newItem, error } = await supabase
    .from('maintenance_order_items')
    .insert({
      maintenance_order_id: maintenanceOrderId,
      description: data.description,
      repair_type_id: data.repairTypeIds?.[0] || null,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error agregando item', { data: { error } });
    throw new Error(`Error al agregar item: ${error.message}`);
  }

  // Insertar en tabla pivot si hay tipos de reparacion
  if (data.repairTypeIds && data.repairTypeIds.length > 0) {
    const pivotRecords = data.repairTypeIds.map((repairTypeId) => ({
      maintenance_order_item_id: newItem.id,
      repair_type_id: repairTypeId,
    }));

    const { error: pivotError } = await supabase.from('maintenance_order_item_repair_types').insert(pivotRecords);

    if (pivotError) {
      logger.warn('Error guardando tipos de reparacion en pivot', { data: { error: pivotError } });
    }
  }

  logger.info('Item agregado exitosamente', { data: { itemId: newItem.id } });
  return newItem;
}

/**
 * Actualiza los tipos de reparacion asignados a un item.
 * Actualiza tanto el campo legacy como la tabla pivot.
 */
export async function updateItemRepairTypes(maintenanceOrderItemId: string, repairTypeIds: string[]) {
  const supabase = await supabaseServer();

  // Actualizar campo legacy con el primer tipo
  const { error: updateError } = await supabase
    .from('maintenance_order_items')
    .update({ repair_type_id: repairTypeIds[0] || null })
    .eq('id', maintenanceOrderItemId);

  if (updateError) {
    logger.error('Error actualizando repair_type_id', { data: { error: updateError } });
    throw new Error(`Error al actualizar tipo de reparacion: ${updateError.message}`);
  }

  // Eliminar registros anteriores de la tabla pivot
  await supabase
    .from('maintenance_order_item_repair_types')
    .delete()
    .eq('maintenance_order_item_id', maintenanceOrderItemId);

  // Insertar nuevos registros en la tabla pivot
  if (repairTypeIds.length > 0) {
    const pivotRecords = repairTypeIds.map((repairTypeId) => ({
      maintenance_order_item_id: maintenanceOrderItemId,
      repair_type_id: repairTypeId,
    }));

    const { error: pivotError } = await supabase.from('maintenance_order_item_repair_types').insert(pivotRecords);

    if (pivotError) {
      logger.warn('Error guardando tipos de reparacion en pivot', { data: { error: pivotError } });
    }
  }

  logger.info('Tipos de reparacion actualizados', {
    data: { maintenanceOrderItemId, repairTypeCount: repairTypeIds.length },
  });
}

/**
 * Elimina un item que fue agregado manualmente (no tiene maintenance_request_item_id)
 */
export async function removeManualItem(itemId: string) {
  const supabase = await supabaseServer();

  // Verificar que el item no tiene origen de solicitud
  const { data: item, error: fetchError } = await supabase
    .from('maintenance_order_items')
    .select('id, maintenance_request_item_id, is_diagnostico')
    .eq('id', itemId)
    .single();

  if (fetchError || !item) {
    throw new Error('Item no encontrado');
  }

  if (item.maintenance_request_item_id && !item.is_diagnostico) {
    throw new Error('No se puede eliminar un item que proviene de una solicitud');
  }

  const { error } = await supabase.from('maintenance_order_items').delete().eq('id', itemId);

  if (error) {
    logger.error('Error eliminando item', { data: { error } });
    throw new Error(`Error al eliminar item: ${error.message}`);
  }

  logger.info('Item eliminado exitosamente', { data: { itemId } });
}

export type AddItemResult = Awaited<ReturnType<typeof addItemToOrder>>;

// =============================================================================
// ORDER NUMBER GENERATION
// =============================================================================

/**
 * Generates and assigns an order number to a maintenance order.
 * Format: OM-{SEQUENCE} (e.g. OM-000001)
 * Called when the OM enters the workshop (status = 'in_workshop').
 */
export async function generateMaintenanceOrderNumber(orderId: string) {
  const supabase = await supabaseServer();

  // Check if already has a number
  const { data: existing } = await supabase
    .from('maintenance_orders')
    .select('order_number')
    .eq('id', orderId)
    .single();

  if (!existing) throw new Error('Orden no encontrada');
  if (existing.order_number) return existing.order_number;

  // Get next sequence number (global)
  const { count } = await supabase
    .from('maintenance_orders')
    .select('id', { count: 'exact', head: true })
    .not('order_number', 'is', null);

  const nextSeq = (count || 0) + 1;
  const paddedSeq = String(nextSeq).padStart(6, '0');
  const orderNumber = `OM-${paddedSeq}`;

  // Update the order
  const { error } = await supabase.from('maintenance_orders').update({ order_number: orderNumber }).eq('id', orderId);

  if (error) {
    logger.error('Error generando numero de orden', { data: { error } });
    throw error;
  }

  logger.info('Numero de orden generado', { data: { orderId, orderNumber } });
  return orderNumber;
}

// =============================================================================
// BATCH SAVE
// =============================================================================

export interface OrderChangeSet {
  /** Items to delete (only manual items, not from request) */
  deletes: string[];
  /** Items to add */
  adds: Array<{ description: string; repairTypeIds: string[] }>;
  /** Sector assignments (item -> sector + sequence) */
  sectorAssignments: Array<{
    itemIds: string[];
    sectorId: string;
    sequenceOrder: number;
  }>;
  /** Repair type updates per item */
  repairTypeUpdates: Array<{
    itemId: string;
    repairTypeIds: string[];
  }>;
  /** Sequence order updates for already-assigned items */
  sequenceUpdates: Array<{
    itemId: string;
    sequenceOrder: number;
  }>;
  /** Description updates per item */
  descriptionUpdates: Array<{
    itemId: string;
    description: string;
  }>;
  /** Workshop chief comment updates per item */
  chiefCommentUpdates: Array<{
    itemId: string;
    comment: string;
  }>;
  /** External workshop assignments (no sector) */
  workshopAssignments: Array<{
    itemIds: string[];
    workshopId: string;
  }>;
  /** Items rejected by workshop chief (won't travel to WO) */
  rejections?: Array<{
    itemId: string;
    reason: string;
  }>;
  /** Items restored from rejected state */
  restorations?: string[];
}

/**
 * Batch save: procesa todos los cambios pendientes en una sola accion.
 * Procesa en orden: deletes -> adds -> sector assignments -> repair type updates -> sequence updates.
 */
export async function saveOrderChanges(orderId: string, changes: OrderChangeSet) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuario no autenticado');

  logger.info('Guardando cambios batch en orden', {
    data: {
      orderId,
      deletes: changes.deletes.length,
      adds: changes.adds.length,
      sectorAssignments: changes.sectorAssignments.length,
      repairTypeUpdates: changes.repairTypeUpdates.length,
      sequenceUpdates: changes.sequenceUpdates.length,
      descriptionUpdates: changes.descriptionUpdates.length,
      chiefCommentUpdates: changes.chiefCommentUpdates.length,
      workshopAssignments: changes.workshopAssignments.length,
    },
  });

  // 1. DELETES - Eliminar items manuales
  for (const itemId of changes.deletes) {
    // Verificar que es un item manual
    const { data: item } = await supabase
      .from('maintenance_order_items')
      .select('id, maintenance_request_item_id, is_diagnostico')
      .eq('id', itemId)
      .single();

    if (item && (!item.maintenance_request_item_id || item.is_diagnostico)) {
      // Eliminar pivot records primero
      await supabase.from('maintenance_order_item_repair_types').delete().eq('maintenance_order_item_id', itemId);

      await supabase.from('maintenance_order_items').delete().eq('id', itemId);
    }
  }

  // 2. ADDS - Agregar nuevos items
  for (const add of changes.adds) {
    const { data: newItem, error: addError } = await supabase
      .from('maintenance_order_items')
      .insert({
        maintenance_order_id: orderId,
        description: add.description,
        repair_type_id: add.repairTypeIds[0] || null,
      })
      .select()
      .single();

    if (addError) {
      logger.error('Error agregando item en batch', { data: { error: addError } });
      continue;
    }

    if (newItem && add.repairTypeIds.length > 0) {
      const pivotRecords = add.repairTypeIds.map((repairTypeId) => ({
        maintenance_order_item_id: newItem.id,
        repair_type_id: repairTypeId,
      }));

      await supabase.from('maintenance_order_item_repair_types').insert(pivotRecords);
    }
  }

  // 3. SECTOR ASSIGNMENTS
  // Backend safeguard: normalize sequence orders to avoid duplicates
  const { data: existingSeqData } = await supabase
    .from('maintenance_order_items')
    .select('assigned_sector_id, sector_sequence_order')
    .eq('maintenance_order_id', orderId)
    .not('work_order_id', 'is', null)
    .not('assigned_sector_id', 'is', null)
    .not('sector_sequence_order', 'is', null);

  const maxExistingSeqBatch = (existingSeqData || []).reduce(
    (max, item) => Math.max(max, item.sector_sequence_order ?? 0),
    0
  );

  // Normalize assignments: sort by their sequence order and re-assign sequential values
  const sortedAssignments = [...changes.sectorAssignments].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const normalizedAssignments = sortedAssignments.map((assignment, idx) => ({
    ...assignment,
    sequenceOrder: maxExistingSeqBatch + idx + 1,
  }));

  for (const assignment of normalizedAssignments) {
    const { error: updateError } = await supabase
      .from('maintenance_order_items')
      .update({
        assigned_sector_id: assignment.sectorId,
        sector_sequence_order: assignment.sequenceOrder,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      })
      .in('id', assignment.itemIds);

    if (updateError) {
      logger.error('Error asignando sector en batch', { data: { error: updateError } });
    }

    // Crear item DIAGNOSTICO si no existe para este sector
    const { data: existingDiag } = await supabase
      .from('maintenance_order_items')
      .select('id')
      .eq('maintenance_order_id', orderId)
      .eq('assigned_sector_id', assignment.sectorId)
      .eq('is_diagnostico', true)
      .limit(1);

    if (!existingDiag || existingDiag.length === 0) {
      await supabase.from('maintenance_order_items').insert({
        maintenance_order_id: orderId,
        assigned_sector_id: assignment.sectorId,
        sector_sequence_order: assignment.sequenceOrder,
        is_diagnostico: true,
        description: 'DIAGNOSTICO',
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      });
    }
  }

  // 4. REPAIR TYPE UPDATES
  for (const update of changes.repairTypeUpdates) {
    // Actualizar campo legacy
    await supabase
      .from('maintenance_order_items')
      .update({ repair_type_id: update.repairTypeIds[0] || null })
      .eq('id', update.itemId);

    // Reemplazar pivot records
    await supabase.from('maintenance_order_item_repair_types').delete().eq('maintenance_order_item_id', update.itemId);

    if (update.repairTypeIds.length > 0) {
      const pivotRecords = update.repairTypeIds.map((repairTypeId) => ({
        maintenance_order_item_id: update.itemId,
        repair_type_id: repairTypeId,
      }));
      await supabase.from('maintenance_order_item_repair_types').insert(pivotRecords);
    }
  }

  // 5. SEQUENCE ORDER UPDATES
  for (const seqUpdate of changes.sequenceUpdates) {
    await supabase
      .from('maintenance_order_items')
      .update({ sector_sequence_order: seqUpdate.sequenceOrder })
      .eq('id', seqUpdate.itemId);
  }

  // 6. DESCRIPTION UPDATES
  for (const descUpdate of changes.descriptionUpdates) {
    await supabase
      .from('maintenance_order_items')
      .update({ description: descUpdate.description })
      .eq('id', descUpdate.itemId);
  }

  // 7. CHIEF COMMENT UPDATES
  for (const commentUpdate of changes.chiefCommentUpdates) {
    await supabase
      .from('maintenance_order_items')
      .update({ workshop_chief_comment: commentUpdate.comment, workshop_chief_comment_by: user.id })
      .eq('id', commentUpdate.itemId);
  }

  // 8. EXTERNAL WORKSHOP ASSIGNMENTS (no sector, no diagnostico)
  for (const wsAssignment of changes.workshopAssignments) {
    const { error: wsError } = await supabase
      .from('maintenance_order_items')
      .update({
        assigned_workshop_id: wsAssignment.workshopId,
        assigned_sector_id: null,
        sector_sequence_order: null,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      })
      .in('id', wsAssignment.itemIds);

    if (wsError) {
      logger.error('Error asignando taller externo en batch', { data: { error: wsError } });
    }
  }

  // 9. REJECTIONS - Marcar items como rechazados
  if (changes.rejections && changes.rejections.length > 0) {
    for (const rejection of changes.rejections) {
      const { error: rejectError } = await supabase
        .from('maintenance_order_items')
        .update({
          is_rejected: true,
          rejection_reason: rejection.reason,
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
        })
        .eq('id', rejection.itemId);

      if (rejectError) {
        logger.error('Error rechazando item en batch', { data: { error: rejectError } });
      }
    }
  }

  // 10. RESTORATIONS - Restaurar items rechazados
  if (changes.restorations && changes.restorations.length > 0) {
    for (const itemId of changes.restorations) {
      const { error: restoreError } = await supabase
        .from('maintenance_order_items')
        .update({
          is_rejected: false,
          rejection_reason: null,
          rejected_by: null,
          rejected_at: null,
        })
        .eq('id', itemId);

      if (restoreError) {
        logger.error('Error restaurando item rechazado', { data: { error: restoreError } });
      }
    }
  }

  // After rejections/restorations, check if order needs status transition
  if (
    (changes.rejections && changes.rejections.length > 0) ||
    (changes.restorations && changes.restorations.length > 0) ||
    changes.adds.length > 0
  ) {
    const { data: currentOrder } = await supabase
      .from('maintenance_orders')
      .select('status')
      .eq('id', orderId)
      .single();

    const { data: allItems } = await supabase
      .from('maintenance_order_items')
      .select('id, is_rejected, is_diagnostico')
      .eq('maintenance_order_id', orderId);

    const regularItems = (allItems || []).filter((item) => !item.is_diagnostico);
    const allRejected = regularItems.length > 0 && regularItems.every((item) => item.is_rejected);
    const hasNonRejected = regularItems.some((item) => !item.is_rejected);

    if (allRejected && currentOrder?.status !== 'workshop_rejected') {
      // All items rejected → mark as workshop_rejected
      await supabase
        .from('maintenance_orders')
        .update({ status: 'workshop_rejected', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      await supabase.from('maintenance_activity_log').insert({
        maintenance_order_id: orderId,
        action_type: 'workshop_rejected_all_items',
        performed_by: user.id,
        previous_status: currentOrder?.status || 'in_workshop',
        new_status: 'workshop_rejected',
        notes: `Todos los items rechazados por taller (${regularItems.length} item(s))`,
      });
    } else if (hasNonRejected && currentOrder?.status === 'workshop_rejected') {
      // Some items restored or new items added → back to in_workshop
      await supabase
        .from('maintenance_orders')
        .update({ status: 'in_workshop', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      await supabase.from('maintenance_activity_log').insert({
        maintenance_order_id: orderId,
        action_type: 'workshop_restored_from_rejected',
        performed_by: user.id,
        previous_status: 'workshop_rejected',
        new_status: 'in_workshop',
        notes: 'Orden restaurada - items disponibles para gestionar',
      });
    }
  }

  logger.info('Cambios batch guardados exitosamente', { data: { orderId } });
}

// =============================================================================
// GENERAR ORDENES DE TRABAJO
// =============================================================================

/**
 * Retorna un resumen agrupado por sector de los items listos para generar OT.
 * Solo incluye items regulares (no diagnostico) que tienen sector asignado.
 */
export async function getOrderGenerationPreview(orderId: string) {
  const supabase = await supabaseServer();

  const { data: order, error } = await supabase
    .from('maintenance_orders')
    .select(
      `
      id, equipment_id,
      vehicles(id, domain, serie, company_id),
      maintenance_order_items(
        id, description, assigned_sector_id, assigned_workshop_id, sector_sequence_order,
        is_diagnostico, is_rejected, work_order_id,
        workshop_sectors(id, name),
        workshops:assigned_workshop_id(id, name, type),
        maintenance_order_item_repair_types(
          repair_type_id,
          types_of_repairs(id, name, autorizable)
        ),
        types_of_repairs(id, name, autorizable)
      )
    `
    )
    .eq('id', orderId)
    .single();

  if (error || !order) {
    logger.error('Error obteniendo preview de generacion', { data: { error } });
    throw new Error('Error al obtener datos de la orden');
  }

  // Filtrar items regulares sin OT generada, no rechazados, con sector o taller externo asignado
  const eligibleItems = (order.maintenance_order_items || []).filter(
    (item) =>
      !item.is_diagnostico &&
      !item.is_rejected &&
      (item.assigned_sector_id || item.assigned_workshop_id) &&
      !item.work_order_id
  );

  // Agrupar por sector (internos) o por workshop (externos)
  const sectorMap = new Map<
    string,
    {
      sectorId: string;
      sectorName: string;
      isExternal: boolean;
      workshopId: string | null;
      workshopName: string | null;
      items: typeof eligibleItems;
      totalRepairs: number;
    }
  >();

  for (const item of eligibleItems) {
    const isExternal = !item.assigned_sector_id && !!item.assigned_workshop_id;
    const groupKey = isExternal ? `ext-${item.assigned_workshop_id}` : item.assigned_sector_id!;

    let groupName: string;
    let workshopId: string | null = null;
    let workshopName: string | null = null;

    if (isExternal) {
      workshopId = item.assigned_workshop_id;
      const ws = item.workshops;
      workshopName = ws && typeof ws === 'object' && 'name' in ws ? String(ws.name) : 'Taller Externo';
      groupName = workshopName;
    } else {
      groupName =
        item.workshop_sectors && typeof item.workshop_sectors === 'object' && 'name' in item.workshop_sectors
          ? String(item.workshop_sectors.name)
          : 'Sin nombre';
    }

    if (!sectorMap.has(groupKey)) {
      sectorMap.set(groupKey, {
        sectorId: isExternal ? '' : item.assigned_sector_id!,
        sectorName: groupName,
        isExternal,
        workshopId,
        workshopName,
        items: [],
        totalRepairs: 0,
      });
    }

    const sector = sectorMap.get(groupKey)!;
    sector.items.push(item);

    // Contar repair types del item
    const pivotTypes = item.maintenance_order_item_repair_types || [];
    sector.totalRepairs += pivotTypes.length > 0 ? pivotTypes.length : item.types_of_repairs ? 1 : 0;
  }

  return {
    orderId: order.id,
    equipmentId: order.equipment_id,
    vehicle: order.vehicles,
    sectors: Array.from(sectorMap.values()),
  };
}

export type OrderGenerationPreview = Awaited<ReturnType<typeof getOrderGenerationPreview>>;

/**
 * Genera ordenes de trabajo agrupando items por sector.
 * Crea una OT por sector, con sus work_order_items y work_order_item_repairs.
 */
export async function generateWorkOrdersForOrder(
  orderId: string,
  dates: { plannedStartDate: string; plannedEndDate: string }
) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuario no autenticado');

  logger.info('Generando ordenes de trabajo para orden', { data: { orderId } });

  // 1. Obtener preview para saber que generar
  const preview = await getOrderGenerationPreview(orderId);

  if (preview.sectors.length === 0) {
    throw new Error('No hay items elegibles para generar ordenes de trabajo');
  }

  const vehicle = preview.vehicle;
  if (!vehicle || typeof vehicle !== 'object') {
    throw new Error('No se pudo obtener informacion del vehiculo');
  }

  const companyId = 'company_id' in vehicle ? String(vehicle.company_id) : null;
  const domain = 'domain' in vehicle ? (vehicle.domain as string | null) : null;
  const serie = 'serie' in vehicle ? (vehicle.serie as string | null) : null;

  if (!companyId) throw new Error('No se pudo determinar la empresa');

  // 2. Obtener el workshop_id de la primera asignacion que tenga workshop
  const { data: workshopItem } = await supabase
    .from('maintenance_order_items')
    .select('assigned_workshop_id, assigned_sector_id')
    .eq('maintenance_order_id', orderId)
    .not('assigned_sector_id', 'is', null)
    .limit(1)
    .single();

  // Si no hay workshop asignado, obtenerlo del sector
  let workshopId: string | null = workshopItem?.assigned_workshop_id || null;
  if (!workshopId && preview.sectors.length > 0) {
    const { data: sectorData } = await supabase
      .from('workshop_sectors')
      .select('workshop_id')
      .eq('id', preview.sectors[0].sectorId)
      .single();
    workshopId = sectorData?.workshop_id || null;
  }

  if (!workshopId) throw new Error('No se pudo determinar el taller');

  const createdOrders: Array<{ orderNumber: string; sectorName: string; itemCount: number }> = [];

  // 3. Por cada sector/taller externo, crear una OT
  for (const sector of preview.sectors) {
    // Obtener siguiente numero de secuencia
    const { data: seqData, error: seqError } = await supabase
      .from('work_orders')
      .select('sequence_number')
      .order('sequence_number', { ascending: false })
      .limit(1)
      .single();

    if (seqError && seqError.code !== 'PGRST116') {
      throw new Error('Error al obtener numero de secuencia');
    }

    const sequenceNumber = (seqData?.sequence_number || 0) + 1;

    // Formatear numero de OT: OT-{EQUIPO}-{SECTOR/TALLER}-{SECUENCIA}
    const identifier = domain || serie || 'EQUIPO';
    const cleanIdentifier = identifier.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const cleanSector = sector.sectorName
      .replace(/[^A-Z]/gi, '')
      .toUpperCase()
      .slice(0, 12);
    const paddedNumber = String(sequenceNumber).padStart(6, '0');
    const orderNumber = `OT-${cleanIdentifier}-${cleanSector}-${paddedNumber}`;

    // Determinar workshop_id y sector_id para la OT
    const woWorkshopId = sector.isExternal && sector.workshopId ? sector.workshopId : workshopId;
    const woSectorId = sector.isExternal ? null : sector.sectorId;

    // Crear la OT
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .insert({
        order_number: orderNumber,
        sequence_number: sequenceNumber,
        company_id: companyId,
        equipment_id: preview.equipmentId,
        workshop_id: woWorkshopId,
        sector_id: woSectorId,
        status: 'pending',
        priority: 'medium',
        planned_start_date: dates.plannedStartDate,
        planned_end_date: dates.plannedEndDate,
        created_by: user.id,
      })
      .select()
      .single();

    if (woError || !workOrder) {
      logger.error('Error creando OT para sector', { data: { error: woError, sector: sector.sectorName } });
      throw new Error(`Error al crear OT para sector ${sector.sectorName}: ${woError?.message}`);
    }

    // Crear work_order_items
    const itemIds = sector.items.map((i) => i.id);
    const woItems = itemIds.map((itemId) => ({
      work_order_id: workOrder.id,
      maintenance_order_item_id: itemId,
      status: 'pending' as const,
    }));

    const { data: createdWoItems, error: woItemsError } = await supabase
      .from('work_order_items')
      .insert(woItems)
      .select('id, maintenance_order_item_id');

    if (woItemsError || !createdWoItems) {
      logger.error('Error creando work_order_items', { data: { error: woItemsError } });
      await supabase.from('work_orders').delete().eq('id', workOrder.id);
      throw new Error(`Error al crear items de OT: ${woItemsError?.message}`);
    }

    // Crear work_order_item_repairs (uno por repair type del item)
    const repairRecords: Array<{
      work_order_item_id: string;
      repair_type_id: string;
      status: 'pending';
    }> = [];

    for (const woItem of createdWoItems) {
      const originalItem = sector.items.find((i) => i.id === woItem.maintenance_order_item_id);
      if (!originalItem) continue;

      const pivotTypes = originalItem.maintenance_order_item_repair_types || [];
      if (pivotTypes.length > 0) {
        for (const pt of pivotTypes) {
          repairRecords.push({
            work_order_item_id: woItem.id,
            repair_type_id: pt.repair_type_id,
            status: 'pending',
          });
        }
      } else if (originalItem.types_of_repairs) {
        // Fallback al legacy repair type
        const legacyId =
          typeof originalItem.types_of_repairs === 'object' && 'id' in originalItem.types_of_repairs
            ? String(originalItem.types_of_repairs.id)
            : null;
        if (legacyId) {
          repairRecords.push({
            work_order_item_id: woItem.id,
            repair_type_id: legacyId,
            status: 'pending',
          });
        }
      }
    }

    if (repairRecords.length > 0) {
      const { error: repairsError } = await supabase.from('work_order_item_repairs').insert(repairRecords);

      if (repairsError) {
        logger.error('Error creando work_order_item_repairs', { data: { error: repairsError } });
      }
    }

    // Actualizar maintenance_order_items con work_order_id
    await supabase.from('maintenance_order_items').update({ work_order_id: workOrder.id }).in('id', itemIds);

    // Incluir item DIAGNÓSTICO del sector (si existe)
    if (sector.sectorId) {
      const { data: diagItem } = await supabase
        .from('maintenance_order_items')
        .select('id')
        .eq('maintenance_order_id', orderId)
        .eq('assigned_sector_id', sector.sectorId)
        .eq('is_diagnostico', true)
        .is('work_order_id', null)
        .limit(1)
        .single();

      if (diagItem) {
        const { data: diagWoItem } = await supabase
          .from('work_order_items')
          .insert({
            work_order_id: workOrder.id,
            maintenance_order_item_id: diagItem.id,
            status: 'pending' as const,
          })
          .select('id')
          .single();

        if (diagWoItem) {
          await supabase.from('work_order_item_repairs').insert({
            work_order_item_id: diagWoItem.id,
            repair_type_id: DIAGNOSTICO_REPAIR_TYPE_ID,
            status: 'pending' as const,
            is_diagnostico: true,
          });
        }

        // Vincular maintenance_order_item DIAGNÓSTICO con la OT
        await supabase.from('maintenance_order_items').update({ work_order_id: workOrder.id }).eq('id', diagItem.id);

        logger.info('Item DIAGNÓSTICO incluido en OT', {
          data: { workOrderId: workOrder.id, diagItemId: diagItem.id },
        });
      }
    }

    createdOrders.push({
      orderNumber,
      sectorName: sector.sectorName,
      itemCount: sector.items.length,
    });

    logger.info('OT creada para sector', {
      data: { orderNumber, sector: sector.sectorName, items: sector.items.length, repairs: repairRecords.length },
    });
  }

  logger.info('Ordenes de trabajo generadas exitosamente', {
    data: { orderId, count: createdOrders.length },
  });

  return createdOrders;
}

// =============================================================================
// WIZARD: SECTOR CANDIDATES
// =============================================================================

/**
 * Obtiene los sectores candidatos para cada repair type usando la tabla sector_repair_types.
 * Retorna un map de repairTypeId → sectorIds[]
 */
export async function getSectorCandidatesForRepairTypes(repairTypeIds: string[]) {
  const supabase = await supabaseServer();

  if (repairTypeIds.length === 0) return [];

  const { data, error } = await supabase
    .from('sector_repair_types')
    .select('workshop_sector_id, repair_type_id, workshop_sectors(id, name)')
    .in('repair_type_id', repairTypeIds);

  if (error) {
    logger.error('Error obteniendo candidatos de sector', { data: { error } });
    throw error;
  }

  return data || [];
}

export type SectorCandidateData = Awaited<ReturnType<typeof getSectorCandidatesForRepairTypes>>;

// =============================================================================
// WIZARD: BATCH SETUP + GENERATE WORK ORDERS
// =============================================================================

/**
 * Ejecuta todo el flujo del wizard en una sola acción:
 * 1. Aplica cambios de items (adds, deletes, repair type updates, description updates)
 * 2. Asigna items a sectores + crea DIAGNOSTICO por sector
 * 3. Actualiza el sector_sequence_order de todos los items
 * 4. Genera las OTs agrupadas por sector
 */
export async function setupAndGenerateWorkOrders(
  orderId: string,
  itemChanges: OrderChangeSet,
  sectorAssignments: Array<{ itemIds: string[]; sectorId: string }>,
  sectorOrder: Array<{ sectorId: string; sequenceOrder: number }>,
  dates: { plannedStartDate: string; plannedEndDate: string }
) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuario no autenticado');

  logger.info('Wizard: iniciando setup y generacion de OTs', {
    data: {
      orderId,
      itemChanges: {
        adds: itemChanges.adds.length,
        deletes: itemChanges.deletes.length,
        repairTypeUpdates: itemChanges.repairTypeUpdates.length,
        descriptionUpdates: itemChanges.descriptionUpdates.length,
      },
      sectorAssignments: sectorAssignments.length,
      sectorOrder: sectorOrder.length,
    },
  });

  // ──────────────────────────────────────────────
  // 1. APLICAR CAMBIOS DE ITEMS (reusar lógica de saveOrderChanges)
  // ──────────────────────────────────────────────

  // 1a. DELETES
  for (const itemId of itemChanges.deletes) {
    const { data: item } = await supabase
      .from('maintenance_order_items')
      .select('id, maintenance_request_item_id, is_diagnostico')
      .eq('id', itemId)
      .single();

    if (item && (!item.maintenance_request_item_id || item.is_diagnostico)) {
      await supabase.from('maintenance_order_item_repair_types').delete().eq('maintenance_order_item_id', itemId);
      await supabase.from('maintenance_order_items').delete().eq('id', itemId);
    }
  }

  // 1b. ADDS - Guardar nuevos items y retornar IDs reales
  const tempToRealIdMap = new Map<number, string>(); // index → real id
  for (let i = 0; i < itemChanges.adds.length; i++) {
    const add = itemChanges.adds[i];
    const { data: newItem, error: addError } = await supabase
      .from('maintenance_order_items')
      .insert({
        maintenance_order_id: orderId,
        description: add.description,
        repair_type_id: add.repairTypeIds[0] || null,
      })
      .select()
      .single();

    if (addError || !newItem) {
      logger.error('Error agregando item en wizard', { data: { error: addError } });
      continue;
    }

    tempToRealIdMap.set(i, newItem.id);

    if (add.repairTypeIds.length > 0) {
      const pivotRecords = add.repairTypeIds.map((repairTypeId) => ({
        maintenance_order_item_id: newItem.id,
        repair_type_id: repairTypeId,
      }));
      await supabase.from('maintenance_order_item_repair_types').insert(pivotRecords);
    }
  }

  // 1c. REPAIR TYPE UPDATES
  for (const update of itemChanges.repairTypeUpdates) {
    await supabase
      .from('maintenance_order_items')
      .update({ repair_type_id: update.repairTypeIds[0] || null })
      .eq('id', update.itemId);

    await supabase.from('maintenance_order_item_repair_types').delete().eq('maintenance_order_item_id', update.itemId);

    if (update.repairTypeIds.length > 0) {
      const pivotRecords = update.repairTypeIds.map((repairTypeId) => ({
        maintenance_order_item_id: update.itemId,
        repair_type_id: repairTypeId,
      }));
      await supabase.from('maintenance_order_item_repair_types').insert(pivotRecords);
    }
  }

  // 1d. DESCRIPTION UPDATES
  for (const descUpdate of itemChanges.descriptionUpdates) {
    await supabase
      .from('maintenance_order_items')
      .update({ description: descUpdate.description })
      .eq('id', descUpdate.itemId);
  }

  // 1e. CHIEF COMMENT UPDATES
  for (const commentUpdate of itemChanges.chiefCommentUpdates) {
    await supabase
      .from('maintenance_order_items')
      .update({ workshop_chief_comment: commentUpdate.comment, workshop_chief_comment_by: user.id })
      .eq('id', commentUpdate.itemId);
  }

  // ──────────────────────────────────────────────
  // 2. ASIGNAR ITEMS A SECTORES + CREAR DIAGNOSTICO
  // ──────────────────────────────────────────────

  // Backend safeguard: normalize sector order to guarantee unique sequential values
  // considering sectors that already have work orders
  const { data: existingSequences } = await supabase
    .from('maintenance_order_items')
    .select('assigned_sector_id, sector_sequence_order')
    .eq('maintenance_order_id', orderId)
    .not('work_order_id', 'is', null)
    .not('assigned_sector_id', 'is', null)
    .not('sector_sequence_order', 'is', null);

  const maxExistingSeq = (existingSequences || []).reduce(
    (max, item) => Math.max(max, item.sector_sequence_order ?? 0),
    0
  );

  // Sort incoming sector order and re-normalize starting from maxExistingSeq + 1
  const sortedSectorOrder = [...sectorOrder].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const normalizedSectorOrder = sortedSectorOrder.map((so, idx) => ({
    ...so,
    sequenceOrder: maxExistingSeq + idx + 1,
  }));

  // Construir mapa de sectorId → sequenceOrder (normalized)
  const sectorSequenceMap = new Map<string, number>();
  for (const so of normalizedSectorOrder) {
    sectorSequenceMap.set(so.sectorId, so.sequenceOrder);
  }

  for (const assignment of sectorAssignments) {
    const seqOrder = sectorSequenceMap.get(assignment.sectorId) ?? 1;

    // Resolver IDs reales (los temp items tienen IDs temp-xxx)
    const resolvedItemIds = assignment.itemIds.map((id) => {
      if (id.startsWith('temp-')) {
        // Buscar en el mapa de temp → real usando el índice del add
        // Los temp IDs incluyen un índice implícito basado en el orden de adds
        // Necesitamos matchear por descripción en los adds
        return id; // Se resolverá abajo
      }
      return id;
    });

    // Actualizar items con sector y secuencia
    const realIds = resolvedItemIds.filter((id) => !id.startsWith('temp-'));
    if (realIds.length > 0) {
      const { error: updateError } = await supabase
        .from('maintenance_order_items')
        .update({
          assigned_sector_id: assignment.sectorId,
          sector_sequence_order: seqOrder,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
        })
        .in('id', realIds);

      if (updateError) {
        logger.error('Error asignando sector en wizard', { data: { error: updateError } });
      }
    }

    // Crear item DIAGNOSTICO si no existe para este sector
    const { data: existingDiag } = await supabase
      .from('maintenance_order_items')
      .select('id')
      .eq('maintenance_order_id', orderId)
      .eq('assigned_sector_id', assignment.sectorId)
      .eq('is_diagnostico', true)
      .limit(1);

    if (!existingDiag || existingDiag.length === 0) {
      await supabase.from('maintenance_order_items').insert({
        maintenance_order_id: orderId,
        assigned_sector_id: assignment.sectorId,
        sector_sequence_order: seqOrder,
        is_diagnostico: true,
        description: 'DIAGNOSTICO',
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      });
    }
  }

  // ──────────────────────────────────────────────
  // 3. GENERAR OTs (reusar generateWorkOrdersForOrder)
  // ──────────────────────────────────────────────

  const result = await generateWorkOrdersForOrder(orderId, dates);

  logger.info('Wizard: setup y generacion completados', {
    data: { orderId, workOrdersCreated: result.length },
  });

  return result;
}
