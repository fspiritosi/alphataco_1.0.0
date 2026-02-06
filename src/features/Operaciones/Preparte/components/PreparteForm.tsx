'use client';

import { fetchContractsByClientId } from '@/app/dashboard/employee/action/actions/actions';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
// TODO: Descomentar cuando se reactive la funcionalidad de "Sujeto a disponibilidad operativa"
// import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { fetchServiceItems } from '@/features/Empresa/Clientes/actions/items';
import {
  fetchAreasByContract,
  fetchEquipmentsByCustomer,
  fetchSectorsByContract,
} from '@/features/Operaciones/Preparte/actions/actions';
import { useImageUpload } from '@/hooks/useUploadImage';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building, CalendarIcon, Plus, Trash2 } from 'lucide-react';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
// TODO: Descomentar logPreparteChange cuando se reactive el sistema de cambio de item con motivo
import { createPreparte /* , logPreparteChange */ } from '../actions/preparte';
import type { Cliente } from './PreparteManager';

// Esquema de validación con Zod
const formSchema = z
  .object({
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
    // ORIGINAL: executionDate con validación requerida
    executionDate: z
      .object({
        from: z
          .date({
            required_error: 'La fecha de ejecución es requerida',
          })
          .refine((date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date >= today;
          }, 'La fecha de ejecución no puede ser anterior al día actual'),
        to: z.date().optional(),
      })
      .refine((data) => {
        if (data.from && data.to) {
          return data.from <= data.to;
        }
        return true;
      }, 'La fecha de inicio debe ser anterior a la fecha de fin'),
    // TODO: Descomentar cuando se reactive "Sujeto a disponibilidad operativa"
    // executionDate: z
    //   .object({
    //     from: z.date().optional(),
    //     to: z.date().optional(),
    //   })
    //   .optional(),
    // subject_to_availability: z.boolean().default(false),
    tipo: z.string().min(1, 'El tipo es requerido'),
    jornada: z.string().min(1, 'La jornada es requerida'),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    solicitante: z.string().min(1, 'El solicitante es requerido'),
    status: z
      .enum(['pendiente', 'reprogramado', 'cancelado', 'rechazado', 'confirmado', 'vencido'])
      .default('pendiente'),
    cancel_reason: z.string().optional(),
    rejected_reason: z.string().optional(),
    reprogram_reason: z.string().optional(),
    reprogram: z.date().optional(),
    quantity: z.number().optional(),
    numero_pedido: z.string().optional(),
    observaciones: z.string().optional(),
    sector_service_id: z.string().uuid('Sector inválido').optional().or(z.literal('')),
    areas_service_id: z.string({ required_error: 'Área del cliente es obligatoria' }).uuid('Área inválida'),
    equipos_cliente: z.array(z.string().uuid()).optional().default([]),
    image_url: z.string().optional(),
    // TODO: Descomentar cuando se reactive el sistema de cambio de item con motivo
    // // Campo para registrar motivo de cambio de item (solo en edición)
    // item_change_reason: z.string().optional(),
    // // Guardar el item original para detectar cambios
    // original_item_id: z.string().optional(),
  })
  .refine(
    (data) => data.status !== 'reprogramado' || (data.reprogram !== undefined && data.reprogram instanceof Date),
    {
      message: "Debe proporcionar una fecha válida de reprogramación cuando el estado es 'reprogramado'",
      path: ['reprogram'],
    }
  )
  .refine(
    (data) => data.status !== 'cancelado' || (data.cancel_reason !== undefined && data.cancel_reason.trim().length > 0),
    {
      message: "La razón de cancelación es obligatoria cuando el estado es 'cancelado'",
      path: ['cancel_reason'],
    }
  )
  .refine(
    (data) =>
      data.status !== 'rechazado' || (data.rejected_reason !== undefined && data.rejected_reason.trim().length > 0),
    {
      message: "La razón de rechazo es obligatoria cuando el estado es 'rechazado'",
      path: ['rejected_reason'],
    }
  )
  .refine(
    (data) =>
      data.status !== 'reprogramado' ||
      (data.reprogram_reason !== undefined && data.reprogram_reason.trim().length > 0),
    {
      message: "La razón del reprogramado es obligatoria cuando el estado es 'reprogramado'",
      path: ['reprogram_reason'],
    }
  );
