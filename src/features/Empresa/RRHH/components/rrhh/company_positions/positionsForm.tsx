import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Position } from '@/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createPosition, updatePosition } from '../../../actions/actions';
const PositionSchema = z.object({
  name: z.string().nonempty({ message: 'El nombre es requerido' }),
  is_active: z.boolean(),
  hierarchical_position_id: z.array(z.string()).optional(),
  aptitudes_tecnicas_id: z.array(z.string()).optional(),
});

interface PositionFormValues extends z.infer<typeof PositionSchema> {
  aptitudes_tecnicas_id: string[];
}

interface PositionsFormProps {
  position: Position | null;
  hierarchicalData: any[];
  aptitudes: any[];
  mode: 'create' | 'edit';
  setMode: (mode: 'create' | 'edit') => void;
}

function PositionsForm({ position, hierarchicalData, aptitudes, mode, setMode }: PositionsFormProps) {
  const form = useForm<PositionFormValues>({
    resolver: zodResolver(PositionSchema),
    defaultValues: {
      name: position?.name || '',
      is_active: position?.is_active ?? true,
      hierarchical_position_id: position?.hierarchical_position_id || [],
      aptitudes_tecnicas_id: position?.aptitudes_tecnicas_id || [],
    },
  });

  // console.log(position);

  const { reset } = form;
  const router = useRouter();
  useEffect(() => {
    if (position) {
      form.reset({
        name: position.name || '',
        is_active: position.is_active ?? true,
        hierarchical_position_id: position.hierarchical_position_id
          ? Array.isArray(position.hierarchical_position_id)
            ? position.hierarchical_position_id
            : [position.hierarchical_position_id]
          : [],
        aptitudes_tecnicas_id: position.aptitudes_tecnicas_id || [],
      });
      setMode('edit');
    } else {
      form.reset({
        name: '',
        is_active: true,
        hierarchical_position_id: [],
        aptitudes_tecnicas_id: [],
      });
      setMode('create');
    }
  }, [position, form, setMode]);

  const handleSubmit = async (values: PositionFormValues) => {
    try {
      if (!position) {
        await createPosition({
          name: values.name,
          is_active: values.is_active,
          hierarchical_position_id: values.hierarchical_position_id || [],
          aptitudes_tecnicas_id: values.aptitudes_tecnicas_id || [],
        });
        toast.success('Posición creada con éxito');
        router.refresh();
        reset();
        setMode('create');
      } else {
        await updatePosition({
          ...values,
          id: position?.id || '',
          hierarchical_position_id: values.hierarchical_position_id || [],
          aptitudes_tecnicas_id: values.aptitudes_tecnicas_id || [],
        });
        toast.success('Posición actualizada con éxito');
        router.refresh();
        reset();
        setMode('create');
      }
    } catch (error) {
      toast.error('Error al crear o actualizar la posición');
      console.error(error);
    }
  };

  const handleCancel = () => {
    reset();
    setMode('create');
    form.reset({
      name: '',
      is_active: true,
      hierarchical_position_id: [],
      aptitudes_tecnicas_id: [],
    });
  };

  const hierarchicalDataFormatted = hierarchicalData.map((item) => ({
    label: item.name,
    value: item.id,
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 w-[300px]">
        <h2 className="text-xl font-bold mb-4">{mode === 'edit' ? 'Editar Posición' : 'Crear Posición'}</h2>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Puesto</FormLabel>
              <FormControl>
                <Input type="text" {...field} placeholder="Nombre del puesto" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hierarchical_position_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sector/Departamento</FormLabel>
              <FormControl>
                <MultiSelectCombobox
                  options={hierarchicalDataFormatted}
                  emptyMessage="No hay posiciones"
                  selectedValues={field.value || []}
                  onChange={field.onChange}
                  placeholder="Seleccione Sectores"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="aptitudes_tecnicas_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aptitudes Técnicas</FormLabel>
              <FormControl>
                <MultiSelectCombobox
                  options={aptitudes.map((apt) => ({
                    value: apt.id,
                    label: apt.nombre,
                  }))}
                  emptyMessage="No hay aptitudes disponibles"
                  selectedValues={field.value || []}
                  onChange={field.onChange}
                  placeholder="Seleccione Aptitudes"
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
            {mode === 'edit' ? 'Actualizar' : 'Crear'}
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
    // </div>
  );
}

export default PositionsForm;
