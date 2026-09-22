import type { BadgeProps } from '@/components/ui/badge';
import type { MaintenanceOrderData } from '../../actions/queries.server';

export interface SectorGroup {
  sectorId: string;
  sectorName: string;
  sequenceOrder: number;
  items: MaintenanceOrderData['maintenance_order_items'];
}

/** Tarea individual mostrada en las tarjetas de sector y en el listado de items */
export interface TaskInfo {
  id: string;
  repairTypeName: string;
  description?: string;
  status: string;
  isDiagnostico: boolean;
  isAutorizable: boolean;
  isOperatorAdded: boolean;
}

/** Variantes de badge admitidas — el estado sale de los mappers de las tablas */
export type StatusBadgeVariant = NonNullable<BadgeProps['variant']>;

/** Estado resumido de un item del pedido (derivado de sus tareas o del rechazo) */
export type ItemStatusKey = 'rejected' | 'completed' | 'in_progress' | 'pending';

export const itemStatusLabels: Record<ItemStatusKey, string> = {
  rejected: 'Rechazado',
  completed: 'Completado',
  in_progress: 'En progreso',
  pending: 'Pendiente',
};

export const itemStatusVariants: Record<ItemStatusKey, StatusBadgeVariant> = {
  rejected: 'destructive',
  completed: 'success',
  in_progress: 'warning',
  pending: 'secondary',
};

/** Represents a selectable repair item for rejection dialogs */
export interface SelectableRepair {
  repairId: string;
  repairName: string;
  sectorName: string;
  status: string;
}
