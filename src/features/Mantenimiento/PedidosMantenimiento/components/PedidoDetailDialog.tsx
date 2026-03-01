'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ItemComments } from '@/features/Mantenimiento/components/ItemComments';
import { formatDateOnly, formatDateTime } from '@/features/Mantenimiento/utils/dateFormat';
import type { MaintenanceOrderData } from '../actions/actionsServer';

interface PedidoDetailDialogProps {
  order: MaintenanceOrderData;
  open: boolean;
  onClose: () => void;
}

export function PedidoDetailDialog({ order, open, onClose }: PedidoDetailDialogProps) {
  const statusConfig: Record<
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

  // Función para formatear el código de sección (sistema_electrico -> Sistema Eléctrico)
  const formatSectionCode = (code: string | null | undefined): string => {
    if (!code) return '-';
    return code
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Pedido de Mantenimiento</DialogTitle>
          <DialogDescription>Pedido creado el {formatDateTime(order.created_at)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información general */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Equipo:</span>
                  <p className="font-medium">
                    {order.vehicles?.domain || order.vehicles?.serie || 'Sin identificar'}
                    {order.vehicles?.intern_number && ` (#${order.vehicles.intern_number})`}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  <div className="mt-1">
                    <Badge variant={statusConfig[order.status]?.variant || 'secondary'}>
                      {statusConfig[order.status]?.label || order.status}
                    </Badge>
                  </div>
                </div>
                {order.scheduled_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">Fecha Planificada:</span>
                    <p className="font-medium">{formatDateOnly(order.scheduled_date)}</p>
                  </div>
                )}
                {order.maintenance_requests?.kilometer && (
                  <div>
                    <span className="text-sm text-muted-foreground">Kilometraje:</span>
                    <p className="font-medium">{order.maintenance_requests.kilometer} km</p>
                  </div>
                )}
                {order.maintenance_requests?.engine_hours && (
                  <div>
                    <span className="text-sm text-muted-foreground">Horómetro:</span>
                    <p className="font-medium">{order.maintenance_requests.engine_hours} hs</p>
                  </div>
                )}
              </div>

              {order.date_rejection_reason && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Motivo de reprogramación:
                  </span>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{order.date_rejection_reason}</p>
                  {order.date_rejected_at && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      Rechazado el {formatDateTime(order.date_rejected_at)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Items del pedido */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Items a Reparar ({order.maintenance_order_items?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.maintenance_order_items?.map((item) => {
                  // Extraer tipos de reparación de la tabla pivot (prioridad) o del campo legacy
                  const pivotRepairTypes = (item as any).maintenance_order_item_repair_types || [];
                  const repairTypeNames: string[] =
                    pivotRepairTypes.length > 0
                      ? pivotRepairTypes.map((rt: any) => rt.types_of_repairs?.name).filter(Boolean)
                      : item.types_of_repairs?.name
                        ? [item.types_of_repairs.name]
                        : [];

                  return (
                    <div key={item.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {item.maintenance_request_items?.checklist_deviations?.item_label || 'Sin título'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Sección:{' '}
                            {formatSectionCode(item.maintenance_request_items?.checklist_deviations?.section_code)}
                          </p>
                        </div>
                        {repairTypeNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                            {repairTypeNames.map((name, idx) => (
                              <Badge key={idx} variant="secondary">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <ItemComments item={item} source={order.maintenance_requests?.source} />
                    </div>
                  );
                })}

                {(!order.maintenance_order_items || order.maintenance_order_items.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">No hay items registrados</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
