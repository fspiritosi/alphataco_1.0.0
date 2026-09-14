/**
 * Labels, colores e iconos de los estados de OM y OT que usa la Vista Taller.
 *
 * Vive en un módulo propio (sin directiva) porque lo consumen tanto las columnas
 * de la tabla como el modal de tareas: tenerlo en `columns.tsx` obligaba a un
 * import circular entre los dos.
 */

import {
  AlertCircle,
  Ban,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock,
  Hammer,
  Pause,
  PlayCircle,
  XCircle,
} from 'lucide-react';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'info' | 'warning' | 'success' | 'yellow' | 'red';

export type StatusConfig = {
  label: string;
  variant: BadgeVariant;
  icon: typeof AlertCircle;
};

/** Estados de maintenance_orders (String, no enum). Valores documentados en uso. */
export const MO_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending_scheduling: { label: 'Por planificar', variant: 'secondary', icon: CalendarClock },
  scheduled: { label: 'Planificada', variant: 'info', icon: CalendarClock },
  date_confirmed: { label: 'Fecha confirmada', variant: 'info', icon: CheckCircle2 },
  in_workshop: { label: 'En taller', variant: 'warning', icon: Hammer },
  completed: { label: 'Completada', variant: 'success', icon: CheckCircle2 },
  rejected: { label: 'Rechazada', variant: 'destructive', icon: XCircle },
};

/** Estados de work_orders (enum work_order_status). */
export const WO_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'Pendiente', variant: 'secondary', icon: Clock },
  in_progress: { label: 'En progreso', variant: 'info', icon: PlayCircle },
  paused: { label: 'Pausada', variant: 'yellow', icon: Pause },
  completed: { label: 'Completada', variant: 'success', icon: CheckCircle2 },
  completed_partial: { label: 'Parcial', variant: 'success', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', variant: 'destructive', icon: Ban },
};

export function getMoStatusConfig(status: string | null | undefined): StatusConfig {
  if (!status) return { label: 'Sin estado', variant: 'secondary', icon: CircleDashed };
  return MO_STATUS_CONFIG[status] ?? { label: status, variant: 'secondary', icon: CircleDashed };
}

export function getWoStatusConfig(status: string | null | undefined): StatusConfig {
  if (!status) return { label: 'Sin estado', variant: 'secondary', icon: CircleDashed };
  return WO_STATUS_CONFIG[status] ?? { label: status, variant: 'secondary', icon: CircleDashed };
}
