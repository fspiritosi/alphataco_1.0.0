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
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getResourceKindLabel, getResourceLabel } from '../../../shared/maintenance-resource';
import { useRejectPendingOrder } from '../../hooks/useMaintenanceOrders';
import type { PendingOrderListItem } from '../actions.server';

interface RechazarPedidoDialogProps {
  order: PendingOrderListItem;
  open: boolean;
  onClose: () => void;
}

/**
 * Rechazo de un pedido desde el paso "Por Programar" del taller (ticket 676).
 *
 * El motivo es obligatorio: es lo unico que queda registrado para explicar por
 * que el pedido no se ejecuto (el caso tipico es la solicitud duplicada).
 */
export function RechazarPedidoDialog({ order, open, onClose }: RechazarPedidoDialogProps) {
  const [reason, setReason] = useState('');
  const rejectMutation = useRejectPendingOrder();

  // El dialogo se reutiliza para distintos pedidos: limpiar el motivo al abrir
  // evita arrastrar el texto del rechazo anterior.
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const handleReject = async () => {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      toast.error('Debe indicar un motivo de rechazo');
      return;
    }

    try {
      await rejectMutation.mutateAsync({ orderId: order.id, reason: trimmedReason });
      toast.success('Pedido rechazado. Queda registrado en el historial de mantenimiento del equipo.');
      onClose();
    } catch {
      toast.error('Error al rechazar el pedido');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rechazar Pedido</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción rechazará el pedido {order.order_number ? `#${order.order_number} ` : ''}del{' '}
            {getResourceKindLabel(order).toLowerCase()} <span className="font-medium">{getResourceLabel(order)}</span>.
            El pedido sale de esta lista y queda registrado en el historial de mantenimiento del equipo con el motivo
            indicado.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="pedido-rejection-reason">Motivo del rechazo *</Label>
          <Textarea
            id="pedido-rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Indique el motivo por el cual rechaza este pedido (ej: solicitud duplicada)..."
            className="mt-2"
            rows={3}
            disabled={rejectMutation.isPending}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={rejectMutation.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={rejectMutation.isPending || !reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rechazar Pedido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
