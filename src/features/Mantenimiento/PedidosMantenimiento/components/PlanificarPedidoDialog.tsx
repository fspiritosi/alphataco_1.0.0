'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ItemComments } from '@/features/Mantenimiento/components/ItemComments';
import { PreventiveInfoCard } from '@/features/Mantenimiento/components/PreventiveInfoCard';
import { RepairGroupBadge } from '@/features/Mantenimiento/shared/components/RepairGroupBadge';
import { RepairItemPhotos } from '@/features/Mantenimiento/shared/components/RepairItemPhotos';
import { formatDateForDB } from '@/features/Mantenimiento/utils/dateFormat';
import { Clock, Gauge, Loader2, Package, Truck, Wrench } from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  getResourceInternNumber,
  getResourceKind,
  getResourceKindLabel,
  getResourceLabel,
} from '../../shared/maintenance-resource';
import { getRepairItemGroupName, getRepairItemImages, getRepairItemLabel } from '../../shared/repair-item-label';
import type { MaintenanceOrderData } from '../actions/actionsServer';
import { useScheduleMaintenanceOrder } from '../hooks/useMaintenanceOrders';

interface PlanificarPedidoDialogProps {
  order: MaintenanceOrderData;
  open: boolean;
  onClose: () => void;
}

function formatSectionCode(code: string | null | undefined): string {
  if (!code) return '';
  return code
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function PlanificarPedidoDialog({ order, open, onClose }: PlanificarPedidoDialogProps) {
  const [dateStr, setDateStr] = useState<string>('');
  const scheduleMutation = useScheduleMaintenanceOrder();

  // Ticket 596: el pedido puede ser de un vehiculo o de un equipamiento
  const isOtherEquipment = getResourceKind(order) === 'other_equipment';
  const resourceLabel = getResourceLabel(order);
  const resourceKindLabel = getResourceKindLabel(order);
  const internNumber = getResourceInternNumber(order);
  const ResourceIcon = isOtherEquipment ? Package : Truck;
  const itemCount = order.maintenance_order_items?.length ?? 0;
  const isPreventive = order.maintenance_requests?.source === 'preventive';

  // Un equipamiento no lleva kilometraje; sus horas de uso viven en `horometer`.
  const kilometer = isOtherEquipment ? null : order.vehicles?.kilometer ?? order.maintenance_requests?.kilometer;
  const engineHours =
    order.other_equipment?.horometer ?? order.vehicles?.engine_hours ?? order.maintenance_requests?.engine_hours;

  const handleSchedule = async () => {
    if (!dateStr) {
      toast.error('Debe seleccionar una fecha');
      return;
    }

    const parsedDate = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(parsedDate.getTime())) {
      toast.error('Fecha inválida');
      return;
    }

    try {
      await scheduleMutation.mutateAsync({
        orderId: order.id,
        scheduledDate: formatDateForDB(parsedDate),
      });
      toast.success('Pedido planificado exitosamente');
      onClose();
    } catch {
      toast.error('Error al planificar el pedido');
    }
  };

  // Agrupar items por tipo de reparación (soporta múltiples tipos)
  const itemsByRepairType = (order.maintenance_order_items || []).reduce(
    (acc, item) => {
      const pivotRepairTypes = item.maintenance_order_item_repair_types ?? [];
      const repairTypeNames: string[] =
        pivotRepairTypes.length > 0
          ? pivotRepairTypes.map((rt) => rt.types_of_repairs?.name).filter((n): n is string => Boolean(n))
          : item.types_of_repairs?.name
            ? [item.types_of_repairs.name]
            : ['Sin tipo asignado'];

      repairTypeNames.forEach((typeName) => {
        if (!acc[typeName]) {
          acc[typeName] = [];
        }
        acc[typeName].push(item);
      });
      return acc;
    },
    {} as Record<string, typeof order.maintenance_order_items>
  );

  // Fecha mínima: hoy en formato YYYY-MM-DD
  const todayStr = moment().format('YYYY-MM-DD');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ── Header compacto ──────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 space-y-3">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base">Planificar Pedido de Mantenimiento</DialogTitle>
            <DialogDescription className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1">
                <ResourceIcon className="h-3 w-3" />
                <span className="text-muted-foreground">{resourceKindLabel}</span>
                {resourceLabel}
                {internNumber && <span className="text-muted-foreground">(#{internNumber})</span>}
              </span>
              {order.order_number && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span>Pedido #{order.order_number}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* ── Datos clave (fila horizontal) ───────────────────────────── */}
          {(kilometer || engineHours) && (
            <div className="flex flex-wrap gap-4 text-sm">
              {kilometer && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="text-foreground font-medium">{Number(kilometer).toLocaleString('es-AR')} km</span>
                </div>
              )}
              {engineHours && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-foreground font-medium">{Number(engineHours).toLocaleString('es-AR')} hs</span>
                </div>
              )}
            </div>
          )}

          {/* ── Descripción del pedido ──────────────────────────────────── */}
          {(order.description ?? order.maintenance_requests?.description) && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Descripción</h3>
              <p className="text-sm whitespace-pre-wrap break-words">
                {order.description ?? order.maintenance_requests?.description}
              </p>
            </div>
          )}

          {/* ── Selector de fecha (escritura directa) ──────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Fecha de recepción en taller</Label>
            <Input
              type="date"
              value={dateStr}
              min={todayStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <Separator />

        {/* ── Items a reparar ──────────────────────────────────────────── */}
        {isPreventive && (
          <div className="px-6 pt-3 pb-4">
            <PreventiveInfoCard preventiveType={order.maintenance_requests?.preventive_type ?? ''} />
          </div>
        )}

        {itemCount > 0 && (
          <>
            <div className="px-6 pt-3 pb-1">
              <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Items a reparar
                <span className="text-xs font-normal normal-case">({itemCount})</span>
              </h3>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="px-6 pb-4 space-y-3">
                {Object.entries(itemsByRepairType).map(([repairType, items]) => (
                  <div key={repairType} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-medium text-xs">
                        {repairType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">({items?.length || 0})</span>
                    </div>
                    <div className="space-y-1.5">
                      {items?.map((item, index) => {
                        const deviation = item.maintenance_request_items?.checklist_deviations;
                        // Ticket 592: en la carga manual no hay desvio de checklist —
                        // el titulo del item es lo que escribio el supervisor.
                        const itemLabel = getRepairItemLabel(item);
                        const itemImages = getRepairItemImages(item);
                        return (
                          <div key={item.id} className="p-2.5 border rounded-lg space-y-1">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                                #{index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium text-sm leading-snug">{itemLabel}</p>
                                <RepairGroupBadge groupName={getRepairItemGroupName(item)} className="mt-1" />
                                {deviation?.section_code && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatSectionCode(deviation.section_code)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <ItemComments
                              item={item}
                              source={order.maintenance_requests?.source}
                              fallbackAuthorName={
                                order.maintenance_requests?.profile_maintenance_requests_supervisor_idToprofile
                                  ?.fullname
                              }
                            />

                            {/* Ticket 592: quien planifica necesita ver la foto para estimar la fecha */}
                            <RepairItemPhotos images={itemImages} label={itemLabel} size="sm" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        {itemCount === 0 && !isPreventive && (
          <div className="px-6 pb-4">
            <p className="text-muted-foreground text-center py-6 text-sm">No hay items registrados</p>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <Separator />
        <DialogFooter className="px-6 py-4 shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSchedule} disabled={scheduleMutation.isPending || !dateStr}>
            {scheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Planificación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
