'use client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { handleSubmit } from '@/features/Empresa/Clientes/actions/itemsService';
import { PermissionGuard } from '@/features/Permissions';
import { logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { RadioGroup, RadioGroupItem } from '../../../../../components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { fetchServiceItems } from '../../actions/items';

const ItemsSchema = z.object({
  customer_id: z.string().optional(),
  customer_service_id: z.string().optional(),
  item_name: z.string().min(1, { message: 'Debe ingresar el nombre del servicio' }),
  item_description: z.string().nullable().optional(),
  code_item: z.string().nullable().optional(),
  item_number: z.string().nullable().optional(),
  item_price: z.preprocess((val) => Number(val), z.number().min(0, { message: 'Debe ingresar un precio válido' })),
  item_measure_units: z.string().min(1, { message: 'Debe seleccionar la unidad de medida' }),
  is_active: z.boolean().default(true),
  needs_personnel: z.boolean().default(true),
  needs_equipment: z.boolean().default(true),
});

const EditItemSchema = z.object({
  customer_id: z.string().optional(),
  customer_service_id: z.string().optional(),
  item_name: z.string().optional(),
  code_item: z.string().nullable().optional(),
  item_number: z.string().nullable().optional(),
  item_description: z.string().nullable().optional(),
  item_price: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: 'Debe ingresar un precio válido' }).optional()
  ),
  item_measure_units: z.string().optional(),
  is_active: z.boolean().optional(),
  needs_personnel: z.boolean().default(true),
  needs_equipment: z.boolean().default(true),
});

interface ServiceItemsFormProps {
  measure_units: MeasureUnit[];
  customers: Customer[];
  services: { id?: string; company_id?: string | null; [key: string]: unknown }[];
  company_id: string;
  editService: { id?: string; company_id?: string | null; [key: string]: unknown } | null | undefined;
  editingService?: Awaited<ReturnType<typeof fetchServiceItems>>[number] | null;
  open?: boolean;
  onSuccess?: () => void;
}

export default function ServiceItemsForm({
  measure_units,
  company_id,
  editingService,
  editService,
  open,
  onSuccess,
}: ServiceItemsFormProps) {
  const [isEditing, setIsEditing] = useState(!!editingService);

  const form = useForm<z.infer<typeof ItemsSchema>>({
    resolver: zodResolver(isEditing ? EditItemSchema : ItemsSchema),
    defaultValues: {
      item_price: 0,
      is_active: true,
      needs_personnel: true,
      needs_equipment: true,
    },
  });

  const { reset } = form;
  const router = useRouter();

  useEffect(() => {
    if (editingService) {
      reset({
        item_name: editingService.item_name || '',
        item_description: editingService.item_description || '',
        item_price: editingService.item_price || 0,
        item_measure_units: editingService.measure_units?.id?.toString() || '',
        code_item: editingService.code_item || '',
        item_number: editingService.item_number || '',
        is_active: editingService.is_active ?? true,
        needs_personnel: editingService.needs_personnel ?? true,
        needs_equipment: editingService.needs_equipment ?? true,
      });
      setIsEditing(true);
    } else {
      reset({
        item_name: '',
        item_description: '',
        item_price: 0,
        item_measure_units: '',
        code_item: '',
        item_number: '',
        is_active: true,
        needs_personnel: true,
        needs_equipment: true,
      });
      setIsEditing(false);
    }
  }, [editingService, reset]);

  const onSubmit = async (values: z.infer<typeof ItemsSchema>) => {
    try {
      await handleSubmit(values, editingService, editService, company_id, isEditing, reset, () => {
        // Cerrar el formulario o limpiar después de guardar
        handleCancel();
        // Llamar al callback de éxito si existe
        if (onSuccess) onSuccess();
      });
    } catch (error) {
      logger.error('Error al guardar el ítem', { data: { error } });
    }
  };

  const handleCancel = () => {
    reset({
      item_name: '',
      item_description: '',
      item_price: 0,
      item_measure_units: '',
      code_item: '',
      item_number: '',
      is_active: true,
      needs_personnel: true,
      needs_equipment: true,
    });

    setIsEditing(false);
  };
  return (
    <div className="px-6 pt-6 pb-4">
      <p className="text-base font-semibold mb-4">{isEditing ? 'Editar Item' : 'Nuevo Item'}</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Campo Nombre */}
          <FormField
            control={form.control}
            name="item_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Item*</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Porta Simple" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Código y Número en fila */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="code_item"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: COD-001" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="item_number"
              render={({ field: { onChange, onBlur, value, name, ref } }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: 001"
                      value={value ?? ''}
                      onChange={onChange}
                      onBlur={onBlur}
                      ref={ref}
                      name={name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Precio y Unidad de Medida en fila */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="item_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio*</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="item_measure_units"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad de Medida*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccione unidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {measure_units?.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Campo Descripción */}
          <FormField
            control={form.control}
            name="item_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ingrese la descripción del item" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estado */}
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => {
              const radioValue = field.value ? 'true' : 'false';
              return (
                <FormItem className="space-y-2">
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => field.onChange(value === 'true')}
                      value={radioValue}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="true" />
                        <span className="text-sm">Activo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="false" />
                        <span className="text-sm">Inactivo</span>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Requerimientos de recursos */}
          <div className="space-y-2">
            <p className="text-sm font-medium leading-none">Requerimientos</p>
            <div className="flex gap-6 pt-1">
              <FormField
                control={form.control}
                name="needs_personnel"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Necesita Personal</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="needs_equipment"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Necesita Equipos</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2">
            <PermissionGuard module="comercial" tab="items-contrato" action={isEditing ? 'update' : 'create'}>
              <Button type="submit" variant="gh_orange">
                {isEditing ? 'Guardar cambios' : 'Crear'}
              </Button>
            </PermissionGuard>

            <Button type="button" variant="outline" onClick={() => handleCancel()}>
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
