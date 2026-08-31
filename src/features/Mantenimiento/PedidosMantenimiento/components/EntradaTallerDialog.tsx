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
import { ItemComments } from '@/features/Mantenimiento/components/ItemComments';
import { PreventiveInfoCard } from '@/features/Mantenimiento/components/PreventiveInfoCard';
import { RepairItemPhotos } from '@/features/Mantenimiento/shared/components/RepairItemPhotos';
import { formatDateLong } from '@/features/Mantenimiento/utils/dateFormat';
import { getInitialKilometer, validateKilometer } from '@/features/Mantenimiento/utils/kilometerPreload';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  getResourceCondition,
  getResourceInternNumber,
  getResourceKind,
  getResourceKindLabel,
  getResourceLabel,
} from '../../shared/maintenance-resource';
import { getRepairItemImages, getRepairItemLabel } from '../../shared/repair-item-label';
import { approveWorkshopEntryFromOrder, type MaintenanceOrderData } from '../actions/actionsServer';

interface EntradaTallerDialogProps {
  order: MaintenanceOrderData;
  open: boolean;
  onClose: () => void;
}

export function EntradaTallerDialog({ order, open, onClose }: EntradaTallerDialogProps) {
  // Ticket 596: un equipamiento no lleva kilometraje — se mide por horómetro.
  const isOtherEquipment = getResourceKind(order) === 'other_equipment';
  const resourceLabel = getResourceLabel(order);
  const resourceKindLabel = getResourceKindLabel(order);
  const resourceInternNumber = getResourceInternNumber(order);
  const resourceCondition = getResourceCondition(order);

  // Obtener kilometraje inicial y su origen
  const initialKm = useMemo(
    () => getInitialKilometer(order.vehicles?.kilometer, order.maintenance_order_items),
    [order]
  );
  const [kilometer, setKilometer] = useState(initialKm.value);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Horómetro: precargado del vehículo (opcional)
  const initialEngineHours = useMemo(() => {
    const hours = order.other_equipment?.horometer ?? order.vehicles?.engine_hours;
    return hours ? String(hours) : '';
  }, [order]);
  const [engineHours, setEngineHours] = useState(initialEngineHours);
  const [engineHoursError, setEngineHoursError] = useState<string | null>(null);

  const minEngineHours = useMemo(() => {
    const parsed = parseInt(initialEngineHours, 10);
    return !isNaN(parsed) ? parsed : 0;
  }, [initialEngineHours]);

  const handleEngineHoursChange = (value: string) => {
    setEngineHours(value);
    if (!value.trim()) {
      setEngineHoursError(null);
      return;
    }
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      setEngineHoursError('Ingrese un valor numérico válido');
    } else if (minEngineHours > 0 && num < minEngineHours) {
      setEngineHoursError(`No puede ser menor a ${minEngineHours.toLocaleString()} hs`);
    } else {
      setEngineHoursError(null);
    }
  };

  const queryClient = useQueryClient();

  // Valor mínimo permitido (el valor precargado)
  const minKilometer = useMemo(() => {
    const parsed = parseInt(initialKm.value, 10);
    return !isNaN(parsed) ? parsed : 0;
  }, [initialKm.value]);

  // Validar kilometraje cuando cambia
  const handleKilometerChange = (value: string) => {
    setKilometer(value);
    setValidationError(validateKilometer(value, minKilometer));
  };

  const approveMutation = useMutation({
    mutationFn: approveWorkshopEntryFromOrder,
    onSuccess: () => {
      invalidateAllMaintenanceQueries(queryClient);
    },
  });

  const handleApprove = async () => {
    if (!isOtherEquipment && !kilometer.trim()) {
      toast.error('Debe ingresar el kilometraje actual');
      return;
    }

    // Validar que no sea menor al valor precargado
    const numKilometer = parseInt(kilometer, 10);
    if (!isNaN(numKilometer) && minKilometer > 0 && numKilometer < minKilometer) {
      toast.error(`El kilometraje no puede ser menor a ${minKilometer.toLocaleString()} km`);
      return;
    }

    try {
      await approveMutation.mutateAsync({
        orderId: order.id,
        ...(kilometer.trim() ? { kilometer: kilometer.trim() } : {}),
        ...(engineHours.trim() ? { engine_hours: engineHours.trim() } : {}),
      });
      toast.success(
        `Entrada a taller aprobada. El ${isOtherEquipment ? 'equipamiento' : 'equipo'} ahora está "No Operativo"`
      );
      onClose();
    } catch {
      toast.error('Error al aprobar la entrada a taller');
    }
  };

  const items = order.maintenance_order_items || [];
  const isPreventive = order.maintenance_requests?.source === 'preventive';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprobar Entrada a Taller</DialogTitle>
          <DialogDescription>
            Confirme la entrada del {resourceKindLabel.toLowerCase()}{' '}
            <span className="font-medium">{resourceLabel}</span>
            {resourceInternNumber && <span className="text-muted-foreground"> (#{resourceInternNumber})</span>} al
            taller.
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
                {!isOtherEquipment && <li>El kilometraje se actualizará al valor ingresado</li>}
                {engineHours.trim() && <li>El horómetro se actualizará al valor ingresado</li>}
              </ul>
            </div>
          </div>

          {/* Información actual */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Condición actual:</span>
              <Badge variant={resourceCondition === 'operativo' ? 'success' : 'destructive'}>
                {resourceCondition || 'Desconocido'}
              </Badge>
            </div>
            {!isOtherEquipment && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Km actual:</span>
                <span className="font-medium">{order.vehicles?.kilometer || '-'} km</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Horómetro actual:</span>
              <span className="font-medium">
                {String((isOtherEquipment ? order.other_equipment?.horometer : order.vehicles?.engine_hours) ?? '-')} hs
              </span>
            </div>
            {order.scheduled_date && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Fecha programada:</span>
                <span className="font-medium">{formatDateLong(order.scheduled_date)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Items a reparar:</span>
              <span className="block font-medium">
                {isPreventive && items.length === 0 ? 'Preventivo' : items.length}
              </span>
            </div>
            {(order.description ?? order.maintenance_requests?.description) && (
              <div className="pt-1 border-t">
                <span className="text-sm text-muted-foreground">Descripción:</span>
                <p className="font-medium whitespace-pre-wrap break-words">
                  {order.description ?? order.maintenance_requests?.description}
                </p>
              </div>
            )}
          </div>

          {/* Preventive info */}
          {isPreventive && (
            <PreventiveInfoCard preventiveType={order.maintenance_requests?.preventive_type ?? ''} className="mb-2" />
          )}

          {/* Lista de items */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label>Items a Reparar</Label>
              {/* Se amplia respecto de los 150px originales: los items ahora traen miniaturas (ticket 592) */}
              <div className="max-h-[240px] overflow-y-auto">
                <div className="space-y-2 pr-2">
                  {items.map((item, index) => {
                    const deviation = item.maintenance_request_items?.checklist_deviations;
                    const formattedCode = deviation?.item_code?.replace(/_/g, ' ') || '';

                    // Extraer tipos de reparación de la tabla pivot (prioridad) o del campo legacy
                    const pivotRepairTypes = item.maintenance_order_item_repair_types ?? [];
                    const repairTypeNames: string[] =
                      pivotRepairTypes.length > 0
                        ? pivotRepairTypes.map((rt) => rt.types_of_repairs?.name).filter((n): n is string => Boolean(n))
                        : item.types_of_repairs?.name
                          ? [item.types_of_repairs.name]
                          : [];

                    // Ticket 592: los items de carga manual no tienen desvio de checklist —
                    // su titulo es el texto libre o la tarea elegida del listado.
                    const itemLabel = getRepairItemLabel(item, 'Sin etiqueta');
                    const itemImages = getRepairItemImages(item);

                    return (
                      <div key={item.id || index} className="p-2 bg-muted rounded text-sm">
                        <div className="font-medium">{itemLabel}</div>
                        <div className="text-xs text-muted-foreground">
                          {formattedCode && <>Código: {formattedCode}</>}
                          {repairTypeNames.length > 0 && (
                            <span className="ml-2">
                              | Tipo{repairTypeNames.length > 1 ? 's' : ''}:{' '}
                              <span className="font-medium">{repairTypeNames.join(', ')}</span>
                            </span>
                          )}
                        </div>
                        <ItemComments
                          item={item}
                          source={order.maintenance_requests?.source}
                          fallbackAuthorName={
                            order.maintenance_requests?.profile_maintenance_requests_supervisor_idToprofile?.fullname
                          }
                        />

                        {/* Ticket 592: el taller ve la foto antes de aceptar el ingreso */}
                        <RepairItemPhotos images={itemImages} label={itemLabel} size="sm" className="mt-1.5" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Input de kilometraje — un equipamiento no lleva km (ticket 596) */}
          <div className={`space-y-2 ${isOtherEquipment ? 'hidden' : ''}`}>
            <Label htmlFor="kilometer">Kilometraje actual del equipo *</Label>
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
                  <>
                    Valor precargado desde el checklist ({minKilometer.toLocaleString()} km). El nuevo valor no puede
                    ser menor.
                  </>
                ) : initialKm.source === 'vehicle' ? (
                  <>
                    Valor precargado desde el vehículo ({minKilometer.toLocaleString()} km). El nuevo valor no puede ser
                    menor.
                  </>
                ) : (
                  'Ingrese el kilometraje actual al momento de la entrada al taller'
                )}
              </p>
            )}
          </div>

          {/* Input de horómetro (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="engine_hours">Horómetro actual del equipo</Label>
            <Input
              id="engine_hours"
              type="text"
              value={engineHours}
              onChange={(e) => handleEngineHoursChange(e.target.value)}
              placeholder="Ej: 5000"
              className={engineHoursError ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {engineHoursError ? (
              <p className="text-xs text-red-600">{engineHoursError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {minEngineHours > 0
                  ? `Valor precargado desde el ${isOtherEquipment ? 'equipamiento' : 'vehículo'} (${minEngineHours.toLocaleString()} hs). El nuevo valor no puede ser menor.`
                  : 'Opcional. Ingrese las horas de motor actuales.'}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={
              approveMutation.isPending ||
              (!isOtherEquipment && !kilometer.trim()) ||
              !!validationError ||
              !!engineHoursError
            }
          >
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
