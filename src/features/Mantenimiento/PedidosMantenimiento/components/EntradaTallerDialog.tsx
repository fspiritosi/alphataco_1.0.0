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
import { getDriverCommentInfo } from '@/features/Mantenimiento/utils/driverInfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PLANIFICACION_QUERY_KEY } from '../../Planificacion/hooks/usePlanificacion';
import { PEDIDOS_CONFIRMADOS_QUERY_KEY } from '../Confirmados/components/ConfirmadosTableClient';
import { approveWorkshopEntryFromOrder, type MaintenanceOrderData } from '../actions/actionsServer';
import { MAINTENANCE_ORDERS_QUERY_KEY, PEDIDOS_PENDIENTES_QUERY_KEY } from '../hooks/useMaintenanceOrders';

interface EntradaTallerDialogProps {
  order: MaintenanceOrderData;
  open: boolean;
  onClose: () => void;
}

/**
 * Obtiene el kilometraje inicial para el formulario.
 * Prioridad:
 * 1. Kilometraje de las respuestas del checklist (si existe y es > 0)
 * 2. Kilometraje del vehículo (fallback)
 */
function getInitialKilometer(order: MaintenanceOrderData): { value: string; source: 'checklist' | 'vehicle' | 'none' } {
  const items = order.maintenance_order_items || [];
  for (const item of items) {
    const deviation = item.maintenance_request_items?.checklist_deviations;
    // answer_data viene de la query pero el tipo no lo incluye, usamos casting
    const checklistAnswer = deviation?.checklist_answers as { answer_data?: { kilometraje?: string } } | null;
    const answerData = checklistAnswer?.answer_data;
    if (answerData?.kilometraje) {
      const kmValue = parseInt(answerData.kilometraje, 10);
      if (!isNaN(kmValue) && kmValue > 0) {
        return { value: answerData.kilometraje, source: 'checklist' };
      }
    }
  }

  // Fallback: kilometraje del vehículo
  const vehicleKm = order.vehicles?.kilometer;
  if (vehicleKm) {
    const kmValue = typeof vehicleKm === 'string' ? parseInt(vehicleKm, 10) : vehicleKm;
    if (!isNaN(kmValue) && kmValue > 0) {
      return { value: kmValue.toString(), source: 'vehicle' };
    }
  }

  return { value: '', source: 'none' };
}

export function EntradaTallerDialog({ order, open, onClose }: EntradaTallerDialogProps) {
  // Obtener kilometraje inicial y su origen
  const initialKm = useMemo(() => getInitialKilometer(order), [order]);
  const [kilometer, setKilometer] = useState(initialKm.value);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Estado del horómetro — se precarga desde el vehículo si existe
  const [engineHours, setEngineHours] = useState(order.vehicles?.engine_hours?.toString() || '');
  const [engineHoursError, setEngineHoursError] = useState<string | null>(null);
  const minEngineHours = useMemo(() => {
    const parsed = parseFloat(order.vehicles?.engine_hours?.toString() || '');
    return !isNaN(parsed) && parsed > 0 ? parsed : 0;
  }, [order.vehicles?.engine_hours]);

  const queryClient = useQueryClient();

  // Valor mínimo permitido (el valor precargado)
  const minKilometer = useMemo(() => {
    const parsed = parseInt(initialKm.value, 10);
    return !isNaN(parsed) ? parsed : 0;
  }, [initialKm.value]);

  // Validar kilometraje cuando cambia
  const handleKilometerChange = (value: string) => {
    setKilometer(value);
    if (value.trim()) {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && minKilometer > 0 && numValue < minKilometer) {
        setValidationError(
          `El kilometraje no puede ser menor a ${minKilometer.toLocaleString()} km (valor registrado)`,
        );
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  };

  // Validar horómetro cuando cambia
  const handleEngineHoursChange = (value: string) => {
    setEngineHours(value);
    if (value.trim()) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && minEngineHours > 0 && numValue < minEngineHours) {
        setEngineHoursError(
          `El horómetro no puede ser menor a ${minEngineHours.toLocaleString()} hs (valor registrado)`,
        );
      } else {
        setEngineHoursError(null);
      }
    } else {
      setEngineHoursError(null);
    }
  };

  const approveMutation = useMutation({
    mutationFn: approveWorkshopEntryFromOrder,
    onSuccess: () => {
      // Invalidar todas las vistas relacionadas con pedidos de mantenimiento
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PEDIDOS_CONFIRMADOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PEDIDOS_PENDIENTES_QUERY_KEY });
      // Invalidar Planificación ya que el equipo ahora está en taller
      queryClient.invalidateQueries({ queryKey: PLANIFICACION_QUERY_KEY });
      // Invalidar queries de vehículos (se actualiza condición, km y horómetro)
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });

  const handleApprove = async () => {
    if (!kilometer.trim()) {
      toast.error('Debe ingresar el kilometraje actual');
      return;
    }

    // Validar que no sea menor al valor precargado
    const numKilometer = parseInt(kilometer, 10);
    if (!isNaN(numKilometer) && minKilometer > 0 && numKilometer < minKilometer) {
      toast.error(`El kilometraje no puede ser menor a ${minKilometer.toLocaleString()} km`);
      return;
    }

    // Validar horómetro si fue ingresado
    if (engineHours.trim()) {
      const numEngineHours = parseFloat(engineHours);
      if (!isNaN(numEngineHours) && minEngineHours > 0 && numEngineHours < minEngineHours) {
        toast.error(`El horómetro no puede ser menor a ${minEngineHours.toLocaleString()} hs`);
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

                    // Obtener información del chofer
                    const driverInfo = getDriverCommentInfo(item);

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
                        {driverInfo && (
                          <div className="text-xs mt-1">
                            <span className="text-muted-foreground">
                              Chofer{driverInfo.driverName && ` (${driverInfo.driverName})`}:{' '}
                            </span>
                            <span className="italic">{driverInfo.comment}</span>
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
                type="text"
                value={kilometer}
                onChange={(e) => handleKilometerChange(e.target.value)}
                placeholder="Ej: 150000"
                className={validationError ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {validationError ? (
                <p className="text-xs text-red-600">{validationError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {initialKm.source === 'checklist' ? (
                    <>Precargado desde checklist ({minKilometer.toLocaleString()} km). No puede ser menor.</>
                  ) : initialKm.source === 'vehicle' ? (
                    <>Precargado desde el vehículo ({minKilometer.toLocaleString()} km). No puede ser menor.</>
                  ) : (
                    'Kilometraje al momento de la entrada'
                  )}
                </p>
              )}
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
                  {minEngineHours > 0
                    ? `Mín. ${minEngineHours.toLocaleString()} hs (actual del equipo)`
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
            disabled={approveMutation.isPending || !kilometer.trim() || !!validationError || !!engineHoursError}
          >
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
