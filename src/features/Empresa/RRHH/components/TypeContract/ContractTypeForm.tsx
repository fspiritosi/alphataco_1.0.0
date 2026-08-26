'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Logger } from '@/lib/logger';
import { supabaseBrowser } from '@/lib/supabase/browser';
import DependencyValidationModal, { DependencyConfig } from '@/shared/components/modal/DependencyValidationModal';
import { fetchDependenciesForValue, fetchReplacementOptions } from '@/shared/components/modal/dependency-utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createContractType, updateContractType } from '../../actions/actions';

const logger = new Logger('features/Empresa/RRHH');

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
  const [showDependencyModal, setShowDependencyModal] = useState(false);

  // Función de fetch que usará el Modal (tipado genérico reutilizable basado en la utilidad)
  const fetchDependencies = async (config: DependencyConfig, recordKeyValue: string) => {
    // Solicitamos solo las columnas que se van a mostrar
    const select = config.displayColumns.join(',') as '*';

    const data = await fetchDependenciesForValue<'employees', 'type_of_contract'>({
      targetTable: 'employees',
      targetColumn: 'type_of_contract',
      value: recordKeyValue,
      select,
      limit: 10,
    });

    return data;
  };

  // Configuración reutilizable para validar dependencias de types_of_contract
  const dependencyConfigs = useMemo<DependencyConfig[]>(
    () => [
      {
        sourceTable: 'types_of_contract',
        sourceColumn: 'name',
        targetTable: 'employees',
        targetColumn: 'type_of_contract',
        displayColumns: ['lastname', 'firstname', 'cuil', 'file'],
        displayLabels: ['Apellido', 'Nombre', 'Documento', 'Legajo'],
        relationName: 'Empleados',
      },
    ],
    []
  );

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
    await toast
      .promise(
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
          error: () => {
            return 'Error al crear el tipo de contrato';
          },
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      });
  };

  const onUpdate = async (values: z.infer<typeof ContractTypeSchema>) => {
    await toast
      .promise(
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
          error: () => {
            return 'Error al actualizar el tipo de contrato';
          },
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      });
  };

  const handleSubmit = async (values: z.infer<typeof ContractTypeSchema>) => {
    if (isEditing && editingContractType) {
      const prevActive = !!editingContractType.is_active;
      const nextActive = values.is_active === 'true';

      // Si se intenta cambiar a inactivo y el valor es diferente, abrir modal de dependencias
      if (prevActive && !nextActive) {
        //Awaite del fetch de dependencias
        const data = await fetchDependencies(dependencyConfigs[0], editingContractType.id);

        if (data.data.length) {
          setShowDependencyModal(true);
          return; // No ejecutar update aún, el modal decidirá
        }
      }
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

  // Opciones de reemplazo: traer valores activos de la tabla origen (types_of_contract)
  // Nota: Para este caso, usamos la columna por defecto 'is_active'. Si en otras tablas cambia, podemos generalizar luego.

  const handleDependencyConfirm = async (action: 'force' | 'replace', replacementValue?: string) => {
    setShowDependencyModal(false);

    if (!editingContractType) return;

    // Confirmación sin reemplazo: solo desactivar el registro
    if (action === 'force') {
      const values = form.getValues();
      await onUpdate(values);
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
          .eq(dependencyConfigs[0].targetColumn, editingContractType.id);

        // Ahora sí, desactivar el registro actual
        const values = form.getValues();
        await onUpdate(values);
      } catch (err) {
        logger.error('Error al reemplazar referencias', { data: { error: err } });
        toast.error('No se pudieron reemplazar las referencias');
      }
    }
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
          <Button variant="gh_orange" type="submit" disabled={form.formState.isSubmitting}>
            {isEditing ? 'Actualizar' : 'Crear'}
          </Button>
          {isEditing && (
            <Button type="button" onClick={handleCancel} variant="outline">
              Cancelar
            </Button>
          )}
        </div>
      </form>

      {/* Modal de validación de dependencias reutilizable */}
      {isEditing && editingContractType && (
        <DependencyValidationModal
          isOpen={showDependencyModal}
          onClose={() => setShowDependencyModal(false)}
          onConfirm={handleDependencyConfirm}
          recordId={editingContractType.id || ''}
          recordName={editingContractType.name || ''}
          dependencies={dependencyConfigs}
          title="Confirmar desactivación"
          description="Este tipo de contrato está siendo utilizado por otros registros. Debe resolver estas referencias antes de desactivarlo."
          fetchDependencies={fetchDependencies}
          fetchReplacementOptions={fetchReplacementOptions}
        />
      )}
    </Form>
  );
}
