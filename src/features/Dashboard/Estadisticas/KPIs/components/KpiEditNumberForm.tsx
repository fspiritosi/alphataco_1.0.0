'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { updateKPINumber } from '../actions/actions';
import { useInvalidateKpiQueries } from '../hooks/useInvalidateKpiQueries';
import { KPI } from '../types';

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

const EditNumberSchema = z.object({
  new_number: z.string().min(1, { message: 'Debe ingresar el nuevo número' }),
  new_validity_date: z.string().min(1, { message: 'Debe ingresar la nueva fecha de vigencia' }),
  change_reason: z.string().min(1, { message: 'Debe ingresar el motivo del cambio' }),
});

interface KpiEditNumberFormProps {
  kpi: KPI;
  onSuccess?: () => void;
}

export function KpiEditNumberForm({ kpi, onSuccess }: KpiEditNumberFormProps) {
  const { invalidateKpiChart } = useInvalidateKpiQueries();
  const form = useForm<z.infer<typeof EditNumberSchema>>({
    resolver: zodResolver(EditNumberSchema),
    defaultValues: {
      new_number: kpi.number || '',
      new_validity_date: kpi.validity_date || '',
      change_reason: '',
    },
  });

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: z.infer<typeof EditNumberSchema>) => {
    setIsSubmitting(true);
    toast.promise(
      async () => {
        const result = await updateKPINumber({
          kpi_id: kpi.id,
          new_number: values.new_number,
          new_validity_date: values.new_validity_date,
          change_reason: values.change_reason,
        });
        if (result.error) throw result.error;
        return result;
      },
      {
        loading: 'Actualizando número y vigencia...',
        success: () => {
          // Invalidar solo el gráfico del KPI que se actualizó
          if (kpi.code) {
            invalidateKpiChart(kpi.code as KpiCode);
          }
          router.refresh();
          form.reset({
            new_number: form.getValues('new_number'),
            new_validity_date: form.getValues('new_validity_date'),
            change_reason: '',
          });
          if (onSuccess) onSuccess();
          return 'Número y vigencia actualizados correctamente';
        },
        error: (error) => {
          return error?.message || 'Error al actualizar el número y vigencia';
        },
      }
    );
    setIsSubmitting(false);
  };

  return (
    <div className="border-t pt-4">
      <h3 className="text-lg font-semibold mb-4">Editar Número y Vigencia</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="new_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuevo Número</FormLabel>
                  <FormControl>
                    <Input type="text" {...field} className="input w-full" placeholder="Nuevo número" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="new_validity_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Fecha de Vigencia</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="input w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="change_reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo del Cambio</FormLabel>
                <FormControl>
                  <Textarea {...field} className="input w-full min-h-[80px]" placeholder="Motivo del cambio" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button type="submit" variant="gh_orange" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Actualizar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset({
                  new_number: kpi.number || '',
                  new_validity_date: kpi.validity_date || '',
                  change_reason: '',
                });
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