// TODO: Descomentar cuando se reactive "Sujeto a disponibilidad operativa"
// // Validar que si NO es sujeto a disponibilidad, debe tener fecha de ejecución
// .refine(
//   (data) => {
//     if (data.subject_to_availability) return true;
//     return data.executionDate?.from !== undefined;
//   },
//   {
//     message: 'La fecha de ejecución es requerida cuando no está sujeto a disponibilidad',
//     path: ['executionDate'],
//   }
// )
// // Validar que la fecha from sea menor o igual a to
// .refine(
//   (data) => {
//     if (!data.executionDate?.from || !data.executionDate?.to) return true;
//     return data.executionDate.from <= data.executionDate.to;
//   },
//   {
//     message: 'La fecha de inicio debe ser anterior a la fecha de fin',
//     path: ['executionDate'],
//   }
// )
// // Validar que la fecha de ejecución no sea anterior al día actual (solo si tiene fecha)
// .refine(
//   (data) => {
//     if (!data.executionDate?.from) return true;
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     return data.executionDate.from >= today;
//   },
//   {
//     message: 'La fecha de ejecución no puede ser anterior al día actual',
//     path: ['executionDate'],
//   }
// )
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
  // Opciones dependientes del contrato (solo id+name)
  const [sectorList, setSectorList] = useState<Array<{ id: string; name: string }>>([]);
  const [areaList, setAreaList] = useState<Array<{ id: string; name: string }>>([]);
  const [equipmentList, setEquipmentList] = useState<Array<{ id: string; name: string }>>([]);
  // Reemplaza la línea actual de inicialización de selectedItems por:
  const [selectedItems, setSelectedItems] = useState<Array<{ id: string; quantity: number }>>(() => {
    if (formData?.item) {
      const items = Array.isArray(formData.item)
        ? formData.item
        : [{ id: formData.item, quantity: formData.item || 1 }];
      return items.length > 0 ? items : [{ id: '', quantity: 1 }];
    }
    return [{ id: '', quantity: 1 }];
  });
  // Archivo seleccionado (no forma parte del schema del formulario)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // TODO: Descomentar cuando se reactive el sistema de cambio de item con motivo
  // // Estado para rastrear el item original (para detectar cambios en edición)
  // const [originalItemId, setOriginalItemId] = useState<string | null>(() => {
  //   if (isEditing && formData?.item) {
  //     const items = Array.isArray(formData.item) ? formData.item : [formData.item];
  //     return items[0]?.id || null;
  //   }
  //   return null;
  // });

  // // Estado para mostrar el campo de motivo de cambio de item
  // const [showItemChangeReason, setShowItemChangeReason] = useState(false);

  const handleAddItem = () => {
    setSelectedItems((prev) => [...prev, { id: '', quantity: 1 }]);
  };

  // Add this function to handle item removal
  const handleRemoveItem = (id: string) => {
    if (selectedItems.length > 1) {
      setSelectedItems(selectedItems.filter((row) => row.id !== id));
    }
  };

  // Add this function to update an item
  const updateItemRow = (id: string, updates: Partial<(typeof selectedItems)[0]>) => {
    setSelectedItems(selectedItems.map((row) => (row.id === id ? { ...row, ...updates } : row)));
  };

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

      setIsLoading(true);
      try {
        const items = await fetchServiceItems(form.watch('contrato_id'));

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

  // Cargar sectores/áreas/equipos (id+name) cuando hay cliente y contrato seleccionados
  useEffect(() => {
    const loadDependentOptions = async () => {
      const customerId = form.watch('cliente_id');
      const serviceId = form.watch('contrato_id');

      if (!customerId || !serviceId) {
        setSectorList([]);
        setAreaList([]);
        setEquipmentList([]);
        return;
      }
      try {
        const [sectors, areas] = await Promise.all([
          fetchSectorsByContract(serviceId),
          fetchAreasByContract(serviceId),
        ]);

        setSectorList(sectors);
        setAreaList(areas);
        // Equipos: por cliente
        const equipmentsByCustomer = await fetchEquipmentsByCustomer(customerId);

        setEquipmentList(equipmentsByCustomer);
      } catch (e) {
        console.error('Error loading dependent options:', e);
        setSectorList([]);
        setAreaList([]);
        setEquipmentList([]);
      }
    };

    loadDependentOptions();
  }, [form.watch('cliente_id'), form.watch('contrato_id')]);

  const { uploadImage } = useImageUpload();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: PreparteItem) => {
    try {
      setIsSubmitting(true);

      // TODO: Descomentar cuando se reactive el sistema de cambio de item con motivo
      // // Validar que si se cambió el item, debe tener motivo
      // if (isEditing && showItemChangeReason) {
      //   const itemChangeReason = data.item_change_reason?.trim();
      //   if (!itemChangeReason) {
      //     toast.error('Debe ingresar el motivo del cambio de ítem');
      //     form.setError('item_change_reason', {
      //       type: 'required',
      //       message: 'El motivo del cambio es obligatorio',
      //     });
      //     setIsSubmitting(false);
      //     return;
      //   }
      // }

      // 1) Si hay archivo seleccionado, subirlo desde el formulario usando el hook
      if (selectedFile) {
        try {
          const bucket = process.env.NEXT_PUBLIC_PREPARTE_BUCKET || 'preparte-img';
          const tempUrl = await uploadImage(selectedFile, bucket);
          // Guardar la URL temporal en el formulario para que el manager la procese
          form.setValue('image_url', tempUrl as any);
          (data as any).image_url = tempUrl;
        } catch (e) {
          console.error('Error subiendo archivo:', e);
          toast.error('No se pudo subir el archivo. Intente nuevamente.');
          return;
        }
      }

      // TODO: Descomentar cuando se reactive el sistema de cambio de item con motivo
      // // Registrar cambio de item en el log si corresponde
      // if (isEditing && showItemChangeReason && originalItemId) {
      //   const newItemId = data.item?.[0]?.id;
      //   const oldItemName = contractItems.find((i) => i.value === originalItemId)?.label || originalItemId;
      //   const newItemName = contractItems.find((i) => i.value === newItemId)?.label || newItemId;

      //   try {
      //     await logPreparteChange({
      //       preparte_id: data.id,
      //       field_name: 'item',
      //       old_value: originalItemId,
      //       new_value: newItemId || null,
      //       reason: data.item_change_reason || '',
      //       metadata: {
      //         old_item_name: oldItemName,
      //         new_item_name: newItemName,
      //       },
      //     });
      //   } catch (logError) {
      //     console.error('Error registrando cambio de item:', logError);
      //     // No bloqueamos el guardado si falla el log, pero notificamos
      //     toast.warning('El cambio se guardó pero hubo un error al registrar el historial');
      //   }
      // }

      if (data.status === 'reprogramado' && data.reprogram) {
        // Crear nuevo ítem con la nueva fecha
        const newItem = {
          ...data,
          id: crypto.randomUUID(),
          status: 'pendiente',
          executionDate: new Date(data.reprogram),
          item: data.item[0]?.id, // Tomamos solo el ID del primer ítem
          reprogram: data.id,
          numero_pedido: data.numero_pedido,
          // observaciones: `[${new Date().toLocaleDateString('es-ES')}] Reprogramado de ${format(data.executionDate.from, 'PPP', { locale: es })}. ${data.observaciones || ''}`,
        };

        try {
          const result = await createPreparte(newItem as any);
        } catch (createError) {
          console.error('Error al crear nuevo item:', createError);
          throw createError;
        }

        // Actualizar ítem original
        const updatedOriginal = {
          ...data,
          status: 'reprogramado',
          observaciones: `[${new Date().toLocaleDateString('es-ES')}] Se reprogramó para ${format(data.reprogram, 'PPP', { locale: es })}. ${data.observaciones || ''}`,
        };

        try {
          await onSubmit(updatedOriginal as any);
        } catch (updateError) {
          console.error('Error al actualizar item original:', updateError);
          throw updateError;
        }

        toast.success('Servicio reprogramado correctamente');
        onCancel();
        return;
      }

      // Lógica normal de guardado

      const clienteSeleccionado = clientes.find((c) => c.id === data.cliente_id);
      if (clienteSeleccionado) {
        data.cliente_id = clienteSeleccionado.id;
      }
      await onSubmit(data);
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      toast.error(`Error al guardar el servicio: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
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
                  <MultiSelectCombobox
                    data-testid="cliente-select"
                    options={clientes.map((cliente) => ({
                      label: cliente.name,
                      value: cliente.id,
                    }))}
                    disabled={isEditing}
                    selectedValues={field.value ? [field.value] : []} // Asegurar que sea un array
                    onChange={(selectedIds) => {
                      const value = selectedIds[0] || '';
                      field.onChange(value);
                      // reset dependientes
                      form.setValue('contrato_id', '');
                      form.setValue('sector_service_id', '');
                      form.setValue('areas_service_id', '');
                      form.setValue('equipos_cliente', []);
                      setContractItems([]);
                      handleClienteChange(value);
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
                  <MultiSelectCombobox
                    data-testid="contrato-select"
                    options={contratos.map((contrato) => ({
                      label: contrato.service_name,
                      value: contrato.id,
                    }))}
                    selectedValues={field.value ? [field.value] : []} // Asegurar que sea un array
                    onChange={(selectedIds) => {
                      const value = selectedIds[0] || '';
                      field.onChange(value);
                      // reset dependientes del contrato
                      form.setValue('sector_service_id', '');
                      form.setValue('areas_service_id', '');
                      form.setValue('equipos_cliente', []);
                    }}
                    placeholder={contratos.find((c) => c.id === field.value)?.service_name || 'Seleccionar contrato'}
                    emptyMessage="No hay contratos disponibles"
                    disabled={!form.watch('cliente_id') || isLoading || isEditing}
                    maxSelections={1} // Para selección única
                  />
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
                          disabled={isEditing}
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
                        onSelect={(selectedDate) => {
                          if (selectedDate && selectedDate > new Date()) {
                            return;
                          }
                          field.onChange(selectedDate);
                        }}
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
                          disabled={isEditing}
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
                          fromDate={new Date()} // Usar fromDate en lugar de minDate
                          onSelect={(range) => {
                            if (range?.from && range?.to && range.from > range.to) {
                              return; // No permitir que la fecha desde sea mayor que la fecha hasta
                            }
                            field.onChange(range);
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

            {/* TODO: Descomentar cuando se reactive "Sujeto a disponibilidad operativa" */}
            {/* Checkbox: Sujeto a disponibilidad operativa */}
            {/* {!isEditing && (
              <FormField
                control={form.control}
                name="subject_to_availability"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          // Si se marca, limpiar la fecha de ejecución
                          if (checked) {
                            form.setValue('executionDate', { from: undefined, to: undefined });
                          }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">Sujeto a disponibilidad operativa</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Marcar si la fecha de ejecución depende de la disponibilidad. El pedido no podrá confirmarse
                        hasta que se asigne una fecha.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )} */}

            {/* Jornada */}
            <FormField
              control={form.control}
              name="jornada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jornada</FormLabel>
                  <FormControl>
                    <Select onValueChange={(value) => form.setValue('jornada', value)} value={field.value}>
                      <SelectTrigger className="bg-background" disabled={isEditing} data-testid="jornada-select">
                        <SelectValue placeholder="Seleccionar jornada">
                          {field.value ? field.value : 'Seleccionar jornada'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Jornada 8 horas" data-testid="jornada-option-8">
                          Jornada 8 horas
                        </SelectItem>
                        <SelectItem value="Jornada 12 horas" data-testid="jornada-option-12">
                          Jornada 12 horas
                        </SelectItem>
                        <SelectItem value="Jornada 24 horas" data-testid="jornada-option-24">
                          Jornada 24 horas
                        </SelectItem>
                        <SelectItem value="por horario" data-testid="jornada-option-horario">
                          Por horario
                        </SelectItem>
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
                      disabled={isEditing}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                      data-testid="tipo-servicio-radio"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            defaultValue={field.value}
                            defaultChecked={field.value === 'mensual'}
                            value="mensual"
                            className="bg-background"
                            data-testid="tipo-servicio-mensual"
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
                            data-testid="tipo-servicio-adicional"
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
                            data-testid="tipo-servicio-adicional-permanente"
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
                    <Input
                      placeholder="Ingrese el solicitante"
                      className="bg-background"
                      {...field}
                      disabled={isEditing}
                      data-testid="solicitante-input"
                    />
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
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Seleccione un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem
                            className="hover:bg-accent bg-background"
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
                                    className="bg-background"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      {currentStatusWatch === 'rechazado' && (
                        <div className="mt-6">
                          <FormField
                            control={form.control}
                            name="rejected_reason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Motivo de rechazo</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ingrese el motivo de rechazo"
                                    {...field}
                                    value={field.value || ''}
                                    className="bg-background"
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
                            name="reprogram"
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
                          <FormField
                            control={form.control}
                            name="reprogram_reason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Motivo del Reprogramado</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ingrese el motivo del reprogramado"
                                    {...field}
                                    value={field.value || ''}
                                    className="bg-background"
                                  />
                                </FormControl>
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

            {/* Sector del Cliente */}
            <FormField
              control={form.control}
              name="sector_service_id"
              render={({ field }) => {
                const selectedCustomer = clientes.find((c) => c.id === form.watch('cliente_id')) as Cliente | undefined;
                const selectedServiceId = form.watch('contrato_id');
                const baseSectorOptions = sectorList.map((s) => ({ label: s.name, value: s.id }));
                // If current selected value isn't in options, try to derive label from relations and inject it
                let sectorOptions = baseSectorOptions;
                if (field.value && !baseSectorOptions.some((o) => o.value === field.value)) {
                  const svc = selectedCustomer?.customer_services?.find((s) => s.service_id === selectedServiceId);
                  const matchByServiceSectorId = svc?.service_sectors?.find((ss) => ss.id === field.value);
                  const matchBySectorId = svc?.service_sectors?.find((ss) => ss.sectors?.id === field.value);
                  // Fallback across all services for the cliente if contrato_id not matched yet
                  const anySvcMatchByServiceSectorId =
                    matchByServiceSectorId ||
                    selectedCustomer?.customer_services
                      ?.flatMap((s) => s.service_sectors || [])
                      .find((ss) => ss.id === field.value);
                  const anySvcMatchBySectorId =
                    matchBySectorId ||
                    selectedCustomer?.customer_services
                      ?.flatMap((s) => s.service_sectors || [])
                      .find((ss) => ss.sectors?.id === field.value);

                  // Fallback if current value is a sector_customer.id or sector_id
                  const sc = selectedCustomer?.sector_customer?.find(
                    (x: any) => x?.id === field.value || x?.sector_id === field.value
                  );
                  const viaSectorCustomer = sc
                    ? selectedCustomer?.customer_services
                        ?.flatMap((s) => s.service_sectors || [])
                        .find((ss) => ss.sectors?.id === sc.sector_id)
                    : undefined;
                  if (!anySvcMatchByServiceSectorId && !anySvcMatchBySectorId && viaSectorCustomer) {
                    form.setValue('sector_service_id', viaSectorCustomer.id as any, {
                      shouldDirty: false,
                      shouldValidate: false,
                    });
                  }

                  // If the current value is sectors.id, normalize it to the matching service_sectors.id
                  const normalizeToServiceSector =
                    anySvcMatchByServiceSectorId || anySvcMatchBySectorId || viaSectorCustomer;
                  if (normalizeToServiceSector && field.value !== normalizeToServiceSector.id) {
                    form.setValue('sector_service_id', normalizeToServiceSector.id as any, {
                      shouldDirty: false,
                      shouldValidate: false,
                    });
                  }

                  const derivedLabel =
                    matchByServiceSectorId?.sectors?.name ||
                    matchBySectorId?.sectors?.name ||
                    anySvcMatchByServiceSectorId?.sectors?.name ||
                    anySvcMatchBySectorId?.sectors?.name ||
                    sc?.sectors?.name;
                  if (derivedLabel) {
                    sectorOptions = [{ label: derivedLabel, value: field.value }, ...baseSectorOptions];
                  }
                }

                return (
                  <FormItem>
                    <FormLabel>Sector del Cliente</FormLabel>
                    <MultiSelectCombobox
                      data-testid="sector-select"
                      options={sectorOptions}
                      selectedValues={field.value ? [field.value] : []}
                      onChange={(vals) => field.onChange(vals[0] || '')}
                      placeholder={
                        field.value
                          ? sectorOptions.find((o) => o.value === field.value)?.label || 'Seleccionar sector'
                          : 'Seleccionar sector'
                      }
                      disabled={!selectedCustomer || !selectedServiceId || isEditing}
                      emptyMessage={
                        !selectedCustomer || !selectedServiceId
                          ? 'Seleccione un cliente y contrato'
                          : 'Sin sectores disponibles para este contrato'
                      }
                      maxSelections={1}
                    />
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Área del Cliente */}
            <FormField
              control={form.control}
              name="areas_service_id"
              render={({ field }) => {
                const selectedCustomer = clientes.find((c) => c.id === form.watch('cliente_id')) as Cliente | undefined;
                const selectedServiceId = form.watch('contrato_id');
                const baseAreaOptions = areaList.map((a) => ({ label: a.name, value: a.id }));
                // If current selected value isn't in options, try to derive label from relations and inject it
                let areaOptions = baseAreaOptions;
                if (field.value && !baseAreaOptions.some((o) => o.value === field.value)) {
                  const svc = selectedCustomer?.customer_services?.find((s) => s.service_id === selectedServiceId);
                  const matchByServiceAreaId = svc?.service_areas?.find((sa) => sa.id === field.value);
                  const matchByAreaClienteId = svc?.service_areas?.find((sa) => sa.areas_cliente?.id === field.value);
                  // Fallback across all services for the cliente
                  const anySvcMatchByServiceAreaId =
                    matchByServiceAreaId ||
                    selectedCustomer?.customer_services
                      ?.flatMap((s) => s.service_areas || [])
                      .find((sa) => sa.id === field.value);
                  const anySvcMatchByAreaClienteId =
                    matchByAreaClienteId ||
                    selectedCustomer?.customer_services
                      ?.flatMap((s) => s.service_areas || [])
                      .find((sa) => sa.areas_cliente?.id === field.value);
                  const derivedLabel =
                    matchByServiceAreaId?.areas_cliente?.nombre ||
                    matchByAreaClienteId?.areas_cliente?.nombre ||
                    anySvcMatchByServiceAreaId?.areas_cliente?.nombre ||
                    anySvcMatchByAreaClienteId?.areas_cliente?.nombre;
                  if (derivedLabel) {
                    areaOptions = [{ label: derivedLabel, value: field.value }, ...baseAreaOptions];
                  }
                }
                return (
                  <FormItem>
                    <FormLabel>Área del Cliente</FormLabel>
                    <MultiSelectCombobox
                      data-testid="area-select"
                      options={areaOptions}
                      selectedValues={field.value ? [field.value] : []}
                      onChange={(vals) => field.onChange(vals[0] || '')}
                      placeholder={
                        field.value
                          ? areaOptions.find((o) => o.value === field.value)?.label || 'Seleccionar área'
                          : 'Seleccionar área'
                      }
                      disabled={!selectedCustomer || !selectedServiceId || isEditing}
                      emptyMessage={
                        !selectedCustomer || !selectedServiceId
                          ? 'Seleccione un cliente y contrato'
                          : 'Sin áreas disponibles para este contrato'
                      }
                      maxSelections={1}
                    />
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Equipos del Cliente */}
            <FormField
              control={form.control}
              name="equipos_cliente"
              render={({ field }) => {
                const selectedCustomer = clientes.find((c) => c.id === form.watch('cliente_id')) as Cliente | undefined;
                const selectedServiceId = form.watch('contrato_id');
                const equiposOptions = equipmentList.map((e) => ({ label: e.name, value: e.id }));
                const selectedValues = Array.isArray(field.value) ? field.value : [];
                return (
                  <FormItem>
                    <FormLabel>Equipos del Cliente</FormLabel>
                    <MultiSelectCombobox
                      data-testid="equipo-select"
                      options={equiposOptions}
                      selectedValues={selectedValues}
                      onChange={(vals) => field.onChange(vals)}
                      placeholder={
                        selectedValues.length > 0 ? `${selectedValues.length} seleccionado(s)` : 'Seleccionar equipos'
                      }
                      disabled={!selectedCustomer || !selectedServiceId || isEditing}
                      emptyMessage={
                        !selectedCustomer || !selectedServiceId
                          ? 'Seleccione un cliente y contrato'
                          : 'Sin equipos disponibles para este contrato/cliente'
                      }
                      maxSelections={1}
                    />
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Multiselector de items */}
            <FormField
              control={form.control}
              name="item"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-4">
                    {selectedItems.map((row, index) => {
                      const selectedItem = contractItems.find((item) => item.value === row.id);

                      return (
                        <div key={row.id} className="flex items-end gap-2">
                          <div className="flex-1">
                            <FormLabel>{index === 0 ? 'Item' : ''}</FormLabel>
                            <MultiSelectCombobox
                              data-testid={`item-select-${index}`}
                              options={contractItems.filter(
                                (item) => !selectedItems.some((r) => r.id === item.value && r.id !== row.id)
                              )}
                              selectedValues={row.id ? [row.id] : []}
                              onChange={(selectedIds) => {
                                const newItemId = selectedIds[0] || '';
                                updateItemRow(row.id, { id: newItemId });

                                // TODO: Descomentar cuando se reactive el sistema de cambio de item con motivo
                                // // Detectar si el item cambió respecto al original (en edición)
                                // if (isEditing && originalItemId && newItemId !== originalItemId) {
                                //   setShowItemChangeReason(true);
                                // } else if (isEditing && newItemId === originalItemId) {
                                //   setShowItemChangeReason(false);
                                //   form.setValue('item_change_reason', '');
                                // }

                                // Update form value
                                const updatedItems = selectedItems
                                  .filter((r) => r.id)
                                  .map((r) => ({
                                    id: r.id,
                                    quantity: r.quantity,
                                  }));

                                if (newItemId) {
                                  updatedItems.push({
                                    id: newItemId,
                                    quantity: row.quantity,
                                  });
                                }

                                field.onChange(updatedItems);
                              }}
                              placeholder="Seleccionar item"
                              emptyMessage="No hay items disponibles"
                              disabled={!form.getValues('contrato_id') || isLoading || isEditing}
                              maxSelections={1}
                            />
                          </div>

                          <div className="w-20">
                            <FormLabel>{index === 0 ? 'Cantidad' : ''}</FormLabel>
                            <Input
                              type="number"
                              min="1"
                              value={row.quantity}
                              disabled={!row.id || isEditing}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value) || 1;
                                updateItemRow(row.id, { quantity: newQuantity });

                                // Update form value
                                const updatedItems = selectedItems
                                  .filter((r) => r.id)
                                  .map((r) => ({
                                    id: r.id,
                                    quantity: r.id === row.id ? newQuantity : r.quantity,
                                  }));

                                field.onChange(updatedItems);
                              }}
                              className="w-full bg-background"
                            />
                          </div>
                          {selectedItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isEditing}
                              onClick={() => {
                                handleRemoveItem(row.id);
                                // Update form value after removal
                                const updatedItems = selectedItems
                                  .filter((r) => r.id !== row.id && r.id)
                                  .map((r) => ({
                                    id: r.id,
                                    quantity: r.quantity,
                                  }));
                                field.onChange(updatedItems);
                              }}
                              className="mb-2"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {!isEditing && selectedItems.some((item) => item.id) && (
                      <div className="flex justify-center mt-4">
                        <Button type="button" variant="outline" size="sm" onClick={handleAddItem} disabled={isEditing}>
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar ítem
                        </Button>
                      </div>
                    )}
                  </div>
                </FormItem>
              )}
            />

            {/* TODO: Descomentar cuando se reactive el sistema de cambio de item con motivo */}
            {/* Campo de motivo de cambio de item (solo visible cuando se cambia el item en edición) */}
            {/* {isEditing && showItemChangeReason && (
              <FormField
                control={form.control}
                name="item_change_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-amber-600">Motivo del cambio de ítem *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ingrese el motivo por el cual se está cambiando el ítem..."
                        className="min-h-[80px] bg-background border-amber-300"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Este cambio quedará registrado en el historial del pedido.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )} */}

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
                      data-testid="observaciones-textarea"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Imagen del pedido */}
            {isEditing ? (
              <FormItem>
                <FormLabel>
                  {`Cambiar imagen del pedido${form?.watch('numero_pedido') ? ` (aplica a todo el N° ${form.watch('numero_pedido')})` : ''}`}
                </FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    className="bg-background"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            ) : (
              <FormItem>
                <FormLabel>Documento adjunto (Imagen o PDF)</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    className="bg-background"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    data-testid="archivo-adjunto-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="guardar-preparte-button">
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {isEditing ? 'Actualizando...' : 'Guardando...'}
                  </>
                ) : isEditing ? (
                  'Actualizar'
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
