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
import { Logger } from '@/lib/logger';
import {
  fetchDependenciesForValue,
  fetchReplacementOptions,
  reassignDependencies,
} from '@/shared/components/modal/dependency-utils';
import DependencyValidationModal, { DependencyConfig } from '@/shared/components/modal/DependencyValidationModal';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import {
  createWorkDiagramPrisma,
  updateWorkDiagramPrisma,
  type DiagramTypeItem,
  type WorkDiagramListItem,
} from '../WorkDiagrams/actions.server';

const logger = new Logger('features/Empresa/RRHH');
// Actualizar el esquema para eliminar el campo days
const WorkDiagramSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  is_active: z.boolean(),
  active_working_days: z.number().int().min(0, {
    message: 'Active days must be a positive number.',
  }),
  active_novelty: z.array(z.string()).optional(),
  inactive_working_days: z.number().int().min(0, {
    message: 'Inactive days must be a positive number.',
  }),
  inactive_novelty: z.string().optional(),
});

type WorkDiagramFormValues = z.infer<typeof WorkDiagramSchema>;

interface WorkDiagramFormProps {
  diagram?: WorkDiagramListItem | null;
  mode: 'create' | 'edit';
  diagramsTypes?: DiagramTypeItem[] | null;
  setMode: React.Dispatch<React.SetStateAction<'create' | 'edit'>>;
}

