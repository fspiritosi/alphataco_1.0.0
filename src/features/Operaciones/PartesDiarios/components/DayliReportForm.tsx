'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { checkDailyReportExists, createDailyReport } from '../actions/actions';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { es } from 'date-fns/locale';
import moment from 'moment';

const FormSchema = z.object({
  date: z.date({
    required_error: 'Una fecha es requerida.',
  }),
});

export default function DayliReportForm() {
  const router = useRouter();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    toast.promise(
      async () => {
        const exists = await checkDailyReportExists([format(data.date, 'yyyy-MM-dd')]);

        if (exists.length > 0) {
          throw new Error('Ya existe un parte diario para esta fecha.');
        }

        const created = await createDailyReport([format(data.date, 'yyyy-MM-dd')]);
        if (created?.[0].id) {
          router.push(`/dashboard/operations/${created[0].id}`);
        }
        router.refresh();
        return 'Parte diario creado exitosamente!';
      },
      {
        loading: 'Creando parte diario...',
        success: 'Parte diario creado exitosamente!',
        error: (error) => error,
      }
    );
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
                        {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Seleccione una fecha</span>}
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
          <Button type="submit">Crear parte diario</Button>
        </form>
      </Form>
    </div>
  );
}
