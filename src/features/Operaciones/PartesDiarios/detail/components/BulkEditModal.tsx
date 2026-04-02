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

const BASE_STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'sin_recursos_asignados', label: 'Sin recursos asignados' },
  { value: 'ejecutado', label: 'Ejecutado' },
  { value: 'reprogramado', label: 'Reprogramado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'en_certificacion', label: 'En certificación' },
];

/** Opciones exclusivas de jornadas 24 horas */
const OPTIONS_24H = [
  { value: 'completar_diurno', label: 'Completar turno diurno' },
  { value: 'completar_nocturno', label: 'Completar turno nocturno' },
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
    cancel_reason: z.string().optional(),
    reschedule_date: z.string().optional(), // YYYY-MM-DD
  })
  .superRefine((data, ctx) => {
    const hasAnyField = data.status !== undefined || data.working_day !== undefined || data.type_service !== undefined;
    if (!hasAnyField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe seleccionar al menos un campo para actualizar',
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
      working_day: undefined,
      type_service: undefined,
      cancel_reason: undefined,
      reschedule_date: undefined,
    },
  });

  const watchedStatus = form.watch('status');
  const showCancelReason = watchedStatus === 'cancelado';
  const showRescheduleDate = watchedStatus === 'reprogramado';
  const isPseudoStatus = watchedStatus === 'completar_diurno' || watchedStatus === 'completar_nocturno';

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
        ...(values.working_day !== undefined ? { working_day: values.working_day } : {}),
        ...(values.type_service !== undefined ? { type_service: values.type_service } : {}),
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
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

        {/* Lista scrollable de filas seleccionadas */}
        <ScrollArea className="max-h-32 rounded-md border">
          <div className="p-2 space-y-1">
            {selectedRows.map((row) => (
              <div key={row.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{row.customers?.name ?? '—'}</span>
                <span>→</span>
                <span>{row.customer_services?.service_name ?? '—'}</span>
                {row.working_day === 'Jornada 24 horas' && (
                  <Badge variant="info" className="text-[10px] px-1 py-0">
                    24h
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Indicador de turnos faltantes para filas 24h */}
        {has24hRows && (
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
              <Info className="h-3.5 w-3.5" />
              Filas de Jornada 24 horas seleccionadas ({rows24h.length})
            </div>
            {missingDay.length > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-300 ml-5">
                {missingDay.length} fila{missingDay.length !== 1 ? 's' : ''} sin completar turno diurno
              </p>
            )}
            {missingNight.length > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-300 ml-5">
                {missingNight.length} fila{missingNight.length !== 1 ? 's' : ''} sin completar turno nocturno
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
                  <FormLabel>Estado</FormLabel>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Sin cambios" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Sin cambios</SelectItem>
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

            {/* Jornada — no disponible para pseudo-estados 24h */}
            {!isPseudoStatus && (
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
            )}

            {/* Tipo de servicio — no disponible para pseudo-estados 24h */}
            {!isPseudoStatus && (
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
            )}

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
