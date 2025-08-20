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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { toggleVehicleStatus } from '../lib/actions/vehicle-actions';

interface VehicleQuickActionsProps {
  equipmentId: string | undefined;
  isActive: boolean | undefined;
}

export function VehicleQuickActions({ equipmentId, isActive }: VehicleQuickActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);

  const handleToggleStatus = (activate: boolean) => {
    startTransition(async () => {
      try {
        // Here you would call your server action to toggle employee status
        await toggleVehicleStatus(equipmentId!, activate);
        toast.success(`Equipo ${activate ? 'activado' : 'dado de baja'} correctamente`);
        setShowDeactivateDialog(false);
        setShowActivateDialog(false);
        router.refresh();
      } catch (error) {
        toast.error('Error al cambiar el estado del equipo');
      }
    });
  };
  if (!equipmentId) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isActive ? (
            <DropdownMenuItem onClick={() => setShowDeactivateDialog(true)} className="text-destructive">
              <Truck className="h-4 w-4 mr-2" />
              Dar de Baja Equipo
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setShowActivateDialog(true)} className="text-green-600">
              <Truck className="h-4 w-4 mr-2" />
              Activar Equipo
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deactivate Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja equipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción dará de baja al equipo. Podrás reactivarlo más tarde si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleToggleStatus(false)} disabled={isPending}>
              {isPending ? 'Dando de baja...' : 'Dar de baja'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Activar equipo?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción activará al equipo y podrá acceder al sistema.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleToggleStatus(true)} disabled={isPending}>
              {isPending ? 'Activando...' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
