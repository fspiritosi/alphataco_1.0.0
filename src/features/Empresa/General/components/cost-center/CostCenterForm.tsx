'use client';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createCostCenter, updateCostCenter } from '../../actions/actions';
import { useCostCenterStore } from './store/costCenter.store';
const CostCenterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: 'Debe ingresar el nombre del centro de costo' }),
  is_active: z.boolean().optional(),
});

function CostCenterForm() {
  const editingCostCenter = useCostCenterStore((state) => state.costCenter);
  const form = useForm<z.infer<typeof CostCenterSchema>>({
    resolver: zodResolver(CostCenterSchema),
    defaultValues: {
      name: '',
      is_active: false,
    },
  });

  const { reset } = form;
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!!editingCostCenter);

  useEffect(() => {
    if (editingCostCenter) {
      reset({
        id: editingCostCenter.id,
        name: editingCostCenter.name,
        is_active: editingCostCenter.is_active ? true : false,
      });
      setIsEditing(true);
    } else {
      reset({
        id: '',
        name: '',
        is_active: false,
      });
      setIsEditing(false);
    }
  }, [editingCostCenter, reset]);

  const onSubmit = async (values: z.infer<typeof CostCenterSchema>) => {
    toast.promise(
      async () => {
        await createCostCenter({ name: values.name, is_active: values.is_active! });
      },
      {
        loading: 'Creando centro de costo...',
        success: () => {
          router.refresh();
          resetForm();
          return 'Centro de costo creado correctamente';
        },
        error: (error) => {
          return 'Error al crear el centro de costo';
        },
      }
    );
  };

  const onUpdate = async (values: z.infer<typeof CostCenterSchema>) => {
    toast.promise(
      async () => {
        await updateCostCenter({
          id: values.id!,
          name: values.name,
          is_active: values.is_active! ? true : false,
        });
      },
      {
        loading: 'Actualizando centro de costo...',
        success: () => {
          router.refresh();
          resetForm();
          return 'Centro de costo actualizado correctamente';
        },
        error: (error) => {
          return 'Error al actualizar el centro de costo';
        },
      }
    );
  };

  const handleSubmit = (values: z.infer<typeof CostCenterSchema>) => {
    if (isEditing) {
      onUpdate(values);
    } else {
      onSubmit(values);
    }
  };

  const resetForm = () => {
    reset({
      id: '',
      name: '',
      is_active: false,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    resetForm();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar Centro de Costo' : 'Crear Centro de Costo'}</h2>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Centro de Costo</FormLabel>
              <FormControl>
                <Input type="text" {...field} className="input w-[400px]" placeholder="Nombre del centro de costo" />
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
          <Button type="submit" variant={'gh_orange'}>
            {isEditing ? 'Actualizar' : 'Crear'}
          </Button>
          {isEditing && (
            <Button type="button" onClick={handleCancel} variant="outline">
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}

export default CostCenterForm;
