'use client';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createContractType, deleteContractType, updateContractType } from '../actions/actions';
const ContractTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: 'Debe ingresar el nombre del tipo de contrato' }),
  description: z.string().default('').nullable(),
  is_active: z.string().optional(),
});

export default function ContractTypeForm({ editingContractType }: { editingContractType: ContractType | null }) {
  const form = useForm<z.infer<typeof ContractTypeSchema>>({
    resolver: zodResolver(ContractTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      is_active: '',
    },
  });

  const { reset } = form;
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!!editingContractType);

  useEffect(() => {
    if (editingContractType) {
      reset({
        id: editingContractType.id,
        name: editingContractType.name,
        description: editingContractType.description,
        is_active: editingContractType.is_active ? 'true' : 'false',
      });
      setIsEditing(true);
    } else {
      reset({
        id: '',
        name: '',
        description: '',
        is_active: '',
      });
      setIsEditing(false);
    }
  }, [editingContractType, reset]);

  const onSubmit = async (values: z.infer<typeof ContractTypeSchema>) => {
    toast.promise(
      async () => {
        await createContractType({ description: values.description, name: values.name });
      },
      {
        loading: 'Creando tipo de contrato...',
        success: () => {
          router.refresh();
          resetForm();
          return 'Tipo de contrato creado correctamente';
        },
        error: (error) => {
          return 'Error al crear el tipo de contrato';
        },
      }
    );
  };

  const handleDelete = async () => {
    toast.promise(
      async () => {
        await deleteContractType({ id: editingContractType!.id });
      },
      {
        loading: 'Eliminando tipo de contrato...',
        success: () => {
          router.refresh();
          resetForm();
          return 'Tipo de contrato eliminado correctamente';
        },
        error: (error) => {
          return 'Error al eliminar el tipo de contrato';
        },
      }
    );
  };

  const onUpdate = async (values: z.infer<typeof ContractTypeSchema>) => {
    toast.promise(
      async () => {
        await updateContractType({
          id: values.id!,
          name: values.name,
          description: values.description,
          is_active: values.is_active === 'true' ? true : false,
        });
      },
      {
        loading: 'Actualizando tipo de contrato...',
        success: () => {
          router.refresh();
          resetForm();
          return 'Tipo de contrato actualizado correctamente';
        },
        error: (error) => {
          return 'Error al actualizar el tipo de contrato';
        },
      }
    );
  };

  const handleSubmit = (values: z.infer<typeof ContractTypeSchema>) => {
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
      description: '',
      is_active: '',
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    resetForm();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8  w-[300px]">
        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar Tipo de Contrato' : 'Crear Tipo de Contrato'}</h2>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Tipo de Contrato</FormLabel>
              <FormControl>
                <Input type="text" {...field} className="input w-[400px]" placeholder="Nombre del tipo de contrato" />
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
                <Textarea
                  {...field}
                  value={field.value || ''}
                  className="w-[400px]"
                  placeholder="Descripción del tipo de contrato"
                  rows={4}
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
                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex  space-x-1">
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
