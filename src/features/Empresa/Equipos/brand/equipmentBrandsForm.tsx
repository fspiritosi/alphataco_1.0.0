import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/use-toast';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createBrandOfVehicle, updateBrandOfVehicle } from '../actions/actions';

const logger = new Logger('EquipmentBrandsForm');

interface EquipmentBrandsFormProps {
  initialData?: any | null;
  onReset: () => void;
  isEditing?: boolean;
  onSuccess?: () => void;
}

// Esquema de validación con Zod
const formSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

function EquipmentBrandsForm({ initialData = null, onReset, isEditing = false, onSuccess }: EquipmentBrandsFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      is_active: true,
    },
    mode: 'onChange',
  });

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
    watch,
    setValue,
  } = form;

  // Resetear el formulario cuando cambia initialData
  useEffect(() => {
    if (initialData) {
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
      if (isEditing && data.id !== undefined) {
        await updateBrandOfVehicle({
          id: Number(data.id),
          name: data.name,
          is_active: data.is_active,
        });
      } else {
        await createBrandOfVehicle({
          name: data.name,
          is_active: data.is_active,
        });
      }

      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ['equipment-brands-table-brand'] });
      toast({
        title: 'Marca de equipo guardada correctamente',
        description: 'Los cambios se han guardado exitosamente.',
        variant: 'default',
      });

      onReset();
    } catch (error: unknown) {
      logger.error('Error al guardar la marca de equipo', { data: { error } });

      let errorMessage = 'Ocurrió un error al guardar. Por favor, inténtalo de nuevo.';

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
    <div className="max-w-md">
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full">
          <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar' : 'Crear'} Marca de Unidad</h2>
          <FormField
            name="name"
            render={() => (
              <FormItem>
                <FormLabel>Nombre de la Marca de Unidad</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    {...form.register('name')}
                    placeholder="Nombre de la marca de unidad"
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
                    onValueChange={(value) => setValue('is_active', value === 'true')}
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

export default EquipmentBrandsForm;