export default function WorkDiagramForm({ diagramsTypes, diagram, mode, setMode }: WorkDiagramFormProps) {
  const [showDependencyModal, setShowDependencyModal] = useState(false);

  // Configuración reutilizable para validar dependencias de types_of_contract
  const dependencyConfigs = useMemo<DependencyConfig[]>(
    () => [
      {
        sourceTable: 'work_diagram',
        sourceColumn: 'name',

        targetTable: 'employees',
        targetColumn: 'workflow_diagram',

        displayColumns: ['lastname', 'firstname', 'cuil', 'file'],
        displayLabels: ['Apellido', 'Nombre', 'Documento', 'Legajo'],
        relationName: 'Empleados',
      },
    ],
    []
  );

  const form = useForm<WorkDiagramFormValues>({
    resolver: zodResolver(WorkDiagramSchema),
    defaultValues: {
      name: diagram?.name || '',
      is_active: diagram?.is_active ?? true,
      active_working_days: diagram?.active_working_days || 0,
      inactive_working_days: diagram?.inactive_working_days || 0,
      active_novelty: diagram?.work_diagram_active_novelties?.map((n) => n.diagram_type.id) ?? [],
      inactive_novelty: diagram?.inactive_novelty ?? '',
    },
  });
  const { reset } = form;
  const router = useRouter();
  const fixedOptions =
    diagramsTypes
      ?.filter((opt) => opt.work_active)
      .map((opt) => ({
        value: opt.id,
        label: opt.name ?? 'Sin nombre',
      })) || [];

  // Función de fetch que usará el Modal (tipado genérico reutilizable basado en la utilidad)
  const fetchDependencies = async (config: DependencyConfig, recordKeyValue: string) => {
    // Solicitamos solo las columnas que se van a mostrar
    const select = config.displayColumns.join(',') as '*';

    const data = await fetchDependenciesForValue<'employees', 'workflow_diagram'>({
      targetTable: 'employees',
      targetColumn: 'workflow_diagram',
      value: recordKeyValue,
      select,
      limit: 10,
    });

    return data;
  };

  const handleDependencyConfirm = async (action: 'force' | 'replace', replacementValue?: string) => {
    setShowDependencyModal(false);

    if (!diagram) return;

    // Confirmación sin reemplazo: solo desactivar el registro
    if (action === 'force') {
      const values = form.getValues();
      await onUpdate(values);
      return;
    }

    // Reemplazo masivo y luego desactivar
    if (action === 'replace') {
      try {
        await reassignDependencies({
          targetTable: 'employees',
          targetColumn: dependencyConfigs[0].targetColumn,
          fromValue: diagram.id,
          toValue: replacementValue && replacementValue !== '__NULL__' ? replacementValue : null,
        });

        // Ahora sí, desactivar el registro actual
        const values = form.getValues();
        await onUpdate(values);
      } catch (err) {
        logger.error('Error al reemplazar referencias', { data: { error: err } });
        toast.error('No se pudieron reemplazar las referencias');
      }
    }
  };

  useEffect(() => {
    if (diagram) {
      // Extraer los IDs de las novedades activas
      const activeNoveltyIds = diagram.work_diagram_active_novelties?.map((n) => n.diagram_type.id) ?? [];

      form.reset({
        name: diagram.name ?? '',
        is_active: diagram.is_active ?? true,
        active_working_days: diagram.active_working_days ?? 0,
        inactive_working_days: diagram.inactive_working_days ?? 0,
        active_novelty: activeNoveltyIds,
        inactive_novelty: diagram.inactive_novelty ?? '',
      });
    }
  }, [diagram]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values: z.infer<typeof WorkDiagramSchema>) => {
    toast.promise(
      async () => {
        await createWorkDiagramPrisma({
          name: values.name,
          is_active: values.is_active,
          active_working_days: values.active_working_days,
          inactive_working_days: values.inactive_working_days,
          active_novelty: values.active_novelty || [],
          inactive_novelty: values.inactive_novelty || '',
        });
      },
      {
        loading: 'Creando diagrama...',
        success: () => {
          router.refresh();
          reset();
          return 'Diagrama creado correctamente';
        },
        error: () => 'Error al crear el diagrama',
      }
    );
  };
  const onUpdate = async (values: z.infer<typeof WorkDiagramSchema>) => {
    if (mode === 'edit' && diagram) {
      const prevActive = !!diagram.is_active;
      const nextActive = values.is_active;

      // Si se intenta cambiar a inactivo y el valor es diferente, abrir modal de dependencias
      if (prevActive && !nextActive) {
        //Awaite del fetch de dependencias
        const data = await fetchDependencies(dependencyConfigs[0], diagram.id);

        if (data.data.length) {
          setShowDependencyModal(true);
          return; // No ejecutar update aún, el modal decidirá
        }
      }
      toast.promise(
        async () => {
          if (!diagram?.id) {
            toast.error('No diagram ID found');
            return;
          }
          await updateWorkDiagramPrisma({
            id: diagram?.id,
            name: values.name,
            is_active: values.is_active,
            active_working_days: values.active_working_days,
            inactive_working_days: values.inactive_working_days,
            active_novelty: values.active_novelty || [],
            inactive_novelty: values.inactive_novelty || '',
          });
        },
        {
          loading: 'Actualizando diagrama...',
          success: () => {
            router.refresh();
            reset();
            return 'Diagrama actualizado correctamente';
          },
          error: () => 'Error al actualizar el diagrama',
        }
      );
    } else {
      toast.promise(
        async () => {
          if (!diagram?.id) {
            toast.error('No diagram ID found');
            return;
          }
          await updateWorkDiagramPrisma({
            id: diagram?.id,
            name: values.name,
            is_active: values.is_active,
            active_working_days: values.active_working_days,
            inactive_working_days: values.inactive_working_days,
            active_novelty: values.active_novelty || [],
            inactive_novelty: values.inactive_novelty || '',
          });
        },
        {
          loading: 'Actualizando diagrama...',
          success: () => {
            router.refresh();
            reset();
            return 'Diagrama actualizado correctamente';
          },
          error: () => 'Error al actualizar el diagrama',
        }
      );
    }
  };
  const onCancel = () => {
    form.reset({
      name: '',
      is_active: false,
      active_working_days: 0,
      inactive_working_days: 0,
      active_novelty: [],
      inactive_novelty: '',
    });
    setMode('create');
  };

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(mode === 'edit' ? onUpdate : onSubmit)}
          className="space-y-4 py-4 px-2 max-w-md"
        >
          <h2 className="text-xl font-bold mb-4">{mode === 'edit' ? 'Editar Diagrama' : 'Crear Diagrama'}</h2>

          {/* Nombre */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del diagrama</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del diagrama" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estado */}
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'true')}
                  value={field.value ? 'true' : 'false'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Días activos + inactivos en grid */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="active_working_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días activos</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="inactive_working_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días inactivos</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Novedad activa (multi-select) */}
          <FormField
            control={form.control}
            name="active_novelty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Novedad activa</FormLabel>
                <FormControl>
                  <MultiSelectCombobox
                    options={fixedOptions}
                    selectedValues={Array.isArray(field.value) ? field.value : []}
                    onChange={(selected) => field.onChange(selected)}
                    placeholder="Seleccionar novedades"
                    emptyMessage="No hay novedades disponibles"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Novedad inactiva (select simple) */}
          <FormField
            control={form.control}
            name="inactive_novelty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Novedad inactiva</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar novedad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Novedad</SelectLabel>
                        {diagramsTypes
                          ?.filter((diagramType) => !diagramType.work_active)
                          .map((diagramType) => (
                            <SelectItem key={diagramType.id} value={diagramType.id}>
                              {diagramType.name}
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

          <div className="flex gap-2 mt-6">
            <Button type="submit" variant="gh_orange" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? mode === 'edit'
                  ? 'Actualizando...'
                  : 'Creando...'
                : mode === 'edit'
                  ? 'Actualizar'
                  : 'Crear'}
            </Button>
            {mode === 'edit' && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>

        {/* Modal de validación de dependencias reutilizable */}
        {mode === 'edit' && diagram && (
          <DependencyValidationModal
            isOpen={showDependencyModal}
            onClose={() => setShowDependencyModal(false)}
            onConfirm={handleDependencyConfirm}
            recordId={diagram.id || ''}
            recordName={diagram.name || ''}
            dependencies={dependencyConfigs}
            title="Confirmar desactivación"
            description="Este tipo de contrato está siendo utilizado por otros registros. Debe resolver estas referencias antes de desactivarlo."
            fetchDependencies={fetchDependencies}
            fetchReplacementOptions={fetchReplacementOptions}
          />
        )}
      </Form>
    </div>
  );
}
