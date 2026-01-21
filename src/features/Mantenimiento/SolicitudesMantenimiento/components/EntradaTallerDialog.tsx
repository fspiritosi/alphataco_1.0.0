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
import moment from 'moment';
import 'moment/locale/es';
import { useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceRequestData } from '../actions/actionsServer';
import { useApproveWorkshopEntryFromRequest } from '../hooks/useMaintenanceRequests';

moment.locale('es');

interface EntradaTallerDialogProps {
  request: MaintenanceRequestData;
  open: boolean;
  onClose: () => void;
}

export function EntradaTallerDialog({ request, open, onClose }: EntradaTallerDialogProps) {
  const [kilometer, setKilometer] = useState(request.vehicles?.kilometer || '');
  const approveMutation = useApproveWorkshopEntryFromRequest();

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
                <span className="font-medium">
                  {moment(maintenanceOrder.scheduled_date).format('dddd D [de] MMMM [de] YYYY')}
                </span>
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

          {/* Input de kilometraje */}
          <div className="space-y-2">
            <Label htmlFor="kilometer">Kilometraje actual del equipo *</Label>
            <Input
              id="kilometer"
              type="text"
              value={kilometer}
              onChange={(e) => setKilometer(e.target.value)}
              placeholder="Ej: 150000"
            />
            <p className="text-xs text-muted-foreground">
              Ingrese el kilometraje actual al momento de la entrada al taller
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleApprove} disabled={approveMutation.isPending || !kilometer.toString().trim()}>
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
