import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Ban, CheckCircle, Clock, Package, Wrench, XCircle } from 'lucide-react';

type Status =
  | 'Pendiente'
  | 'Esperando repuestos'
  | 'En reparación'
  | 'Finalizado'
  | 'Rechazado'
  | 'Cancelado'
  | 'Programado';

interface StatusBadgeProps {
  status: Status;
  showIcon?: boolean;
}

const statusConfig: Record<
  Status,
  {
    icon: typeof Clock;
    className: string;
  }
> = {
  Pendiente: {
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-border',
  },
  'Esperando repuestos': {
    icon: Package,
    className:
      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  },
  'En reparación': {
    icon: Wrench,
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  Programado: {
    icon: Clock,
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  },
  Finalizado: {
    icon: CheckCircle,
    className:
      'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
  },
  Rechazado: {
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  Cancelado: {
    icon: Ban,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, 'text-xs')}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {status}
    </Badge>
  );
}
