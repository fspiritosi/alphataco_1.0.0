import { Button } from '@/components/ui/button';
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
import { FetchTypeOfVehicles, createTypeOfVehicle, updateTypeOfVehicle } from '../actions/actions';

interface EquipmentTypesFormProps {
  initialData?: Awaited<ReturnType<typeof FetchTypeOfVehicles>>[0] | null;
  onReset: () => void;
  isEditing?: boolean;
  onSuccess?: () => void;
}

// Esquema de validación con Zod
const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

function EquipmentTypesForm({ initialData = null, onReset, isEditing = false, onSuccess }: EquipmentTypesFormProps) {
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      is_active: true,
    },
  });

  const router = useRouter();
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

  // Resetear el formulario cuando cambia initialData
  useEffect(() => {
    if (initialData) {
      // Aseguramos que el ID sea un número
      reset({
        id: initialData.id,
        name: initialData.name,
        is_active: initialData.is_active ?? true,
      });
    } else {
      reset({
        name: '',
        is_active: true,
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && initialData) {
        const prevActive = !!initialData.is_active;
        const nextActive = data.is_active;

        // Si se intenta cambiar a inactivo y el valor es diferente, abrir modal de dependencias
        if (prevActive && !nextActive) {
          //Awaite del fetch de dependencias
          const data = await fetchDependencies(dependencyConfigs[0], initialData.id);

          if (data.data.length) {
            setShowDependencyModal(true);
            return; // No ejecutar update aún, el modal decidirá
          }
        }
        await updateTypeOfVehicle({
          id: data.id!,
          name: data.name,
          is_active: data.is_active,
        });
        router.refresh();
      } else {
        await createTypeOfVehicle({
          name: data.name,
          is_active: data.is_active,
        });
        router.refresh();
      }

      if (onSuccess) onSuccess();
      toast({
        title: 'Tipo de equipo guardado correctamente',
        description: 'Los cambios se han guardado exitosamente.',
        variant: 'default',
      });

      onReset();

      router.refresh();
    } catch (error: unknown) {
      console.error('Error al guardar el tipo de equipo:', error);

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
      if (errorMessage.includes('Tipo de vehículo no encontrado')) {
        errorMessage = 'No se encontró el tipo de vehículo a actualizar. Quizás fue eliminado por otro usuario.';
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

    const data = await fetchDependenciesForValue<'vehicles', 'type'>({
      targetTable: 'vehicles',
      targetColumn: 'type',
      value: recordKeyValue,
      select,
      limit: 10,
    });

    return data;
  };

  const dependencyConfigs = useMemo<DependencyConfig[]>(
    () => [
      {
        sourceTable: 'type',
        sourceColumn: 'name',
        targetTable: 'vehicles',
        targetColumn: 'type',
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
        await updateTypeOfVehicle({
          id: values.id!,
          name: values.name,
          is_active: values.is_active,
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
          <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar' : 'Crear'} Tipo de Unidad</h2>
          <FormField
            name="name"
            render={() => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ingrese el nombre del tipo de vehículo"
                    {...form.register('name')}
                    className={`w-[400px] ${form.formState.errors.name ? 'border-red-500' : ''}`}
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
            description="Este tipo de equipo está siendo utilizado por otros registros. Debe resolver estas referencias antes de desactivarlo."
            fetchDependencies={fetchDependencies}
            fetchReplacementOptions={fetchReplacementOptions}
          />
        )}
      </Form>
    </div>
  );
}

export default EquipmentTypesForm;
