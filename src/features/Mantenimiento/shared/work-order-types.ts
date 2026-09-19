import { Database } from '@/../database.types';

// Tipos base de la BD
export type WorkOrder = Database['public']['Tables']['work_orders']['Row'];
export type WorkOrderItem = Database['public']['Tables']['work_order_items']['Row'];
export type WorkOrderStatus = Database['public']['Enums']['work_order_status'];
export type WorkOrderItemStatus = Database['public']['Enums']['work_order_item_status'];
export type WorkOrderPriority = Database['public']['Enums']['work_order_priority'];
export type WorkOrderItemRepairRow = Database['public']['Tables']['work_order_item_repairs']['Row'];

// Tipo para un trabajo individual (tipo de reparación) dentro de un item
export interface WorkOrderItemRepair {
  id: string;
  repairTypeId: string;
  repairTypeName: string;
  status: WorkOrderItemStatus;
  technicianNotes: string | null;
  completedAt: string | null;
  completedBy: string | null;
}

// Tipo para la fila de la tabla de OT
export interface WorkOrderRowData {
  id: string;
  orderNumber: string;
  sequenceNumber: number;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  // Equipo
  /** Nullable desde el ticket 596: la OT puede ser de un equipamiento, no de un vehículo */
  equipmentId: string | null;
  vehicleDomain: string | null;
  vehicleSerie: string | null;
  vehicleInternNumber: string | null;
  /** Ticket 596: identificacion del recurso, sea vehiculo o equipamiento */
  resourceLabel: string;
  resourceKindLabel: string;
  resourceInternNumber: string | null;
  resourceType: string | null;
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
  // Pausa
  pausedAt: string | null;
  pauseReason: string | null;
  totalPausedTime: string | null;
}

// Tipo para los items de una OT en el detalle (representa el desvío/item de mantenimiento)
export interface WorkOrderItemDetail {
  id: string;
  status: WorkOrderItemStatus;
  technicianNotes: string | null;
  completedAt: string | null;
  // Datos del maintenance_order_item
  maintenanceOrderItemId: string;
  repairTypeId: string | null;
  repairTypeName: string | null;
  // Múltiples tipos de reparación (tabla pivot) - legacy
  repairTypeIds: string[];
  repairTypeNames: string[];
  // Trabajos individuales a realizar (cada tipo de reparación)
  repairs: WorkOrderItemRepair[];
  // Contadores
  totalRepairs: number;
  completedRepairs: number;
  // Descripción y comentarios
  description: string | null;
  driverComment: string | null;
  validatorComment: string | null;
  // Datos del desvío (si viene de checklist)
  deviationId: string | null;
  itemLabel: string | null;
  itemCode: string | null;
  sectionCode: string | null;
  /** Ticket 592: fotos del ítem (bucket repair-images), vengan de la orden o de la solicitud */
  itemImages: string[];
  /** Grupo de reparaciones del que salio el item, null si se cargo suelto */
  itemGroupName: string | null;
}

// Tipo para el detalle completo de una OT
export interface WorkOrderDetail extends WorkOrderRowData {
  items: WorkOrderItemDetail[];
  // Info adicional del equipo
  vehicleKilometer: string | null;
  vehicleEngineHours: number | null;
  vehicleCondition: string | null;
  // Info adicional
  startedAt: string | null;
  startedBy: string | null;
  completedAt: string | null;
  completedBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  // Pausa
  pausedBy: string | null;
}

// Constantes de estados
export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En Proceso',
  paused: 'Pausada',
  completed: 'Completada',
  completed_partial: 'Completada Parcial',
  cancelled: 'Cancelada',
};

export const WORK_ORDER_STATUS_VARIANTS: Record<
  WorkOrderStatus,
  'secondary' | 'warning' | 'success' | 'destructive' | 'default' | 'yellow'
> = {
  pending: 'secondary',
  in_progress: 'warning',
  paused: 'default',
  completed: 'success',
  completed_partial: 'yellow',
  cancelled: 'destructive',
};

// Constantes de prioridad
export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export const WORK_ORDER_PRIORITY_VARIANTS: Record<
  WorkOrderPriority,
  'destructive' | 'warning' | 'secondary' | 'default'
> = {
  urgent: 'destructive',
  high: 'warning',
  medium: 'secondary',
  low: 'default',
};

export const WORK_ORDER_ITEM_STATUS_LABELS: Record<WorkOrderItemStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En Proceso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  pending_approval: 'Pendiente Aprobación',
  reassignment_requested: 'Reasignación',
  rejected: 'Rechazado',
};
