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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Mail, MoreHorizontal, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteVehicle } from '../lib/actions/vehicle-actions';

interface VehicleQuickActionsProps {
  vehicle: any;
}

export function VehicleQuickActions({ vehicle }: VehicleQuickActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await deleteVehicle(vehicle.id);
      toast.success('Equipo eliminado correctamente');
      router.push('/dashboard/equipment');
    } catch (error) {
      toast.error('Error al eliminar el equipo');
    }
  };

  const handleGenerateReport = () => {
    // TODO: Implement report generation
    toast.info('Funcionalidad de reporte en desarrollo');
  };

  const handleSendEmail = () => {
    // TODO: Implement email functionality
    toast.info('Funcionalidad de email en desarrollo');
  };

  const handleExportData = () => {
    // TODO: Implement data export
    toast.info('Funcionalidad de exportación en desarrollo');
  };

  if (!vehicle) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleGenerateReport}>
          <FileText className="h-4 w-4 mr-2" />
          Generar Reporte
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportData}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Datos
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSendEmail}>
          <Mail className="h-4 w-4 mr-2" />
          Enviar Email
        </DropdownMenuItem>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Equipo
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El equipo {vehicle.domain || vehicle.serie} será eliminado
                permanentemente junto con todos sus documentos y registros asociados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
