import { Database } from '@/../database.types';

// Tipos base de la BD
export type WorkOrder = Database['public']['Tables']['work_orders']['Row'];
export type WorkOrderItem = Database['public']['Tables']['work_order_items']['Row'];
export type WorkOrderStatus = Database['public']['Enums']['work_order_status'];
export type WorkOrderItemStatus = Database['public']['Enums']['work_order_item_status'];

// Tipo para la fila de la tabla de OT
export interface WorkOrderRowData {
  id: string;
  orderNumber: string;
  sequenceNumber: number;
  status: WorkOrderStatus;
  // Equipo
  equipmentId: string;
  vehicleDomain: string | null;
  vehicleSerie: string | null;
  vehicleInternNumber: string | null;
  vehicleType: string | null;
  // Taller y sector
  workshopId: string;
  workshopName: string;
  workshopType: string;
  sectorId: string | null;
  sectorName: string | null;
  // Fechas planificadas
  plannedStartDate: string;
  plannedEndDate: string;
  // Fechas reales
  actualStartDate: string | null;
  actualEndDate: string | null;
  // Conteo de items
  totalItems: number;
  completedItems: number;
  // Notas
  notes: string | null;
  // Auditoría
  createdAt: string | null;
  createdBy: string | null;
}

// Tipo para los items de una OT en el detalle
export interface WorkOrderItemDetail {
  id: string;
  status: WorkOrderItemStatus;
  technicianNotes: string | null;
  completedAt: string | null;
  // Datos del maintenance_order_item
  maintenanceOrderItemId: string;
  repairTypeId: string | null;
  repairTypeName: string | null;
  // Múltiples tipos de reparación (tabla pivot)
  repairTypeIds: string[];
  repairTypeNames: string[];
  description: string | null;
  driverComment: string | null;
  // Datos del desvío (si viene de checklist)
  deviationId: string | null;
  itemLabel: string | null;
  itemCode: string | null;
  sectionCode: string | null;
}

// Tipo para el detalle completo de una OT
export interface WorkOrderDetail extends WorkOrderRowData {
  items: WorkOrderItemDetail[];
  // Info adicional del equipo
  vehicleKilometer: string | null;
  vehicleCondition: string | null;
  // Info adicional
  startedAt: string | null;
  startedBy: string | null;
  completedAt: string | null;
  completedBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
}

// Constantes de estados
export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En Proceso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export const WORK_ORDER_STATUS_VARIANTS: Record<WorkOrderStatus, 'secondary' | 'warning' | 'success' | 'destructive'> =
  {
    pending: 'secondary',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'destructive',
  };

export const WORK_ORDER_ITEM_STATUS_LABELS: Record<WorkOrderItemStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En Proceso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};
