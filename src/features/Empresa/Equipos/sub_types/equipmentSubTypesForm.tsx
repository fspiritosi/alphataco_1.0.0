import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { supabaseBrowser } from '@/lib/supabase/browser';
import DependencyValidationModal, { DependencyConfig } from '@/shared/components/modal/DependencyValidationModal';
import { fetchDependenciesForValue, fetchReplacementOptions } from '@/shared/components/modal/dependency-utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Database } from '../../../../../database.types';
import { createSubTypeOfVehicle, getAvailableCompatibleItems, updateSubTypeOfVehicle } from '../actions/actions';

type VehicleType = Database['public']['Tables']['type']['Row'];
type VehicleSubType = Database['public']['Tables']['sub_type']['Row'];

interface CompatibleItem {
  id: string;
  type: 'sub_type' | 'type';
}

interface EquipmentSubTypesFormProps {
  initialData?: any | null;
  onReset: () => void;
  isEditing?: boolean;
  onSuccess?: () => void;
  types: VehicleType[];
  allSubTypes?: VehicleSubType[];
  initialCompatibleItems?: CompatibleItem[];
}

// Esquema de validación con Zod
const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  type_id: z.string().min(1, 'El tipo es requerido'),
  is_active: z.boolean().default(true),
  compatible_item_ids: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

