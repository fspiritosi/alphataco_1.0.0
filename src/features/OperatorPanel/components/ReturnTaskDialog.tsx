'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Textarea } from '@/components/ui/textarea';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { Logger } from '@/lib/logger';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
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
      invalidateAllMaintenanceQueries(queryClient);
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

  const footer = (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end w-full">
      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        disabled={mutation.isPending}
        className="h-11 w-full sm:w-auto"
      >
        Cancelar
      </Button>
      <Button type="button" onClick={handleSubmit} disabled={mutation.isPending} className="h-11 w-full sm:w-auto">
        {mutation.isPending ? 'Devolviendo...' : 'Devolver Tarea'}
      </Button>
    </div>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose} title="Devolver Tarea" footer={footer}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="return-reason">
            Motivo de devolucion <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="return-reason"
            placeholder="Ingrese el motivo de la devolucion (minimo 10 caracteres)"
            value={returnReason}
            onChange={(e) => {
              setReturnReason(e.target.value);
              if (e.target.value.trim().length >= 10) setShowError(false);
            }}
            rows={4}
            className={`min-h-[100px] ${showError ? 'border-destructive' : ''}`}
          />
          {showError && <p className="text-sm text-destructive">El motivo debe tener al menos 10 caracteres</p>}
        </div>

        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3.5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">Esta seguro?</p>
            <p className="mt-1">La tarea sera enviada al jefe de taller para reasignacion</p>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
