'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';

const logger = new Logger('Equipos/vehicle-operations-actions');

/**
 * Obtiene el historial de ordenes de mantenimiento de un equipo,
 * incluyendo el detalle completo de items, sectores, OTs y su progreso.
 */
export async function getMaintenanceOrdersForEquipment(equipmentId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('maintenance_orders')
    .select(
      `
      id, order_number, status, created_at, workshop_entry_date, updated_at,
      workshop_validated_at, operations_validated_at,
      workshop_validation_notes, operations_validation_notes,
      maintenance_requests(id, source, created_at),
      maintenance_order_items(
        id, description, is_diagnostico, sector_sequence_order, assigned_sector_id,
        assigned_workshop_id,
        types_of_repairs(id, name, autorizable),
        workshop_sectors(id, name),
        workshops(id, name, type),
        maintenance_request_items:maintenance_request_item_id(
          driver_comment, validator_comment, description
        ),
        work_orders(
          id, order_number, status, started_at, completed_at,
          work_order_items(
            id, status, maintenance_order_item_id,
            work_order_item_repairs(id, status, is_diagnostico, is_operator_added,
              types_of_repairs(id, name, autorizable)
            )
          )
        )
      )
    `
    )
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error al obtener historial de OM del equipo', { data: { error, equipmentId } });
    throw error;
  }

  return data || [];
}

export type EquipmentMaintenanceOrders = Awaited<ReturnType<typeof getMaintenanceOrdersForEquipment>>;
export type EquipmentMaintenanceOrder = EquipmentMaintenanceOrders[number];
