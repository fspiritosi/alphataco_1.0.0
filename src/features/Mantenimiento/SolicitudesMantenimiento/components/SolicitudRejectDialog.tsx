'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceRequestData } from '../actions/actionsServer';
import { useRejectMaintenanceRequestItems } from '../hooks/useMaintenanceRequests';

interface SolicitudRejectDialogProps {
  request: MaintenanceRequestData;
  open: boolean;
  onClose: () => void;
}

export function SolicitudRejectDialog({ request, open, onClose }: SolicitudRejectDialogProps) {
  const [reason, setReason] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const rejectMutation = useRejectMaintenanceRequestItems();

  // Items pendientes de la solicitud
  const pendingItems = request.maintenance_request_items?.filter((item) => item.status === 'pending') || [];

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setReason('');
      setSelectedItemIds(new Set());
    }
  }, [open]);

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItemIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItemIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItemIds.size === pendingItems.length) {
      // Si todos están seleccionados, deseleccionar todos
      setSelectedItemIds(new Set());
    } else {
      // Seleccionar todos
      setSelectedItemIds(new Set(pendingItems.map((item) => item.id)));
    }
  };

  const handleReject = async () => {
    if (selectedItemIds.size === 0) {
      toast.error('Debe seleccionar al menos un item para rechazar');
      return;
    }

    if (!reason.trim()) {
      toast.error('Debe indicar un motivo de rechazo');
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        requestId: request.id,
        itemIds: Array.from(selectedItemIds),
        reason: reason.trim(),
      });

      const isPartialReject = selectedItemIds.size < pendingItems.length;
      toast.success(isPartialReject ? 'Items rechazados' : 'Solicitud rechazada', {
        description: `Se rechazaron ${selectedItemIds.size} de ${pendingItems.length} item(s)`,
      });
      onClose();
    } catch {
      toast.error('Error al rechazar los items');
    }
  };

  const allSelected = selectedItemIds.size === pendingItems.length && pendingItems.length > 0;
  const someSelected = selectedItemIds.size > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rechazar Items de Solicitud</DialogTitle>
          <DialogDescription>
            Selecciona los items que deseas rechazar para el equipo{' '}
            <span className="font-medium">
              {request.vehicles?.domain || request.vehicles?.serie || 'Sin identificar'}
            </span>
            . Puedes rechazar items individuales o todos a la vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selector de todos */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                className={cn(someSelected && !allSelected && 'data-[state=checked]:bg-muted-foreground')}
              />
              <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </Label>
            </div>
            <Badge variant="outline">
              {selectedItemIds.size} de {pendingItems.length} seleccionado(s)
            </Badge>
          </div>

          <Separator />

          {/* Lista de items */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingItems.map((item) => {
              const isSelected = selectedItemIds.has(item.id);
              const deviation = item.checklist_deviations;
              const isCritical = deviation?.is_critical;

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    isSelected ? 'border-destructive bg-destructive/5' : 'hover:bg-muted/50',
                    isCritical && !isSelected && 'border-destructive/30'
                  )}
                  onClick={() => handleToggleItem(item.id)}
                >
                  <Checkbox checked={isSelected} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isCritical ? (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                      )}
                      <span className="font-medium text-sm">{deviation?.item_label || 'Item sin descripción'}</span>
                      {isCritical && (
                        <Badge variant="destructive" className="text-xs">
                          CRÍTICO
                        </Badge>
                      )}
                    </div>
                    {deviation?.section_code && (
                      <p className="text-xs text-muted-foreground capitalize mt-1">
                        Sección: {deviation.section_code.replace('_', ' ')}
                      </p>
                    )}
                    {(deviation?.driver_comment || item.driver_comment) && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Comentario: {deviation?.driver_comment || item.driver_comment}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {pendingItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No hay items pendientes para rechazar</div>
            )}
          </div>

          <Separator />

          {/* Motivo de rechazo */}
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Motivo del rechazo *</Label>
            <Textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indique el motivo por el cual rechaza estos items..."
              rows={3}
              disabled={rejectMutation.isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={rejectMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={rejectMutation.isPending || selectedItemIds.size === 0 || !reason.trim()}
          >
            {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rechazar {selectedItemIds.size > 0 ? `(${selectedItemIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
