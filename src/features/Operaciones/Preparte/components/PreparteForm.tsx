'use client';

import { fetchContractsByClientId } from '@/app/dashboard/employee/action/actions/actions';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building, CalendarIcon, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Cliente } from '../components/PreparteManager';
// Esquema de validación con Zod
const formSchema = z.object({
  id: z.string().optional(),
  clienteId: z.string().min(1, 'Por favor selecciona un cliente'),
  contratoId: z.string().min(1, 'Por favor selecciona un contrato'),
  clienteName: z.string(),
  requestDate: z.date({
    required_error: 'La fecha de solicitud es requerida',
  }),
  executionDate: z.date({
    required_error: 'La fecha de ejecución es requerida',
  }),
  observaciones: z.string().optional(),
});

type PreparteItem = z.infer<typeof formSchema>;
interface Contrato {
  id: string;
  service_name: string;
}
interface PreparteFormProps {
  formData: PreparteItem;
  clientes: Cliente[];
  contratos: Contrato[];
  isEditing: boolean;
  onInputChange: (field: keyof PreparteItem, value: any) => void;
  onSubmit: (data: PreparteItem) => void;
  onCancel: () => void;
}

export function PreparteForm({ formData, clientes, isEditing, onInputChange, onSubmit, onCancel }: PreparteFormProps) {
  const form = useForm<PreparteItem>({
    resolver: zodResolver(formSchema),
    defaultValues: formData,
  });

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (form.formState.isSubmitSuccessful) return;

    const clienteId = form.getValues('clienteId');
    if (clienteId) {
      handleClienteChange(clienteId);
    }
  }, [form, form.watch('clienteId')]);

  const handleClienteChange = async (clienteId: string) => {
    if (!clienteId) {
      setContratos([]);
      form.setValue('contratoId', '');
      return;
    }

    setIsLoading(true);
    try {
      const contratosCliente = await fetchContractsByClientId(clienteId);
      setContratos(contratosCliente as Contrato[]);
    } catch (error) {
      console.error('Error cargando contratos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (data: PreparteItem) => {
    // Actualizar el nombre del cliente si es necesario
    const clienteSeleccionado = clientes.find((c) => c.id === data.clienteId);
    if (clienteSeleccionado) {
      data.clienteName = clienteSeleccionado.name;
    }

    // Llamar a la función onSubmit con los datos del formulario
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-4">
          {/* Selector de Clientes */}
          <FormField
            control={form.control}
            name="clienteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select
                  onValueChange={(value) => {
                    form.setValue('clienteId', value);
                    form.setValue('contratoId', '');
                    handleClienteChange(value);
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente">
                        {field.value ? (
                          clientes.find((c) => c.id === field.value)?.name || 'Cliente no encontrado'
                        ) : (
                          <span className="flex items-center">
                            <Building className="mr-2 h-4 w-4" />
                            Seleccionar cliente
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Selector de Contrato */}
          <FormField
            control={form.control}
            name="contratoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contrato</FormLabel>
                <Select
                  disabled={!form.watch('clienteId') || isLoading}
                  onValueChange={(value) => form.setValue('contratoId', value)}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoading ? 'Cargando contratos...' : 'Seleccionar contrato'}>
                      {field.value ? (
                        contratos.find((c) => c.id === field.value)?.service_name || 'Contrato no encontrado'
                      ) : (
                        <span className="flex items-center">
                          <FileText className="mr-2 h-4 w-4" />
                          {isLoading ? 'Cargando...' : 'Seleccionar contrato'}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {contratos.map((contrato) => (
                      <SelectItem key={contrato.id} value={contrato.id}>
                        {contrato.service_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha de Solicitud */}
          <FormField
            control={form.control}
            name="requestDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Solicitud</FormLabel>
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
                        {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Seleccionar fecha</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha de Ejecución Solicitada */}
          <FormField
            control={form.control}
            name="executionDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Ejecución Solicitada</FormLabel>
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
                        {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Seleccionar fecha</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo de Observaciones */}
          <FormField
            control={form.control}
            name="observaciones"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observaciones</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ingrese observaciones adicionales..." className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">{isEditing ? 'Actualizar' : 'Guardar'}</Button>
        </div>
      </form>
    </Form>
  );
}
