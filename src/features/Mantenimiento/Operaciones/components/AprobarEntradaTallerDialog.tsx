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
import { getInitialKilometer, validateKilometer } from '@/features/Mantenimiento/utils/kilometerPreload';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceOperationData } from '../actions/actionsServer';
import { useApproveWorkshopEntry } from '../hooks/useMaintenanceOperations';

interface AprobarEntradaTallerDialogProps {
  operation: MaintenanceOperationData;
  open: boolean;
  onClose: () => void;
}

export function AprobarEntradaTallerDialog({ operation, open, onClose }: AprobarEntradaTallerDialogProps) {
  const initialKm = useMemo(
    () => getInitialKilometer(operation.vehicles?.kilometer, operation.maintenance_order_items),
    [operation]
  );
  const [kilometer, setKilometer] = useState(initialKm.value);
  const [validationError, setValidationError] = useState<string | null>(null);
  const approveMutation = useApproveWorkshopEntry();

  // Valor mínimo permitido
  const minKilometer = useMemo(() => {
    const parsed = parseInt(initialKm.value, 10);
    return !isNaN(parsed) ? parsed : 0;
  }, [initialKm.value]);

  const handleKilometerChange = (value: string) => {
    setKilometer(value);
    setValidationError(validateKilometer(value, minKilometer));
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

    // Validar que el kilometraje no sea menor al valor precargado
    if (minKilometer > 0 && inputKm < minKilometer) {
      toast.error(`El kilometraje no puede ser menor a ${minKilometer.toLocaleString()} km`);
      return;
    }

    try {
      await approveMutation.mutateAsync({
        orderId: operation.id,
        kilometer: kilometer.trim(),
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
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Items a reparar:</span>
              <span className="font-medium">{operation.maintenance_order_items?.length || 0}</span>
            </div>
          </div>

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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approveMutation.isPending || !kilometer.trim() || !!validationError}
          >
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
