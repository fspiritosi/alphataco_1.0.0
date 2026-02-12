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
import { formatDateLong } from '@/features/Mantenimiento/utils/dateFormat';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { MAINTENANCE_ORDERS_QUERY_KEY } from '../../../MaintenanceOrders/hooks/useMaintenanceOrders';
import { ORDER_MANAGEMENT_QUERY_KEY } from '../../../OrderManagement/hooks/useOrderManagement';
import { PLANIFICACION_QUERY_KEY } from '../../../Planificacion/hooks/usePlanificacion';
import { WORKSHOP_TRACKING_QUERY_KEY } from '../../../WorkshopTracking/hooks/useWorkshopTracking';
import { approveWorkshopEntry, type OrderForWorkshopData } from '../../actions/actionsServer';
import { PARA_TALLER_QUERY_KEY } from './ParaTallerTableClient';

interface ParaTallerEntradaDialogProps {
  order: OrderForWorkshopData;
  open: boolean;
  onClose: () => void;
}

export function ParaTallerEntradaDialog({ order, open, onClose }: ParaTallerEntradaDialogProps) {
  const [kilometer, setKilometer] = useState(order.vehicles?.kilometer?.toString() || '');
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: approveWorkshopEntry,
    onSuccess: () => {
      // Invalidar la vista de Para Taller
      queryClient.invalidateQueries({ queryKey: PARA_TALLER_QUERY_KEY });
      // Invalidar Planificación ya que el equipo ahora está en taller
      queryClient.invalidateQueries({ queryKey: PLANIFICACION_QUERY_KEY });
      // Invalidar Gestion de Ordenes, Ordenes de Mantenimiento y Seguimiento en Taller
      queryClient.invalidateQueries({ queryKey: [...ORDER_MANAGEMENT_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [...MAINTENANCE_ORDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [...WORKSHOP_TRACKING_QUERY_KEY] });
      // Invalidar otras vistas relacionadas
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'operaciones'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });

  const handleApprove = async () => {
    if (!kilometer.trim()) {
      toast.error('Debe ingresar el kilometraje actual');
      return;
    }

    const inputKm = Number(kilometer.trim());
    if (isNaN(inputKm) || inputKm < 0) {
      toast.error('El kilometraje debe ser un número válido mayor o igual a 0');
      return;
    }

    // Validar que el kilometraje no sea menor al actual del equipo
    // Solo si el equipo tiene un kilometraje registrado mayor a 0
    const currentKm = Number(order.vehicles?.kilometer) || 0;
    if (currentKm > 0 && inputKm < currentKm) {
      toast.error(`El kilometraje no puede ser menor al actual del equipo (${currentKm.toLocaleString('es-AR')} km)`);
      return;
    }

    try {
      await approveMutation.mutateAsync({
        orderId: order.id,
        kilometer: kilometer.trim(),
      });
      toast.success('Entrada a taller aprobada. El equipo ahora está "No Operativo"');
      onClose();
    } catch {
      toast.error('Error al aprobar la entrada a taller');
    }
  };

  const items = order.maintenance_order_items || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprobar Entrada a Taller</DialogTitle>
          <DialogDescription>
            Confirme la entrada del equipo{' '}
            <span className="font-medium">{order.vehicles?.domain || order.vehicles?.serie || 'Sin identificar'}</span>{' '}
            al taller.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Advertencia */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Esta acción actualizará el equipo:</p>
              <ul className="list-disc list-inside mt-1">
                <li>
                  La condición cambiará a{' '}
                  <Badge variant="destructive" className="ml-1">
                    No Operativo
                  </Badge>
                </li>
                <li>El kilometraje se actualizará al valor ingresado</li>
              </ul>
            </div>
          </div>

          {/* Información actual */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Condición actual:</span>
              <Badge variant={order.vehicles?.condition === 'operativo' ? 'success' : 'destructive'}>
                {order.vehicles?.condition || 'Desconocido'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Km actual:</span>
              <span className="font-medium">{order.vehicles?.kilometer || '-'} km</span>
            </div>
            {order.scheduled_date && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Fecha programada:</span>
                <span className="font-medium">{formatDateLong(order.scheduled_date)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Items a reparar:</span>
              <span className="font-medium">{items.length}</span>
            </div>
          </div>

          {/* Lista de items */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label>Items a Reparar</Label>
              <div className="max-h-[150px] overflow-y-auto">
                <div className="space-y-2 pr-2">
                  {items.map((item, index) => {
                    const deviation = item.maintenance_request_items?.checklist_deviations;
                    const formattedCode = deviation?.item_code?.replace(/_/g, ' ') || '';

                    // Extraer tipos de reparación de la tabla pivot (prioridad) o del campo legacy
                    const pivotRepairTypes = (item as any).maintenance_order_item_repair_types || [];
                    const repairTypeNames: string[] =
                      pivotRepairTypes.length > 0
                        ? pivotRepairTypes.map((rt: any) => rt.types_of_repairs?.name).filter(Boolean)
                        : item.types_of_repairs?.name
                          ? [item.types_of_repairs.name]
                          : [];

                    return (
                      <div key={item.id || index} className="p-2 bg-muted rounded text-sm">
                        <div className="font-medium">{deviation?.item_label || 'Sin etiqueta'}</div>
                        <div className="text-xs text-muted-foreground">
                          Código: {formattedCode}
                          {repairTypeNames.length > 0 && (
                            <span className="ml-2">
                              | Tipo{repairTypeNames.length > 1 ? 's' : ''}:{' '}
                              <span className="font-medium">{repairTypeNames.join(', ')}</span>
                            </span>
                          )}
                        </div>
                        {((item.maintenance_request_items as any)?.driver_comment || deviation?.driver_comment) && (
                          <div className="text-xs mt-1">
                            <span className="text-muted-foreground">Chofer: </span>
                            <span className="italic">
                              {(item.maintenance_request_items as any)?.driver_comment || deviation?.driver_comment}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Input de kilometraje */}
          <div className="space-y-2">
            <Label htmlFor="kilometer">Kilometraje actual del equipo *</Label>
            <Input
              id="kilometer"
              type="number"
              min={order.vehicles?.kilometer && Number(order.vehicles.kilometer) > 0 ? order.vehicles.kilometer : 0}
              value={kilometer}
              onChange={(e) => setKilometer(e.target.value)}
              placeholder="Ej: 150000"
            />
            <p className="text-xs text-muted-foreground">
              Ingrese el kilometraje actual al momento de la entrada al taller
              {order.vehicles?.kilometer && Number(order.vehicles.kilometer) > 0 && (
                <span className="block mt-1 text-yellow-600">
                  Mínimo permitido: {Number(order.vehicles.kilometer).toLocaleString('es-AR')} km (actual del equipo)
                </span>
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleApprove} disabled={approveMutation.isPending || !kilometer.trim()}>
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
