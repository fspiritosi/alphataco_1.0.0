/**
 * Calcula el progreso de reparaciones de una orden de mantenimiento.
 *
 * Recorre: maintenance_order_items → work_orders → work_order_items → work_order_item_repairs
 * Excluye reparaciones canceladas y rechazadas.
 * Cuenta como completadas las que tienen status 'completed'.
 */

interface RepairLike {
  id: string;
  status: string | null;
}

interface WorkOrderItemLike {
  work_order_item_repairs?: RepairLike[];
}

interface WorkOrderLike {
  work_order_items?: WorkOrderItemLike[];
}

interface OrderItemLike {
  work_orders?: WorkOrderLike | WorkOrderLike[] | null;
}

export interface RepairProgress {
  /** Total de reparaciones activas (excluye cancelled/rejected) */
  total: number;
  /** Reparaciones con status 'completed' */
  completed: number;
  /** Porcentaje redondeado (0-100) */
  percent: number;
}

export function calculateRepairProgress(items: OrderItemLike[] | null | undefined): RepairProgress {
  // Deduplicar reparaciones por ID: cuando varios maintenance_order_items comparten
  // el mismo work_order, las mismas reparaciones aparecen repetidas en cada item.
  const repairMap = new Map<string, RepairLike>();

  for (const item of items ?? []) {
    const workOrders = Array.isArray(item.work_orders) ? item.work_orders : item.work_orders ? [item.work_orders] : [];
    for (const wo of workOrders) {
      for (const woi of wo.work_order_items ?? []) {
        for (const repair of woi.work_order_item_repairs ?? []) {
          repairMap.set(repair.id, repair);
        }
      }
    }
  }

  const allRepairs = Array.from(repairMap.values());
  const activeRepairs = allRepairs.filter((r) => r.status !== 'cancelled' && r.status !== 'rejected');
  const total = activeRepairs.length;
  const completed = activeRepairs.filter((r) => r.status === 'completed').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percent };
}
