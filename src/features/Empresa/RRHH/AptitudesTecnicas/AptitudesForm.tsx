'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createAptitudTecnicaPrisma, updateAptitudTecnicaPrisma, type CompanyPositionOption } from './actions.server';
import { useAptitudesStore } from './store/aptitudes.store';

// ============================================================================
// SCHEMA
// ============================================================================

const AptitudSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  puestos: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

type AptitudFormValues = z.infer<typeof AptitudSchema>;

// ============================================================================
// PROPS
// ============================================================================

interface AptitudesFormProps {
  positions: CompanyPositionOption[];
  queryKey: readonly string[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AptitudesForm({ positions, queryKey }: AptitudesFormProps) {
  const editingAptitud = useAptitudesStore((state) => state.aptitud);
  const setAptitud = useAptitudesStore((state) => state.setAptitud);
  const queryClient = useQueryClient();

  const isEditing = !!editingAptitud;

  const form = useForm<AptitudFormValues>({
    resolver: zodResolver(AptitudSchema),
    defaultValues: {
      nombre: '',
      puestos: [],
      is_active: true,
    },
  });

  // Sincronizar form cuando cambia el item a editar (store externo — useEffect válido)
  useEffect(() => {
    if (editingAptitud) {
      const puestosIds = editingAptitud.aptitudes_tecnicas_puestos.map((p) => p.puesto_id);
      form.reset({
        id: editingAptitud.id,
        nombre: editingAptitud.nombre,
        puestos: puestosIds,
        is_active: editingAptitud.is_active ?? true,
      });
    } else {
      form.reset({ id: undefined, nombre: '', puestos: [], is_active: true });
    }
  }, [editingAptitud, form]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setAptitud(null);
    form.reset({ id: undefined, nombre: '', puestos: [], is_active: true });
  };

  const invalidateTable = () => {
    queryClient.invalidateQueries({ queryKey: [...queryKey] });
  };

  // ── Submit handlers ────────────────────────────────────────────────────────

  const handleCreate = async (values: AptitudFormValues) => {
    toast.promise(
      createAptitudTecnicaPrisma({
        nombre: values.nombre,
        puestos: values.puestos,
        is_active: values.is_active,
      }),
      {
        loading: 'Creando aptitud técnica...',
        success: () => {
          invalidateTable();
          resetForm();
          return 'Aptitud técnica creada correctamente';
        },
        error: 'Error al crear la aptitud técnica',
      }
    );
  };

  const handleUpdate = async (values: AptitudFormValues) => {
    if (!values.id) return;
    toast.promise(
      updateAptitudTecnicaPrisma({
        id: values.id,
        nombre: values.nombre,
        puestos: values.puestos,
        is_active: values.is_active,
      }),
      {
        loading: 'Actualizando aptitud técnica...',
        success: () => {
          invalidateTable();
          resetForm();
          return 'Aptitud técnica actualizada correctamente';
        },
        error: 'Error al actualizar la aptitud técnica',
      }
    );
  };

  const handleSubmit = (values: AptitudFormValues) => {
    if (isEditing) {
      handleUpdate(values);
    } else {
      handleCreate(values);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 px-2">
        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar Aptitud Técnica' : 'Crear Aptitud Técnica'}</h2>

        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  {...field}
                  className="input w-full max-w-[400px]"
                  placeholder="Nombre de la aptitud"
                  disabled={form.formState.isSubmitting}
                />
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
                    label: p.name ?? '',
                    value: p.id,
                  }))}
                  selectedValues={field.value}
                  onChange={(selected) => field.onChange(selected)}
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
              <FormLabel>Estado</FormLabel>
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
          <Button type="submit" variant="gh_orange" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? isEditing
                ? 'Actualizando...'
                : 'Creando...'
              : isEditing
                ? 'Actualizar'
                : 'Crear'}
          </Button>
          {isEditing && (
            <Button type="button" onClick={resetForm} variant="outline" disabled={form.formState.isSubmitting}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