function EquipmentSubTypesForm({
  initialData = null,
  onReset,
  isEditing = false,
  onSuccess,
  types,
  allSubTypes = [],
  initialCompatibleItems = [],
}: EquipmentSubTypesFormProps) {
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [availableItems, setAvailableItems] = useState<{ subTypes: VehicleSubType[]; types: VehicleType[] }>({
    subTypes: [],
    types: [],
  });
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      is_active: true,
      type_id: '',
      compatible_item_ids: [],
    },
  });

  const router = useRouter();
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
    watch,
  } = form;

  const selectedTypeId = watch('type_id');

  // Obtener el tipo seleccionado
  const selectedType = useMemo(() => {
    return types.find((t) => t.id === selectedTypeId);
  }, [types, selectedTypeId]);

  // Verificar si el tipo padre es unidad tractora y tiene enganche
  const showCompatibleItems = useMemo(() => {
    return selectedType?.is_tractor_unit && selectedType?.has_hitch;
  }, [selectedType]);

  // Cargar items compatibles disponibles cuando cambia el tipo seleccionado
  const loadAvailableItems = useCallback(async (typeId: string) => {
    setIsLoadingItems(true);

    try {
      const result = await getAvailableCompatibleItems(typeId);
      setAvailableItems({
        subTypes: result.subTypes || [],
        types: result.types || [],
      });
    } catch (error) {
      console.error('Error loading available items:', error);
      setAvailableItems({ subTypes: [], types: [] });
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  // Cargar items disponibles cuando cambia el tipo seleccionado
  useEffect(() => {
    if (selectedTypeId && showCompatibleItems) {
      loadAvailableItems(selectedTypeId);
    } else {
      setAvailableItems({ subTypes: [], types: [] });
    }
  }, [selectedTypeId, showCompatibleItems, loadAvailableItems]);

  // Opciones para el multi-select combinando subtipos y tipos
  const compatibleItemOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];

    // Agregar subtipos
    availableItems.subTypes.forEach((st) => {
      const parentType = types.find((t) => t.id === st.type);
      options.push({
        value: `sub_type:${st.id}`,
        label: `${st.name} (${parentType?.name || 'Sin tipo'})`,
      });
    });

    // Agregar tipos sin subtipos
    availableItems.types.forEach((t) => {
      options.push({
        value: `type:${t.id}`,
        label: `${t.name} (Tipo)`,
      });
    });

    return options;
  }, [availableItems, types]);

  // Resetear el formulario cuando cambia initialData
  useEffect(() => {
    if (initialData) {
      const compatibleIds = initialCompatibleItems.map((item) => `${item.type}:${item.id}`);
      reset({
        id: initialData.id,
        name: initialData.name,
        is_active: initialData.is_active,
        type_id: initialData.type,
        compatible_item_ids: compatibleIds,
      });
    } else {
      reset({
        name: '',
        is_active: true,
        type_id: '',
        compatible_item_ids: [],
      });
    }
  }, [initialData, initialCompatibleItems, reset]);

  // Resetear compatible_item_ids cuando cambia el tipo
  useEffect(() => {
    if (!isEditing) {
      form.setValue('compatible_item_ids', []);
    }
  }, [selectedTypeId, form, isEditing]);

  // Función para parsear los IDs de items compatibles del formato "type:id" o "sub_type:id"
  const parseCompatibleItems = (ids: string[]): CompatibleItem[] => {
    return ids.map((id) => {
      const [type, itemId] = id.split(':');
      return { id: itemId, type: type as 'sub_type' | 'type' };
    });
  };

  const onSubmit = async (data: FormData) => {
    try {
      const compatibleItems = parseCompatibleItems(data.compatible_item_ids);

      if (isEditing && data.id) {
        const prevActive = !!initialData.is_active;
        const nextActive = data.is_active;

        // Si se intenta cambiar a inactivo y el valor es diferente, abrir modal de dependencias
        if (prevActive && !nextActive) {
          //Awaite del fetch de dependencias
          const depData = await fetchDependencies(dependencyConfigs[0], initialData.id);

          if (depData.data.length) {
            setShowDependencyModal(true);
            return; // No ejecutar update aún, el modal decidirá
          }
        }
        await updateSubTypeOfVehicle({
          id: data.id,
          name: data.name,
          is_active: data.is_active,
          type_id: data.type_id,
          compatible_item_ids: compatibleItems,
        });
        router.refresh();
      } else {
        await createSubTypeOfVehicle({
          name: data.name,
          is_active: data.is_active,
          type_id: data.type_id,
          compatible_item_ids: compatibleItems,
        });
      }

      if (onSuccess) onSuccess();
      toast({
        title: 'Subtipo de equipo guardado correctamente',
        description: 'Los cambios se han guardado exitosamente.',
        variant: 'default',
      });

      onReset();
      router.refresh();
    } catch (error: unknown) {
      console.error('Error al guardar el subtipo de equipo:', error);

      let errorMessage = 'Ocurrió un error al guardar. Por favor, inténtalo de nuevo.';

      // Extraer el mensaje de error de diferentes formatos de error
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = String(error);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // Mapear mensajes de error específicos
      if (errorMessage.includes('Subtipo de vehículo no encontrado')) {
        errorMessage = 'No se encontró el subtipo de vehículo a actualizar. Quizás fue eliminado por otro usuario.';
      } else if (errorMessage.includes('PGRST116') || errorMessage.includes('no rows returned')) {
        errorMessage = 'Error de base de datos: No se pudo completar la operación.';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };
  const fetchDependencies = async (config: DependencyConfig, recordKeyValue: string) => {
    // Solicitamos solo las columnas que se van a mostrar
    const select = config.displayColumns.join(',') as '*';

    const data = await fetchDependenciesForValue<'vehicles', 'subType'>({
      targetTable: 'vehicles',
      targetColumn: 'subType',
      value: recordKeyValue,
      select,
      limit: 10,
    });

    return data;
  };

  const dependencyConfigs = useMemo<DependencyConfig[]>(
    () => [
      {
        sourceTable: 'sub_type',
        sourceColumn: 'name',
        targetTable: 'vehicles',
        targetColumn: 'subType',
        displayColumns: ['domain', 'chassis'],
        displayLabels: ['Dominio', 'Chassis'],
        relationName: 'Equipos',
      },
    ],
    []
  );

  const handleDependencyConfirm = async (action: 'force' | 'replace', replacementValue?: string) => {
    setShowDependencyModal(false);

    if (!initialData?.id) return;

    // Confirmación sin reemplazo: solo desactivar el registro
    if (action === 'force') {
      const values = form.getValues();
      await onSubmit(values);
      return;
    }

    // Reemplazo masivo y luego desactivar
    if (action === 'replace') {
      try {
        const supabase = supabaseBrowser();
        const { error } = await supabase
          .from(dependencyConfigs[0].targetTable as keyof Database['public']['Tables'])
          .update({
            [dependencyConfigs[0].targetColumn]: replacementValue !== '__NULL__' ? replacementValue : null,
          } as any)
          .eq(dependencyConfigs[0].targetColumn, initialData.id);

        if (error) {
          console.error(error);
        }

        // Ahora sí, desactivar el registro actual
        const values = form.getValues();
        const compatibleItems = parseCompatibleItems(values.compatible_item_ids);
        await updateSubTypeOfVehicle({
          id: values.id!,
          name: values.name,
          is_active: values.is_active,
          type_id: values.type_id,
          compatible_item_ids: compatibleItems,
        });
        if (onSuccess) onSuccess();
      } catch (err) {
        console.error('Error al reemplazar referencias:', err);
        toast({
          title: 'Error',
          description: 'No se pudieron reemplazar las referencias',
          variant: 'destructive',
        });
      }
    }
  };
  return (
    <div className="flex space-y-8 max-w-[400px]">
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar' : 'Crear'} Subtipo de Unidad</h2>
          <FormField
            name="name"
            render={() => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ingrese el nombre del subtipo de equipo"
                    {...form.register('name')}
                    className={`w-[400px] ${form.formState.errors.name ? 'border-red-500' : ''}`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="type_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Unidad</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-[400px]">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Activo</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => form.setValue('is_active', value === 'true')}
                    value={form.watch('is_active') ? 'true' : 'false'}
                    className="flex space-x-1"
                  >
                    <FormItem className="flex items-center space-x-6 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="true" />
                      </FormControl>
                      <FormLabel className="font-normal">Activo</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="false" />
                      </FormControl>
                      <FormLabel className="font-normal">Inactivo</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Multi-select de items compatibles - solo visible si el tipo padre tiene enganche */}
          {showCompatibleItems && (
            <FormField
              control={form.control}
              name="compatible_item_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtipos/Tipos compatibles para enganche</FormLabel>
                  <FormControl>
                    <MultiSelectCombobox
                      options={compatibleItemOptions}
                      selectedValues={field.value}
                      onChange={field.onChange}
                      placeholder={isLoadingItems ? 'Cargando...' : 'Seleccione los items compatibles'}
                      emptyMessage="No hay items disponibles"
                      disabled={isLoadingItems}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="min-w-[100px]">
              {isEditing ? (isSubmitting ? 'Guardando...' : 'Guardar') : isSubmitting ? 'Creando...' : 'Crear'}
            </Button>
            <Button type="button" variant="outline" onClick={onReset} disabled={isSubmitting} className="min-w-[100px]">
              Cancelar
            </Button>
          </div>
        </form>

        {/* Modal de validación de dependencias reutilizable */}
        {isEditing && initialData && (
          <DependencyValidationModal
            isOpen={showDependencyModal}
            onClose={() => setShowDependencyModal(false)}
            onConfirm={handleDependencyConfirm}
            recordId={initialData.id || ''}
            recordName={initialData.name || ''}
            dependencies={dependencyConfigs}
            title="Confirmar desactivación"
            description="Este subtipo de equipo está siendo utilizado por otros registros. Debe resolver estas referencias antes de desactivarlo."
            fetchDependencies={fetchDependencies}
            fetchReplacementOptions={fetchReplacementOptions}
          />
        )}
      </Form>
    </div>
  );
}

export default EquipmentSubTypesForm;
