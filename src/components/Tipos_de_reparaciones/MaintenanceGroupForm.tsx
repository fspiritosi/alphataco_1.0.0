import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  createMaintenanceGroupAction,
  fetchMaintenanceGroupsActionType,
  fetchTypesOfRepairActionType,
  updateMaintenanceGroupAction,
} from './actions/maintenanceGroupActions';

const MaintenanceGroupSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }),
  description: z.string().optional(),
  is_active: z.boolean(),
  type_ids: z.array(z.string()).optional(),
});

interface MaintenanceGroupFormValues extends z.infer<typeof MaintenanceGroupSchema> {
  type_ids: string[];
}

interface MaintenanceGroupFormProps {
  group: fetchMaintenanceGroupsActionType['groups'][number] | null;
  mode: 'create' | 'edit';
  setMode: (mode: 'create' | 'edit') => void;
  types: fetchTypesOfRepairActionType['types'];
}

function MaintenanceGroupForm({ group, types, mode, setMode }: MaintenanceGroupFormProps) {
  const isEditing = mode === 'edit';
  const form = useForm<MaintenanceGroupFormValues>({
    defaultValues: {
      name: group?.name || '',
      description: group?.description || '',
      is_active: group?.is_active ?? true,
      type_ids: group?.maintenance_group_type_of_repairs?.map((rel) => rel.type_id) || [],
    },
  });

  const { reset } = form;
  const router = useRouter();

  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name || '',
        description: group.description || '',
        is_active: group.is_active ?? true,
        type_ids: group.maintenance_group_type_of_repairs?.map((rel) => rel.type_id) || [],
      });
      setMode('edit');
    } else {
      form.reset({
        name: '',
        description: '',
        is_active: true,
        type_ids: [],
      });
      setMode('create');
    }
  }, [group, form, setMode]);

  const handleSubmit = async (values: MaintenanceGroupFormValues) => {
    const resetForm = () => {
      reset();
      setMode('create');
      form.reset({
        name: '',
        description: '',
        is_active: true,
        type_ids: [],
      });
    };
    if (!group) {
      await toast.promise(
        createMaintenanceGroupAction(
          {
            name: values.name,
            description: values.description,
            is_active: values.is_active,
          },
          values.type_ids
        ),
        {
          loading: 'Creando grupo...',
          success: 'Grupo de reparación creado con éxito',
          error: 'Error al crear el grupo',
        }
      );
      router.refresh();
      resetForm();
    } else {
      await toast.promise(
        updateMaintenanceGroupAction(
          group.id,
          {
            name: values.name,
            description: values.description,
            is_active: values.is_active,
          },
          values.type_ids
        ),
        {
          loading: 'Actualizando grupo...',
          success: 'Grupo de reparación actualizado con éxito',
          error: 'Error al actualizar el grupo',
        }
      );
      router.refresh();
      resetForm();
    }
  };

  const handleCancel = () => {
    reset();
    setMode('create');
    form.reset({
      name: '',
      is_active: true,
      type_ids: [],
    });
  };

  const repairTypesOptions = types.map((type) => ({
    value: type.id,
    label: type.name,
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 w-[300px]">
        <h2 className="text-xl font-bold mb-4">
          {mode === 'edit' ? 'Editar Grupo de Reparación' : 'Crear Grupo de Reparación'}
        </h2>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del grupo</FormLabel>
              <FormControl>
                <Input type="text" {...field} placeholder="Nombre del grupo" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  placeholder="Descripción del grupo"
                  className="border rounded-md p-2 w-full min-h-[60px] resize-y"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipos de reparación asociados</FormLabel>
              <FormControl>
                <MultiSelectCombobox
                  options={repairTypesOptions}
                  emptyMessage="No hay tipos de reparación"
                  selectedValues={field.value || []}
                  onChange={field.onChange}
                  placeholder="Seleccione tipos de reparación"
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
              <FormLabel>Estado</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange(value === 'true')}
                  value={field.value ? 'true' : 'false'}
                  className="flex  space-x-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
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

        <div className="flex gap-2 mt-6">
          <Button variant="gh_orange" type="submit">
            {mode === 'edit' ? 'Editar' : 'Crear'}
          </Button>
          {mode === 'edit' ? (
            <Button type="button" onClick={handleCancel} variant="outline">
              Cancelar
            </Button>
          ) : (
            <Button type="button" onClick={handleCancel} variant="outline">
              Limpiar
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}

export default MaintenanceGroupForm;
