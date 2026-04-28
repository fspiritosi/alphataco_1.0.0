'use client';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { XCircle } from 'lucide-react';
import { useMemo } from 'react';
import type { LocalItem } from '../ManageOrderWizard';
import { getItemLabel, getItemRepairTypeNames } from './helpers';

interface RejectedItemsListProps {
  localItems: LocalItem[];
  repairTypes: Array<{ id: string; name: string }>;
  /** Mensaje contextual mostrado junto al título (ej: "no se asignarán a ningún sector"). */
  contextNote?: string;
  /** Si true, antepone un Separator. Default: true. */
  withSeparator?: boolean;
}

/**
 * Muestra los desvíos rechazados como sección disabled/informativa.
 * No interactivo — la restauración se realiza desde el paso 1.
 */
export function RejectedItemsList({
  localItems,
  repairTypes,
  contextNote,
  withSeparator = true,
}: RejectedItemsListProps) {
  const rejectedItems = useMemo(
    () => localItems.filter((item) => !item.is_diagnostico && !item._deleted && !item.work_order_id && item._rejected),
    [localItems]
  );

  if (rejectedItems.length === 0) return null;

  return (
    <>
      {withSeparator && <Separator />}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-muted-foreground">Desvíos rechazados ({rejectedItems.length})</span>
          {contextNote && <span className="text-xs text-muted-foreground">— {contextNote}</span>}
        </div>
        <div className="space-y-1.5 opacity-70">
          {rejectedItems.map((item) => {
            const rtNames = getItemRepairTypeNames(item, repairTypes);
            const label = getItemLabel(item);
            return (
              <div
                key={item.id}
                className="flex items-start gap-2 p-2.5 border rounded-lg border-destructive/30 bg-destructive/5"
              >
                <Badge variant="destructive" className="text-xs px-2 py-0.5 shrink-0">
                  Rechazado
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {rtNames.length > 0 ? (
                      rtNames.map((name, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5">
                          {name}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        Sin tipo
                      </Badge>
                    )}
                  </div>
                  {label && <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>}
                  {item._rejectionReason && (
                    <p className="text-xs text-destructive/80 italic mt-1">Motivo: {item._rejectionReason}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
