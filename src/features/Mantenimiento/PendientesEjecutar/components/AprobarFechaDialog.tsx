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
import { Separator } from '@/components/ui/separator';
import { ItemComments } from '@/features/Mantenimiento/components/ItemComments';
import { PreventiveInfoCard } from '@/features/Mantenimiento/components/PreventiveInfoCard';
import { Logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import { useState } from 'react';
import { toast } from 'sonner';
import { approveMaintenanceOrderDate } from '../../actions/actionsServer';
import { invalidateAllMaintenanceQueries } from '../../utils/queryInvalidation';
import type { PendingExecutionListItem } from '../actions.server';

// Configurar moment en español
moment.locale('es');

const logger = new Logger('AprobarFechaDialog');

interface AprobarFechaDialogProps {
  order: PendingExecutionListItem;
  open: boolean;
  onClose: () => void;
}

export function AprobarFechaDialog({ order, open, onClose }: AprobarFechaDialogProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const vehicle = order.vehicles;
  const scheduledDate = order.scheduled_date ? moment.utc(order.scheduled_date) : null;
  const items = order.maintenance_order_items || [];

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await approveMaintenanceOrderDate(order.id);

      toast.success('Fecha aprobada correctamente', {
        description: 'El equipo está listo para ingresar al taller en la fecha programada.',
      });

      invalidateAllMaintenanceQueries(queryClient);
      onClose();
    } catch (error) {
      logger.error('Error al aprobar fecha', { data: { error, orderId: order.id } });
      toast.error('Error al aprobar la fecha');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprobar Fecha de Mantenimiento</DialogTitle>
          <DialogDescription>Confirmar la fecha planificada para el equipo</DialogDescription>
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
                <p className="font-medium text-lg capitalize">
                  {scheduledDate ? scheduledDate.format('dddd DD [de] MMMM [de] YYYY') : '-'}
                </p>
              </div>
              {(order.description ?? order.maintenance_requests?.description) && (
                <div>
                  <span className="text-sm text-muted-foreground">Descripción</span>
                  <p className="font-medium whitespace-pre-wrap break-words">
                    {order.description ?? order.maintenance_requests?.description}
                  </p>
                </div>
              )}
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
                <div className="max-h-[200px] overflow-y-auto">
                  <div className="space-y-2 pr-2">
                    {items.map((item, index) => {
                      const deviation = item.maintenance_request_items?.checklist_deviations;
                      const formattedCode = deviation?.item_code?.replace(/_/g, ' ') || '';

                      // Extraer tipos de reparación de la tabla pivot (prioridad) o del campo legacy
                      const pivotRepairTypes = item.maintenance_order_item_repair_types ?? [];
                      const repairTypeNames: string[] =
                        pivotRepairTypes.length > 0
                          ? pivotRepairTypes
                              .map((rt) => rt.types_of_repairs?.name)
                              .filter((n): n is string => Boolean(n))
                          : item.types_of_repairs?.name
                            ? [item.types_of_repairs.name]
                            : [];

                      return (
                        <div key={item.id || index} className="p-2 border rounded-md bg-background">
                          <p className="text-sm font-medium">{deviation?.item_label || 'Desvío sin descripción'}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {formattedCode && (
                              <span className="text-xs text-muted-foreground">Código: {formattedCode}</span>
                            )}
                            {repairTypeNames.map((name, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                          </div>
                          <div className="mt-1">
                            <ItemComments
                              item={item}
                              source={order.maintenance_requests?.source}
                              fallbackAuthorName={
                                order.maintenance_requests?.profile_maintenance_requests_supervisor_idToprofile
                                  ?.fullname
                              }
                            />
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

          <div className="text-sm text-muted-foreground">
            Al aprobar la fecha, el pedido quedará disponible para que el taller apruebe la entrada del equipo.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleApprove} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aprobar Fecha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
