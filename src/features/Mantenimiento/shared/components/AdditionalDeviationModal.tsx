'use client';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchSupervisorsForEquipment } from '@/features/Checklists/actions/actionsServer';
import { createManualDeviationsFromChecklist } from '@/features/Mantenimiento/SolicitudesMantenimiento/actions/mutations.server';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChecklistItemPicker, type PickableSection, type SelectedItem } from './ChecklistItemPicker';
import { ManualItemsInput, type ManualItem } from './ManualItemsInput';

const logger = new Logger('AdditionalDeviationModal');

type AdditionalDeviationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  checklistAnswerId: string;
  equipmentId: string;
  sections: PickableSection[];
  driverEmployeeId?: string;
  employeeId?: string;
  userId?: string;
  kilometer?: string;
};

export function AdditionalDeviationModal({
  isOpen,
  onClose,
  onSuccess,
  checklistAnswerId,
  equipmentId,
  sections,
  driverEmployeeId,
  employeeId,
  userId,
  kilometer,
}: AdditionalDeviationModalProps) {
  const queryClient = useQueryClient();

  const { data: supervisors = [], isLoading: isLoadingSupervisors } = useQuery({
    // Por EQUIPO, no por sesión: este modal cuelga del checklist y también corre en el
    // flujo QR anónimo, donde no hay empresa activa.
    queryKey: ['supervisors-for-equipment', equipmentId],
    queryFn: () => fetchSupervisorsForEquipment(equipmentId),
    enabled: isOpen && Boolean(equipmentId),
    staleTime: 5 * 60 * 1000,
  });

  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [openSupervisorSelect, setOpenSupervisorSelect] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitSuccessRef = useRef(false);

  // Ref adicional para distinguir click explícito en "Cancelar" vs cierre por ESC/click fuera.
  // Sin esto, el botón Cancel dispararía onClose dos veces (una por el onClick, otra por Radix
  // al cerrar el dialog → handleOpenChange).
  const explicitCloseRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedSupervisorId('');
      setSelectedItems([]);
      setManualItems([]);
      setIsSubmitting(false);
      submitSuccessRef.current = false;
      explicitCloseRef.current = false;
    }
  }, [isOpen]);

  const supervisorName = useMemo(
    () => supervisors.find((s) => s.id === selectedSupervisorId)?.fullName ?? '',
    [supervisors, selectedSupervisorId]
  );

  const totalItems = selectedItems.length + manualItems.length;

  const handleSubmit = useCallback(async () => {
    if (!selectedSupervisorId) {
      toast.error('Debes seleccionar un supervisor de turno');
      return;
    }
    if (selectedItems.length === 0 && manualItems.length === 0) {
      toast.error('Debes seleccionar al menos un ítem');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createManualDeviationsFromChecklist({
        checklistAnswerId,
        equipmentId,
        supervisorId: selectedSupervisorId,
        driverEmployeeId,
        employeeId,
        userId,
        kilometer,
        items: selectedItems.map((s) => ({
          templateItemId: s.templateItemId,
          itemCode: s.itemCode,
          itemLabel: s.itemLabel,
          sectionCode: s.sectionCode,
          isCritical: s.isCritical,
          comment: s.comment?.trim() || undefined,
        })),
        manualItems: manualItems.map((m) => ({ label: m.label })),
      });

      if (!result.ok) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      toast.success('Solicitud de mantenimiento creada', {
        description: `Se registraron ${totalItems} desvío(s) para revisión del supervisor.`,
      });
      invalidateAllMaintenanceQueries(queryClient);

      submitSuccessRef.current = true;
      explicitCloseRef.current = true;
      setSelectedSupervisorId('');
      setSelectedItems([]);
      setManualItems([]);
      setIsSubmitting(false);
      onSuccess();
    } catch (error) {
      logger.error('Error al registrar desvíos manuales', { data: { error } });
      toast.error('Ocurrió un error al registrar los desvíos');
      setIsSubmitting(false);
    }
  }, [
    selectedSupervisorId,
    selectedItems,
    manualItems,
    checklistAnswerId,
    equipmentId,
    driverEmployeeId,
    employeeId,
    userId,
    kilometer,
    queryClient,
    onSuccess,
    totalItems,
  ]);

  const handleCancelClick = useCallback(() => {
    explicitCloseRef.current = true;
    onClose();
  }, [onClose]);

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    if (submitSuccessRef.current) {
      submitSuccessRef.current = false;
      return;
    }
    // Si el cierre vino por click en Cancelar o success, los handlers ya corrieron.
    if (explicitCloseRef.current) {
      explicitCloseRef.current = false;
      return;
    }
    // Solo llega acá por ESC o click fuera.
    onClose();
  };

  const submitLabel =
    totalItems === 0 ? 'Registrar desvíos' : `Registrar ${totalItems} desvío${totalItems > 1 ? 's' : ''}`;

  const submitDisabled =
    isSubmitting || !selectedSupervisorId || (selectedItems.length === 0 && manualItems.length === 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>Registrar desvío adicional</DialogTitle>
          <DialogDescription>
            El checklist fue guardado sin fallos. Seleccioná los ítems sobre los que querés dejar un desvío.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          <div className="rounded-md bg-muted/30 p-3 flex flex-col gap-2">
            <Label htmlFor="supervisor-select" className="text-sm">
              Supervisor de turno <span className="text-destructive">*</span>
            </Label>
            {isLoadingSupervisors ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Popover open={openSupervisorSelect} onOpenChange={setOpenSupervisorSelect}>
                <PopoverTrigger asChild>
                  <Button
                    id="supervisor-select"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSupervisorSelect}
                    disabled={isSubmitting}
                    className="w-full justify-between font-normal"
                  >
                    {supervisorName || 'Seleccionar supervisor...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar supervisor..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron supervisores.</CommandEmpty>
                      <CommandGroup>
                        {supervisors.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.fullName}
                            onSelect={() => {
                              setSelectedSupervisorId(s.id);
                              setOpenSupervisorSelect(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedSupervisorId === s.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span className="flex-1">{s.fullName}</span>
                            {!s.isAvailable && <span className="text-xs text-muted-foreground">(no disponible)</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {selectedItems.length} ítem{selectedItems.length === 1 ? '' : 's'} seleccionado
            {selectedItems.length === 1 ? '' : 's'}
          </p>

          <ChecklistItemPicker
            sections={sections}
            selectedItems={selectedItems}
            onChange={setSelectedItems}
            disabled={isSubmitting}
          />
          <ManualItemsInput items={manualItems} onChange={setManualItems} disabled={isSubmitting} />
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-row sm:justify-between gap-2">
          <Button variant="outline" onClick={handleCancelClick} disabled={isSubmitting} className="sm:mr-auto">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitDisabled}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
