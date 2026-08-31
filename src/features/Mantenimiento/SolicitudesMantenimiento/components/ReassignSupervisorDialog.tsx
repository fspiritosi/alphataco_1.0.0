'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { fetchSupervisorsForChecklist } from '@/features/Checklist/actions/actionsServer';
import { SearchableSelect } from '@/features/Mantenimiento/shared/components/SearchableSelect';
import { Logger } from '@/lib/logger';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { invalidateAllMaintenanceQueries } from '../../utils/queryInvalidation';
import type { MaintenanceRequestData } from '../actions/actionsServer';
import { reassignRequestSupervisor } from '../actions/actionsServer';

const logger = new Logger('ReassignSupervisorDialog');

interface ReassignSupervisorDialogProps {
  request: MaintenanceRequestData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReassignSupervisorDialog({ request, open, onOpenChange, onSuccess }: ReassignSupervisorDialogProps) {
  const queryClient = useQueryClient();

  // Pre-cargar con el supervisor actual de la solicitud
  const currentSupervisorId = request.supervisor?.id ?? request.supervisor_id ?? undefined;
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | undefined>(currentSupervisorId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar lista de supervisores disponibles
  const { data: supervisors, isLoading: isLoadingSupervisors } = useQuery({
    queryKey: ['supervisors-for-checklist'],
    queryFn: () => fetchSupervisorsForChecklist(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  // Opciones del combobox con buscador: la lista de supervisores es larga y
  // buscar por nombre es mas rapido que recorrerla.
  const supervisorOptions = useMemo(
    () =>
      (supervisors ?? []).map((supervisor) => ({
        value: supervisor.id,
        label: supervisor.fullName,
        disabled: !supervisor.isAvailable,
        trailing: !supervisor.hasLinkedEmployee ? (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            Sin empleado vinculado
          </Badge>
        ) : !supervisor.hasActiveDiagram ? (
          <Badge variant="warning" className="shrink-0 text-[10px]">
            Sin diagrama activo
          </Badge>
        ) : null,
      })),
    [supervisors]
  );

  const handleConfirm = async () => {
    if (!selectedSupervisorId) {
      toast.error('Debe seleccionar un supervisor');
      return;
    }

    setIsSubmitting(true);
    try {
      await reassignRequestSupervisor(request.id, selectedSupervisorId);

      toast.success('Supervisor reasignado correctamente');
      invalidateAllMaintenanceQueries(queryClient);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      logger.error('Error al reasignar supervisor', { data: { error, requestId: request.id } });
      toast.error('Error al reasignar el supervisor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      // Restaurar supervisor actual al cerrar sin confirmar
      if (!newOpen) {
        setSelectedSupervisorId(currentSupervisorId);
      }
      onOpenChange(newOpen);
    }
  };

  const vehicleLabel = request.vehicles?.domain || request.vehicles?.serie || 'Sin identificar';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reasignar Supervisor</DialogTitle>
          <DialogDescription>
            Selecciona el nuevo supervisor de turno para la solicitud del equipo{' '}
            <span className="font-medium">{vehicleLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supervisor actual */}
          {request.supervisor?.fullname && (
            <div className="text-sm text-muted-foreground">
              Supervisor actual: <span className="font-medium text-foreground">{request.supervisor.fullname}</span>
            </div>
          )}

          {/* Select de supervisores */}
          <div className="space-y-2">
            <Label htmlFor="supervisor-select">Nuevo supervisor *</Label>
            {isLoadingSupervisors ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando supervisores...
              </div>
            ) : (
              <SearchableSelect
                id="supervisor-select"
                value={selectedSupervisorId ?? ''}
                onValueChange={setSelectedSupervisorId}
                disabled={isSubmitting}
                options={supervisorOptions}
                placeholder="Seleccionar supervisor..."
                searchPlaceholder="Buscar supervisor..."
                emptyMessage="No hay supervisores disponibles"
              />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || !selectedSupervisorId || isLoadingSupervisors}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
