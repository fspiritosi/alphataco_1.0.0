'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, Wrench } from 'lucide-react';
import type { MaintenanceOrderListItem } from '../table/actions.server';

type OrderItem = MaintenanceOrderListItem['maintenance_order_items'][number];

interface Props {
  order: MaintenanceOrderListItem | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Devuelve un nombre legible para un item de la orden.
 * Prioridad: pivot M:M de tipos de reparación → FK directo → label del desvío → descripción → fallback.
 */
function getItemDisplay(item: OrderItem): { label: string; repair: string | null } {
  const pivotNames = item.maintenance_order_item_repair_types
    ?.map((rt) => rt.types_of_repairs?.name)
    .filter((n): n is string => !!n);
  const repair =
    (pivotNames && pivotNames.length > 0 ? pivotNames.join(', ') : null) ?? item.types_of_repairs?.name ?? null;
  const label =
    item.maintenance_request_items?.checklist_deviations?.item_label || item.description || 'Ítem sin descripción';
  return { label, repair };
}

export function RequestedItemsDialog({ order, open, onClose }: Props) {
  if (!order) return null;

  const items = order.maintenance_order_items || [];
  const orderLabel = order.order_number || order.id;
  const vehicleLabel = order.vehicles?.domain || order.vehicles?.serie || 'Sin equipo';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            Ítems solicitados
          </DialogTitle>
          <DialogDescription>
            Orden {orderLabel} — Equipo {vehicleLabel}
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <ClipboardList className="h-6 w-6" />
            <p>Esta orden no tiene ítems registrados.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-3">
            <ul className="space-y-2">
              {items.map((item, idx) => {
                const { label, repair } = getItemDisplay(item);
                const sectorName = item.workshop_sectors?.name;
                return (
                  <li key={item.id} className="rounded-md border bg-card p-3 text-sm shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-muted-foreground tabular-nums text-xs font-medium">#{idx + 1}</span>
                        <span className="font-medium leading-snug">{label}</span>
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
