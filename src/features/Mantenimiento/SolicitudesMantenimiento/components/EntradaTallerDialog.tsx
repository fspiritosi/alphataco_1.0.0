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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceRequestData } from '../actions/actionsServer';
import { useApproveWorkshopEntryFromRequest } from '../hooks/useMaintenanceRequests';

interface EntradaTallerDialogProps {
  request: MaintenanceRequestData;
  open: boolean;
  onClose: () => void;
}

export function EntradaTallerDialog({ request, open, onClose }: EntradaTallerDialogProps) {
  const [kilometer, setKilometer] = useState(request.vehicles?.kilometer?.toString() || '');
  const [engineHours, setEngineHours] = useState(request.vehicles?.engine_hours?.toString() || '');
  const [engineHoursError, setEngineHoursError] = useState<string | null>(null);
  const approveMutation = useApproveWorkshopEntryFromRequest();

  // Valor mínimo permitido para horómetro
  const currentEngineHours = Number(request.vehicles?.engine_hours) || 0;
  // Valor mínimo permitido para kilometraje
  const currentKm = Number(request.vehicles?.kilometer) || 0;

  // Obtener el maintenance_order con fecha confirmada
  const maintenanceOrder = request.maintenance_orders?.[0];

  // Validar horómetro cuando cambia
  const handleEngineHoursChange = (value: string) => {
    setEngineHours(value);
    if (value.trim()) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && currentEngineHours > 0 && numValue < currentEngineHours) {
        setEngineHoursError(
          `El horómetro no puede ser menor al actual del equipo (${currentEngineHours.toLocaleString('es-AR')} hs)`
        );
      } else {
        setEngineHoursError(null);
      }
    } else {
      setEngineHoursError(null);
    }
  };

  const handleApprove = async () => {
    if (!kilometer.toString().trim()) {
      toast.error('Debe ingresar el kilometraje actual');
      return;
    }

    if (!maintenanceOrder?.id) {
      toast.error('No se encontró el pedido de mantenimiento');
      return;
    }

    // Validar horómetro si fue ingresado
    if (engineHours.trim()) {
      const numEngineHours = parseFloat(engineHours);
      if (!isNaN(numEngineHours) && currentEngineHours > 0 && numEngineHours < currentEngineHours) {
        toast.error(
          `El horómetro no puede ser menor al actual del equipo (${currentEngineHours.toLocaleString('es-AR')} hs)`
        );
        return;
      }
    }

    try {
      await approveMutation.mutateAsync({
        orderId: maintenanceOrder.id,
        kilometer: kilometer.toString().trim(),
        ...(engineHours.trim() && { engine_hours: engineHours.trim() }),
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprobar Entrada a Taller</DialogTitle>
          <DialogDescription>
            Confirme la entrada del equipo{' '}
            <span className="font-medium">
              {request.vehicles?.domain || request.vehicles?.serie || 'Sin identificar'}
            </span>{' '}
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
              <Badge variant={request.vehicles?.condition === 'operativo' ? 'success' : 'destructive'}>
                {request.vehicles?.condition || 'Desconocido'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Km actual:</span>
              <span className="font-medium">{request.vehicles?.kilometer || '-'} km</span>
            </div>
            {request.vehicles?.engine_hours && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Horómetro actual:</span>
                <span className="font-medium">{request.vehicles.engine_hours} hs</span>
              </div>
            )}
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
                        <div className="font-medium">{deviation?.item_label || 'Sin etiqueta'}</div>
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

          {/* Campos de KM y Horómetro en grilla de 2 columnas */}
          <div className="grid grid-cols-2 gap-4">
            {/* Input de kilometraje */}
            <div className="space-y-2">
              <Label htmlFor="kilometer">Kilometraje actual *</Label>
              <Input
                id="kilometer"
                type="text"
                value={kilometer}
                onChange={(e) => setKilometer(e.target.value)}
                placeholder="Ej: 150000"
              />
              <p className="text-xs text-muted-foreground">
                {currentKm > 0
                  ? `Mín. ${currentKm.toLocaleString('es-AR')} km (actual del equipo)`
                  : 'Kilometraje al momento de la entrada'}
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
            disabled={approveMutation.isPending || !kilometer.toString().trim() || !!engineHoursError}
          >
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
