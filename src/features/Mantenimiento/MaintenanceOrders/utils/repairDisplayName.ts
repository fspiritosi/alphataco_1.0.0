import type { MaintenanceOrderData } from '../actions/actionsServer';

type OrderItem = MaintenanceOrderData['maintenance_order_items'][number];

/**
 * Centralized helper to get a human-readable name for a maintenance_order_item.
 * Priority: pivot repair types → single FK repair type → description → fallback
 */
export function getRepairDisplayName(item: OrderItem): string {
  // 1. Pivot M:M repair types (assigned via wizard)
  const pivotNames = item.maintenance_order_item_repair_types?.map((rt) => rt.types_of_repairs?.name).filter(Boolean);
  if (pivotNames && pivotNames.length > 0) return pivotNames.join(', ');

  // 2. Single FK repair type
  if (item.types_of_repairs?.name) return item.types_of_repairs.name;

  // 3. Manual description
  if (item.description) return item.description;

  // 4. Fallback
  return 'Sin informacion';
}
