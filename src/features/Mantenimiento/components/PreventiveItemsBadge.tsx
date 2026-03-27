import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  PREVENTIVE_TYPES,
  PREVENTIVE_TYPE_DESCRIPTIONS,
  PREVENTIVE_TYPE_ICONS,
  type PreventiveType,
} from '@/features/Mantenimiento/shared/preventive-maintenance';
import { Shield } from 'lucide-react';

interface PreventiveItemsBadgeProps {
  preventiveType: string;
}

export function PreventiveItemsBadge({ preventiveType }: PreventiveItemsBadgeProps) {
  const typeKey = preventiveType as PreventiveType;
  const label = PREVENTIVE_TYPES[typeKey] ?? preventiveType;
  const description = PREVENTIVE_TYPE_DESCRIPTIONS[typeKey];
  const Icon = PREVENTIVE_TYPE_ICONS[typeKey];

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 cursor-default">
            <Shield className="h-3 w-3" />
            Preventivo
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold text-sm">Mantenimiento Preventivo</p>
            <p className="text-sm flex items-center gap-1">
              {Icon && <Icon className="h-3 w-3" />}
              {label}
            </p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
