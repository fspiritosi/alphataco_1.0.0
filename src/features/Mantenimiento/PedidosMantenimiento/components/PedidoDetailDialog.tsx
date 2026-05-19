'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ItemComments } from '@/features/Mantenimiento/components/ItemComments';
import { PREVENTIVE_TYPES, type PreventiveType } from '@/features/Mantenimiento/shared/preventive-maintenance';
import { formatDateOnly, formatDateTime } from '@/features/Mantenimiento/utils/dateFormat';
import { AlertTriangle, Calendar, Clock, Gauge, Truck } from 'lucide-react';
import type { MaintenanceOrderData } from '../actions/actionsServer';

interface PedidoDetailDialogProps {
  order: MaintenanceOrderData;
  open: boolean;
  onClose: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'warning' | 'success' | 'default' | 'secondary' | 'destructive' }
> = {
  pending_scheduling: { label: 'Pendiente Planificar', variant: 'warning' },
  scheduled: { label: 'Planificado', variant: 'secondary' },
  date_confirmed: { label: 'Fecha Confirmada', variant: 'success' },
  in_workshop: { label: 'En Taller', variant: 'default' },
  completed: { label: 'Completado', variant: 'secondary' },
  rejected: { label: 'Rechazado', variant: 'destructive' },
};

function formatSectionCode(code: string | null | undefined): string {
  if (!code) return '-';
  return code
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function PedidoDetailDialog({ order, open, onClose }: PedidoDetailDialogProps) {
  const equipmentLabel = order.vehicles?.domain || order.vehicles?.serie || 'Sin identificar';
  const internNumber = order.vehicles?.intern_number;
  const statusInfo = STATUS_CONFIG[order.status] ?? { label: order.status, variant: 'secondary' as const };
  const itemCount = order.maintenance_order_items?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* ── Header compacto ──────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 space-y-3">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <DialogTitle className="text-base">
                {order.order_number ? `Pedido #${order.order_number}` : 'Pedido de Mantenimiento'}
              </DialogTitle>
            </div>
            <DialogDescription className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1">
                <Truck className="h-3 w-3" />
                {equipmentLabel}
                {internNumber && <span className="text-muted-foreground">(#{internNumber})</span>}
              </span>
              <span className="text-muted-foreground">·</span>
              <span>Creado {formatDateTime(order.created_at)}</span>
            </DialogDescription>
          </DialogHeader>

          {/* ── Datos clave (fila horizontal) ───────────────────────────── */}
          {(order.scheduled_date ||
            order.maintenance_requests?.kilometer ||
            order.maintenance_requests?.engine_hours) && (
            <div className="flex flex-wrap gap-4 text-sm">
              {order.scheduled_date && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Planificado:{' '}
                    <span className="text-foreground font-medium">{formatDateOnly(order.scheduled_date)}</span>
                  </span>
                </div>
              )}
              {(order.vehicles?.kilometer || order.maintenance_requests?.kilometer) && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="text-foreground font-medium">
                    {Number(order.vehicles?.kilometer ?? order.maintenance_requests?.kilometer).toLocaleString('es-AR')}{' '}
                    km
                  </span>
                </div>
              )}
              {(order.vehicles?.engine_hours || order.maintenance_requests?.engine_hours) && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-foreground font-medium">
                    {Number(order.vehicles?.engine_hours ?? order.maintenance_requests?.engine_hours).toLocaleString(
                      'es-AR'
                    )}{' '}
                    hs
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Alert de reprogramación ──────────────────────────────── */}
          {order.date_rejection_reason && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Motivo de reprogramación
                  </span>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">{order.date_rejection_reason}</p>
                  {order.date_rejected_at && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Rechazado el {formatDateTime(order.date_rejected_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* ── Items a reparar ──────────────────────────────────────────── */}
        {order.maintenance_requests?.source === 'preventive' ? (
          <>
            <div className="px-6 pt-3 pb-1">
              <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
                Tipo de mantenimiento
              </h3>
            </div>
            <div className="px-6 pb-6">
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm">Mantenimiento Preventivo</h4>
                <Badge variant="secondary">
                  {PREVENTIVE_TYPES[order.maintenance_requests?.preventive_type as PreventiveType] ??
                    order.maintenance_requests?.preventive_type ??
                    'Preventivo'}
                </Badge>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 pt-3 pb-1">
              <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
                Items a reparar
                <span className="ml-1.5 text-xs font-normal normal-case">({itemCount})</span>
              </h3>
            </div>

            <ScrollArea className="max-h-[45vh]">
              <div className="px-6 pb-6 space-y-3">
                {order.maintenance_order_items?.map((item, index) => {
                  const pivotRepairTypes = item.maintenance_order_item_repair_types ?? [];
                  const repairTypeNames: string[] =
                    pivotRepairTypes.length > 0
                      ? pivotRepairTypes.map((rt) => rt.types_of_repairs?.name).filter((n): n is string => Boolean(n))
                      : item.types_of_repairs?.name
                        ? [item.types_of_repairs.name]
                        : [];

                  return (
                    <div key={item.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                            #{index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium leading-snug">
                              {item.maintenance_request_items?.checklist_deviations?.item_label || 'Sin título'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatSectionCode(item.maintenance_request_items?.checklist_deviations?.section_code)}
                            </p>
                          </div>
                        </div>
                        {repairTypeNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-end shrink-0">
                            {repairTypeNames.map((name, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <ItemComments
                        item={item}
                        source={order.maintenance_requests?.source}
                        fallbackAuthorName={
                          order.maintenance_requests?.profile_maintenance_requests_supervisor_idToprofile?.fullname
                        }
                      />
                    </div>
                  );
                })}

                {itemCount === 0 && (
                  <p className="text-muted-foreground text-center py-6 text-sm">No hay items registrados</p>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
