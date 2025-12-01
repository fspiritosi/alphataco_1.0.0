'use client';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createArea, fetchAreasWithProvinces, updateArea } from '@/features/Empresa/Clientes/actions/create';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const AreaSchema = z.object({
  name: z.string().nonempty({ message: 'El nombre es requerido' }),
  descripcion_corta: z
    .string()
    .nonempty({ message: 'La descripción corta es requerida' })
    .max(5, 'Máximo 5 caracteres'),
  customer_id: z.string().nonempty({ message: 'El cliente es requerido' }),
  province_id: z.array(z.number()).nonempty({ message: 'La provincia es requerida' }),
});

interface Cliente {
  id: string;
  name: string;
}

interface Provincia {
  id: number;
  name: string;
}

type Area = Awaited<ReturnType<typeof fetchAreasWithProvinces>>[0];
interface AreaFormProps {
  customers: Cliente[];
  provinces: Provincia[];
  mode: 'create' | 'edit';
  setMode: (mode: 'create' | 'edit') => void;
  selectedArea: Area | null;
  setSelectedArea: (area: Area | null) => void;
}

type AreaFormValues = z.infer<typeof AreaSchema>;

function AreaForm({ customers, provinces, mode, setMode, selectedArea, setSelectedArea }: AreaFormProps) {
  const form = useForm<AreaFormValues>({
    resolver: zodResolver(AreaSchema),
    defaultValues: {
      name: '',
      descripcion_corta: '',
      customer_id: '',
      province_id: [],
    },
  });

  const { reset } = form;
  const router = useRouter();

  // Cargar datos cuando cambia el modo o el área seleccionada
  useEffect(() => {
    if (mode === 'edit' && selectedArea) {
      reset({
        name: selectedArea.nombre,
        descripcion_corta: selectedArea.descripcion_corta || '',
        customer_id: selectedArea.customers?.id || '',
        province_id: selectedArea.area_province.map((prov) => prov.provinces?.id || 0),
      });
    } else if (mode === 'create') {
      reset({
        name: '',
        descripcion_corta: '',
        customer_id: '',
        province_id: [],
      });
    }
  }, [mode, selectedArea, reset]);

  const handleSubmit = async (values: AreaFormValues) => {
    try {
      if (mode === 'edit' && selectedArea) {
        const response = await updateArea({ ...values, id: selectedArea.id });

        // Manejar la respuesta según el código de estado
        if (!response) {
          toast.error('No se recibió respuesta del servidor');
          return;
        }

        if (response.status === 200) {
          toast.success(response.body || 'Área actualizada correctamente');
          reset();
          setSelectedArea(null);
          setMode('create');
          router.refresh();
        } else if (response.status === 400) {
          // Mostrar mensaje de error específico para validación
          toast.error(response.body || 'No se pudo actualizar el área');
        } else {
          // Otros errores
          console.error('Error inesperado:', response);
          toast.error(response.body || 'Error inesperado al actualizar el área');
        }
      } else {
        const response = await createArea(values);
        if (response?.status === 200) {
          toast.success(response.body || 'Área creada correctamente');
          reset();
          router.refresh();
        } else {
          toast.error(response?.body || 'Error al crear el área');
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Error inesperado al procesar la solicitud');
    }
  };

  const handleCancel = () => {
    reset();
    if (mode === 'edit') {
      setSelectedArea(null);
      setMode('create');
    }
  };

  return (
    <PermissionGuard module="comercial" tab="areas" action={mode === 'create' ? 'create' : 'update'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 w-[300px]">
          <h2 className="text-xl font-bold mb-4">{mode === 'create' ? 'Crear Area' : 'Editar Area'}</h2>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Área</FormLabel>
                <FormControl>
                  <Input type="text" {...field} placeholder="Nombre del área" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descripcion_corta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción Corta</FormLabel>
                <FormControl>
                  <Input type="text" {...field} placeholder="Descripción breve" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Clientes</SelectLabel>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="province_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provincias</FormLabel>
                <FormControl>
                  <MultiSelectCombobox
                    options={provinces.map((province) => ({
                      label: province.name,
                      value: province.id.toString(),
                    }))}
                    emptyMessage="No hay provincias disponibles"
                    selectedValues={field.value.map(String)}
                    onChange={(values) => field.onChange(values.map(Number))}
                    placeholder="Selecciona provincias"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <Button type="submit" variant="gh_orange">
              {mode === 'create' ? 'Crear' : 'Actualizar'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </PermissionGuard>
  );
}

export default AreaForm;
