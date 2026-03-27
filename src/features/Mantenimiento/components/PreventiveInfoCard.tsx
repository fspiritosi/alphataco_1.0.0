import { Badge } from '@/components/ui/badge';
import {
  PREVENTIVE_TYPES,
  PREVENTIVE_TYPE_DESCRIPTIONS,
  PREVENTIVE_TYPE_ICONS,
  type PreventiveType,
} from '@/features/Mantenimiento/shared/preventive-maintenance';
import { Shield } from 'lucide-react';

interface PreventiveInfoCardProps {
  preventiveType: string;
  className?: string;
  showDescription?: boolean;
}

export function PreventiveInfoCard({ preventiveType, className, showDescription = true }: PreventiveInfoCardProps) {
  const typeKey = preventiveType as PreventiveType;
  const label = PREVENTIVE_TYPES[typeKey] ?? preventiveType;
  const description = PREVENTIVE_TYPE_DESCRIPTIONS[typeKey];
  const Icon = PREVENTIVE_TYPE_ICONS[typeKey];

  return (
    <div className={`space-y-2 p-4 bg-muted/50 rounded-lg ${className ?? ''}`}>
      <h4 className="font-medium text-sm flex items-center gap-1.5">
        <Shield className="h-4 w-4" />
        Mantenimiento Preventivo
      </h4>
      <Badge variant="secondary" className="gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </Badge>
      {showDescription && description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
