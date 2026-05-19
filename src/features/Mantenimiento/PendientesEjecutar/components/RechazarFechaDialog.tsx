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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { PreventiveInfoCard } from '@/features/Mantenimiento/components/PreventiveInfoCard';
import { Logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import { useState } from 'react';
import { toast } from 'sonner';
import { rejectMaintenanceOrderDate } from '../../actions/actionsServer';
import { invalidateAllMaintenanceQueries } from '../../utils/queryInvalidation';
import type { PendingExecutionListItem } from '../actions.server';

// Configurar moment en español
moment.locale('es');

const logger = new Logger('RechazarFechaDialog');

interface RechazarFechaDialogProps {
  order: PendingExecutionListItem;
  open: boolean;
  onClose: () => void;
}

export function RechazarFechaDialog({ order, open, onClose }: RechazarFechaDialogProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');

  const vehicle = order.vehicles;
  const scheduledDate = order.scheduled_date ? moment.utc(order.scheduled_date) : null;
  const items = order.maintenance_order_items || [];

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error('Debe ingresar un motivo de rechazo');
      return;
    }

    setIsLoading(true);
    try {
      await rejectMaintenanceOrderDate(order.id, reason);

      toast.success('Fecha rechazada', {
        description: 'El pedido volverá a estado de planificación para asignar nueva fecha.',
      });

      invalidateAllMaintenanceQueries(queryClient);
      onClose();
    } catch (error) {
      logger.error('Error al rechazar fecha', { data: { error, orderId: order.id } });
      toast.error('Error al rechazar la fecha');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Rechazar Fecha de Mantenimiento</DialogTitle>
          <DialogDescription>Indicar el motivo por el cual se rechaza la fecha planificada</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-sm text-muted-foreground">Equipo</span>
                <p className="font-medium">
                  {vehicle?.domain || vehicle?.serie || 'Sin identificar'}
                  {vehicle?.intern_number && ` (#${vehicle.intern_number})`}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Fecha Planificada</span>
                <p className="font-medium capitalize">
                  {scheduledDate ? scheduledDate.format('dddd DD [de] MMMM [de] YYYY') : '-'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Lista de Items */}
          <div>
            {order.maintenance_requests?.source === 'preventive' && (
              <PreventiveInfoCard preventiveType={order.maintenance_requests?.preventive_type ?? ''} className="mb-3" />
            )}
            {items.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Items a Reparar</span>
                  <Badge variant="secondary">{items.length} items</Badge>
                </div>
                <div className="max-h-[150px] overflow-y-auto">
                  <div className="space-y-2 pr-2">
                    {items.map((item, index) => {
                      const deviation = item.maintenance_request_items?.checklist_deviations;
                      const repairType = item.types_of_repairs;
                      const formattedCode = deviation?.item_code?.replace(/_/g, ' ') || '';

                      return (
                        <div key={item.id || index} className="p-2 border rounded-md bg-background">
                          <p className="text-sm font-medium">{deviation?.item_label || 'Desvío sin descripción'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {formattedCode && (
                              <span className="text-xs text-muted-foreground">Código: {formattedCode}</span>
                            )}
                            {repairType && (
                              <Badge variant="outline" className="text-xs">
                                {repairType.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            {items.length === 0 && order.maintenance_requests?.source !== 'preventive' && (
              <p className="text-sm text-muted-foreground text-center py-2">No hay items registrados</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Motivo de Rechazo *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Indique el motivo por el cual rechaza esta fecha..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            El pedido volverá a estado &quot;Pendiente de Planificación&quot; para que se asigne una nueva fecha.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleReject} disabled={isLoading || !reason.trim()} variant="destructive">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rechazar Fecha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
