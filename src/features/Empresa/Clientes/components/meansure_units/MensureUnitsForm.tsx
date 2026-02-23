'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createMeasureUnit, fetchMeasureUnits, updateMeasureUnit } from './actions/actions';

// Definir el esquema de validación con Zod
const formSchema = z.object({
  simbol: z.string().min(1, { message: 'El símbolo es requerido' }),
  tipo: z.string().min(1, { message: 'El tipo es requerido' }),
  unit: z.string().min(1, { message: 'La unidad es requerida' }),
});

interface MensureUnitsFormProps {
  selectedUnit: Awaited<ReturnType<typeof fetchMeasureUnits>>[number] | null;
  setSelectedUnit: (unit: Awaited<ReturnType<typeof fetchMeasureUnits>>[number] | null) => void;
  mode: 'create' | 'edit';
  setMode: (mode: 'create' | 'edit') => void;
}

function MensureUnitsForm({ selectedUnit, setSelectedUnit, mode, setMode }: MensureUnitsFormProps) {
  // Configurar el formulario con React Hook Form y validación Zod
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      simbol: '',
      tipo: '',
      unit: '',
    },
  });
  const handleCreateNew = () => {
    setSelectedUnit(null);
    setMode('create');
  };

  // Actualizar el formulario cuando cambia el modo o la unidad seleccionada
  useEffect(() => {
    if (mode === 'edit' && selectedUnit) {
      form.reset({
        simbol: selectedUnit.simbol,
        tipo: selectedUnit.tipo,
        unit: selectedUnit.unit,
      });
    } else if (mode === 'create') {
      form.reset({
        simbol: '',
        tipo: '',
        unit: '',
      });
    }
  }, [mode, selectedUnit, form]);
  const router = useRouter();

  // Función para manejar el envío del formulario
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (mode === 'create') {
        // Crear nueva unidad de medida
        const result = await createMeasureUnit(values);

        if (result.status === 200) {
          toast.success(result.body);
          form.reset();
          router.refresh();
        } else {
          toast.error(result.body);
        }
      } else if (mode === 'edit' && selectedUnit) {
        // Actualizar unidad existente
        const result = await updateMeasureUnit({ ...values, id: selectedUnit.id });

        if (result.status === 200) {
          toast.success(result.body);
          setMode('create');
          setSelectedUnit(null);
          form.reset();
          router.refresh();
        } else {
          toast.error(result.body);
        }
      }
    } catch (error) {
      console.error('Error al guardar la unidad de medida:', error);
      toast.error('Error al guardar la unidad de medida');
    }
  }

  // Función para cancelar la edición
  function handleCancel() {
    setMode('create');
    setSelectedUnit(null);
    form.reset();
  }

  return (
    <PermissionGuard module="comercial" tab="mensure_units" action={mode === 'create' ? 'create' : 'update'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-[300px]">
          <h2 className="text-xl font-bold mb-4">
            {mode === 'create' ? 'Nueva Unidad de Medida' : 'Editar Unidad de Medida'}
          </h2>
          <FormField
            control={form.control}
            name="simbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Símbolo</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: kg, m, l" {...field} maxLength={5} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Peso, Longitud, Volumen" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Kilogramo, Metro, Litro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button type="submit">{mode === 'create' ? 'Crear' : 'Actualizar'}</Button>
            {mode === 'edit' && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Form>
    </PermissionGuard>
  );
}

export default MensureUnitsForm;
