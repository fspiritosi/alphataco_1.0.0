import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/use-toast';
import { supabaseBrowser } from '@/lib/supabase/browser';
import DependencyValidationModal, { DependencyConfig } from '@/shared/components/modal/DependencyValidationModal';
import { fetchDependenciesForValue, fetchReplacementOptions } from '@/shared/components/modal/dependency-utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FetchEquipmentOwnersType, createEquipmentOwner, updateEquipmentOwner } from './actions/actions';

interface EquipmentOwnerFormProps {
  initialData?: FetchEquipmentOwnersType[0] | null;
  onReset: () => void;
  isEditing?: boolean;
}

// Esquema de validación con Zod
const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  is_active: z.boolean().default(true),
  cuit: z.string({ required_error: 'El CUIT es requerido' }).min(6, 'Debe tener minimo 6 caracteres'),
  contract_types: z
    .array(z.enum(['Leasing', 'Alquiler', 'Prendado']))
    .min(1, 'Debe seleccionar al menos un tipo de contrato'),
});

type FormData = z.infer<typeof formSchema>;

function EquipmentOwnerForm({ initialData = null, onReset, isEditing = false }: EquipmentOwnerFormProps) {
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      is_active: true,
      contract_types: [],
      cuit: '',
    },
  });

  const router = useRouter();
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

  const fetchDependencies = async (config: DependencyConfig, recordKeyValue: string) => {
    // Solicitamos solo las columnas que se van a mostrar
    const select = config.displayColumns.join(',') as '*';

    const data = await fetchDependenciesForValue<'vehicles', 'owner_id'>({
      targetTable: 'vehicles',
      targetColumn: 'owner_id',
      value: recordKeyValue,
      select,
      limit: 10,
    });

    return data;
  };

  // Resetear el formulario cuando cambia initialData
  useEffect(() => {
    if (initialData) {
      // Extraer los tipos de contrato de la relación
      const contractTypes = initialData.equipment_owner_contract_types?.map((ct) => ct.contract_type) || [];

      reset({
        id: initialData.id,
        name: initialData.name,
        is_active: initialData.is_active!,
        contract_types: contractTypes as ('Leasing' | 'Alquiler' | 'Prendado')[],
        cuit: initialData.cuit,
      });
    } else {
      reset({
        name: '',
        is_active: true,
        contract_types: [],
        cuit: '',
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && data.id) {
        const prevActive = !!initialData?.is_active;
        const nextActive = data.is_active;

        // Si se intenta cambiar a inactivo y el valor es diferente, abrir modal de dependencias
        if (prevActive && !nextActive) {
          //Awaite del fetch de dependencias
          const data = await fetchDependencies(dependencyConfigs[0], initialData?.id!);

          if (data.data.length) {
            setShowDependencyModal(true);
            return; // No ejecutar update aún, el modal decidirá
          }
        }
        await updateEquipmentOwner({
          id: data.id,
          name: data.name,
          is_active: data.is_active,
          cuit: data.cuit,
          contract_types: data.contract_types,
        });

        router.refresh();
      } else {
        await createEquipmentOwner({
          name: data.name,
          is_active: data.is_active,
          cuit: data.cuit,
          contract_types: data.contract_types,
        });
      }

      toast({
        title: 'Titular guardado correctamente',
        description: 'Los cambios se han guardado exitosamente.',
        variant: 'default',
      });

      onReset();
      router.refresh();
    } catch (error: unknown) {
      console.error('Error al guardar el titular:', error);

      toast({
        title: 'Error',
        description: 'No se pudo guardar el titular. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const dependencyConfigs = useMemo<DependencyConfig[]>(
    () => [
      {
        sourceTable: 'equipment_owners',
        sourceColumn: 'name',
        targetTable: 'vehicles',
        targetColumn: 'owner_id',
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
        toast;
        await updateEquipmentOwner({
          id: values.id!,
          name: values.name,
          is_active: values.is_active,
          cuit: values.cuit,
          contract_types: values.contract_types,
        });

        toast({
          title: 'Titular actualizado correctamente',
          description: 'El titular ha sido actualizado exitosamente.',
          variant: 'default',
        });
      } catch (err) {
        console.error('Error al reemplazar referencias:', err);
        toast({
          title: 'Error',
          description: 'No se pudieron reemplazar las referencias',
          variant: 'destructive',
        });
      }

      router.refresh();
    }
  };
  return (
    <div className="flex space-y-8 max-w-[400px]">
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar' : 'Crear'} Titular</h2>
          <FormField
            name="name"
            render={() => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ingrese el nombre del titular"
                    {...form.register('name')}
                    className={`w-[400px] ${form.formState.errors.name ? 'border-red-500' : ''}`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="contract_types"
            render={() => (
              <FormItem>
                <FormLabel>Tipos de Contrato</FormLabel>
                <div className="space-y-2">
                  {(['Leasing', 'Alquiler', 'Prendado'] as const).map((type) => (
                    <FormField
                      key={type}
                      control={form.control}
                      name="contract_types"
                      render={({ field }) => {
                        return (
                          <FormItem key={type} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(type)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, type])
                                    : field.onChange(field.value?.filter((value) => value !== type));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{type}</FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="cuit"
            render={() => (
              <FormItem>
                <FormLabel>CUIT</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ingrese el CUIT"
                    {...form.register('cuit')}
                    className={`w-[400px] ${form.formState.errors.cuit ? 'border-red-500' : ''}`}
                  />
                </FormControl>
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

export default EquipmentOwnerForm;
