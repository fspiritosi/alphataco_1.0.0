'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { MaintenanceOperationData } from '../actions/actionsServer';
import { useRejectMaintenanceOperation } from '../hooks/useMaintenanceOperations';

interface RechazarOperacionDialogProps {
  operation: MaintenanceOperationData;
  open: boolean;
  onClose: () => void;
}

export function RechazarOperacionDialog({ operation, open, onClose }: RechazarOperacionDialogProps) {
  const [reason, setReason] = useState('');
  const rejectMutation = useRejectMaintenanceOperation();

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error('Debe indicar un motivo de rechazo');
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        orderId: operation.id,
        reason: reason.trim(),
      });
      toast.success('Operación rechazada. El pedido vuelve a estado pendiente de planificar.');
      onClose();
    } catch {
      toast.error('Error al rechazar la operación');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rechazar Operación</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción rechazará la operación planificada para el equipo{' '}
            <span className="font-medium">
              {operation.vehicles?.domain || operation.vehicles?.serie || 'Sin identificar'}
            </span>
            . El pedido volverá al estado "Pendiente de Planificar".
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="rejection-reason">Motivo del rechazo *</Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Indique el motivo por el cual rechaza esta operación..."
            className="mt-2"
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={rejectMutation.isPending || !reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rechazar Operación
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
