import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, Clock, Package, Settings2, Wrench, XCircle } from 'lucide-react';

// ============================================================================
// ICON / COLOR MAPS — compartidos entre columns.tsx y RepairEquipmentDialog.tsx
// ============================================================================

// Keys = valores enum Prisma TypeScript (con underscore para los @map)
export const repairStateIcons: Record<string, React.ElementType> = {
  Pendiente: Clock,
  Esperando_repuestos: Package,
  En_reparaci_n: Wrench,
  Finalizado: CheckCircle2,
  Rechazado: XCircle,
  Cancelado: XCircle,
  Programado: Settings2,
};

export const repairStateColors: Record<string, string> = {
  Pendiente: 'text-gray-600',
  Esperando_repuestos: 'text-yellow-600',
  En_reparaci_n: 'text-blue-600',
  Finalizado: 'text-green-600',
  Rechazado: 'text-red-600',
  Cancelado: 'text-red-400',
  Programado: 'text-blue-600',
};

export const criticityIcons: Record<string, React.ElementType> = {
  Baja: ArrowDown,
  Media: ArrowRight,
  Alta: ArrowUp,
};

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;

export const criticityBadgeVariants: Record<string, BadgeVariant> = {
  Baja: 'success',
  Media: 'yellow',
  Alta: 'destructive',
};
