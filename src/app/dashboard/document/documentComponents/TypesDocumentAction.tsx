// Prefetch eliminado: el componente carga bajo demanda
import NewDocumentType from '@/components/NewDocumentType';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cookies } from 'next/headers';
import ButtonTypeRefetch from './ButtonTypeRefetch';

export default async function TypesDocumentAction({ optionChildrenProp }: { optionChildrenProp: string }) {
  const cookiesStore = cookies();
  const role = cookiesStore.get('guestRole')?.value || '';
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild className="mr-4">
        {role !== 'Invitado' && <Button>Crear nuevo</Button>}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[90vh] overflow-y-scroll max-w-[40vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>Nuevo tipo de documento</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <NewDocumentType codeControlClient optionChildrenProp={optionChildrenProp} />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <ButtonTypeRefetch />
          <AlertDialogCancel id="close_document_modal">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
