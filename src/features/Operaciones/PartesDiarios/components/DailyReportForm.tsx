'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createDailyReport } from '../actions/mutations.server';
import { checkDailyReportExists } from '../actions/queries.server';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import 'moment/locale/es';
import { useState } from 'react';
import { DAILY_REPORTS_QUERY_KEY } from '../hooks/useDailyReports';

const FormSchema = z.object({
  date: z.date({
    required_error: 'Una fecha es requerida.',
  }),
});

export default function DailyReportForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const loadingToast = toast.loading('Creando parte diario...');

    try {
      // Verificar si ya existe
      const exists = await checkDailyReportExists([moment(data.date).format('YYYY-MM-DD')]);

      if (exists.length > 0) {
        toast.dismiss(loadingToast);
        toast.error('Ya existe un parte diario para esta fecha.');
        setIsSubmitting(false);
        return;
      }

      // Crear el parte diario
      const created = await createDailyReport([moment(data.date).format('YYYY-MM-DD')]);

      toast.dismiss(loadingToast);
      toast.success('Parte diario creado exitosamente!');

      // Invalidar la query para actualizar la tabla
      queryClient.invalidateQueries({ queryKey: [...DAILY_REPORTS_QUERY_KEY] });

      // Redirigir al detalle del parte diario creado
      if (created?.[0]?.id) {
        router.push(`/dashboard/operations/${created[0].id}`);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : 'Error al crear el parte diario');
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <CardTitle className="text-2xl mb-4">Crear parte diario</CardTitle>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn('w-[240px] pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                      >
                        {field.value ? (
                          moment(field.value).locale('es').format('LL')
                        ) : (
                          <span>Seleccione una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      disabled={(date) => moment(date).isBefore(moment().subtract(1, 'days'))}
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>Seleccione la fecha para el parte diario.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear parte diario'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
