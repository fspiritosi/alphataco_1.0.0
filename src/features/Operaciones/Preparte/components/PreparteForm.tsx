'use client';

import { fetchContractsByClientId } from '@/app/dashboard/employee/action/actions/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchServiceItems } from '@/features/Empresa/Clientes/actions/items';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building, CalendarIcon, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Cliente } from '../components/PreparteManager';

// Esquema de validación con Zod
const formSchema = z.object({
  id: z.string(),
  clienteId: z.string().min(1, 'Por favor selecciona un cliente'),
  contratoId: z.string().min(1, 'Por favor selecciona un contrato'),
  items: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
      })
    )
    .min(1, 'Por favor selecciona al menos un ítem'),
  clienteName: z.string(),
  requestDate: z.date({
    required_error: 'La fecha de solicitud es requerida',
  }),
  executionDate: z.date({
    required_error: 'La fecha de ejecución es requerida',
  }),
  tipo: z.string().min(1, 'El tipo es requerido'),
  jornada: z.string().min(1, 'La jornada es requerida'),
  solicitante: z.string().min(1, 'El solicitante es requerido'),
  observaciones: z.string().optional(),
});

type PreparteItem = z.infer<typeof formSchema>;

interface Contrato {
  id: string;
  service_name: string;
}

interface Item {
  id: string;
  item_name: string;
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
  const [contractItems, setContractItems] = useState<{ label: string; value: string }[]>([]);
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

  // Fetch items when contratoId changes
  useEffect(() => {
    const fetchItems = async () => {
      if (!form.watch('contratoId')) {
        setContractItems([]);
        return;
      }
      console.log('Fetching items for contrato:', form.watch('contratoId'));

      setIsLoading(true);
      try {
        const items = await fetchServiceItems(form.watch('contratoId'));
        console.log('Fetched items:', items);
        setContractItems(
          items.map((item) => ({
            label: item.item_name || `Item ${item.id}`,
            value: item.id.toString(),
          }))
        );
      } catch (error) {
        console.error('Error fetching contract items:', error);
        setContractItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [form.watch('contratoId')]);

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
    <div className="overflow-y-auto max-h-[calc(100vh-10rem)] gap-4">
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
                      form.setValue('items', []);
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
            {/* Multiselector de items */}
            <FormField
              control={form.control}
              name="items"
              render={({ field }) => (
                <FormItem>
                  <Card>
                    <CardContent>
                      <FormLabel>Items</FormLabel>
                      <MultiSelectCombobox
                        options={contractItems}
                        selectedValues={field.value?.map((item) => item.id) || []}
                        onChange={(selectedIds) => {
                          const currentItems = form.getValues('items') || [];
                          const newItems = selectedIds.map((id) => {
                            const existing = currentItems.find((item) => item.id === id);
                            return existing || { id, quantity: 1 };
                          });
                          field.onChange(newItems);
                        }}
                        placeholder={
                          form.getValues('contratoId') ? 'Seleccionar items' : 'Seleccione un contrato primero'
                        }
                        emptyMessage="No hay items disponibles para este contrato"
                        disabled={!form.getValues('contratoId') || isLoading}
                      />
                    </CardContent>
                    <CardFooter>
                      <div className="grid grid-cols-2 gap-4 w-full">
                        {field.value?.map((item) => {
                          const itemData = contractItems.find((i) => i.value === item.id);
                          return itemData ? (
                            <div key={item.id} className="flex items-center justify-between gap-4">
                              <div className="flex items-center flex-1 min-w-0">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className="bg-blue-500 text-white flex-1 min-w-0 truncate pr-6 relative group hover:bg-blue-600 transition-colors">
                                        {itemData.label}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const updatedItems = field.value.filter((i) => i.id !== item.id);
                                            field.onChange(updatedItems);
                                          }}
                                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
                                          aria-label="Eliminar ítem"
                                        >
                                          <span className="text-xs font-bold">×</span>
                                        </button>
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" align="center" className="max-w-xs break-words">
                                      {itemData.label}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Cant:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newQuantity = parseInt(e.target.value) || 1;
                                    const updatedItems = field.value.map((i) =>
                                      i.id === item.id ? { ...i, quantity: newQuantity } : i
                                    );
                                    field.onChange(updatedItems);
                                  }}
                                  className="w-16 h-8 text-sm text-center border rounded"
                                />
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </CardFooter>
                  </Card>
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
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        locale={es}
                      />
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
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de servicio */}
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de servicio</FormLabel>
                  <FormControl>
                    <Select onValueChange={(value) => form.setValue('tipo', value)} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo de servicio">
                          {field.value ? field.value : 'Seleccionar tipo de servicio'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Adicional">Adicional</SelectItem>
                        <SelectItem value="Adicional Permanente">Adicional Permanente</SelectItem>
                        <SelectItem value="Mensual">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Jornada */}
            <FormField
              control={form.control}
              name="jornada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jornada</FormLabel>
                  <FormControl>
                    <Select onValueChange={(value) => form.setValue('jornada', value)} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar jornada">
                          {field.value ? field.value : 'Seleccionar jornada'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Jornada 8 horas">Jornada 8 horas</SelectItem>
                        <SelectItem value="Jornada 12 horas">Jornada 12 horas</SelectItem>
                        <SelectItem value="Jornada 24 horas">Jornada 24 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Solicitante */}
            <FormField
              control={form.control}
              name="solicitante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solicitante</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingrese el solicitante" {...field} />
                  </FormControl>
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
    </div>
  );
}
