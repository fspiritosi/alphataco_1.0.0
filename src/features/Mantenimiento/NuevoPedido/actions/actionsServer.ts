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
