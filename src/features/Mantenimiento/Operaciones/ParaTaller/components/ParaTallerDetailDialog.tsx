'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ItemComments } from '@/features/Mantenimiento/components/ItemComments';
import { formatDateOnly } from '@/features/Mantenimiento/utils/dateFormat';
import { type OrderForWorkshopData } from '../../actions/actionsServer';

interface ParaTallerDetailDialogProps {
  order: OrderForWorkshopData;
  open: boolean;
  onClose: () => void;
}

export function ParaTallerDetailDialog({ order, open, onClose }: ParaTallerDetailDialogProps) {
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
          <DialogTitle>Detalle del Pedido</DialogTitle>
          <DialogDescription>Pedido con fecha confirmada - Listo para entrada a taller</DialogDescription>
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
                  <span className="text-sm text-muted-foreground">Condición:</span>
                  <div className="mt-1">
                    <Badge variant={order.vehicles?.condition === 'operativo' ? 'success' : 'destructive'}>
                      {order.vehicles?.condition || 'Desconocido'}
                    </Badge>
                  </div>
                </div>
                {order.scheduled_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">Fecha Planificada:</span>
                    <p className="font-medium">{formatDateOnly(order.scheduled_date)}</p>
                  </div>
                )}
                {order.vehicles?.kilometer && (
                  <div>
                    <span className="text-sm text-muted-foreground">Kilometraje:</span>
                    <p className="font-medium">{Number(order.vehicles.kilometer).toLocaleString('es-AR')} km</p>
                  </div>
                )}
                {order.vehicles?.engine_hours && (
                  <div>
                    <span className="text-sm text-muted-foreground">Horómetro:</span>
                    <p className="font-medium">{order.vehicles.engine_hours} hs</p>
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
                        <div className="flex-1">
                          <p className="font-medium">
                            {item.maintenance_request_items?.checklist_deviations?.item_label || 'Sin título'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Sección:{' '}
                            {formatSectionCode(item.maintenance_request_items?.checklist_deviations?.section_code)}
                          </p>
                          <ItemComments item={item} source={order.maintenance_requests?.source} />
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
