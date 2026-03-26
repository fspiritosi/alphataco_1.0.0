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
import { Badge } from '@/components/ui/badge';
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
import { Logger } from '@/lib/logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  assignTemplateToSubType,
  getSubTypesForTemplateAssign,
  type SubTypeForAssign,
} from '../actions/actions.server';

const logger = new Logger('TemplateAssignDialog');

// ============================================================================
// PROPS
// ============================================================================

interface TemplateAssignDialogProps {
  templateId: string;
  templateName: string;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TemplateAssignDialog({
  templateId,
  templateName,
  companyId,
  open,
  onOpenChange,
}: TemplateAssignDialogProps) {
  const queryClient = useQueryClient();

  // ─── State ────────────────────────────────────────────────────────────────
  const [selectedSubType, setSelectedSubType] = useState<SubTypeForAssign | null>(null);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  // ─── Fetch sub_types ──────────────────────────────────────────────────────
  const { data: subTypes = [], isLoading: isLoadingSubTypes } = useQuery({
    queryKey: ['sub-types-for-assign', companyId],
    queryFn: () => getSubTypesForTemplateAssign(companyId),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Mutation ─────────────────────────────────────────────────────────────
  const { mutate: doAssign, isPending: isAssigning } = useMutation({
    mutationFn: ({ subTypeId }: { subTypeId: string }) => assignTemplateToSubType(subTypeId, templateId),
    onSuccess: () => {
      logger.info('Template assigned to sub_type successfully');
      toast.success(`Plantilla "${templateName}" asignada correctamente`);
      queryClient.invalidateQueries({ queryKey: ['tire-templates'] });
      queryClient.invalidateQueries({ queryKey: ['sub-types-for-assign'] });
      handleClose();
    },
    onError: (error) => {
      logger.error('Error assigning template to sub_type', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al asignar la plantilla');
    },
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function getSubTypeLabel(subType: SubTypeForAssign): string {
    const typeName = subType.type_sub_type_typeTotype?.name;
    return typeName ? `${typeName} / ${subType.name}` : subType.name;
  }

  function handleClose() {
    setSelectedSubType(null);
    setShowConflictWarning(false);
    onOpenChange(false);
  }

  function handleSubTypeSelect(subType: SubTypeForAssign) {
    setSelectedSubType(subType);
  }

  function handleAssignClick() {
    if (!selectedSubType) return;

    // SubType already has a DIFFERENT template → show warning
    if (selectedSubType.tire_template_id !== null && selectedSubType.tire_template_id !== templateId) {
      setShowConflictWarning(true);
      return;
    }

    // Same template already assigned → nothing to do
    if (selectedSubType.tire_template_id === templateId) {
      toast.info('Este subtipo ya tiene esta plantilla asignada');
      return;
    }

    // No existing template → assign directly
    doAssign({ subTypeId: selectedSubType.id });
  }

  function handleConflictConfirm() {
    if (!selectedSubType) return;
    setShowConflictWarning(false);
    doAssign({ subTypeId: selectedSubType.id });
  }

  // ─── Derived state ────────────────────────────────────────────────────────
  const alreadyAssigned = selectedSubType !== null && selectedSubType.tire_template_id === templateId;

  const hasDifferentTemplate =
    selectedSubType !== null &&
    selectedSubType.tire_template_id !== null &&
    selectedSubType.tire_template_id !== templateId;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar plantilla a subtipo</DialogTitle>
            <DialogDescription>
              Seleccioná un subtipo de vehículo para asignarle la plantilla <strong>"{templateName}"</strong>. Todos los
              vehículos de ese subtipo usarán esta plantilla.
            </DialogDescription>
          </DialogHeader>

          {/* ─── SubType list ─────────────────────────────────────────── */}
          <div className="py-2">
            {isLoadingSubTypes ? (
              <div className="space-y-2 px-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-muted h-8 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <Command className="border rounded-md">
                <CommandInput placeholder="Buscar subtipo..." />
                <CommandList className="max-h-64">
                  <CommandEmpty>No se encontraron subtipos.</CommandEmpty>
                  <CommandGroup>
                    {subTypes.map((subType) => {
                      const isSelected = selectedSubType?.id === subType.id;
                      const hasSameTemplate = subType.tire_template_id === templateId;
                      const hasDiffTemplate =
                        subType.tire_template_id !== null && subType.tire_template_id !== templateId;

                      return (
                        <CommandItem
                          key={subType.id}
                          value={getSubTypeLabel(subType)}
                          onSelect={() => handleSubTypeSelect(subType)}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                            {!isSelected && <span className="h-4 w-4 shrink-0" />}
                            <span className="font-medium">{getSubTypeLabel(subType)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {hasSameTemplate && (
                              <Badge variant="secondary" className="text-xs">
                                Esta plantilla
                              </Badge>
                            )}
                            {hasDiffTemplate && subType.tire_template && (
                              <Badge variant="outline" className="text-xs max-w-[120px] truncate">
                                {subType.tire_template.name}
                              </Badge>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </div>

          {/* ─── Selection feedback ───────────────────────────────────── */}
          {alreadyAssigned && (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded px-3 py-2">
              Este subtipo ya tiene esta plantilla asignada.
            </p>
          )}

          {hasDifferentTemplate && selectedSubType?.tire_template && (
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 rounded px-3 py-2">
              Este subtipo tiene la plantilla <strong>"{selectedSubType.tire_template.name}"</strong> asignada. Al
              cambiar la plantilla, los vehículos de este subtipo generarán nuevas posiciones de cubiertas al ingresar a
              gomería.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isAssigning}>
              Cancelar
            </Button>
            <Button onClick={handleAssignClick} disabled={!selectedSubType || alreadyAssigned || isAssigning}>
              {isAssigning ? 'Asignando...' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Conflict confirmation dialog ─────────────────────────────────── */}
      <AlertDialog open={showConflictWarning} onOpenChange={setShowConflictWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar plantilla del subtipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Este subtipo ya tiene la plantilla <strong>"{selectedSubType?.tire_template?.name}"</strong> asignada. Al
              cambiar, los vehículos de este subtipo generarán nuevas posiciones al ingresar a gomería. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAssigning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConflictConfirm}
              disabled={isAssigning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isAssigning ? 'Asignando...' : 'Cambiar plantilla'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
