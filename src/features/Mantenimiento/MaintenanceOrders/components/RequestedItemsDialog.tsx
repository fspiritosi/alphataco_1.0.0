'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RepairGroupBadge } from '@/features/Mantenimiento/shared/components/RepairGroupBadge';
import { RepairItemPhotos } from '@/features/Mantenimiento/shared/components/RepairItemPhotos';
import {
  getResourceInternNumber,
  getResourceKindLabel,
  getResourceLabel,
} from '@/features/Mantenimiento/shared/maintenance-resource';
import {
  getRepairItemDescription,
  getRepairItemGroupName,
  getRepairItemImages,
  getRepairItemLabel,
} from '@/features/Mantenimiento/shared/repair-item-label';
import { ClipboardList, Wrench } from 'lucide-react';
import type { MaintenanceOrderListItem } from '../table/actions.server';

type OrderItem = MaintenanceOrderListItem['maintenance_order_items'][number];

interface Props {
  order: MaintenanceOrderListItem | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Tipos de reparación asociados al ítem, como dato secundario.
 *
 * Se omite cuando repite el título: en la carga manual con tarea del listado
 * (ticket 592) el título YA es el nombre del tipo de reparación, y mostrarlo
 * dos veces solo agrega ruido.
 */
function getRepairTypesLine(item: OrderItem, label: string): string | null {
  const pivotNames = item.maintenance_order_item_repair_types
    ?.map((rt) => rt.types_of_repairs?.name)
    .filter((n): n is string => !!n);
  const repair = (pivotNames && pivotNames.length > 0 ? pivotNames.join(', ') : null) ?? item.types_of_repairs?.name;
  if (!repair || repair === label) return null;
  return repair;
}

export function RequestedItemsDialog({ order, open, onClose }: Props) {
  if (!order) return null;

  const items = order.maintenance_order_items || [];
  const orderLabel = order.order_number || order.id;
  // Ticket 596: el pedido puede ser de un equipamiento, no siempre de un vehículo
  const resourceLabel = getResourceLabel(order);
  const resourceKind = getResourceKindLabel(order);
  const internNumber = getResourceInternNumber(order);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            Ítems solicitados
          </DialogTitle>
          <DialogDescription>
            Orden {orderLabel} — {resourceKind} {resourceLabel}
            {internNumber ? ` (#${internNumber})` : ''}
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <ClipboardList className="h-6 w-6" />
            <p>Esta orden no tiene ítems registrados.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0 pr-3">
            <ul className="space-y-2">
              {items.map((item, idx) => {
                const label = getRepairItemLabel(item);
                const description = getRepairItemDescription(item);
                const repair = getRepairTypesLine(item, label);
                const images = getRepairItemImages(item);
                const sectorName = item.workshop_sectors?.name;
                return (
                  <li key={item.id} className="rounded-md border bg-card p-3 text-sm shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-muted-foreground tabular-nums text-xs font-medium">#{idx + 1}</span>
                        <span className="font-medium leading-snug">{label}</span>
                        <RepairGroupBadge groupName={getRepairItemGroupName(item)} />
                        {item.is_critical && (
                          <Badge variant="destructive" className="h-5 text-[10px]">
                            Crítico
                          </Badge>
                        )}
                        {item.is_diagnostico && (
                          <Badge variant="outline" className="h-5 text-[10px]">
                            Diagnóstico
                          </Badge>
                        )}
                      </div>
                      {description && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{description}</p>
                      )}
                      {repair && (
                        <p className="text-xs text-muted-foreground">
                          Reparación: <span className="font-medium text-foreground">{repair}</span>
                        </p>
                      )}
                      {sectorName && (
                        <p className="text-xs text-muted-foreground">
                          Sector: <span className="font-medium text-foreground">{sectorName}</span>
                        </p>
                      )}
                      <RepairItemPhotos images={images} label={label} size="sm" className="pt-1" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
