'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Logger } from '@/lib/logger';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { returnTask } from '../actions/actionsServer';

const logger = new Logger('ReturnTaskDialog');

interface ReturnTaskDialogProps {
  repairId: string;
  open: boolean;
  onClose: () => void;
}

export function ReturnTaskDialog({ repairId, open, onClose }: ReturnTaskDialogProps) {
  const [returnReason, setReturnReason] = useState('');
  const [showError, setShowError] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (returnReason.trim().length < 10) {
        setShowError(true);
        throw new Error('El motivo debe tener al menos 10 caracteres');
      }
      return returnTask(repairId, returnReason);
    },
    onSuccess: () => {
      logger.info('Tarea devuelta exitosamente', { data: { repairId } });
      toast.success('Tarea devuelta. El jefe de taller la reasignara.');
      queryClient.invalidateQueries({ queryKey: ['operator-work-order'] });
      queryClient.invalidateQueries({ queryKey: ['operator-work-orders'] });
      handleClose();
    },
    onError: (error) => {
      logger.error('Error al devolver tarea', {
        data: { repairId, error: error instanceof Error ? error.message : 'Unknown error' },
      });
      toast.error(error instanceof Error ? error.message : 'Error al devolver la tarea');
    },
  });

  const handleClose = () => {
    setReturnReason('');
    setShowError(false);
    onClose();
  };

  const handleSubmit = () => {
    if (returnReason.trim().length < 10) {
      setShowError(true);
      return;
    }
    mutation.mutate();
  };

  const handleReasonChange = (value: string) => {
    setReturnReason(value);
    if (value.trim().length >= 10) {
      setShowError(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Devolver Tarea</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="return-reason">
              Motivo de devolucion <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="return-reason"
              placeholder="Ingrese el motivo de la devolucion (minimo 10 caracteres)"
              value={returnReason}
              onChange={(e) => handleReasonChange(e.target.value)}
              rows={4}
              className={showError ? 'border-destructive' : ''}
            />
            {showError && <p className="text-sm text-destructive">El motivo debe tener al menos 10 caracteres</p>}
          </div>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            <p className="font-medium">Esta seguro?</p>
            <p className="mt-1">La tarea sera enviada al jefe de taller para reasignacion</p>
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
            {mutation.isPending ? 'Devolviendo...' : 'Devolver Tarea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
