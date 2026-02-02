import { Badge } from '@/components/ui/badge';
import { Car, Hash } from 'lucide-react';

interface EquipmentBadgeProps {
  domain?: string | null;
  serie?: string | null;
  internNumber?: string | null;
  size?: 'sm' | 'default';
}

export function EquipmentBadge({ domain, serie, internNumber, size = 'default' }: EquipmentBadgeProps) {
  const identifier = domain || serie || 'Sin identificador';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary" className={`${textSize} font-medium`}>
        <Car className={`${iconSize} mr-1.5`} />
        {identifier}
      </Badge>
      {internNumber && (
        <Badge variant="outline" className={`${textSize} font-medium`}>
          <Hash className={`${iconSize} mr-1.5`} />
          Nº {internNumber}
        </Badge>
      )}
    </div>
  );
}
