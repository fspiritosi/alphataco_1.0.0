'use client';

import { Calendar } from '@/components/ui/calendar';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import moment from 'moment';
import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

export const terminationSchema = z.object({
  reason_for_termination: z.string({ required_error: 'La razon de baja es requerida.' }),
  termination_date: z.date({ required_error: 'La fecha de baja es requerida.' }),
});

export type TerminationFormValues = z.infer<typeof terminationSchema>;

export const TERMINATION_REASONS = [
  'Despido sin causa',
  'Renuncia',
  'Despido con causa',
  'Acuerdo de partes',
  'Fin de contrato',
  'Fallecimiento',
] as const;

interface TerminationFormFieldsProps {
  form: UseFormReturn<TerminationFormValues>;
}

export function TerminationFormFields({ form }: TerminationFormFieldsProps) {
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const parsed = moment(value, 'YYYY-MM-DD', true);
      if (parsed.isValid()) {
        form.setValue('termination_date', parsed.toDate(), { shouldValidate: true });
      }
    }
  };

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="reason_for_termination"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Motivo de Baja</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la razon" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TERMINATION_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>Elige la razon por la que deseas dar de baja</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="termination_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Fecha de Baja</FormLabel>
            <div className="flex gap-2">
              <FormControl>
                <Input
                  type="date"
                  value={field.value ? moment(field.value).format('YYYY-MM-DD') : ''}
                  onChange={handleDateInputChange}
                  max={moment().format('YYYY-MM-DD')}
                  className="flex-1"
                />
              </FormControl>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'inline-flex items-center justify-center rounded-md border border-input bg-background px-3 hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <FormDescription>Fecha en la que se dio de baja</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
