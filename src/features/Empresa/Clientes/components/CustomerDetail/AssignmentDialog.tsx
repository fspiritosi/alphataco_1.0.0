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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { AssignmentChanges, AssignmentUpdateResult } from '../../actions/assignments.server';
import { diffAssignments } from '../../lib/assignment-diff';

interface AssignmentOption {
  label: string;
  value: string;
}

interface AssignmentDialogProps {
  triggerLabel: string;
  title: string;
  description: string;
  fieldLabel: string;
  placeholder: string;
  emptyMessage: string;
  options: AssignmentOption[];
  /** Singular/plural para el resumen del toast ("empleado"/"empleados"). */
  nouns: { singular: string; plural: string };
  /** Afectaciones vigentes leídas de la BASE al abrir el modal (baseline). */
  loadBaseline: () => Promise<string[]>;
  /** Aplica altas y bajas explícitas. */
  save: (changes: AssignmentChanges) => Promise<AssignmentUpdateResult>;
  onSaved?: () => void;
}

/** Mensaje de resultado con números reales, para que el usuario vea qué pasó de verdad. */
export function buildAssignmentSummary(added: number, removed: number, singular: string, plural: string): string {
  const parts: string[] = [];
  if (added > 0) parts.push(`Se afectaron ${added} ${added === 1 ? singular : plural}`);
  if (removed > 0) parts.push(`se desafectaron ${removed} ${removed === 1 ? singular : plural}`);
  if (parts.length === 0) return 'No hubo cambios';
  return `${parts.join(' y ')}.`;
}

interface FormValues {
  selected: string[];
}

/**
 * Modal de afectación M:M (cliente ↔ empleados/equipos).
 *
 * - El baseline se lee de la base al abrir (nunca del estado de la pantalla). Sin baseline no
 *   se puede guardar: combo deshabilitado y submit bloqueado.
 * - Antes de confirmar se muestra el delta ("N afectados. Se agregan X. Se quitan Y").
 * - Al servidor viajan SOLO los ids de alta y de baja (`{ add, remove }`).
 */
export function AssignmentDialog({
  triggerLabel,
  title,
  description,
  fieldLabel,
  placeholder,
  emptyMessage,
  options,
  nouns,
  loadBaseline,
  save,
  onSaved,
}: AssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [baseline, setBaseline] = useState<string[] | null>(null);
  const [isLoadingBaseline, setIsLoadingBaseline] = useState(false);
  const form = useForm<FormValues>({ defaultValues: { selected: [] } });

  const handleOpenChange = async (nextOpen: boolean) => {
    if (!nextOpen) {
      setOpen(false);
      setBaseline(null);
      form.reset({ selected: [] });
      return;
    }

    setOpen(true);
    setIsLoadingBaseline(true);
    form.reset({ selected: [] });
    try {
      const current = await loadBaseline();
      setBaseline(current);
      form.reset({ selected: current });
    } catch {
      toast.error('No se pudieron cargar las afectaciones actuales. Volvé a abrir el modal.');
      setBaseline(null);
      setOpen(false);
    } finally {
      setIsLoadingBaseline(false);
    }
  };

  const handleSubmit = async (values: FormValues) => {
    // Sin baseline no se guarda: no sabríamos qué se agregó y qué se quitó.
    if (!baseline) {
      toast.error('Todavía se están cargando las afectaciones actuales. Esperá un instante.');
      return;
    }

    const { toAdd, toRemove } = diffAssignments(baseline, values.selected);
    if (toAdd.length === 0 && toRemove.length === 0) {
      toast.info('No hay cambios para guardar');
      setOpen(false);
      return;
    }

    const result = await save({ add: toAdd, remove: toRemove });
    if (!result.success) {
      toast.error(`No se pudieron actualizar los ${nouns.plural}: ${result.error}`);
      return;
    }

    toast.success(buildAssignmentSummary(result.added, result.removed, nouns.singular, nouns.plural));
    setOpen(false);
    setBaseline(null);
    form.reset({ selected: [] });
    onSaved?.();
  };

  const disabled = isLoadingBaseline || !baseline;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="gh_orange">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full space-y-6 pt-2">
            <FormField
              control={form.control}
              name="selected"
              render={({ field }) => {
                const pending = baseline ? diffAssignments(baseline, field.value) : null;
                return (
                  <FormItem className="w-full">
                    <FormLabel>{fieldLabel}</FormLabel>
                    <FormControl>
                      <MultiSelectCombobox
                        options={options}
                        emptyMessage={emptyMessage}
                        selectedValues={field.value}
                        onChange={field.onChange}
                        placeholder={placeholder}
                        showSelectAll={true}
                        disabled={disabled}
                        isLoading={isLoadingBaseline}
                      />
                    </FormControl>
                    {/* Resumen de lo que va a pasar al guardar: el usuario ve las bajas antes de confirmarlas */}
                    {isLoadingBaseline ? (
                      <p className="text-xs text-muted-foreground">Cargando las afectaciones actuales del cliente...</p>
                    ) : pending ? (
                      <p className="text-xs text-muted-foreground">
                        {baseline?.length ?? 0} afectados actualmente.{' '}
                        {pending.toAdd.length === 0 && pending.toRemove.length === 0 ? (
                          'Sin cambios.'
                        ) : (
                          <>
                            {pending.toAdd.length > 0 && (
                              <span className="text-green-600 dark:text-green-500">
                                Se agregan {pending.toAdd.length}.{' '}
                              </span>
                            )}
                            {pending.toRemove.length > 0 && (
                              <span className="text-destructive font-medium">Se quitan {pending.toRemove.length}.</span>
                            )}
                          </>
                        )}
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <DialogFooter className="gap-2 sm:gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting || disabled} variant="gh_orange">
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
