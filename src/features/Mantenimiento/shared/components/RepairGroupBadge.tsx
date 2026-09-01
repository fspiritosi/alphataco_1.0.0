import { Layers } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RepairGroupBadgeProps {
  /** Nombre del grupo de origen. Si es null el item se cargo suelto y no se muestra nada. */
  groupName: string | null | undefined;
  className?: string;
}

/**
 * Marca de que grupo de reparaciones salio un item.
 *
 * Al cargar un grupo se expanden N tareas sueltas en la lista, y despues no habia forma
 * de saber cuales vinieron de un grupo (ni de cual) y cuales se agregaron a mano. Se usa
 * en TODO listado de items del modulo para que la agrupacion se lea igual en todos lados.
 */
export function RepairGroupBadge({ groupName, className }: RepairGroupBadgeProps) {
  if (!groupName) return null;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 border-dashed text-[11px] font-normal text-muted-foreground max-w-full', className)}
      title={`Cargado desde el grupo "${groupName}"`}
    >
      <Layers className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">Grupo: {groupName}</span>
    </Badge>
  );
}
