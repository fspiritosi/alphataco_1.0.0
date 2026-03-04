'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemComments } from '@/features/Mantenimiento/components/ItemComments';
import { formatDateForDB, formatDateOnly } from '@/features/Mantenimiento/utils/dateFormat';
import { cn } from '@/lib/utils';
import { AlertCircle, CalendarIcon, Loader2, Wrench } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceOrderData } from '../actions/actionsServer';
import { useScheduleMaintenanceOrder } from '../hooks/useMaintenanceOrders';

interface PlanificarPedidoDialogProps {
  order: MaintenanceOrderData;
  open: boolean;
  onClose: () => void;
}

export function PlanificarPedidoDialog({ order, open, onClose }: PlanificarPedidoDialogProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const scheduleMutation = useScheduleMaintenanceOrder();

  const handleSchedule = async () => {
    if (!date) {
      toast.error('Debe seleccionar una fecha');
      return;
    }

    try {
      await scheduleMutation.mutateAsync({
        orderId: order.id,
        scheduledDate: formatDateForDB(date),
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
      // Extraer tipos de reparación de la tabla pivot (prioridad) o del campo legacy
      const pivotRepairTypes = (item as any).maintenance_order_item_repair_types || [];
      const repairTypeNames: string[] =
        pivotRepairTypes.length > 0
          ? pivotRepairTypes.map((rt: any) => rt.types_of_repairs?.name).filter(Boolean)
          : item.types_of_repairs?.name
            ? [item.types_of_repairs.name]
            : ['Sin tipo asignado'];

      // Si hay múltiples tipos, el item aparecerá en cada grupo
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Planificar Pedido de Mantenimiento</DialogTitle>
          <DialogDescription>
            Seleccione la fecha en que el equipo{' '}
            <span className="font-medium">{order.vehicles?.domain || order.vehicles?.serie || 'Sin identificar'}</span>{' '}
            será recibido en el taller.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Información del equipo */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Equipo:</span>
                  <p className="font-medium">
                    {order.vehicles?.domain || order.vehicles?.serie || 'Sin identificar'}
                    {order.vehicles?.intern_number && ` (Nº ${order.vehicles.intern_number})`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Kilometraje:</span>
                  <p className="font-medium">
                    {order.maintenance_requests?.kilometer || order.vehicles?.kilometer || '-'} km
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Horómetro:</span>
                  <p className="font-medium">
                    {order.maintenance_requests?.engine_hours || order.vehicles?.engine_hours || '-'} hs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de items a reparar */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Items a reparar ({order.maintenance_order_items?.length || 0})
            </Label>
            <ScrollArea className="h-[200px] rounded-md border p-3">
              <div className="space-y-4">
                {Object.entries(itemsByRepairType).map(([repairType, items]) => (
                  <div key={repairType} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-medium">
                        {repairType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">({items?.length || 0} items)</span>
                    </div>
                    <div className="ml-4 space-y-1">
                      {items?.map((item) => {
                        const deviation = item.maintenance_request_items?.checklist_deviations;
                        return (
                          <div key={item.id} className="flex items-start gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="font-medium">{deviation?.item_label || 'Item sin descripción'}</span>
                              {deviation?.section_code && (
                                <span className="text-muted-foreground ml-2 text-xs">
                                  (Sección: {deviation.section_code.replace('_', ' ')})
                                </span>
                              )}
                              <ItemComments item={item} source={order.maintenance_requests?.source} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {(!order.maintenance_order_items || order.maintenance_order_items.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay items registrados</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Selector de fecha */}
          <div className="space-y-2">
            <Label>Fecha de recepción en taller</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? formatDateOnly(date) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSchedule} disabled={scheduleMutation.isPending || !date}>
            {scheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Planificación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
