import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createModelOfVehicle, updateModelOfVehicle } from '../actions/actions';

interface EquipmentModelFormProps {
  initialData?: any | null;
  onReset: () => void;
  isEditing?: boolean;
  onSuccess?: () => void;
  brands: any[];
}

// Esquema de validación con Zod
const formSchema = z.object({
  id: z.number().optional(),
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .refine((value) => value.trim() !== '', {
      message: 'El nombre no puede estar vacío',
    }),
  brand: z.string().min(1, 'Debe seleccionar una marca'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

function EquipmentModelForm({
  brands,
  initialData = null,
  onReset,
  isEditing = false,
  onSuccess,
}: EquipmentModelFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      brand: '',
      is_active: true,
    },
    mode: 'onChange',
    criteriaMode: 'all',
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
    watch,
    setValue,
  } = form;

  const router = useRouter();

  // Resetear el formulario cuando cambia initialData
  useEffect(() => {
    if (initialData) {
      reset({
        id: Number(initialData.id),
        name: initialData.name,
        brand: initialData.brand?.toString() || '',
        is_active: initialData.is_active ?? true,
      });
    } else {
      reset({
        name: '',
        brand: '',
        is_active: true,
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: FormData) => {
    // La validación ahora es manejada por Zod, no se necesita validación manual
    try {
      if (isEditing && data.id) {
        await updateModelOfVehicle({
          id: Number(data.id),
          name: data.name,
          brand: Number(data.brand),
          is_active: data.is_active,
        });
      } else {
        await createModelOfVehicle({
          name: data.name,
          brand: Number(data.brand),
          is_active: data.is_active,
        });
      }

      if (onSuccess) onSuccess();
      toast({
        title: 'Modelo de equipo guardado correctamente',
        description: 'Los cambios se han guardado exitosamente.',
        variant: 'default',
      });

      onReset();
      router.refresh();
    } catch (error: unknown) {
      console.error('Error al guardar el modelo de equipo:', error);

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
      if (errorMessage.includes('Marca de vehiculo no encontrado')) {
        errorMessage = 'No se encontró la marca de vehiculo a actualizar. Quizás fue eliminado por otro usuario.';
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
  return (
    <div className="flex space-y-8 max-w-[300px]">
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar' : 'Crear'} Modelo de Unidad</h2>
          <FormField
            name="brand"
            render={() => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <FormControl>
                  <div className={`relative ${form.formState.errors.brand ? 'border border-red-500 rounded-md' : ''}`}>
                    <Select
                      onValueChange={(value) => setValue('brand', value, { shouldValidate: true })}
                      value={watch('brand')}
                    >
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Seleccione una marca" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={String(brand.id)}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="name"
            render={() => (
              <FormItem>
                <FormLabel>Nombre del Modelo</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ingrese el nombre del modelo"
                    {...form.register('name')}
                    className={form.formState.errors.name ? 'border-red-500' : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="is_active"
            render={() => (
              <FormItem className="space-y-3">
                <FormLabel>Activo</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => setValue('is_active', value === 'true', { shouldValidate: true })}
                    value={watch('is_active') ? 'true' : 'false'}
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
      </Form>
    </div>
  );
}

export default EquipmentModelForm;
