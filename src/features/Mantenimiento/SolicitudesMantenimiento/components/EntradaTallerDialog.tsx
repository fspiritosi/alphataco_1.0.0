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
import { RepairGroupBadge } from '@/features/Mantenimiento/shared/components/RepairGroupBadge';
import { getRepairItemGroupName, getRepairItemLabel } from '@/features/Mantenimiento/shared/repair-item-label';
import { formatDateLong } from '@/features/Mantenimiento/utils/dateFormat';
import { getInitialKilometer, validateKilometer } from '@/features/Mantenimiento/utils/kilometerPreload';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceRequestData } from '../actions/actionsServer';
import { useApproveWorkshopEntryFromRequest } from '../hooks/useMaintenanceRequests';

interface EntradaTallerDialogProps {
  request: MaintenanceRequestData;
  open: boolean;
  onClose: () => void;
}

export function EntradaTallerDialog({ request, open, onClose }: EntradaTallerDialogProps) {
  // Adaptar items de solicitud para la utilidad de kilometraje
  const checklistItems = useMemo(() => {
    return (request.maintenance_request_items || []).map((item) => ({
      maintenance_request_items: {
        checklist_deviations: item.checklist_deviations
          ? {
              checklist_answers: (item.checklist_deviations as { checklist_answers?: unknown }).checklist_answers as {
                answer_data?: { kilometraje?: string } | null;
              } | null,
            }
          : null,
      },
    }));
  }, [request.maintenance_request_items]);

  const initialKm = useMemo(
    () => getInitialKilometer(request.vehicles?.kilometer, checklistItems),
    [request.vehicles?.kilometer, checklistItems]
  );
  const [kilometer, setKilometer] = useState(initialKm.value);
  const [validationError, setValidationError] = useState<string | null>(null);
  const approveMutation = useApproveWorkshopEntryFromRequest();

  const minKilometer = useMemo(() => {
    const parsed = parseInt(initialKm.value, 10);
    return !isNaN(parsed) ? parsed : 0;
  }, [initialKm.value]);

  const handleKilometerChange = (value: string) => {
    setKilometer(value);
    setValidationError(validateKilometer(value, minKilometer));
  };

  // Obtener el maintenance_order con fecha confirmada
  const maintenanceOrder = request.maintenance_orders?.[0];

  const handleApprove = async () => {
    if (!kilometer.toString().trim()) {
      toast.error('Debe ingresar el kilometraje actual');
      return;
    }

    if (!maintenanceOrder?.id) {
      toast.error('No se encontró el pedido de mantenimiento');
      return;
    }

    try {
      await approveMutation.mutateAsync({
        orderId: maintenanceOrder.id,
        kilometer: kilometer.toString().trim(),
      });
      toast.success('Entrada a taller aprobada. El equipo ahora está "No Operativo"');
      onClose();
    } catch {
      toast.error('Error al aprobar la entrada a taller');
    }
  };

  const items = request.maintenance_request_items || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* Alto acotado + scroll solo en el cuerpo: header y footer quedan siempre visibles */}
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Aprobar Entrada a Taller</DialogTitle>
          <DialogDescription>
            Confirme la entrada del equipo{' '}
            <span className="font-medium">
              {request.vehicles?.domain || request.vehicles?.serie || 'Sin identificar'}
            </span>{' '}
            al taller.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 flex-1 overflow-y-auto min-h-0">
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
              <Badge variant={request.vehicles?.condition === 'operativo' ? 'success' : 'destructive'}>
                {request.vehicles?.condition || 'Desconocido'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Km actual:</span>
              <span className="font-medium">{request.vehicles?.kilometer || '-'} km</span>
            </div>
            {maintenanceOrder?.scheduled_date && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Fecha programada:</span>
                <span className="font-medium">{formatDateLong(maintenanceOrder.scheduled_date)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Items a reparar:</span>
              <span className="font-medium">{items.length}</span>
            </div>
            {request.description && (
              <div className="pt-1 border-t">
                <span className="text-sm text-muted-foreground">Descripción:</span>
                <p className="font-medium whitespace-pre-wrap break-words">{request.description}</p>
              </div>
            )}
          </div>

          {/* Lista de items */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label>Items a Reparar</Label>
              <div className="max-h-[150px] overflow-y-auto">
                <div className="space-y-2 pr-2">
                  {items.map((item, index) => {
                    const deviation = item.checklist_deviations;
                    const repairType = item.types_of_repairs;
                    const formattedCode = deviation?.item_code?.replace(/_/g, ' ') || '';
                    return (
                      <div key={item.id || index} className="p-2 bg-muted rounded text-sm">
                        {/* El helper cubre tambien la carga manual: sin desvio de checklist,
                            `item_label` es null y el item se dibujaba en blanco. */}
                        <div className="font-medium">{getRepairItemLabel(item, 'Sin etiqueta')}</div>
                        <RepairGroupBadge groupName={getRepairItemGroupName(item)} className="mt-1" />
                        <div className="text-xs text-muted-foreground">
                          Código: {formattedCode}
                          {repairType && (
                            <span className="ml-2">
                              | Tipo: <span className="font-medium">{repairType.name}</span>
                            </span>
                          )}
                        </div>
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
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approveMutation.isPending || !kilometer.toString().trim() || !!validationError}
          >
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
