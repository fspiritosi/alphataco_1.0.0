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
import type { MaintenanceRequestData } from '../actions/actionsServer';
import { useRejectMaintenanceRequest } from '../hooks/useMaintenanceRequests';

interface SolicitudRejectDialogProps {
  request: MaintenanceRequestData;
  open: boolean;
  onClose: () => void;
}

export function SolicitudRejectDialog({ request, open, onClose }: SolicitudRejectDialogProps) {
  const [reason, setReason] = useState('');
  const rejectMutation = useRejectMaintenanceRequest();

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error('Debe indicar un motivo de rechazo');
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        requestId: request.id,
        reason: reason.trim(),
      });
      toast.success('Solicitud rechazada');
      onClose();
    } catch {
      toast.error('Error al rechazar la solicitud');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rechazar Solicitud de Mantenimiento</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción rechazará todos los desvíos de la solicitud para el equipo{' '}
            <span className="font-medium">
              {request.vehicles?.domain || request.vehicles?.serie || 'Sin identificar'}
            </span>
            . Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="rejection-reason">Motivo del rechazo *</Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Indique el motivo por el cual rechaza esta solicitud..."
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
            Rechazar Solicitud
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
