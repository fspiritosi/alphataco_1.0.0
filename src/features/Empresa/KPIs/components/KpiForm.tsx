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
import { createKPI, updateKPI } from '../actions/actions';
import { useKpiStore } from '../store/kpi.store';

const KpiSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: 'Debe ingresar el nombre del KPI' }),
  validity_date: z.string().min(1, { message: 'Debe ingresar la fecha de vigencia' }),
  calculation_formula: z.string().min(1, { message: 'Debe ingresar la fórmula de cálculo' }),
  improvement_opportunities: z.string().optional(),
  is_active: z.boolean().optional(),
});

export function KpiForm() {
  const editingKpi = useKpiStore((state) => state.kpi);
  const form = useForm<z.infer<typeof KpiSchema>>({
    resolver: zodResolver(KpiSchema),
    defaultValues: {
      name: '',
      validity_date: '',
      calculation_formula: '',
      improvement_opportunities: '',
      is_active: true,
    },
  });

  const { reset } = form;
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!!editingKpi);

  useEffect(() => {
    if (editingKpi) {
      reset({
        id: editingKpi.id,
        name: editingKpi.name,
        validity_date: editingKpi.validity_date,
        calculation_formula: editingKpi.calculation_formula,
        improvement_opportunities: editingKpi.improvement_opportunities || '',
        is_active: editingKpi.is_active ?? true,
      });
      setIsEditing(true);
    } else {
      reset({
        id: '',
        name: '',
        validity_date: '',
        calculation_formula: '',
        improvement_opportunities: '',
        is_active: true,
      });
      setIsEditing(false);
    }
  }, [editingKpi, reset]);

  const onSubmit = async (values: z.infer<typeof KpiSchema>) => {
    toast.promise(
      async () => {
        const result = await createKPI({
          name: values.name,
          validity_date: values.validity_date,
          calculation_formula: values.calculation_formula,
          is_active: values.is_active ?? true,
        });
        if (result.error) throw result.error;
        return result;
      },
      {
        loading: 'Creando KPI...',
        success: () => {
          router.refresh();
          resetForm();
          return 'KPI creado correctamente';
        },
        error: (error) => {
          return error?.message || 'Error al crear el KPI';
        },
      }
    );
  };

  const onUpdate = async (values: z.infer<typeof KpiSchema>) => {
    toast.promise(
      async () => {
        const result = await updateKPI({
          id: values.id!,
          name: values.name,
          calculation_formula: values.calculation_formula,
          improvement_opportunities: values.improvement_opportunities || undefined,
          is_active: values.is_active ?? true,
        });
        if (result.error) throw result.error;
        return result;
      },
      {
        loading: 'Actualizando KPI...',
        success: () => {
          router.refresh();
          resetForm();
          return 'KPI actualizado correctamente';
        },
        error: (error) => {
          return error?.message || 'Error al actualizar el KPI';
        },
      }
    );
  };

  const handleSubmit = (values: z.infer<typeof KpiSchema>) => {
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
      validity_date: '',
      calculation_formula: '',
      improvement_opportunities: '',
      is_active: true,
    });
    setIsEditing(false);
    useKpiStore.getState().setKpi(null);
  };

  const handleCancel = () => {
    resetForm();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 px-4">
        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar KPI' : 'Crear KPI'}</h2>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del KPI</FormLabel>
              <FormControl>
                <Input type="text" {...field} className="input w-full" placeholder="Nombre del KPI" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing && (
          <FormField
            control={form.control}
            name="validity_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Vigencia</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="input w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="calculation_formula"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fórmula de Cálculo</FormLabel>
              <FormControl>
                <Textarea {...field} className="input w-full min-h-[100px]" placeholder="Fórmula de cálculo" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEditing && (
          <FormField
            control={form.control}
            name="improvement_opportunities"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Oportunidades de Mejora</FormLabel>
                <FormControl>
                  <Textarea {...field} className="input w-full min-h-[80px]" placeholder="Oportunidades de mejora" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
                  className="flex space-x-1"
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
