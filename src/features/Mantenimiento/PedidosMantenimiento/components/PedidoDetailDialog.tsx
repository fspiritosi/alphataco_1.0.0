'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import moment from 'moment';
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
    scheduled: { label: 'Planificado', variant: 'success' },
    in_workshop: { label: 'En Taller', variant: 'default' },
    completed: { label: 'Completado', variant: 'secondary' },
    rejected: { label: 'Rechazado', variant: 'destructive' },
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Pedido de Mantenimiento</DialogTitle>
          <DialogDescription>Pedido creado el {moment(order.created_at).format('DD/MM/YYYY HH:mm')}</DialogDescription>
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
                    <p className="font-medium">{moment(order.scheduled_date).format('DD/MM/YYYY')}</p>
                  </div>
                )}
                {order.maintenance_requests?.kilometer && (
                  <div>
                    <span className="text-sm text-muted-foreground">Kilometraje:</span>
                    <p className="font-medium">{order.maintenance_requests.kilometer} km</p>
                  </div>
                )}
              </div>
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
                {order.maintenance_order_items?.map((item) => (
                  <div key={item.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          {item.maintenance_request_items?.checklist_deviations?.item_label || 'Sin título'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Sección: {item.maintenance_request_items?.checklist_deviations?.section_code || '-'}
                        </p>
                      </div>
                      {item.types_of_repairs && <Badge variant="secondary">{item.types_of_repairs.name}</Badge>}
                    </div>

                    {item.description && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Descripción adicional: </span>
                        {item.description}
                      </div>
                    )}
                  </div>
                ))}

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
