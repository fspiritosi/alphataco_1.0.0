'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { AptitudTecnica, createAptitudTecnica, updateAptitudTecnica } from '../../actions/rrhh/aptitudesTecnicas';

const logger = new Logger('features/Empresa/RRHH');

const formSchema = z.object({
  nombre: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres.',
  }),
  descripcion: z.string().optional(),
  puestos: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

interface AptitudesFormProps {
  onSuccess: (aptitud: AptitudTecnica) => void;
  positions: { id: string; name: string }[];
  initialData?: AptitudTecnica | null;
}

export function AptitudesForm({ onSuccess, positions, initialData }: AptitudesFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<string[]>(initialData?.puestos || []);
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: initialData?.nombre || '',
      puestos: initialData?.puestos || [],
      is_active: initialData?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        nombre: initialData.nombre,
        puestos: initialData.puestos,
        is_active: initialData.is_active,
      });
      setSelectedPositions(initialData.puestos || []);
    } else {
      form.reset({
        nombre: '',
        puestos: [],
        is_active: true,
      });
      setSelectedPositions([]);
    }
  }, [initialData]);

  const handlePositionSelect = (selected: string[]) => {
    setSelectedPositions(selected);
    form.setValue('puestos', selected);
  };

  const handleCancel = () => {
    if (initialData) {
      // Si estamos editando, volvemos a los valores iniciales
      form.reset({
        nombre: initialData.nombre,
        puestos: initialData.puestos,
        is_active: initialData.is_active,
      });
      setSelectedPositions(initialData.puestos || []);
    } else {
      // Si estamos creando, limpiamos el formulario
      form.reset({
        nombre: '',
        puestos: [],
        is_active: true,
      });
      setSelectedPositions([]);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);

      if (initialData) {
        await updateAptitudTecnica({ ...values, id: initialData.id });
      } else {
        await createAptitudTecnica(values as any);
      }

      const savedAptitud: AptitudTecnica = {
        id: initialData?.id || Math.random().toString(36).substr(2, 9),
        nombre: values.nombre,
        puestos: values.puestos,
        is_active: values.is_active,
        aptitudes_tecnicas_puestos: values.puestos.map((puestoId) => ({
          puesto_id: {
            id: puestoId,
            name: '', // Este valor se actualizará cuando se carguen los datos reales
            is_active: true,
          },
          aptitud_id: initialData?.id || '',
          created_at: new Date().toISOString(),
        })),
      } as AptitudTecnica;

      onSuccess(savedAptitud);
      router.refresh();
    } catch (error) {
      logger.error('Error al guardar la aptitud', { data: { error } });
      toast.error('Error al guardar la aptitud');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-2">
      <div>
        <h2 className="text-xl font-bold">{initialData ? 'Editar Aptitud Técnica' : 'Crear Aptitud Técnica'}</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-[300px]">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la aptitud" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="puestos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puestos</FormLabel>
                  <FormControl>
                    <MultiSelectCombobox
                      options={positions.map((p) => ({
                        label: p.name,
                        value: p.id,
                      }))}
                      selectedValues={selectedPositions}
                      onChange={handlePositionSelect}
                      placeholder="Selecciona los puestos..."
                      emptyMessage="No se encontraron puestos"
                    />
                  </FormControl>
                  <FormDescription>Selecciona los puestos que requieren esta aptitud</FormDescription>
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
          </div>
          <div className="flex space-x-2">
            <Button type="submit" variant="gh_orange" disabled={isLoading}>
              {initialData ? 'Actualizar aptitud' : 'Crear'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
