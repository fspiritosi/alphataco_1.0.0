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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteCompanyUser } from '../actions.server';

const logger = new Logger('DeleteUserCell');

export const COMPANY_USERS_QUERY_KEY = ['company-users'] as const;

interface DeleteUserCellProps {
  shareCompanyUserId: string;
}

export function DeleteUserCell({ shareCompanyUserId }: DeleteUserCellProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await deleteCompanyUser(shareCompanyUserId);
      toast.success('Usuario eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: [...COMPANY_USERS_QUERY_KEY] });
      router.refresh();
    } catch (error) {
      logger.error('Error eliminando usuario', { data: { error, shareCompanyUserId } });
      toast.error('Error al eliminar usuario');
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
          <AlertDialogDescription>
            Este usuario dejará de tener acceso a la empresa. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleDelete} variant="destructive">
              Eliminar
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
