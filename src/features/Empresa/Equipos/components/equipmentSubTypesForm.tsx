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
import { Database } from '../../../../../database.types';
import { createSubTypeOfVehicle, updateSubTypeOfVehicle } from '../actions/actions';

interface EquipmentSubTypesFormProps {
  initialData?: any | null;
  onReset: () => void;
  isEditing?: boolean;
  onSuccess?: () => void;
  types: Database['public']['Tables']['type']['Row'][];
}

// Esquema de validación con Zod
const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  type_id: z.string().min(1, 'El tipo es requerido'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

function EquipmentSubTypesForm({
  initialData = null,
  onReset,
  isEditing = false,
  onSuccess,
  types,
}: EquipmentSubTypesFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      is_active: true,
      type_id: '',
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
        is_active: initialData.is_active,
        type_id: initialData.type,
      });
    } else {
      reset({
        name: '',
        is_active: true,
        type_id: '',
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && data.id) {
        await updateSubTypeOfVehicle({
          id: data.id,
          name: data.name,
          is_active: data.is_active,
          type_id: data.type_id,
        });
      } else {
        await createSubTypeOfVehicle({
          name: data.name,
          is_active: data.is_active,
          type_id: data.type_id,
        });
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

export default EquipmentSubTypesForm;
