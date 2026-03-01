'use server';

import type { WorkOrderPriority } from '@/features/Mantenimiento/OrdenesTrabajo/types';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';

const logger = new Logger('Planificacion/actions');

// =============================================================================
// TIPOS
// =============================================================================

export interface AssignWorkshopInput {
  maintenanceOrderItemId: string;
  workshopId: string;
  sectorId?: string | null;
  plannedStartDate: string; // ISO date string
  plannedEndDate: string; // ISO date string
  repairTypeIds: string[]; // Tipos de reparación seleccionados
}

export interface AssignWorkshopBulkInput {
  itemIds: string[];
  workshopId: string;
  sectorId?: string | null;
  plannedStartDate: string;
  plannedEndDate: string;
  repairTypeIds: string[]; // Tipos de reparación seleccionados
}

export interface CreateWorkOrderInput {
  itemIds: string[];
  workshopId: string;
  sectorId?: string | null;
  plannedStartDate: string;
  plannedEndDate: string;
  notes?: string;
  repairTypeIds?: string[]; // Tipos de reparación (opcional si ya están asignados)
  priority?: WorkOrderPriority; // Prioridad de la orden de trabajo
}

// =============================================================================
// UTILIDADES PARA NOMENCLATURA DE OT
// =============================================================================

/**
 * Formatea el número de orden de trabajo
 * Formato: OT-{NUMERO} (e.g. OT-000001)
 *
 * NOTA: Función interna, no exportada porque 'use server' requiere async
 */
function formatWorkOrderNumber(
  _domain: string | null,
  _serie: string | null,
  _sectorName: string | null,
  sequenceNumber: number
): string {
  const paddedNumber = String(sequenceNumber).padStart(6, '0');
  return `OT-${paddedNumber}`;
}

/**
 * Obtiene el siguiente número de secuencia global para OT
 */
async function getNextSequenceNumber(): Promise<number> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('work_orders')
    .select('sequence_number')
    .order('sequence_number', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    logger.error('Error obteniendo secuencia', { data: { error } });
    throw new Error('Error al obtener número de secuencia');
  }

  return (data?.sequence_number || 0) + 1;
}

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Asigna taller, sector, período y tipos de reparación a un item de maintenance_order
 * NO crea la orden de trabajo, solo guarda la asignación
 */
export async function assignWorkshopToItem(input: AssignWorkshopInput) {
  const supabase = await supabaseServer();

  logger.info('Asignando taller a item', { data: { ...input } });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // Actualizar el item con el taller, sector y primer tipo de reparación (legacy)
  const { data, error } = await supabase
    .from('maintenance_order_items')
    .update({
      assigned_workshop_id: input.workshopId,
      assigned_sector_id: input.sectorId || null,
      planned_start_date: input.plannedStartDate,
      planned_end_date: input.plannedEndDate,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
      repair_type_id: input.repairTypeIds[0] || null, // Campo legacy: primer tipo
    })
    .eq('id', input.maintenanceOrderItemId)
    .select()
    .single();

  if (error) {
    logger.error('Error asignando taller', { data: { error } });
    throw new Error(`Error al asignar taller: ${error.message}`);
  }

  // Guardar tipos de reparación en tabla pivot
  if (input.repairTypeIds.length > 0) {
    // Eliminar registros anteriores
    await supabase
      .from('maintenance_order_item_repair_types')
      .delete()
      .eq('maintenance_order_item_id', input.maintenanceOrderItemId);

    // Insertar nuevos registros
    const pivotRecords = input.repairTypeIds.map((repairTypeId) => ({
      maintenance_order_item_id: input.maintenanceOrderItemId,
      repair_type_id: repairTypeId,
    }));

    const { error: pivotError } = await supabase.from('maintenance_order_item_repair_types').insert(pivotRecords);

    if (pivotError) {
      logger.warn('Error guardando tipos de reparación en pivot', { data: { error: pivotError } });
    }
  }

  logger.info('Taller y tipos de reparación asignados exitosamente', {
    data: { itemId: input.maintenanceOrderItemId, repairTypeCount: input.repairTypeIds.length },
  });

  return data;
}

