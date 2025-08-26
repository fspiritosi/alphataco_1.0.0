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
  contract_type: z.enum(['Leasing', 'Alquiler']),
});

type FormData = z.infer<typeof formSchema>;

function EquipmentOwnerForm({ initialData = null, onReset, isEditing = false }: EquipmentOwnerFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      is_active: true,
      contract_type: undefined,
      cuit: '',
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
        is_active: initialData.is_active!,
        contract_type: initialData.contract_type,
        cuit: initialData.cuit,
      });
    } else {
      reset({
        name: '',
        is_active: true,
        contract_type: undefined,
        cuit: '',
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && data.id) {
        await updateEquipmentOwner({
          id: data.id,
          name: data.name,
          is_active: data.is_active,
          cuit: data.cuit,
          contract_type: data.contract_type,
        });
      } else {
        await createEquipmentOwner({
          name: data.name,
          is_active: data.is_active,
          cuit: data.cuit,
          contract_type: data.contract_type,
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
            name="contract_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Contrato</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-[400px]">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Leasing">Leasing</SelectItem>
                    <SelectItem value="Alquiler">Alquiler</SelectItem>
                  </SelectContent>
                </Select>
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
      </Form>
    </div>
  );
}

export default EquipmentOwnerForm;
