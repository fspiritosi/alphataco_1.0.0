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
  const [engineHours, setEngineHours] = useState(order.vehicles?.engine_hours?.toString() || '');
  const [engineHoursError, setEngineHoursError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Valor mínimo permitido para horómetro
  const currentEngineHours = Number(order.vehicles?.engine_hours) || 0;

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

  // Validar horómetro cuando cambia
  const handleEngineHoursChange = (value: string) => {
    setEngineHours(value);
    if (value.trim()) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && currentEngineHours > 0 && numValue < currentEngineHours) {
        setEngineHoursError(
          `El horómetro no puede ser menor al actual del equipo (${currentEngineHours.toLocaleString('es-AR')} hs)`,
        );
      } else {
        setEngineHoursError(null);
      }
    } else {
      setEngineHoursError(null);
    }
  };

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

    // Validar horómetro si fue ingresado
    if (engineHours.trim()) {
      const numEngineHours = parseFloat(engineHours);
      if (!isNaN(numEngineHours) && currentEngineHours > 0 && numEngineHours < currentEngineHours) {
        toast.error(
          `El horómetro no puede ser menor al actual del equipo (${currentEngineHours.toLocaleString('es-AR')} hs)`,
        );
        return;
      }
    }

    try {
      await approveMutation.mutateAsync({
        orderId: order.id,
        kilometer: kilometer.trim(),
        ...(engineHours.trim() && { engine_hours: engineHours.trim() }),
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
                <li>El horómetro se actualizará si se ingresa un valor</li>
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
            {order.vehicles?.engine_hours && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Horómetro actual:</span>
                <span className="font-medium">{order.vehicles.engine_hours} hs</span>
              </div>
            )}
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
                    const pivotRepairTypes = (
                      item as {
                        maintenance_order_item_repair_types?: { types_of_repairs?: { name: string } }[];
                      }
                    ).maintenance_order_item_repair_types || [];
                    const repairTypeNames: string[] =
                      pivotRepairTypes.length > 0
                        ? pivotRepairTypes.map((rt) => rt.types_of_repairs?.name ?? '').filter(Boolean)
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
                        {((item.maintenance_request_items as { driver_comment?: string } | null)?.driver_comment ||
                          deviation?.driver_comment) && (
                          <div className="text-xs mt-1">
                            <span className="text-muted-foreground">Chofer: </span>
                            <span className="italic">
                              {(item.maintenance_request_items as { driver_comment?: string } | null)?.driver_comment ||
                                deviation?.driver_comment}
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

          {/* Campos de KM y Horómetro en grilla de 2 columnas */}
          <div className="grid grid-cols-2 gap-4">
            {/* Input de kilometraje */}
            <div className="space-y-2">
              <Label htmlFor="kilometer">Kilometraje actual *</Label>
              <Input
                id="kilometer"
                type="number"
                min={order.vehicles?.kilometer && Number(order.vehicles.kilometer) > 0 ? order.vehicles.kilometer : 0}
                value={kilometer}
                onChange={(e) => setKilometer(e.target.value)}
                placeholder="Ej: 150000"
              />
              <p className="text-xs text-muted-foreground">
                {order.vehicles?.kilometer && Number(order.vehicles.kilometer) > 0 ? (
                  <span className="text-yellow-600">
                    Mín. {Number(order.vehicles.kilometer).toLocaleString('es-AR')} km (actual del equipo)
                  </span>
                ) : (
                  'Kilometraje al momento de la entrada'
                )}
              </p>
            </div>

            {/* Input de horómetro */}
            <div className="space-y-2">
              <Label htmlFor="engine-hours">Horómetro actual</Label>
              <Input
                id="engine-hours"
                type="text"
                value={engineHours}
                onChange={(e) => handleEngineHoursChange(e.target.value)}
                placeholder="Ej: 1250"
                className={engineHoursError ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {engineHoursError ? (
                <p className="text-xs text-red-600">{engineHoursError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {currentEngineHours > 0
                    ? `Mín. ${currentEngineHours.toLocaleString('es-AR')} hs (actual del equipo)`
                    : 'Horómetro al momento de la entrada (opcional)'}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approveMutation.isPending || !kilometer.trim() || !!engineHoursError}
          >
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
