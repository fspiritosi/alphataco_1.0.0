'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Logger } from '@/lib/logger';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { closeWorkOrder } from '../actions/actionsServer';

const logger = new Logger('CloseWorkOrderDialog');

interface CloseWorkOrderDialogProps {
  workOrderId: string;
  workOrderItems: Array<{
    id: string;
    status: string | null;
    work_order_item_repairs: Array<{
      id: string;
      status: string | null;
    }> | null;
  }>;
  open: boolean;
  onClose: () => void;
}

export function CloseWorkOrderDialog({ workOrderId, workOrderItems, open, onClose }: CloseWorkOrderDialogProps) {
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  const router = useRouter();

  const countRepairsByStatus = () => {
    let completed = 0;
    let pending = 0;
    let returned = 0;

    workOrderItems.forEach((item) => {
      item.work_order_item_repairs?.forEach((repair) => {
        if (repair.status === 'completed') {
          completed++;
        } else if (repair.status === 'reassignment_requested') {
          returned++;
        } else {
          pending++;
        }
      });
    });

    return { completed, pending, returned };
  };

  const { completed, pending, returned } = countRepairsByStatus();

  const mutation = useMutation({
    mutationFn: async () => {
      return closeWorkOrder(workOrderId, notes || undefined);
    },
    onSuccess: () => {
      logger.info('Orden de trabajo cerrada exitosamente', {
        data: { workOrderId },
      });
      toast.success('Orden de trabajo cerrada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['operator-work-orders'] });
      handleClose();
      router.push('/operator/dashboard');
    },
    onError: (error) => {
      logger.error('Error al cerrar orden de trabajo', {
        data: {
          workOrderId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      toast.error(error instanceof Error ? error.message : 'Error al cerrar la orden de trabajo');
    },
  });

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  const handleSubmit = () => {
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cerrar Orden de Trabajo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Resumen de Reparaciones</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm font-medium text-green-800">Completadas</p>
                <p className="text-2xl font-bold text-green-900">{completed}</p>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-sm font-medium text-yellow-800">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-900">{pending}</p>
              </div>
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <p className="text-sm font-medium text-orange-800">Devueltas</p>
                <p className="text-2xl font-bold text-orange-900">{returned}</p>
              </div>
            </div>
          </div>

          {/* Warning if pending repairs */}
          {pending > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm font-medium text-yellow-800">Advertencia</p>
              <p className="text-sm text-yellow-700 mt-1">
                Esta OT se cerrara con {pending} tarea{pending > 1 ? 's' : ''} pendiente{pending > 1 ? 's' : ''}
              </p>
            </div>
          )}

          <Separator />

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="closure-notes">
              Notas de cierre <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="closure-notes"
              placeholder="Ingrese observaciones sobre el cierre de la orden de trabajo"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={mutation.isPending}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={mutation.isPending} className="w-full sm:w-auto">
            {mutation.isPending ? 'Cerrando...' : 'Cerrar Orden de Trabajo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