/**
 * Asigna taller, sector, período y tipos de reparación a múltiples items
 */
export async function assignWorkshopToItemsBulk(input: AssignWorkshopBulkInput) {
  const supabase = await supabaseServer();

  logger.info('Asignando taller a múltiples items', {
    data: {
      itemCount: input.itemIds.length,
      workshopId: input.workshopId,
      repairTypeCount: input.repairTypeIds.length,
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  const { data, error } = await supabase
    .from('maintenance_order_items')
    .update({
      assigned_workshop_id: input.workshopId,
      assigned_sector_id: input.sectorId || null,
      planned_start_date: input.plannedStartDate,
      planned_end_date: input.plannedEndDate,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
      repair_type_id: input.repairTypeIds[0] || null, // Campo legacy: primer tipo
    })
    .in('id', input.itemIds)
    .select();

  if (error) {
    logger.error('Error asignando taller en bulk', { data: { error } });
    throw new Error(`Error al asignar taller: ${error.message}`);
  }

  // Guardar tipos de reparación en tabla pivot para cada item
  if (input.repairTypeIds.length > 0) {
    // Eliminar registros anteriores de todos los items
    await supabase.from('maintenance_order_item_repair_types').delete().in('maintenance_order_item_id', input.itemIds);

    // Insertar nuevos registros para todos los items
    const pivotRecords: { maintenance_order_item_id: string; repair_type_id: string }[] = [];
    for (const itemId of input.itemIds) {
      for (const repairTypeId of input.repairTypeIds) {
        pivotRecords.push({
          maintenance_order_item_id: itemId,
          repair_type_id: repairTypeId,
        });
      }
    }

    const { error: pivotError } = await supabase.from('maintenance_order_item_repair_types').insert(pivotRecords);

    if (pivotError) {
      logger.warn('Error guardando tipos de reparación en pivot (bulk)', { data: { error: pivotError } });
    }
  }

  logger.info('Taller y tipos de reparación asignados a múltiples items', {
    data: { count: data?.length, repairTypeCount: input.repairTypeIds.length },
  });

  return data;
}

/**
 * Crea una orden de trabajo a partir de items asignados
 * Los items deben pertenecer al mismo equipo
 */
export async function createWorkOrder(input: CreateWorkOrderInput) {
  const supabase = await supabaseServer();

  logger.info('Creando orden de trabajo', {
    data: { itemCount: input.itemIds.length, workshopId: input.workshopId },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  // 1. Obtener los items y verificar que son del mismo equipo
  const { data: items, error: itemsError } = await supabase
    .from('maintenance_order_items')
    .select(
      `
      id,
      maintenance_order_id,
      maintenance_orders!inner (
        id,
        equipment_id,
        vehicles!inner (
          id,
          domain,
          serie,
          company_id
        )
      )
    `
    )
    .in('id', input.itemIds);

  if (itemsError || !items || items.length === 0) {
    logger.error('Error obteniendo items', { data: { error: itemsError } });
    throw new Error('No se encontraron los items seleccionados');
  }

  // Verificar que todos los items son del mismo equipo
  const equipmentIds = [...new Set(items.map((item) => (item.maintenance_orders as any).equipment_id))];
  if (equipmentIds.length > 1) {
    throw new Error('Todos los items deben ser del mismo equipo para crear una orden de trabajo');
  }

  const equipmentId = equipmentIds[0];
  const vehicle = (items[0].maintenance_orders as any).vehicles;
  const companyId = vehicle.company_id;

  // 2. Obtener el nombre del sector (si existe)
  let sectorName: string | null = null;
  if (input.sectorId) {
    const { data: sector } = await supabase.from('workshop_sectors').select('name').eq('id', input.sectorId).single();
    sectorName = sector?.name || null;
  }

  // 3. Obtener siguiente número de secuencia
  const sequenceNumber = await getNextSequenceNumber();

  // 4. Generar número de orden
  const orderNumber = formatWorkOrderNumber(vehicle.domain, vehicle.serie, sectorName, sequenceNumber);

  // 5. Crear la orden de trabajo
  const { data: workOrder, error: workOrderError } = await supabase
    .from('work_orders')
    .insert({
      order_number: orderNumber,
      sequence_number: sequenceNumber,
      company_id: companyId,
      equipment_id: equipmentId,
      workshop_id: input.workshopId,
      sector_id: input.sectorId || null,
      status: 'pending',
      priority: input.priority || 'medium',
      planned_start_date: input.plannedStartDate,
      planned_end_date: input.plannedEndDate,
      notes: input.notes || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (workOrderError) {
    logger.error('Error creando orden de trabajo', { data: { error: workOrderError } });
    throw new Error(`Error al crear orden de trabajo: ${workOrderError.message}`);
  }

  // 6. Crear los work_order_items
  const workOrderItems = input.itemIds.map((itemId) => ({
    work_order_id: workOrder.id,
    maintenance_order_item_id: itemId,
    status: 'pending' as const,
  }));

  const { data: createdWoItems, error: woItemsError } = await supabase
    .from('work_order_items')
    .insert(workOrderItems)
    .select('id, maintenance_order_item_id');

  if (woItemsError || !createdWoItems) {
    logger.error('Error creando items de orden de trabajo', { data: { error: woItemsError } });
    // Rollback: eliminar la orden de trabajo creada
    await supabase.from('work_orders').delete().eq('id', workOrder.id);
    throw new Error(`Error al crear items de orden: ${woItemsError?.message}`);
  }

  // 6.1 Crear los work_order_item_repairs (cada tipo de reparación es un trabajo individual)
  if (input.repairTypeIds && input.repairTypeIds.length > 0) {
    const repairRecords: { work_order_item_id: string; repair_type_id: string; status: 'pending' }[] = [];

    for (const woItem of createdWoItems) {
      for (const repairTypeId of input.repairTypeIds) {
        repairRecords.push({
          work_order_item_id: woItem.id,
          repair_type_id: repairTypeId,
          status: 'pending',
        });
      }
    }

    const { error: repairsError } = await supabase.from('work_order_item_repairs').insert(repairRecords);

    if (repairsError) {
      logger.error('Error creando trabajos de reparación', { data: { error: repairsError } });
      // Rollback
      await supabase.from('work_order_items').delete().eq('work_order_id', workOrder.id);
      await supabase.from('work_orders').delete().eq('id', workOrder.id);
      throw new Error(`Error al crear trabajos de reparación: ${repairsError.message}`);
    }

    logger.info('Trabajos de reparación creados', {
      data: { count: repairRecords.length, workOrderId: workOrder.id },
    });
  }

  // 7. Actualizar los maintenance_order_items con la referencia a la OT
  const { error: updateError } = await supabase
    .from('maintenance_order_items')
    .update({
      work_order_id: workOrder.id,
      assigned_workshop_id: input.workshopId,
      assigned_sector_id: input.sectorId || null,
      planned_start_date: input.plannedStartDate,
      planned_end_date: input.plannedEndDate,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
      repair_type_id: input.repairTypeIds?.[0] || null, // Campo legacy: primer tipo
    })
    .in('id', input.itemIds);

  if (updateError) {
    logger.warn('Error actualizando referencia de OT en items', { data: { error: updateError } });
  }

  // 8. Guardar tipos de reparación en tabla pivot (si se proporcionaron)
  if (input.repairTypeIds && input.repairTypeIds.length > 0) {
    // Eliminar registros anteriores de todos los items
    await supabase.from('maintenance_order_item_repair_types').delete().in('maintenance_order_item_id', input.itemIds);

    // Insertar nuevos registros para todos los items
    const pivotRecords: { maintenance_order_item_id: string; repair_type_id: string }[] = [];
    for (const itemId of input.itemIds) {
      for (const repairTypeId of input.repairTypeIds) {
        pivotRecords.push({
          maintenance_order_item_id: itemId,
          repair_type_id: repairTypeId,
        });
      }
    }

    const { error: pivotError } = await supabase.from('maintenance_order_item_repair_types').insert(pivotRecords);

    if (pivotError) {
      logger.warn('Error guardando tipos de reparación en pivot (createWorkOrder)', { data: { error: pivotError } });
    }
  }

  logger.info('Orden de trabajo creada exitosamente', {
    data: {
      workOrderId: workOrder.id,
      orderNumber,
      itemCount: input.itemIds.length,
      repairTypeCount: input.repairTypeIds?.length || 0,
      priority: input.priority || 'medium',
    },
  });

  return {
    workOrder,
    orderNumber,
    itemCount: input.itemIds.length,
  };
}

/**
 * Asigna y crea orden de trabajo en una sola operación
 * Útil cuando se quiere asignar y generar OT directamente
 */
export async function assignAndCreateWorkOrder(input: CreateWorkOrderInput) {
  // Primero asignar los items (con tipos de reparación)
  await assignWorkshopToItemsBulk({
    itemIds: input.itemIds,
    workshopId: input.workshopId,
    sectorId: input.sectorId,
    plannedStartDate: input.plannedStartDate,
    plannedEndDate: input.plannedEndDate,
    repairTypeIds: input.repairTypeIds || [],
  });

  // Luego crear la orden de trabajo
  return createWorkOrder(input);
}

// =============================================================================
// OCUPACIÓN DE SECTORES
// =============================================================================

/**
 * Obtiene la ocupación de todos los sectores de un taller
 * Retorna cuántas OT activas hay por sector vs el cupo máximo
 */
export async function getSectorOccupancy(workshopId: string) {
  const supabase = await supabaseServer();

  // Obtener todos los sectores del taller con su cupo
  const { data: sectors, error: sectorsError } = await supabase
    .from('workshop_sectors')
    .select('id, name, max_capacity')
    .eq('workshop_id', workshopId)
    .eq('is_active', true);

  if (sectorsError) {
    logger.error('Error obteniendo sectores', { data: { error: sectorsError } });
    return [];
  }

  if (!sectors || sectors.length === 0) {
    return [];
  }

  // Contar OTs activas por sector (pending, in_progress, paused)
  const { data: occupancyData, error: occupancyError } = await supabase
    .from('work_orders')
    .select('sector_id')
    .eq('workshop_id', workshopId)
    .in('status', ['pending', 'in_progress', 'paused'])
    .not('sector_id', 'is', null);

  if (occupancyError) {
    logger.error('Error obteniendo ocupación', { data: { error: occupancyError } });
    return sectors.map((s) => ({
      id: s.id,
      name: s.name,
      maxCapacity: s.max_capacity,
      currentOccupancy: 0,
    }));
  }

  // Contar OTs por sector
  const occupancyCount: Record<string, number> = {};
  occupancyData?.forEach((ot) => {
    if (ot.sector_id) {
      occupancyCount[ot.sector_id] = (occupancyCount[ot.sector_id] || 0) + 1;
    }
  });

  return sectors.map((s) => ({
    id: s.id,
    name: s.name,
    maxCapacity: s.max_capacity,
    currentOccupancy: occupancyCount[s.id] || 0,
  }));
}

export type SectorOccupancy = Awaited<ReturnType<typeof getSectorOccupancy>>[number];

// =============================================================================
// TIPOS DE RETORNO
// =============================================================================

export type AssignWorkshopResult = Awaited<ReturnType<typeof assignWorkshopToItem>>;
export type CreateWorkOrderResult = Awaited<ReturnType<typeof createWorkOrder>>;
