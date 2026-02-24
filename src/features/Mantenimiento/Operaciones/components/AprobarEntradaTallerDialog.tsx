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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceOperationData } from '../actions/actionsServer';
import { useApproveWorkshopEntry } from '../hooks/useMaintenanceOperations';

interface AprobarEntradaTallerDialogProps {
  operation: MaintenanceOperationData;
  open: boolean;
  onClose: () => void;
}

export function AprobarEntradaTallerDialog({ operation, open, onClose }: AprobarEntradaTallerDialogProps) {
  const [kilometer, setKilometer] = useState(operation.vehicles?.kilometer?.toString() || '');
  const [engineHours, setEngineHours] = useState(operation.vehicles?.engine_hours?.toString() || '');
  const [engineHoursError, setEngineHoursError] = useState<string | null>(null);
  const approveMutation = useApproveWorkshopEntry();

  // Valor mínimo permitido (kilometraje actual del vehículo)
  const currentKm = Number(operation.vehicles?.kilometer) || 0;
  // Valor mínimo permitido para horómetro
  const currentEngineHours = Number(operation.vehicles?.engine_hours) || 0;

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
    if (currentKm > 0 && inputKm < currentKm) {
      toast.error(`El kilometraje no puede ser menor al actual del equipo (${currentKm.toLocaleString('es-AR')} km)`);
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
        orderId: operation.id,
        kilometer: kilometer.trim(),
        ...(engineHours.trim() && { engine_hours: engineHours.trim() }),
      });
      toast.success('Entrada a taller aprobada. El equipo ahora está "No Operativo"');
      onClose();
    } catch {
      toast.error('Error al aprobar la entrada a taller');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprobar Entrada a Taller</DialogTitle>
          <DialogDescription>
            Confirme la entrada del equipo{' '}
            <span className="font-medium">
              {operation.vehicles?.domain || operation.vehicles?.serie || 'Sin identificar'}
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
              <Badge variant={operation.vehicles?.condition === 'operativo' ? 'success' : 'destructive'}>
                {operation.vehicles?.condition || 'Desconocido'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Km actual:</span>
              <span className="font-medium">{operation.vehicles?.kilometer || '-'} km</span>
            </div>
            {operation.vehicles?.engine_hours && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Horómetro actual:</span>
                <span className="font-medium">{operation.vehicles.engine_hours} hs</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Items a reparar:</span>
              <span className="font-medium">{operation.maintenance_order_items?.length || 0}</span>
            </div>
          </div>

          {/* Campos de KM y Horómetro en grilla de 2 columnas */}
          <div className="grid grid-cols-2 gap-4">
            {/* Input de kilometraje */}
            <div className="space-y-2">
              <Label htmlFor="kilometer">Kilometraje actual *</Label>
              <Input
                id="kilometer"
                type="number"
                min={currentKm > 0 ? currentKm : 0}
                value={kilometer}
                onChange={(e) => setKilometer(e.target.value)}
                placeholder="Ej: 150000"
              />
              <p className="text-xs text-muted-foreground">
                {currentKm > 0 ? (
                  <span className="text-yellow-600">
                    Mín. {currentKm.toLocaleString('es-AR')} km (actual del equipo)
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
