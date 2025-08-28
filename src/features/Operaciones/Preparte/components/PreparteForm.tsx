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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchServiceItems } from '@/features/Empresa/Clientes/actions/items';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building, CalendarIcon } from 'lucide-react';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { createPreparte } from '../actions/preparte';
import { Cliente } from '../components/PreparteManager';
// Esquema de validación con Zod
const formSchema = z.object({
  id: z.string(),
  cliente_id: z.string().min(1, 'Por favor selecciona un cliente'),
  contrato_id: z.string().min(1, 'Por favor selecciona un contrato'),
  item: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
      })
    )
    .min(1, 'Por favor selecciona al menos un ítem'),
  requestDate: z.date({
    required_error: 'La fecha de solicitud es requerida',
  }),
  executionDate: z
    .object({
      from: z.date(),
      to: z.date().optional(),
    })
    .refine((data) => {
      if (data.from && data.to) {
        return data.from <= data.to;
      }
      return true;
    }, 'La fecha de inicio debe ser anterior a la fecha de fin'),
  tipo: z.string().min(1, 'El tipo es requerido'),
  jornada: z.string().min(1, 'La jornada es requerida'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  solicitante: z.string().min(1, 'El solicitante es requerido'),
  status: z.enum(['pendiente', 'reprogramado', 'cancelado', 'rechazado', 'confirmado']).default('pendiente'),
  cancel_reason: z.string().optional(),
  reprogram_date: z.date().optional(),
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
  const [reprogramDate, setReprogramDate] = useState<Date | null>(null);
  useEffect(() => {
    if (form.formState.isSubmitSuccessful) return;

    const clienteId = form.getValues('cliente_id');
    if (clienteId) {
      handleClienteChange(clienteId);
    }
  }, [form, form.watch('cliente_id')]);

  const handleClienteChange = async (clienteId: string) => {
    if (!clienteId) {
      setContratos([]);
      form.setValue('contrato_id', '');
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
      if (!form.watch('contrato_id')) {
        setContractItems([]);
        return;
      }
      console.log('Fetching items for contrato:', form.watch('contrato_id'));

      setIsLoading(true);
      try {
        const items = await fetchServiceItems(form.watch('contrato_id'));
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
  }, [form.watch('contrato_id')]);

  // const handleSubmit = (data: PreparteItem) => {
  //   // Actualizar el nombre del cliente si es necesario
  //   const clienteSeleccionado = clientes.find((c) => c.id === data.cliente_id);
  //   if (clienteSeleccionado) {
  //     data.cliente_id = clienteSeleccionado.id;
  //   }

  //   // Llamar a la función onSubmit con los datos del formulario
  //   onSubmit(data);
  // };
  const handleSubmit = async (data: PreparteItem) => {
    console.log('Iniciando handleSubmit con data:', data);

    try {
      console.log('Status actual:', data.status);
      console.log('reprogramDate:', data.reprogram_date);

      if (data.status === 'reprogramado' && data.reprogram_date) {
        console.log('Iniciando proceso de reprogramación');

        // Crear nuevo ítem con la nueva fecha
        const newItem = {
          ...data,
          id: crypto.randomUUID(),
          status: 'pendiente',
          executionDate: new Date(data.reprogram_date),
          item: data.item[0]?.id, // Tomamos solo el ID del primer ítem
          observaciones: `[${new Date().toLocaleDateString('es-ES')}] Reprogramado de ${format(data.executionDate.from, 'PPP', { locale: es })}. ${data.observaciones || ''}`,
        };

        console.log('Nuevo item a crear:', JSON.stringify(newItem, null, 2));

        try {
          console.log('Intentando crear nuevo item...');
          const result = await createPreparte(newItem as any);
          console.log('Nuevo item creado:', result);
        } catch (createError) {
          console.error('Error al crear nuevo item:', createError);
          throw createError;
        }

        // Actualizar ítem original
        const updatedOriginal = {
          ...data,
          status: 'reprogramado',
          observaciones: `[${new Date().toLocaleDateString('es-ES')}] Se reprogramó para ${format(data.reprogram_date, 'PPP', { locale: es })}. ${data.observaciones || ''}`,
        };

        console.log('Actualizando item original:', JSON.stringify(updatedOriginal, null, 2));

        try {
          console.log('Intentando actualizar item original...');
          await onSubmit(updatedOriginal as any);
          console.log('Item original actualizado');
        } catch (updateError) {
          console.error('Error al actualizar item original:', updateError);
          throw updateError;
        }

        toast.success('Servicio reprogramado correctamente');
        onCancel();
        return;
      }

      // Lógica normal de guardado
      console.log('Guardado normal, no es reprogramación');
      const clienteSeleccionado = clientes.find((c) => c.id === data.cliente_id);
      if (clienteSeleccionado) {
        data.cliente_id = clienteSeleccionado.id;
      }
      onSubmit(data);
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      toast.error(`Error al guardar el servicio: ${(error as Error).message}`);
    }
  };
  return (
    <div className=" gap-4 space-y-4 rounded-lg dark:bg-slate-900 bg-slate-50 p-4 w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" />
              Datos del Cliente
            </h4>
            {/* Selector de Clientes */}
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  {/* <Select
                    onValueChange={(value) => {
                      form.setValue('cliente_id', value);
                      form.setValue('contrato_id', '');
                      form.setValue('item', []);
                      handleClienteChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-background">
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
                  </Select> */}
                  <MultiSelectCombobox
                    options={clientes.map((cliente) => ({
                      label: cliente.name,
                      value: cliente.id,
                    }))}
                    selectedValues={field.value ? [field.value] : []} // Asegurar que sea un array
                    onChange={(selectedIds) => {
                      field.onChange(selectedIds[0] || ''); // Tomar el primer ID o string vacío
                    }}
                    placeholder={clientes.find((c) => c.id === field.value)?.name || 'Seleccionar cliente'}
                    emptyMessage="No hay clientes disponibles"
                    maxSelections={1} // Para selección única
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Selector de Contrato */}
            <FormField
              control={form.control}
              name="contrato_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contrato</FormLabel>
                  {/* <Select
                    disabled={!form.watch('cliente_id') || isLoading}
                    onValueChange={(value) => form.setValue('contrato_id', value)}
                    value={field.value}
                  >
                    <SelectTrigger className="bg-background">
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
                  </Select> */}
                  <MultiSelectCombobox
                    options={contratos.map((contrato) => ({
                      label: contrato.service_name,
                      value: contrato.id,
                    }))}
                    selectedValues={field.value ? [field.value] : []} // Asegurar que sea un array
                    onChange={(selectedIds) => {
                      field.onChange(selectedIds[0] || ''); // Tomar el primer ID o string vacío
                    }}
                    placeholder={contratos.find((c) => c.id === field.value)?.service_name || 'Seleccionar contrato'}
                    emptyMessage="No hay contratos disponibles"
                    disabled={!form.watch('cliente_id') || isLoading}
                    maxSelections={1} // Para selección única
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Multiselector de items */}
            <FormField
              control={form.control}
              name="item"
              render={({ field }) => (
                <FormItem>
                  <Card>
                    <CardContent>
                      <FormLabel>Items</FormLabel>
                      <MultiSelectCombobox
                        options={contractItems}
                        selectedValues={field.value?.map((item) => item.id) || []}
                        onChange={(selectedIds) => {
                          const currentItems = form.getValues('item') || [];
                          const newItems = selectedIds.map((id) => {
                            const existing = currentItems.find((item) => item.id === id);
                            return existing || { id, quantity: 1 };
                          });
                          field.onChange(newItems);
                        }}
                        placeholder={
                          form.getValues('contrato_id') ? 'Seleccionar items' : 'Seleccione un contrato primero'
                        }
                        emptyMessage="No hay items disponibles para este contrato"
                        disabled={!form.getValues('contrato_id') || isLoading}
                        maxSelections={isEditing ? 1 : null}
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
                          {field.value?.from ? (
                            field.value.to ? (
                              <>
                                {format(field.value.from, 'PPP', { locale: es })} -{' '}
                                {format(field.value.to, 'PPP', { locale: es })}
                              </>
                            ) : (
                              format(field.value.from, 'PPP', { locale: es })
                            )
                          ) : (
                            <span>Seleccionar rango de fechas</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      {isEditing ? (
                        // Modo edición (single)
                        <Calendar
                          mode="single"
                          selected={field.value?.from}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange({ from: date, to: date });
                            }
                          }}
                          initialFocus
                          locale={es}
                          numberOfMonths={2}
                        />
                      ) : (
                        // Modo creación (range)
                        <Calendar
                          mode="range"
                          selected={field.value || { from: undefined, to: undefined }}
                          onSelect={(range) => {
                            if (range) {
                              field.onChange(range);
                            }
                          }}
                          initialFocus
                          locale={es}
                          numberOfMonths={2}
                        />
                      )}
                    </PopoverContent>
                  </Popover>
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
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Seleccionar jornada">
                          {field.value ? field.value : 'Seleccionar jornada'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Jornada 8 horas">Jornada 8 horas</SelectItem>
                        <SelectItem value="Jornada 12 horas">Jornada 12 horas</SelectItem>
                        <SelectItem value="Jornada 24 horas">Jornada 24 horas</SelectItem>
                        <SelectItem value="por horario">Por horario</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Horario (condicional) */}
            {form.watch('jornada') === 'por horario' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de inicio</FormLabel>
                      <Input type="time" {...field} className="bg-background" />
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
                      <Input type="time" {...field} className="bg-background" />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            {/* Tipo de servicio */}
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tipo de servicio</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            defaultValue={field.value}
                            defaultChecked={field.value === 'mensual'}
                            value="mensual"
                            className="bg-background"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Mensual</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            defaultValue={field.value}
                            defaultChecked={field.value === 'adicional'}
                            value="adicional"
                            className="bg-background"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Adicional</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            defaultValue={field.value}
                            defaultChecked={field.value === 'adicional_permanente'}
                            value="adicional_permanente"
                            className="bg-background"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Adicional Permanente</FormLabel>
                      </FormItem>
                    </RadioGroup>
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
                    <Input placeholder="Ingrese el solicitante" className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => {
                  // Obtener el valor actual del estado
                  const currentStatusWatch = form.watch('status');
                  // const currentStatus = field.value as string;

                  return (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem
                            className="hover:bg-accent"
                            value="pendiente"
                            disabled={field.value === 'pendiente'}
                          >
                            Pendiente
                          </SelectItem>
                          <SelectItem className="hover:bg-accent" value="reprogramado">
                            Reprogramado
                          </SelectItem>
                          <SelectItem className="hover:bg-accent" value="cancelado">
                            Cancelado
                          </SelectItem>
                          <SelectItem value="rechazado">Rechazado</SelectItem>
                          <SelectItem value="confirmado" disabled={true}>
                            Confirmado
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />

                      {/* Campo de número de remito - Solo visible cuando el estado es 'ejecutado' */}
                      {/* {currentStatusWatch === 'confirmado' && (
                                        <div className="mt-6">
                                          <FormField
                                            control={form.control}
                                            name="remit_number"
                                            render={({ field: remitField }) => (
                                              <FormItem>
                                                <FormLabel>Número de Remito</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    placeholder="Ingrese el número de remito"
                                                    {...remitField}
                                                    value={remitField.value || ''}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      )} */}
                      {currentStatusWatch === 'cancelado' && (
                        <div className="mt-6">
                          <FormField
                            control={form.control}
                            name="cancel_reason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Motivo de cancelación</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ingrese el motivo de cancelación"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      {currentStatusWatch === 'reprogramado' && (
                        <div className="mt-6">
                          <FormField
                            control={form.control}
                            name="reprogram_date"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel className="mt-2">Fecha de reprogramación</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={'outline'}
                                        className={cn(
                                          'pl-3 text-left font-normal',
                                          !field.value && 'text-muted-foreground'
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, 'PPP', { locale: es })
                                        ) : (
                                          <span>Seleccionar fecha</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) => moment(date).isBefore(moment())}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </FormItem>
                  );
                }}
              />
            )}
            {/* Campo de Observaciones */}
            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ingrese observaciones adicionales..."
                      className="min-h-[100px] bg-background"
                      {...field}
                    />
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
