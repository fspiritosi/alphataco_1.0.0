import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

type Criticality = 'Alta' | 'Media' | 'Baja';

interface CriticalityBadgeProps {
  criticality: Criticality;
  showIcon?: boolean;
  size?: 'sm' | 'default';
}

const criticalityConfig: Record<
  Criticality,
  {
    icon: typeof AlertTriangle;
    className: string;
    label: string;
  }
> = {
  Alta: {
    icon: AlertTriangle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
    label: 'Alta',
  },
  Media: {
    icon: AlertCircle,
    className:
      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    label: 'Media',
  },
  Baja: {
    icon: Info,
    className:
      'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
    label: 'Baja',
  },
};

export function CriticalityBadge({ criticality, showIcon = true, size = 'default' }: CriticalityBadgeProps) {
  const config = criticalityConfig[criticality];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <Badge variant="outline" className={cn(config.className, size === 'sm' && 'text-xs py-0 px-1.5')}>
      {showIcon && <Icon className={cn(iconSize, 'mr-1')} />}
      {config.label}
    </Badge>
  );
}
