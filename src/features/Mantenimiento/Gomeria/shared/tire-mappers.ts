import type { BadgeProps } from '@/components/ui/badge';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

// TireStatus
export const tireStatusLabels: Record<string, string> = {
  AVAILABLE: 'Disponible',
  INSTALLED: 'Instalada',
  IN_REPAIR: 'En reparación',
  DISCARDED: 'Descartada',
};

export const tireStatusBadges: Record<string, BadgeVariant> = {
  AVAILABLE: 'success',
  INSTALLED: 'default',
  IN_REPAIR: 'yellow',
  DISCARDED: 'destructive',
};

// TireRetreadLevel
export const tireRetreadLabels: Record<string, string> = {
  FIRST: '1° Precurado',
  SECOND: '2° Precurado',
  THIRD: '3° Precurado',
};

// TireTreadType
export const tireTreadTypeLabels: Record<string, string> = {
  SMOOTH: 'Liso',
  MIXED: 'Mixto',
  BLOCK: 'Taco',
};

// TireServiceAction
export const tireServiceActionLabels: Record<string, string> = {
  REPLACE: 'Reemplazo',
  REPAIR: 'Reparación',
  CALIBRATE: 'Calibración',
};

export const tireServiceActionBadges: Record<string, BadgeVariant> = {
  REPLACE: 'default',
  REPAIR: 'yellow',
  CALIBRATE: 'outline',
};

// TireOldDestination
export const tireOldDestinationLabels: Record<string, string> = {
  AVAILABLE: 'Disponible',
  DISCARD: 'Descarte',
  REPAIR: 'Reparación',
};

// TireServiceOrderStatus
export const tireServiceOrderStatusLabels: Record<string, string> = {
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
};

export const tireServiceOrderStatusBadges: Record<string, BadgeVariant> = {
  OPEN: 'yellow',
  CLOSED: 'success',
};

// TirePositionSide
export const tirePositionSideLabels: Record<string, string> = {
  LEFT: 'Izquierda',
  RIGHT: 'Derecha',
  SPARE: 'Auxilio',
};
