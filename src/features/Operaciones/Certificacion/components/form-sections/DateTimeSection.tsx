import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

type DateTimeSectionProps = {
  form: UseFormReturn<any>;
  isCreating: boolean;
  disabled?: boolean;
};

const workingDayOptions = [
  { label: 'Jornada 8 horas', value: 'jornada 8 horas' },
  { label: 'Jornada 12 horas', value: 'jornada 12 horas' },
  { label: 'Jornada 24 horas', value: 'jornada 24 horas' },
  { label: 'Por horario', value: 'por horario' },
];

export function DateTimeSection({ form, isCreating, disabled }: DateTimeSectionProps) {
  const workingDayWatch = form.watch('working_day');

  return (
    <div className="space-y-4 rounded-lg dark:bg-slate-900 bg-slate-50 p-4 w-full">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <CalendarIcon className="h-4 w-4" />
        Fechas y Horarios
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {/* Campo de Fecha - Solo visible en modo creación */}
        {isCreating && (
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha del Parte Diario *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                      >
                        {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Seleccione una fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        // Deshabilitar desde hoy en adelante
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date >= today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Tipo de jornada */}
        <FormField
          control={form.control}
          name="working_day"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Jornada</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                  disabled={disabled}
                >
                  {workingDayOptions.map((option) => (
                    <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value={option.value} disabled={disabled} />
                      </FormControl>
                      <FormLabel className="font-normal">{option.label}</FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Horas - Solo si es "por horario" */}
        {workingDayWatch === 'por horario' && (
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora de inicio</FormLabel>
                  <FormControl>
                    <Input type="time" disabled={disabled} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora de fin</FormLabel>
                  <FormControl>
                    <Input type="time" disabled={disabled} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
