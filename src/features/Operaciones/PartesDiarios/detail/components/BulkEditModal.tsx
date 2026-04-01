'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { bulkUpdateRowStatus } from '../actions.server';
import type { DailyReportDetailRow } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'sin_recursos_asignados', label: 'Sin recursos asignados' },
  { value: 'ejecutado', label: 'Ejecutado' },
  { value: 'reprogramado', label: 'Reprogramado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'en_certificacion', label: 'En certificación' },
];

const WORKING_DAY_OPTIONS = [
  { value: 'Jornada 8 horas', label: 'Jornada 8 horas' },
  { value: 'Jornada 12 horas', label: 'Jornada 12 horas' },
  { value: 'Jornada 24 horas', label: 'Jornada 24 horas' },
];

const TYPE_SERVICE_OPTIONS = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'adicional', label: 'Adicional' },
  { value: 'adicional_permanente', label: 'Adicional Permanente' },
];

// ============================================================================
// SCHEMA
// ============================================================================

const formSchema = z
  .object({
    status: z.string().optional(),
    working_day: z.string().optional(),
    type_service: z.enum(['mensual', 'adicional', 'adicional_permanente']).optional(),
  })
  .refine((data) => data.status !== undefined || data.working_day !== undefined || data.type_service !== undefined, {
    message: 'Debe seleccionar al menos un campo para actualizar',
    path: ['status'],
  });

type FormValues = z.infer<typeof formSchema>;

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRows: DailyReportDetailRow[];
  dailyReportId: string;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BulkEditModal({ open, onOpenChange, selectedRows, dailyReportId, onSuccess }: Props) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: undefined,
      working_day: undefined,
      type_service: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const rowIds = selectedRows.map((r) => r.id);
      return bulkUpdateRowStatus(rowIds, {
        ...(values.status !== undefined ? { status: values.status } : {}),
        ...(values.working_day !== undefined ? { working_day: values.working_day } : {}),
        ...(values.type_service !== undefined ? { type_service: values.type_service } : {}),
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['daily-report-detail', dailyReportId] });
      onOpenChange(false);
      onSuccess();
      form.reset();
      toast.success(
        `${result.count} registro${result.count !== 1 ? 's' : ''} actualizado${result.count !== 1 ? 's' : ''} exitosamente`
      );
    },
    onError: () => {
      toast.error('Ocurrió un error al actualizar los registros');
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edición masiva</DialogTitle>
          <DialogDescription>
            Actualizando{' '}
            <strong>
              {selectedRows.length} registro{selectedRows.length !== 1 ? 's' : ''}
            </strong>{' '}
            seleccionado{selectedRows.length !== 1 ? 's' : ''}. Solo se actualizarán los campos que completes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(val) => field.onChange(val === '_none' ? undefined : val)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin cambios" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Sin cambios</SelectItem>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Working day */}
            <FormField
              control={form.control}
              name="working_day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jornada</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(val) => field.onChange(val === '_none' ? undefined : val)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin cambios" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Sin cambios</SelectItem>
                      {WORKING_DAY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type service */}
            <FormField
              control={form.control}
              name="type_service"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de servicio</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(val) =>
                      field.onChange(
                        val === '_none' ? undefined : (val as 'mensual' | 'adicional' | 'adicional_permanente')
                      )
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin cambios" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Sin cambios</SelectItem>
                      {TYPE_SERVICE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending || selectedRows.length === 0}>
                {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
