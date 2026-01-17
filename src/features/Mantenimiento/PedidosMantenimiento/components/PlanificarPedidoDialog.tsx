'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2 } from 'lucide-react';
import moment from 'moment';
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
        scheduledDate: moment(date).format('YYYY-MM-DD'),
      });
      toast.success('Pedido planificado exitosamente');
      onClose();
    } catch {
      toast.error('Error al planificar el pedido');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planificar Pedido de Mantenimiento</DialogTitle>
          <DialogDescription>
            Seleccione la fecha en que el equipo{' '}
            <span className="font-medium">{order.vehicles?.domain || order.vehicles?.serie || 'Sin identificar'}</span>{' '}
            será recibido en el taller.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Resumen de items */}
          <div className="p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Items a reparar: </span>
            <span className="font-medium">{order.maintenance_order_items?.length || 0}</span>
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
                  {date ? moment(date).format('DD/MM/YYYY') : 'Seleccionar fecha'}
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
