'use client';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createWorkDiagram, updateWorkDiagram } from '@/features/Empresa/RRHH/actions/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
// Actualizar el esquema para eliminar el campo days
const WorkDiagramSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  is_active: z.boolean(),
  active_working_days: z.number().int().min(0, {
    message: 'Active days must be a positive number.',
  }),
  active_novelty: z.string().optional(),
  inactive_working_days: z.number().int().min(0, {
    message: 'Inactive days must be a positive number.',
  }),
  inactive_novelty: z.string().optional(),
});

// interface DiagramType {
//   id: string;
//   created_at: string;
//   name: string;
//   company_id: string;
//   color: string;
//   short_description: string;
//   work_active: boolean;
// }

type WorkDiagramFormValues = z.infer<typeof WorkDiagramSchema>;

interface WorkDiagramFormProps {
  diagram?: any | null;
  mode: 'create' | 'edit';
  diagramsTypes?: DiagramType[] | null;
  setMode: React.Dispatch<React.SetStateAction<'create' | 'edit'>>;
}

export default function WorkDiagramForm({ diagramsTypes, diagram, mode, setMode }: WorkDiagramFormProps) {
  const form = useForm<WorkDiagramFormValues>({
    resolver: zodResolver(WorkDiagramSchema),
    defaultValues: {
      name: diagram?.name || '',
      is_active: diagram?.is_active ?? true,
      active_working_days: diagram?.active_working_days || 0,
      inactive_working_days: diagram?.inactive_working_days || 0,
      active_novelty: diagram?.active_novelty?.id || '',
      inactive_novelty: diagram?.inactive_novelty?.id || '',
    },
  });
  const { reset } = form;
  const router = useRouter();

  console.log(diagram, 'diagram');
  console.log(diagramsTypes, 'diagramsTypes');

  const isViewMode = false;

  useEffect(() => {
    if (diagram && diagramsTypes) {
      form.reset({
        name: diagram.name,
        is_active: diagram.is_active,
        active_working_days: diagram.active_working_days,
        inactive_working_days: diagram.inactive_working_days,
        active_novelty: diagram.active_novelty?.id || '',
        inactive_novelty: diagram.inactive_novelty?.id || '',
      });
    }
  }, [diagram, diagramsTypes, form]);

  const onSubmit = async (values: z.infer<typeof WorkDiagramSchema>) => {
    toast.promise(
      async () => {
        await createWorkDiagram({
          name: values.name,
          is_active: values.is_active,
          active_working_days: values.active_working_days,
          inactive_working_days: values.inactive_working_days,
          active_novelty: values.active_novelty || '',
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
        error: (error) => {
          return 'Error al crear el diagrama';
        },
      }
    );
  };
  const onUpdate = async (values: z.infer<typeof WorkDiagramSchema>) => {
    toast.promise(
      async () => {
        if (!diagram?.id) {
          toast.error('No diagram ID found');
          return;
        }
        await updateWorkDiagram({
          id: diagram?.id,
          name: values.name,
          is_active: values.is_active,
          active_working_days: values.active_working_days,
          inactive_working_days: values.inactive_working_days,
          active_novelty: values.active_novelty || '',
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
        error: (error) => {
          return 'Error al actualizar el diagrama';
        },
      }
    );
  };
  const onCancel = () => {
    form.reset({
      name: '',
      is_active: false,
      active_working_days: 0,
      inactive_working_days: 0,
      active_novelty: '',
      inactive_novelty: '',
    });
    setMode('create');
  };

  return (
    <div className="w-full ">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(mode === 'edit' ? onUpdate : onSubmit)} className="space-y-8 w-[400px]">
          <h2 className="text-xl font-bold mb-4">{mode === 'edit' ? 'Editar Diagrama' : 'Crear Diagrama'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter diagram name" {...field} disabled={isViewMode} className="w-[180px]" />
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
                    disabled={isViewMode}
                  >
                    <FormControl>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select status" />
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

            {/* Días activos */}
            <FormField
              control={form.control}
              name="active_working_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días activos continuos</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      disabled={isViewMode}
                      className="w-[180px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active_novelty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novedad Activa</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isViewMode}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Tipo de Novedad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Novedad</SelectLabel>
                          {diagramsTypes
                            ?.filter((diagramType) => diagramType.work_active)
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

            {/* Días inactivos */}
            <FormField
              control={form.control}
              name="inactive_working_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días inactivos continuos</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      disabled={isViewMode}
                      className="w-[180px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="inactive_novelty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novedad Inactiva</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isViewMode}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Tipo de Novedad" />
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
            {/* <Button type="button" variant="outline" className="w-[180px]" onClick={onCancel}>
              {isViewMode ? 'Cerrar' : 'Cancelar'}
            </Button> */}
          </div>
          <div className="flex justify-start mt-4 space-x-4">
            {!isViewMode && (
              <Button type="submit" variant="gh_orange">
                {mode === 'edit' ? 'Actualizar' : 'Crear'}
              </Button>
            )}
            {mode === 'edit' && (
              <Button type="button" variant="outline" className="flex space-x-2" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
