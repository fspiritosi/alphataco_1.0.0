import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Logger } from '@/lib/logger';
import { supabaseBrowser } from '@/lib/supabase/browser';
import DependencyValidationModal, { DependencyConfig } from '@/shared/components/modal/DependencyValidationModal';
import { fetchDependenciesForValue, fetchReplacementOptions } from '@/shared/components/modal/dependency-utils';
import { Position } from '@/shared/types/legacy';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createPosition, updatePosition } from '../../actions/actions';

const logger = new Logger('features/Empresa/RRHH');
const PositionSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }),
  is_active: z.boolean(),
  hierarchical_position_id: z.array(z.string()).optional(),
  aptitudes_tecnicas_id: z.array(z.string()).optional(),
});

interface PositionFormValues extends z.infer<typeof PositionSchema> {
  aptitudes_tecnicas_id: string[];
}

interface PositionsFormProps {
  position: Position | null;
  hierarchicalData: any[];
  aptitudes: any[];
  mode: 'create' | 'edit';
  setMode: (mode: 'create' | 'edit') => void;
}

function PositionsForm({ position, hierarchicalData, aptitudes, mode, setMode }: PositionsFormProps) {
  const initialData = position;
  const isEditing = mode === 'edit';
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const form = useForm<PositionFormValues>({
    resolver: zodResolver(PositionSchema),
    defaultValues: {
      name: position?.name || '',
      is_active: position?.is_active ?? true,
      hierarchical_position_id: position?.hierarchical_position_id || [],
      aptitudes_tecnicas_id: position?.aptitudes_tecnicas_id || [],
    },
  });

  const { reset } = form;
  const router = useRouter();
  useEffect(() => {
    if (position) {
      form.reset({
        name: position.name || '',
        is_active: position.is_active ?? true,
        hierarchical_position_id: position.hierarchical_position_id
          ? Array.isArray(position.hierarchical_position_id)
            ? position.hierarchical_position_id
            : [position.hierarchical_position_id]
          : [],
        aptitudes_tecnicas_id: position.aptitudes_tecnicas_id || [],
      });
      setMode('edit');
    } else {
      form.reset({
        name: '',
        is_active: true,
        hierarchical_position_id: [],
        aptitudes_tecnicas_id: [],
      });
      setMode('create');
    }
  }, [position, form, setMode]);

  const handleSubmit = async (values: PositionFormValues) => {
    try {
      if (!position) {
        await createPosition({
          name: values.name,
          is_active: values.is_active,
          hierarchical_position_id: values.hierarchical_position_id || [],
          aptitudes_tecnicas_id: values.aptitudes_tecnicas_id || [],
        });
        toast.success('Posición creada con éxito');
        router.refresh();
        reset();
        setMode('create');
      } else {
        const prevActive = !!position.is_active;
        const nextActive = values.is_active;

        // Si se intenta cambiar a inactivo y el valor es diferente, abrir modal de dependencias
        if (prevActive && !nextActive) {
          //Awaite del fetch de dependencias
          const data = await fetchDependencies(dependencyConfigs[0], position.id!);

          if (data.data.length) {
            setShowDependencyModal(true);
            return; // No ejecutar update aún, el modal decidirá
          }
        }

        await updatePosition({
          ...values,
          id: position?.id || '',
          hierarchical_position_id: values.hierarchical_position_id || [],
          aptitudes_tecnicas_id: values.aptitudes_tecnicas_id || [],
        });
        toast.success('Posición actualizada con éxito');
        router.refresh();
        reset();
        setMode('create');
      }
    } catch (error) {
      toast.error('Error al crear o actualizar la posición');
      logger.error('Error al crear o actualizar la posición', { data: { error } });
    }
  };

  const handleCancel = () => {
    reset();
    setMode('create');
    form.reset({
      name: '',
      is_active: true,
      hierarchical_position_id: [],
      aptitudes_tecnicas_id: [],
    });
  };

  const hierarchicalDataFormatted = hierarchicalData.map((item) => ({
    label: item.name,
    value: item.id,
  }));
  const fetchDependencies = async (config: DependencyConfig, recordKeyValue: string) => {
    // Solicitamos solo las columnas que se van a mostrar
    const select = config.displayColumns.join(',') as '*';

    const data = await fetchDependenciesForValue<'employees', 'company_position'>({
      targetTable: 'employees',
      targetColumn: 'company_position',
      value: recordKeyValue,
      select,
      limit: 10,
    });

    return data;
  };

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

  const handleDependencyConfirm = async (action: 'force' | 'replace', replacementValue?: string) => {
    setShowDependencyModal(false);

    if (!initialData?.id) return;

    // Confirmación sin reemplazo: solo desactivar el registro
    if (action === 'force') {
      const values = form.getValues();
      await handleSubmit(values);
      return;
    }

    // Reemplazo masivo y luego desactivar
    if (action === 'replace') {
      try {
        const supabase = supabaseBrowser();
        const { error } = await supabase
          .from(dependencyConfigs[0].targetTable as keyof Database['public']['Tables'])
          .update({
            [dependencyConfigs[0].targetColumn]: replacementValue !== '__NULL__' ? replacementValue : null,
          } as any)
          .eq(dependencyConfigs[0].targetColumn, initialData.id);

        if (error) {
          logger.error('Error al reemplazar referencias en positions', { data: { error } });
        }

        // Ahora sí, desactivar el registro actual
        const values = form.getValues();
        await handleSubmit(values);
        // if (onSuccess) onSuccess();
      } catch (err) {
        logger.error('Error al reemplazar referencias', { data: { error: err } });
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 w-[300px]">
        <h2 className="text-xl font-bold mb-4">{mode === 'edit' ? 'Editar Posición' : 'Crear Posición'}</h2>

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
                  options={hierarchicalDataFormatted}
                  emptyMessage="No hay posiciones"
                  selectedValues={field.value || []}
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
                  options={aptitudes.map((apt) => ({
                    value: apt.id,
                    label: apt.nombre,
                  }))}
                  emptyMessage="No hay aptitudes disponibles"
                  selectedValues={field.value || []}
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
          <Button variant="gh_orange" type="submit">
            {mode === 'edit' ? 'Actualizar' : 'Crear'}
          </Button>
          {mode === 'edit' ? (
            <Button type="button" onClick={handleCancel} variant="outline">
              Cancelar
            </Button>
          ) : (
            <Button type="button" onClick={handleCancel} variant="outline">
              Limpiar
            </Button>
          )}
        </div>
      </form>
      {/* Modal de validación de dependencias reutilizable */}
      {isEditing && initialData && (
        <DependencyValidationModal
          isOpen={showDependencyModal}
          onClose={() => setShowDependencyModal(false)}
          onConfirm={handleDependencyConfirm}
          recordId={initialData.id || ''}
          recordName={initialData.name || ''}
          dependencies={dependencyConfigs}
          title="Confirmar desactivación"
          description="Esta posición está siendo utilizado por otros registros. Debe resolver estas referencias antes de desactivarlo."
          fetchDependencies={fetchDependencies}
          fetchReplacementOptions={fetchReplacementOptions}
        />
      )}
    </Form>
    // </div>
  );
}

export default PositionsForm;
