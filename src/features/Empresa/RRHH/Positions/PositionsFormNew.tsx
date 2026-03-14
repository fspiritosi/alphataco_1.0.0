'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import DependencyValidationModal, { type DependencyConfig } from '@/shared/components/modal/DependencyValidationModal';
import { fetchDependenciesForValue, fetchReplacementOptions } from '@/shared/components/modal/dependency-utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  createPositionPrisma,
  getAllAptitudesForForm,
  getAllHierarchiesForForm,
  updatePositionPrisma,
  type PositionListItem,
} from './actions.server';

// ============================================================================
// SCHEMA
// ============================================================================

const PositionSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }),
  is_active: z.boolean(),
  hierarchical_position_id: z.array(z.string()).optional(),
  aptitudes_tecnicas_id: z.array(z.string()).optional(),
});

type PositionFormValues = z.infer<typeof PositionSchema>;

// ============================================================================
// PROPS
// ============================================================================

interface PositionsFormNewProps {
  selectedPosition: PositionListItem | null;
  onDone: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PositionsFormNew({ selectedPosition, onDone }: PositionsFormNewProps) {
  const queryClient = useQueryClient();
  const isEditing = selectedPosition !== null;
  const [showDependencyModal, setShowDependencyModal] = useState(false);

  // ── Catálogos (lazy-load on demand) ──────────────────────────────────────
  const { data: hierarchies = [] } = useQuery({
    queryKey: ['hierarchies-for-form'],
    queryFn: getAllHierarchiesForForm,
    staleTime: 5 * 60 * 1000,
  });

  const { data: aptitudes = [] } = useQuery({
    queryKey: ['aptitudes-for-form'],
    queryFn: getAllAptitudesForForm,
    staleTime: 5 * 60 * 1000,
  });

  // ── Formulario ────────────────────────────────────────────────────────────
  const form = useForm<PositionFormValues>({
    resolver: zodResolver(PositionSchema),
    defaultValues: {
      name: '',
      is_active: true,
      hierarchical_position_id: [],
      aptitudes_tecnicas_id: [],
    },
  });

  // Sincronizar form cuando cambia la posición seleccionada para editar
  useEffect(() => {
    if (selectedPosition) {
      form.reset({
        name: selectedPosition.name ?? '',
        is_active: selectedPosition.is_active ?? true,
        hierarchical_position_id: selectedPosition.hierarchical_position_id ?? [],
        aptitudes_tecnicas_id: selectedPosition.aptitudes_tecnicas_puestos.map((rel) => rel.aptitudes_tecnicas.id),
      });
    } else {
      form.reset({
        name: '',
        is_active: true,
        hierarchical_position_id: [],
        aptitudes_tecnicas_id: [],
      });
    }
  }, [selectedPosition, form]);

  // ── Dependency modal config ───────────────────────────────────────────────
  const dependencyConfigs = useMemo<DependencyConfig[]>(
    () => [
      {
        sourceTable: 'company_positions',
        sourceColumn: 'name',
        targetTable: 'employees',
        targetColumn: 'company_position',
        displayColumns: ['lastname', 'firstname', 'cuil', 'file'],
        displayLabels: ['Apellido', 'Nombre', 'Documento', 'Legajo'],
        relationName: 'Empleados',
      },
    ],
    []
  );

  const fetchDependencies = async (config: DependencyConfig, recordKeyValue: string) => {
    const select = config.displayColumns.join(',') as '*';
    return fetchDependenciesForValue<'employees', 'company_position'>({
      targetTable: 'employees',
      targetColumn: 'company_position',
      value: recordKeyValue,
      select,
      limit: 10,
    });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (values: PositionFormValues) => {
    try {
      if (!isEditing) {
        await createPositionPrisma({
          name: values.name,
          is_active: values.is_active,
          hierarchical_position_id: values.hierarchical_position_id ?? [],
          aptitudes_tecnicas_id: values.aptitudes_tecnicas_id ?? [],
        });
        toast.success('Posición creada con éxito');
      } else {
        const prevActive = !!selectedPosition.is_active;
        const nextActive = values.is_active;

        // Si se intenta desactivar, verificar dependencias primero
        if (prevActive && !nextActive) {
          const data = await fetchDependencies(dependencyConfigs[0], selectedPosition.id);
          if (data.data.length > 0) {
            setShowDependencyModal(true);
            return; // El modal decidirá
          }
        }

        await updatePositionPrisma({
          id: selectedPosition.id,
          name: values.name,
          is_active: values.is_active,
          hierarchical_position_id: values.hierarchical_position_id ?? [],
          aptitudes_tecnicas_id: values.aptitudes_tecnicas_id ?? [],
        });
        toast.success('Posición actualizada con éxito');
      }

      // Invalidar queries para refrescar la tabla
      await queryClient.invalidateQueries({ queryKey: ['positions'] });

      form.reset();
      onDone();
    } catch (error) {
      toast.error('Error al guardar la posición');
    }
  };

  // ── Dependency modal handler ──────────────────────────────────────────────
  const handleDependencyConfirm = async (action: 'force' | 'replace') => {
    setShowDependencyModal(false);

    if (!selectedPosition?.id) return;

    // En ambos casos (force o replace) el modal ya procesó el reemplazo,
    // ahora ejecutamos el update de la posición
    const values = form.getValues();
    await handleSubmit(values);
  };

  const handleCancel = () => {
    form.reset();
    onDone();
  };

  // ── Formatted options ─────────────────────────────────────────────────────
  const hierarchyOptions = useMemo(() => hierarchies.map((h) => ({ label: h.name, value: h.id })), [hierarchies]);

  const aptitudeOptions = useMemo(() => aptitudes.map((apt) => ({ label: apt.nombre, value: apt.id })), [aptitudes]);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-[300px]">
          <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar Posición' : 'Crear Posición'}</h2>

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
                    options={hierarchyOptions}
                    emptyMessage="No hay sectores disponibles"
                    selectedValues={field.value ?? []}
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
                    options={aptitudeOptions}
                    emptyMessage="No hay aptitudes disponibles"
                    selectedValues={field.value ?? []}
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
            <Button variant="gh_orange" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </Button>
            <Button type="button" onClick={handleCancel} variant="outline">
              {isEditing ? 'Cancelar' : 'Limpiar'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Modal de validación de dependencias */}
      {isEditing && selectedPosition && (
        <DependencyValidationModal
          isOpen={showDependencyModal}
          onClose={() => setShowDependencyModal(false)}
          onConfirm={handleDependencyConfirm}
          recordId={selectedPosition.id}
          recordName={selectedPosition.name ?? ''}
          dependencies={dependencyConfigs}
          title="Confirmar desactivación"
          description="Esta posición está siendo utilizada por otros registros. Debe resolver estas referencias antes de desactivarla."
          fetchDependencies={fetchDependencies}
          fetchReplacementOptions={fetchReplacementOptions}
        />
      )}
    </>
  );
}
