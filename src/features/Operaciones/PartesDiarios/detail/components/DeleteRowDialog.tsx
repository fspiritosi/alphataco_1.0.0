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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteDailyReportRowPrisma } from '../actions.server';
import type { DailyReportDetailRow } from '../types';

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: DailyReportDetailRow | null;
  dailyReportId: string;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DeleteRowDialog({ open, onOpenChange, row, dailyReportId, onSuccess }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (rowId: string) => deleteDailyReportRowPrisma(rowId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['daily-report-detail', dailyReportId] });
      onOpenChange(false);
      onSuccess();

      if (result?.revertedPreparte?.numero_pedido) {
        toast.success(
          `Registro eliminado. El pedido ${result.revertedPreparte.numero_pedido} volvió a estado Pendiente.`
        );
      } else {
        toast.success('Registro eliminado exitosamente');
      }
    },
    onError: () => {
      toast.error('Ocurrió un error al eliminar el registro');
    },
  });

  const customerName = row?.customers?.name ?? '—';
  const serviceName = row?.customer_services?.service_name ?? '—';

  const handleConfirm = () => {
    if (!row) return;
    mutation.mutate(row.id);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar registro</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.</p>
              {row && (
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  <p>
                    <span className="font-medium">Cliente:</span> {customerName}
                  </p>
                  <p>
                    <span className="font-medium">Servicio:</span> {serviceName}
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={mutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
