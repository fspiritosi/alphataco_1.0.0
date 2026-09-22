'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createMeasureUnit, updateMeasureUnit, type MeasureUnitRow } from '../../actions/measure-units.server';
import { measureUnitFormSchema, type MeasureUnitFormValues } from '../../schemas/measure-unit';

const logger = new Logger('features/Empresa/Clientes/MensureUnitsForm');

interface MensureUnitsFormProps {
  selectedUnit: MeasureUnitRow | null;
  setSelectedUnit: (unit: MeasureUnitRow | null) => void;
  mode: 'create' | 'edit';
  setMode: (mode: 'create' | 'edit') => void;
}

const EMPTY_VALUES: MeasureUnitFormValues = { simbol: '', tipo: '', unit: '' };

function MensureUnitsForm({ selectedUnit, setSelectedUnit, mode, setMode }: MensureUnitsFormProps) {
  const form = useForm<MeasureUnitFormValues>({
    resolver: zodResolver(measureUnitFormSchema),
    defaultValues: EMPTY_VALUES,
  });
  const { reset } = form;
  const router = useRouter();

  // El modo/unidad seleccionada llegan por props desde la tabla: sincronizar el form con ellos.
  useEffect(() => {
    if (mode === 'edit' && selectedUnit) {
      reset({ simbol: selectedUnit.simbol, tipo: selectedUnit.tipo, unit: selectedUnit.unit });
    } else {
      reset(EMPTY_VALUES);
    }
  }, [mode, selectedUnit, reset]);

  async function onSubmit(values: MeasureUnitFormValues) {
    try {
      const result =
        mode === 'edit' && selectedUnit ? await updateMeasureUnit(selectedUnit.id, values) : await createMeasureUnit(values);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === 'edit' ? 'Unidad de medida actualizada correctamente' : 'Unidad de medida creada correctamente');
      setMode('create');
      setSelectedUnit(null);
      reset(EMPTY_VALUES);
      router.refresh();
    } catch (error) {
      logger.error('Error al guardar la unidad de medida', { data: { error } });
      toast.error('Error al guardar la unidad de medida');
    }
  }

  function handleCancel() {
    setMode('create');
    setSelectedUnit(null);
    reset(EMPTY_VALUES);
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
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {mode === 'create' ? 'Crear' : 'Actualizar'}
            </Button>
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
