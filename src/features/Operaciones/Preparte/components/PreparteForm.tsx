'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useImageUpload } from '@/hooks/useUploadImage';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building, CalendarIcon, Plus, Trash2 } from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { createPreparte, logPreparteChange } from '../actions/preparte';
import {
  useContratos,
  usePreparteChangeLogsInvalidation,
  usePreparteFormDependentOptions,
  useServiceItems,
} from '../hooks';
import type { Cliente } from './PreparteManager';

const logger = new Logger('PreparteForm');

// Esquema de validación con Zod
// PP-3: jornada, tipo, observaciones y fecha ahora son por ítem
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
          // PP-3: Campos por ítem
          jornada: z.string().min(1, 'La jornada es requerida'),
          tipo: z.string().min(1, 'El tipo es requerido'),
          observaciones: z.string().optional(),
          start_time: z.string().optional(),
          end_time: z.string().optional(),
          executionDate: z
            .object({
              from: z.date().optional(),
              to: z.date().optional(),
            })
            .optional(),
          subject_to_availability: z.boolean().default(false),
        })
      )
      .min(1, 'Por favor selecciona al menos un ítem'),
    requestDate: z.date({
      required_error: 'La fecha de solicitud es requerida',
    }),
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
    sector_service_id: z.string().uuid('Sector inválido').optional().or(z.literal('')),
    areas_service_id: z.string({ required_error: 'Área del cliente es obligatoria' }).uuid('Área inválida'),
    equipos_cliente: z.array(z.string().uuid()).optional().default([]),
    image_url: z.string().optional(),
    // Campo para registrar motivo de cambio de item (solo en edición)
    item_change_reason: z.string().optional(),
    // Guardar el item original para detectar cambios
    original_item_id: z.string().optional(),
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
  )
  // PP-3: Validar que cada ítem tenga jornada seleccionada
  .refine(
    (data) => {
      return data.item.every((item) => item.id === '' || item.jornada !== '');
    },
    {
      message: 'Todos los ítems deben tener una jornada seleccionada',
      path: ['item'],
    }
  )
  // PP-3: Validar que cada ítem tenga tipo de servicio seleccionado
  .refine(
    (data) => {
      return data.item.every((item) => item.id === '' || item.tipo !== '');
    },
    {
      message: 'Todos los ítems deben tener un tipo de servicio seleccionado',
      path: ['item'],
    }
  )
  // PP-3: Validar que cada ítem que NO esté sujeto a disponibilidad tenga fecha de ejecución
  .refine(
    (data) => {
      return data.item.every((item) => {
        if (item.id === '' || item.subject_to_availability) return true;
        return item.executionDate?.from !== undefined;
      });
    },
    {
      message: 'Todos los ítems deben tener fecha de ejecución o estar sujetos a disponibilidad',
      path: ['item'],
    }
  );
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

  // Log para depuración de valores iniciales
  logger.debug('PreparteForm inicializado', {
    data: {
      isEditing,
      formDataItem: formData?.item,
      defaultItemValues: formData?.item ? JSON.stringify(formData.item) : 'undefined',
    },
  });

  // Log de errores del formulario en cada render (útil para depurar)
  const formErrors = form.formState.errors;
  if (Object.keys(formErrors).length > 0) {
    logger.warn('Errores activos en el formulario', {
      data: {
        errors: formErrors,
        itemErrors: formErrors.item,
      },
    });
  }

  // Hooks de invalidación para refrescar datos después de mutaciones
  const { invalidateChangeLogs } = usePreparteChangeLogsInvalidation();

  // Observar cambios en cliente y contrato para los hooks dependientes
  const watchedClienteId = form.watch('cliente_id');
  const watchedContratoId = form.watch('contrato_id');

  // Hook para obtener contratos del cliente seleccionado
  const { data: contratosData = [], isLoading: isLoadingContratos } = useContratos(watchedClienteId);
  const contratos = contratosData as Contrato[];

  // Hook para obtener items del contrato seleccionado
  const { data: serviceItemsData = [], isLoading: isLoadingItems } = useServiceItems(watchedContratoId);
  const contractItems = serviceItemsData.map((item) => ({
    label: item.item_name || `Item ${item.id}`,
    value: item.id.toString(),
  }));

  // Hook combinado para sectores, áreas y equipos
  const {
    sectors: sectorList,
    areas: areaList,
    equipments: equipmentList,
    isLoading: isLoadingDependentOptions,
    isLoadingSectors,
    isLoadingAreas,
    isLoadingEquipments,
  } = usePreparteFormDependentOptions(watchedClienteId, watchedContratoId);

  // Estado de carga combinado
  const isLoading = isLoadingContratos || isLoadingItems || isLoadingDependentOptions;

  const [reprogramDate, setReprogramDate] = useState<Date | null>(null);
  // PP-3: Estado de items incluye fecha y subject_to_availability por ítem
  // PP-3: Tipo completo de ítem con todos los campos por ítem
  type ItemRow = {
    id: string;
    quantity: number;
    jornada: string;
    tipo: string;
    observaciones: string;
    start_time: string;
    end_time: string;
    executionDate?: { from?: Date; to?: Date };
    subject_to_availability: boolean;
  };

  const defaultItemRow: ItemRow = {
    id: '',
    quantity: 1,
    jornada: '',
    tipo: '',
    observaciones: '',
    start_time: '',
    end_time: '',
    executionDate: { from: undefined, to: undefined },
    subject_to_availability: false,
  };

  const [selectedItems, setSelectedItems] = useState<ItemRow[]>(() => {
    if (formData?.item) {
      const items = Array.isArray(formData.item)
        ? formData.item.map((i: any) => {
            // Si subject_to_availability es true, la fecha debe estar vacía
            const isSubjectToAvailability = i.subject_to_availability ?? false;
            const execDate = isSubjectToAvailability
              ? { from: undefined, to: undefined }
              : i.executionDate || { from: undefined, to: undefined };

            return {
              id: i.id || '',
              quantity: i.quantity || 1,
              jornada: i.jornada || '',
              tipo: i.tipo || '',
              observaciones: i.observaciones || '',
              start_time: i.start_time || '',
              end_time: i.end_time || '',
              executionDate: execDate,
              subject_to_availability: isSubjectToAvailability,
            };
          })
        : [{ ...defaultItemRow }];
      return items.length > 0 ? items : [{ ...defaultItemRow }];
    }
    return [{ ...defaultItemRow }];
  });
  // Archivo seleccionado (no forma parte del schema del formulario)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Estado para rastrear el item original (para detectar cambios en edición)
  const [originalItemId, setOriginalItemId] = useState<string | null>(() => {
    if (isEditing && formData?.item) {
      const items = Array.isArray(formData.item) ? formData.item : [formData.item];
      return items[0]?.id || null;
    }
    return null;
  });

  // Estado para mostrar el campo de motivo de cambio de item
  const [showItemChangeReason, setShowItemChangeReason] = useState(false);

  const handleAddItem = () => {
    setSelectedItems((prev) => [...prev, { ...defaultItemRow }]);
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

  const { uploadImage } = useImageUpload();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: PreparteItem) => {
    try {
      setIsSubmitting(true);

      // Validar que si se cambió el item, debe tener motivo
      if (isEditing && showItemChangeReason) {
        const itemChangeReason = data.item_change_reason?.trim();
        if (!itemChangeReason) {
          toast.error('Debe ingresar el motivo del cambio de ítem');
          form.setError('item_change_reason', {
            type: 'required',
            message: 'El motivo del cambio es obligatorio',
          });
          setIsSubmitting(false);
          return;
        }
      }

      // 1) Si hay archivo seleccionado, subirlo desde el formulario usando el hook
      if (selectedFile) {
        try {
          const bucket = process.env.NEXT_PUBLIC_PREPARTE_BUCKET || 'preparte-img';
          const tempUrl = await uploadImage(selectedFile, bucket);
          // Guardar la URL temporal en el formulario para que el manager la procese
          form.setValue('image_url', tempUrl as any);
          (data as any).image_url = tempUrl;
        } catch (e) {
          logger.error('Error subiendo archivo', { data: { error: e } });
          toast.error('No se pudo subir el archivo. Intente nuevamente.');
          return;
        }
      }

      // Registrar cambio de item en el log si corresponde
      if (isEditing && showItemChangeReason && originalItemId) {
        const newItemId = data.item?.[0]?.id;
        const oldItemName = contractItems.find((i) => i.value === originalItemId)?.label || originalItemId;
        const newItemName = contractItems.find((i) => i.value === newItemId)?.label || newItemId;

        try {
          await logPreparteChange({
            preparte_id: data.id,
            field_name: 'item',
            old_value: originalItemId,
            new_value: newItemId || null,
            reason: data.item_change_reason || '',
            metadata: {
              old_item_name: oldItemName,
              new_item_name: newItemName,
            },
          });
          // Invalidar los logs de cambios para que se refresquen en el detalle
          invalidateChangeLogs(data.id, data.numero_pedido);
        } catch (logError) {
          logger.error('Error registrando cambio de item', { data: { error: logError } });
          // No bloqueamos el guardado si falla el log, pero notificamos
          toast.warning('El cambio se guardó pero hubo un error al registrar el historial');
        }
      }

      if (data.status === 'reprogramado' && data.reprogram) {
        // PP-3: Usar los campos del primer ítem para el nuevo registro
        const firstItem = data.item[0];
        const itemObservaciones = firstItem?.observaciones || '';

        // Crear nuevo ítem con la nueva fecha
        const newItem = {
          ...data,
          id: crypto.randomUUID(),
          status: 'pendiente',
          executionDate: new Date(data.reprogram),
          item: firstItem?.id,
          jornada: firstItem?.jornada || '',
          tipo: firstItem?.tipo || '',
          observaciones: itemObservaciones,
          start_time: firstItem?.start_time || null,
          end_time: firstItem?.end_time || null,
          reprogram: data.id,
          numero_pedido: data.numero_pedido,
        };

        try {
          await createPreparte(newItem as never);
        } catch (createError) {
          logger.error('Error al crear nuevo item', { data: { error: createError } });
          throw createError;
        }

        // Actualizar ítem original
        const updatedOriginal = {
          ...data,
          status: 'reprogramado',
          // PP-3: Agregar nota de reprogramación a las observaciones del ítem
          observaciones: `[${new Date().toLocaleDateString('es-ES')}] Se reprogramó para ${format(data.reprogram, 'PPP', { locale: es })}. ${itemObservaciones}`,
        };

        try {
          await onSubmit(updatedOriginal as never);
        } catch (updateError) {
          logger.error('Error al actualizar item original', { data: { error: updateError } });
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
      logger.error('Error en handleSubmit', { data: { error } });
      toast.error(`Error al guardar el servicio: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className=" gap-4 space-y-4 rounded-lg dark:bg-slate-900 bg-slate-50 p-4 w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(
            handleSubmit,
            // Handler de errores de validación
            (errors) => {
              logger.error('Errores de validación del formulario', {
                data: {
                  errors,
                  formValues: form.getValues(),
                  itemValues: form.getValues('item'),
                  selectedItems: selectedItems,
                },
              });
            }
          )}
          className="space-y-6"
        >
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
                      // reset dependientes - los hooks se refrescan automáticamente al cambiar cliente_id
                      form.setValue('contrato_id', '');
                      form.setValue('sector_service_id', '');
                      form.setValue('areas_service_id', '');
                      form.setValue('equipos_cliente', []);
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
                    selectedValues={field.value ? [field.value] : []}
                    onChange={(selectedIds) => {
                      const value = selectedIds[0] || '';
                      field.onChange(value);
                      // reset dependientes del contrato
                      form.setValue('sector_service_id', '');
                      form.setValue('areas_service_id', '');
                      form.setValue('equipos_cliente', []);
                    }}
                    placeholder="Seleccionar contrato"
                    emptyMessage="No hay contratos disponibles"
                    disabled={!form.watch('cliente_id') || isLoading || isEditing}
                    isLoading={isLoadingContratos}
                    maxSelections={1}
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
                      placeholder="Seleccionar sector"
                      disabled={!selectedCustomer || !selectedServiceId || isEditing}
                      emptyMessage={
                        !selectedCustomer || !selectedServiceId
                          ? 'Seleccione un cliente y contrato'
                          : 'Sin sectores disponibles para este contrato'
                      }
                      isLoading={isLoadingSectors}
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
                      placeholder="Seleccionar área"
                      disabled={!selectedCustomer || !selectedServiceId || isEditing}
                      emptyMessage={
                        !selectedCustomer || !selectedServiceId
                          ? 'Seleccione un cliente y contrato'
                          : 'Sin áreas disponibles para este contrato'
                      }
                      isLoading={isLoadingAreas}
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
                      isLoading={isLoadingEquipments}
                      maxSelections={1}
                    />
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Multiselector de items - PP-3: con fecha y sujeto a disponibilidad por ítem */}
            <FormField
              control={form.control}
              name="item"
              render={({ field }) => {
                // En edición, solo permitir cambiar item si status='pendiente'
                const currentStatus = form.watch('status');
                const canEditItem = !isEditing || currentStatus === 'pendiente';
                const isItemDisabled = !form.getValues('contrato_id') || isLoading || !canEditItem;

                // Función helper para sincronizar selectedItems con el form
                const syncFormValue = (items: typeof selectedItems) => {
                  const formItems = items
                    .filter((r) => r.id)
                    .map((r) => ({
                      id: r.id,
                      quantity: r.quantity,
                      // PP-3: Incluir todos los campos requeridos por ítem
                      jornada: r.jornada,
                      tipo: r.tipo,
                      observaciones: r.observaciones,
                      start_time: r.start_time,
                      end_time: r.end_time,
                      executionDate: r.executionDate,
                      subject_to_availability: r.subject_to_availability,
                    }));
                  field.onChange(formItems);

                  // Log para depuración
                  logger.debug('syncFormValue - Items sincronizados', {
                    data: {
                      itemCount: formItems.length,
                      items: formItems,
                    },
                  });
                };

                return (
                  <FormItem>
                    <div className="space-y-6">
                      {selectedItems.map((row, index) => {
                        const selectedItem = contractItems.find((item) => item.value === row.id);
                        const rowKey = row.id || `temp-${index}`;

                        return (
                          <div key={rowKey} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                            {/* Fila superior: Item, Cantidad, Eliminar */}
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <FormLabel>{index === 0 ? 'Item' : `Item ${index + 1}`}</FormLabel>
                                <MultiSelectCombobox
                                  data-testid={`item-select-${index}`}
                                  options={contractItems.filter(
                                    (item) => !selectedItems.some((r) => r.id === item.value && r.id !== row.id)
                                  )}
                                  selectedValues={row.id ? [row.id] : []}
                                  isLoading={isLoadingItems}
                                  onChange={(selectedIds) => {
                                    const newItemId = selectedIds[0] || '';
                                    const updatedItems = selectedItems.map((r, i) =>
                                      i === index ? { ...r, id: newItemId } : r
                                    );
                                    setSelectedItems(updatedItems);

                                    // Detectar si el item cambió respecto al original (en edición)
                                    if (isEditing && originalItemId && newItemId !== originalItemId) {
                                      setShowItemChangeReason(true);
                                    } else if (isEditing && newItemId === originalItemId) {
                                      setShowItemChangeReason(false);
                                      form.setValue('item_change_reason', '');
                                    }

                                    syncFormValue(updatedItems);
                                  }}
                                  placeholder="Seleccionar item"
                                  emptyMessage="No hay items disponibles"
                                  disabled={isItemDisabled}
                                  maxSelections={1}
                                />
                              </div>

                              <div className="w-20">
                                <FormLabel>Cantidad</FormLabel>
                                <Input
                                  type="number"
                                  min="1"
                                  value={row.quantity}
                                  disabled={!row.id || !canEditItem}
                                  onChange={(e) => {
                                    const newQuantity = parseInt(e.target.value) || 1;
                                    const updatedItems = selectedItems.map((r, i) =>
                                      i === index ? { ...r, quantity: newQuantity } : r
                                    );
                                    setSelectedItems(updatedItems);
                                    syncFormValue(updatedItems);
                                  }}
                                  className="w-full bg-background"
                                />
                              </div>

                              {selectedItems.length > 1 && !isEditing && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={!canEditItem}
                                  onClick={() => {
                                    const updatedItems = selectedItems.filter((_, i) => i !== index);
                                    setSelectedItems(updatedItems);
                                    syncFormValue(updatedItems);
                                  }}
                                  className="mb-0"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>

                            {/* PP-3: Campos por ítem - solo visibles cuando hay ítem seleccionado */}
                            {row.id && (
                              <>
                                {/* Jornada por ítem */}
                                <div className="flex flex-col gap-2">
                                  <FormLabel
                                    className={cn('text-sm', formErrors.item && !row.jornada && 'text-destructive')}
                                  >
                                    Jornada{' '}
                                    {!row.jornada && formErrors.item && <span className="text-destructive">*</span>}
                                  </FormLabel>
                                  <Select
                                    value={row.jornada}
                                    onValueChange={(value) => {
                                      const updatedItems = selectedItems.map((r, i) =>
                                        i === index ? { ...r, jornada: value, start_time: '', end_time: '' } : r
                                      );
                                      setSelectedItems(updatedItems);
                                      syncFormValue(updatedItems);
                                    }}
                                    disabled={!canEditItem}
                                  >
                                    <SelectTrigger
                                      className={cn(
                                        'bg-background',
                                        formErrors.item && !row.jornada && 'border-destructive'
                                      )}
                                    >
                                      <SelectValue placeholder="Seleccionar jornada">
                                        {row.jornada || 'Seleccionar jornada'}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Jornada 8 horas">Jornada 8 horas</SelectItem>
                                      <SelectItem value="Jornada 12 horas">Jornada 12 horas</SelectItem>
                                      <SelectItem value="Jornada 24 horas">Jornada 24 horas</SelectItem>
                                      <SelectItem value="por horario">Por horario</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Horario (solo si jornada es "por horario") */}
                                {row.jornada === 'por horario' && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                      <FormLabel className="text-sm">Hora de inicio</FormLabel>
                                      <Input
                                        type="time"
                                        value={row.start_time || ''}
                                        onChange={(e) => {
                                          const updatedItems = selectedItems.map((r, i) =>
                                            i === index ? { ...r, start_time: e.target.value } : r
                                          );
                                          setSelectedItems(updatedItems);
                                          syncFormValue(updatedItems);
                                        }}
                                        className="bg-background"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <FormLabel className="text-sm">Hora de fin</FormLabel>
                                      <Input
                                        type="time"
                                        value={row.end_time || ''}
                                        onChange={(e) => {
                                          const updatedItems = selectedItems.map((r, i) =>
                                            i === index ? { ...r, end_time: e.target.value } : r
                                          );
                                          setSelectedItems(updatedItems);
                                          syncFormValue(updatedItems);
                                        }}
                                        className="bg-background"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Tipo de servicio por ítem */}
                                <div className="flex flex-col gap-2">
                                  <FormLabel
                                    className={cn('text-sm', formErrors.item && !row.tipo && 'text-destructive')}
                                  >
                                    Tipo de servicio{' '}
                                    {!row.tipo && formErrors.item && <span className="text-destructive">*</span>}
                                  </FormLabel>
                                  <RadioGroup
                                    value={row.tipo}
                                    onValueChange={(value) => {
                                      const updatedItems = selectedItems.map((r, i) =>
                                        i === index ? { ...r, tipo: value } : r
                                      );
                                      setSelectedItems(updatedItems);
                                      syncFormValue(updatedItems);
                                    }}
                                    disabled={!canEditItem}
                                    className={cn(
                                      'flex flex-row space-x-4',
                                      formErrors.item && !row.tipo && 'p-2 border border-destructive rounded-md'
                                    )}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="mensual" id={`tipo-mensual-${index}`} />
                                      <label htmlFor={`tipo-mensual-${index}`} className="text-sm">
                                        Mensual
                                      </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="adicional" id={`tipo-adicional-${index}`} />
                                      <label htmlFor={`tipo-adicional-${index}`} className="text-sm">
                                        Adicional
                                      </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="adicional_permanente" id={`tipo-permanente-${index}`} />
                                      <label htmlFor={`tipo-permanente-${index}`} className="text-sm">
                                        Adicional Permanente
                                      </label>
                                    </div>
                                  </RadioGroup>
                                </div>

                                {/* Observaciones por ítem */}
                                <div className="flex flex-col gap-2">
                                  <FormLabel className="text-sm">Observaciones</FormLabel>
                                  <Textarea
                                    placeholder="Observaciones para este ítem..."
                                    value={row.observaciones || ''}
                                    onChange={(e) => {
                                      const updatedItems = selectedItems.map((r, i) =>
                                        i === index ? { ...r, observaciones: e.target.value } : r
                                      );
                                      setSelectedItems(updatedItems);
                                      syncFormValue(updatedItems);
                                    }}
                                    className="min-h-[60px] bg-background"
                                  />
                                </div>

                                {/* Fecha de ejecución por ítem */}
                                <div className="flex flex-col gap-2">
                                  <FormLabel
                                    className={cn(
                                      'text-sm',
                                      formErrors.item &&
                                        !row.executionDate?.from &&
                                        !row.subject_to_availability &&
                                        'text-destructive'
                                    )}
                                  >
                                    Fecha de Ejecución{' '}
                                    {!row.executionDate?.from && !row.subject_to_availability && formErrors.item && (
                                      <span className="text-destructive">*</span>
                                    )}
                                  </FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        disabled={row.subject_to_availability}
                                        className={cn(
                                          'w-full justify-start text-left font-normal',
                                          !row.executionDate?.from && 'text-muted-foreground',
                                          row.subject_to_availability && 'opacity-50',
                                          formErrors.item &&
                                            !row.executionDate?.from &&
                                            !row.subject_to_availability &&
                                            'border-destructive'
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {row.subject_to_availability ? (
                                          <span className="italic">Sujeto a disponibilidad operativa</span>
                                        ) : row.executionDate?.from ? (
                                          row.executionDate.to &&
                                          row.executionDate.from.getTime() !== row.executionDate.to.getTime() ? (
                                            <>
                                              {format(row.executionDate.from, 'dd/MM/yyyy', { locale: es })} -{' '}
                                              {format(row.executionDate.to, 'dd/MM/yyyy', { locale: es })}
                                            </>
                                          ) : (
                                            format(row.executionDate.from, 'PPP', { locale: es })
                                          )
                                        ) : (
                                          <span>Seleccionar fecha</span>
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      {isEditing ? (
                                        <Calendar
                                          mode="single"
                                          selected={row.executionDate?.from}
                                          onSelect={(date) => {
                                            if (date) {
                                              const updatedItems = selectedItems.map((r, i) =>
                                                i === index ? { ...r, executionDate: { from: date, to: date } } : r
                                              );
                                              setSelectedItems(updatedItems);
                                              syncFormValue(updatedItems);
                                            }
                                          }}
                                          initialFocus
                                          locale={es}
                                        />
                                      ) : (
                                        <Calendar
                                          mode="range"
                                          selected={
                                            row.executionDate?.from
                                              ? (row.executionDate as { from: Date; to?: Date })
                                              : undefined
                                          }
                                          fromDate={new Date()}
                                          onSelect={(range) => {
                                            if (range?.from && range?.to && range.from > range.to) {
                                              return;
                                            }
                                            const updatedItems = selectedItems.map((r, i) =>
                                              i === index ? { ...r, executionDate: range || undefined } : r
                                            );
                                            setSelectedItems(updatedItems);
                                            syncFormValue(updatedItems);
                                          }}
                                          initialFocus
                                          locale={es}
                                          numberOfMonths={2}
                                        />
                                      )}
                                    </PopoverContent>
                                  </Popover>
                                </div>

                                {/* PP-3: Checkbox sujeto a disponibilidad por ítem */}
                                <div className="flex items-center space-x-3 pt-2">
                                  <Checkbox
                                    id={`subject-availability-${index}`}
                                    checked={row.subject_to_availability}
                                    onCheckedChange={(checked) => {
                                      const updatedItems = selectedItems.map((r, i) =>
                                        i === index
                                          ? {
                                              ...r,
                                              subject_to_availability: !!checked,
                                              // Si se marca, limpiar fecha
                                              executionDate: checked
                                                ? { from: undefined, to: undefined }
                                                : r.executionDate,
                                            }
                                          : r
                                      );
                                      setSelectedItems(updatedItems);
                                      syncFormValue(updatedItems);
                                    }}
                                  />
                                  <label
                                    htmlFor={`subject-availability-${index}`}
                                    className="text-sm cursor-pointer leading-none"
                                  >
                                    Sujeto a disponibilidad operativa
                                  </label>
                                </div>
                                {row.subject_to_availability && (
                                  <p className="text-xs text-muted-foreground pl-6">
                                    {isEditing
                                      ? 'Desmarcar para asignar fecha y poder confirmar.'
                                      : 'No podrá confirmarse hasta asignar fecha.'}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                      {!isEditing && selectedItems.some((item) => item.id) && (
                        <div className="flex justify-center mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddItem}
                            disabled={isEditing}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar ítem
                          </Button>
                        </div>
                      )}
                    </div>
                    {/* Mostrar errores de validación de items de forma más específica */}
                    <FormMessage />
                    {formErrors.item && (
                      <div className="text-sm text-destructive mt-2 space-y-1">
                        {Array.isArray(formErrors.item)
                          ? formErrors.item.map((itemError, idx) => {
                              if (!itemError) return null;
                              const errors = [];
                              if (itemError.jornada) errors.push(`Item ${idx + 1}: ${itemError.jornada.message}`);
                              if (itemError.tipo) errors.push(`Item ${idx + 1}: ${itemError.tipo.message}`);
                              if (itemError.quantity) errors.push(`Item ${idx + 1}: ${itemError.quantity.message}`);
                              return errors.map((err, errIdx) => <p key={`${idx}-${errIdx}`}>{err}</p>);
                            })
                          : formErrors.item.message && <p>{formErrors.item.message}</p>}
                      </div>
                    )}
                  </FormItem>
                );
              }}
            />

            {/* Campo de motivo de cambio de item (solo visible cuando se cambia el item en edición) */}
            {isEditing && showItemChangeReason && (
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
            )}

            {/* Imagen del pedido - No usa FormField porque es manejado localmente */}
            {isEditing ? (
              <div className="space-y-2">
                <FormLabel>
                  {`Cambiar imagen del pedido${form?.watch('numero_pedido') ? ` (aplica a todo el N° ${form.watch('numero_pedido')})` : ''}`}
                </FormLabel>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  className="bg-background"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <FormLabel>Documento adjunto (Imagen o PDF)</FormLabel>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  className="bg-background"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  data-testid="archivo-adjunto-input"
                />
              </div>
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
