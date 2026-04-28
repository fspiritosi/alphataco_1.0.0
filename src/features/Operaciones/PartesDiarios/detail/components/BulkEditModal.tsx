'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarIcon, Info } from 'lucide-react';
import moment from 'moment';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { bulkUpdateRowStatus } from '../actions.server';
import type { DailyReportDetailRow } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Estados disponibles en edición masiva — alineados con prod.
 * NO se permite cambiar a 'pendiente', 'sin_recursos_asignados' ni 'en_certificacion'
 * desde aquí (esos son estados internos del flujo, no acciones del usuario).
 */
const BASE_STATUS_OPTIONS = [
  { value: 'ejecutado', label: 'Ejecutado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'reprogramado', label: 'Reprogramado' },
];

/** Opciones exclusivas de jornadas 24 horas */
const OPTIONS_24H = [
  { value: 'completar_diurno', label: 'Completar turno diurno' },
  { value: 'completar_nocturno', label: 'Completar turno nocturno' },
];

// ============================================================================
// SCHEMA
// ============================================================================

const formSchema = z
  .object({
    status: z.string().optional(),
    cancel_reason: z.string().optional(),
    reschedule_date: z.string().optional(), // YYYY-MM-DD
  })
  .superRefine((data, ctx) => {
    if (data.status === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe seleccionar un estado para actualizar',
        path: ['status'],
      });
    }
    if (data.status === 'cancelado' && !data.cancel_reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El motivo de cancelación es requerido',
        path: ['cancel_reason'],
      });
    }
    if (data.status === 'reprogramado' && !data.reschedule_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de reprogramación es requerida',
        path: ['reschedule_date'],
      });
    }
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

  // Detectar filas de jornada 24h y su estado de completitud
  const rows24h = selectedRows.filter((r) => r.working_day === 'Jornada 24 horas');
  const has24hRows = rows24h.length > 0;
  const statusOptions = has24hRows ? [...BASE_STATUS_OPTIONS, ...OPTIONS_24H] : BASE_STATUS_OPTIONS;

  // Detectar qué turnos faltan completar en las filas 24h seleccionadas
  const missingDay = rows24h.filter((r) => !r.completed_day);
  const missingNight = rows24h.filter((r) => !r.completed_night);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: undefined,
      cancel_reason: undefined,
      reschedule_date: undefined,
    },
  });

  const watchedStatus = form.watch('status');
  const showCancelReason = watchedStatus === 'cancelado';
  const showRescheduleDate = watchedStatus === 'reprogramado';

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const rowIds = selectedRows.map((r) => r.id);

      // Pseudo-estados de jornada 24h
      if (values.status === 'completar_diurno') {
        return bulkUpdateRowStatus(rowIds, { completar_diurno: true });
      }
      if (values.status === 'completar_nocturno') {
        return bulkUpdateRowStatus(rowIds, { completar_nocturno: true });
      }

      return bulkUpdateRowStatus(rowIds, {
        ...(values.status !== undefined ? { status: values.status } : {}),
        ...(values.cancel_reason ? { cancel_reason: values.cancel_reason } : {}),
        ...(values.reschedule_date ? { reschedule_date: values.reschedule_date } : {}),
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

  // Fecha mínima para reprogramación: mañana
  const tomorrow = moment().add(1, 'day').startOf('day').toDate();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto gap-4">
        <DialogHeader className="space-y-1.5">
          <DialogTitle>Edición masiva</DialogTitle>
          <DialogDescription className="text-xs">
            Actualizando{' '}
            <strong className="text-foreground">
              {selectedRows.length} registro{selectedRows.length !== 1 ? 's' : ''}
            </strong>
            . Solo se actualizan los campos que completes.
          </DialogDescription>
        </DialogHeader>

        {/* Lista scrollable de filas seleccionadas — compacta, altura adaptativa */}
        <ScrollArea className={cn('rounded-md border bg-muted/30', selectedRows.length > 4 ? 'max-h-32' : 'max-h-fit')}>
          <ul className="px-2.5 py-2 space-y-1">
            {selectedRows.map((row) => (
              <li key={row.id} className="flex items-center gap-2 text-xs">
                <span className="font-medium text-foreground truncate">{row.customers?.name ?? '—'}</span>
                <span className="text-muted-foreground/60">→</span>
                <span className="text-muted-foreground truncate">{row.customer_services?.service_name ?? '—'}</span>
                {row.working_day === 'Jornada 24 horas' && (
                  <Badge variant="info" className="ml-auto shrink-0 text-[10px] px-1 py-0">
                    24h
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>

        {/* Indicador de turnos faltantes para filas 24h */}
        {has24hRows && (
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 px-3 py-2 space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {rows24h.length} fila{rows24h.length !== 1 ? 's' : ''} de Jornada 24h seleccionada
              {rows24h.length !== 1 ? 's' : ''}
            </div>
            {(missingDay.length > 0 || missingNight.length > 0) && (
              <p className="text-xs text-blue-600 dark:text-blue-300 pl-5">
                Faltan completar:
                {missingDay.length > 0 && (
                  <>
                    {' '}
                    <strong>{missingDay.length}</strong> turno{missingDay.length !== 1 ? 's' : ''} diurno
                    {missingDay.length !== 1 ? 's' : ''}
                  </>
                )}
                {missingDay.length > 0 && missingNight.length > 0 && ','}
                {missingNight.length > 0 && (
                  <>
                    {' '}
                    <strong>{missingNight.length}</strong> turno{missingNight.length !== 1 ? 's' : ''} nocturno
                    {missingNight.length !== 1 ? 's' : ''}
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Estado */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuevo estado</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(val) => {
                      field.onChange(val === '_none' ? undefined : val);
                      // Limpiar campos condicionales al cambiar estado
                      form.setValue('cancel_reason', undefined);
                      form.setValue('reschedule_date', undefined);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar estado..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((opt) => (
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

            {/* Motivo de cancelación — solo si status = cancelado */}
            {showCancelReason && (
              <FormField
                control={form.control}
                name="cancel_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de cancelación</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingrese el motivo..." {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Fecha de reprogramación — solo si status = reprogramado */}
            {showRescheduleDate && (
              <FormField
                control={form.control}
                name="reschedule_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva fecha</FormLabel>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>La fecha debe ser a partir de mañana</span>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? moment(field.value).format('DD/MM/YYYY') : 'Seleccionar fecha'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? moment(date).format('YYYY-MM-DD') : undefined)}
                          disabled={(date) => date < tomorrow}
                          captionLayout="dropdown"
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending || selectedRows.length === 0} className="min-w-32">
                {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
