'use client';

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
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteDailyReportRow } from '../actions/actions';

interface DeleteConfirmationModalProps {
  dailyReportId: string;
  date: string;
  refetchData?: () => void;
}

export function DeleteConfirmationModal({ dailyReportId, date, refetchData }: DeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      toast.promise(
        async () => {
          setIsDeleting(true);
          await deleteDailyReportRow(dailyReportId);
          if (refetchData) refetchData();
          router.refresh();
        },
        {
          loading: 'Eliminando registro...',
          success: 'Registro eliminado exitosamente!',
          error: 'Ocurrió un error al eliminar el registro',
        }
      );
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Ocurrió un error al eliminar el registro');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            'h-8 w-8 p-0 hover:text-red-500',
            moment(date).isSame(moment(), 'day') || moment(date).isAfter(moment()) ? '' : 'hidden'
          )}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar registro</DialogTitle>
          <DialogDescription>¿Estás seguro de eliminar este registro?</DialogDescription>
        </DialogHeader>
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
