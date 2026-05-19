/**
 * Tipos para el flujo de mantenimiento
 *
 * NOTA: Los tipos de datos con relaciones se infieren automáticamente
 * de las queries usando `Awaited<ReturnType<typeof fnName>>` en cada action file.
 * Este archivo solo contiene tipos utilitarios (status, filtros, inputs).
 */

// Estados de solicitud de mantenimiento
export type MaintenanceRequestStatus = 'pending_approval' | 'approved' | 'rejected';

// Estados de items de solicitud
export type MaintenanceRequestItemStatus = 'pending' | 'approved' | 'rejected';

// Estados de pedidos de mantenimiento
export type MaintenanceOrderStatus = 'pending_scheduling' | 'scheduled' | 'in_workshop' | 'completed' | 'rejected';

// Tipos para filtros
export interface MaintenanceRequestFilters {
  status?: MaintenanceRequestStatus;
  equipment_id?: string;
  from_date?: string;
  to_date?: string;
}

export interface MaintenanceOrderFilters {
  status?: MaintenanceOrderStatus;
  equipment_id?: string;
  scheduled_from?: string;
  scheduled_to?: string;
}

// Tipos para acciones
export interface ApproveRequestItemsInput {
  requestId: string;
  /** Items aprobados - Los tipos de reparación se asignan en la etapa de Planificación */
  approvedItems: {
    itemId: string;
    /** Comentario del validador (opcional) */
    validatorComment?: string;
  }[];
  rejectedItems: {
    itemId: string;
    reason: string;
    /** Comentario del validador (opcional) */
    validatorComment?: string;
  }[];
  /** Aprueba la solicitud preventiva completa como unidad (sin items) */
  preventiveApproval?: boolean;
  /** Comentario del validador para aprobación preventiva */
  validatorComment?: string;
}

export interface RejectRequestInput {
  requestId: string;
  reason: string;
}

export interface ScheduleOrderInput {
  orderId: string;
  scheduledDate: string;
}

export interface ApproveWorkshopEntryInput {
  orderId: string;
  kilometer: string;
  engine_hours?: string;
}

export interface RejectOperationInput {
  orderId: string;
  reason: string;
}
