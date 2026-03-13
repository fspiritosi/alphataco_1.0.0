'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteDailyReportRow } from '../actions/actions';

interface DeleteConfirmationModalProps {
  dailyReportId: string;
  refetchData?: () => void;
  preparteInfo?: { numero_pedido: string | null } | null;
}

export function DeleteConfirmationModal({
  dailyReportId,
  refetchData,
  preparteInfo,
}: DeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      toast.promise(
        async () => {
          setIsDeleting(true);
          const result = await deleteDailyReportRow(dailyReportId);
          if (refetchData) refetchData();
          router.refresh();
          return result;
        },
        {
          loading: 'Eliminando registro...',
          success: (result) => {
            if (result?.revertedPreparte?.numero_pedido) {
              return `Registro eliminado. El pedido ${result.revertedPreparte.numero_pedido} volvió a estado Pendiente.`;
            }
            return 'Registro eliminado exitosamente!';
          },
          error: 'Ocurrió un error al eliminar el registro',
        }
      );
    } catch (error) {
      toast.error('Ocurrió un error al eliminar el registro');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          data-testid={`delete-button-${dailyReportId}`}
          className="h-8 w-8 p-0 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar registro</DialogTitle>
          <DialogDescription>¿Estás seguro de eliminar este registro?</DialogDescription>
        </DialogHeader>
        {preparteInfo?.numero_pedido && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Este registro está vinculado al pedido <strong>{preparteInfo.numero_pedido}</strong>. Al eliminarlo, el
              pedido volverá a estado <strong>Pendiente</strong>.
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <DialogClose>
            <Button variant="outline" disabled={isDeleting}>
              Cancelar
            </Button>
          </DialogClose>
          <DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
