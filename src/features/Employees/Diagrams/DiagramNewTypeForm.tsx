'use client';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  createDiagramTypePrisma,
  updateDiagramTypePrisma,
} from '@/features/Empresa/RRHH/DiagramTypes/actions.server';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

interface DiagramNewTypeFormProps {
  /** Novedad a editar (mismos campos del formulario); vacío para crear una nueva. */
  selectedDiagram?: Partial<NewDiagramType> | null;
  diagramToEdit: boolean;
  setDiagramToEdit: (value: boolean) => void;
}
export const NewDiagramType = z.object({
  name: z.string().min(1, { message: 'El nombre de la novedad no puede estar vacío' }),
  short_description: z
    .string()
    .min(1, { message: 'La descripción dorta no puede estar vacía' })
    .max(3, { message: 'La descripción corta no debe tener más de 3 caracteres' }),
  color: z.string().min(1, { message: 'Por favor selecciona un color para la novedad' }),
  id: z.string().optional(),
  work_active: z.boolean().optional(),
  is_active: z.boolean().optional(),
  computes_absenteeism: z.boolean().optional(),
});

export type NewDiagramType = z.infer<typeof NewDiagramType>;
export function DiagramNewTypeForm({ selectedDiagram, diagramToEdit, setDiagramToEdit }: DiagramNewTypeFormProps) {
  const router = useRouter();
  const form = useForm<NewDiagramType>({
    resolver: zodResolver(NewDiagramType),
    defaultValues: {
      name: '',
      short_description: '',
      color: '',
      id: '',
      work_active: false,
      is_active: false,
      computes_absenteeism: false,
    },
  });

  async function onSubmit(values: NewDiagramType) {
    values.short_description = values.short_description.toUpperCase();

    const method = diagramToEdit ? 'PUT' : 'POST';
    // const url = diagramToEdit
    //   ? `${URL}/api/employees/diagrams/tipos`
    //   : `${URL}/api/employees/diagrams/tipos?actual=${company_id}`;

    await toast
      .promise(
        async () => {
          // `computes_absenteeism` por defecto: una novedad que NO es de trabajo activo computa ausentismo.
          const payload = {
            name: values.name,
            color: values.color,
            short_description: values.short_description,
            work_active: values.work_active ?? false,
            is_active: values.is_active ?? false,
            computes_absenteeism: values.computes_absenteeism ?? !values.work_active,
          };
          if (method === 'PUT') {
            if (!values.id) throw new Error('Falta el id de la novedad a editar');
            await updateDiagramTypePrisma({ id: values.id, ...payload });
          } else {
            await createDiagramTypePrisma(payload);
          }
        },
        {
          loading: 'Cargando...',
          success: diagramToEdit
            ? `Novedad ${values.name} editada con éxito`
            : `Novedad ${values.name} cargada con éxito`,
          error: diagramToEdit ? 'No se pudo editar la novedad' : 'No se pudo crear la novedad',
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      });

    cleanForm();
    router.refresh();
  }

  function cleanForm() {
    form.reset({
      name: '',
      short_description: '',
      color: '',
      id: '',
    });
    setDiagramToEdit(false);
  }

  useEffect(() => {
    if (selectedDiagram) {
      form.reset({
        name: selectedDiagram.name || '',
        short_description: selectedDiagram.short_description || '',
        color: selectedDiagram.color || '',
        id: selectedDiagram.id || '',
        work_active: selectedDiagram.work_active || false,
        is_active: selectedDiagram.is_active !== undefined ? selectedDiagram.is_active : true,
        computes_absenteeism: selectedDiagram.computes_absenteeism ?? (!selectedDiagram.work_active ? true : false),
      });
      setDiagramToEdit(true);
    } else {
      form.reset({
        name: '',
        short_description: '',
        color: '',
        id: '',
        work_active: false,
        is_active: true, // Valor por defecto
        computes_absenteeism: false,
      });
      setDiagramToEdit(false);
    }
  }, [selectedDiagram, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-[300px]">
        <h2 className="text-xl font-bold mb-4">{diagramToEdit ? 'Editar Novedad' : 'Crear Novedad'}</h2>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la novedad</FormLabel>
              <Input placeholder="Ingresa un nombre para la novedad" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="short_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción corta</FormLabel>
              <Input placeholder="Ingresa una descripción corta, ej: TD" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between">
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <Input className=" w-20" placeholder="Elige un color" type="color" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="work_active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="work-active-switch"
                      defaultChecked={field.value}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label htmlFor="work-active-switch">Laboralmente Activo</Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Switch para ausentismo: solo aplica cuando NO es laboralmente activo */}
            <FormField
              control={form.control}
              name="computes_absenteeism"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="computes-absenteeism-switch"
                      checked={!form.watch('work_active') ? field.value : false}
                      disabled={form.watch('work_active')}
                      onCheckedChange={(checked) => {
                        // Solo permitir cambios cuando NO es laboralmente activo
                        if (!form.watch('work_active')) {
                          field.onChange(checked);
                        }
                      }}
                    />
                    <Label htmlFor="computes-absenteeism-switch">Computa para ausentismo</Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Activo</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange(value === 'true')}
                  value={field.value !== undefined ? (field.value ? 'true' : 'false') : 'true'}
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

        {!diagramToEdit ? (
          <div className="flex gap-x-4">
            <Button variant="gh_orange" className="mt-4" type="submit" disabled={form.formState.isSubmitting}>
              Crear
            </Button>
          </div>
        ) : (
          <div className="flex gap-x-4">
            <Button variant="gh_orange" className="mt-4" type="submit" disabled={form.formState.isSubmitting}>
              Actualizar
            </Button>
            <Button variant="outline" className="mt-4" type="button" onClick={() => cleanForm()}>
              Cancelar
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}

// Si tengo un boton que dice "Editar" necesito tener un boton que diga "Limpiar formulario", para que el usuario pueda limpiar el formulario y cargar uno nuevo

//si selectedDiagram tiene algo, se debe cargar el formulario con los valores de selectedDiagram
//si selectedDiagram no tiene nada, se debe cargar el formulario vacio
//si selectedDiagram tiene algo, se debe hacer un fetch de tipo PUT en vez de POST
//si selectedDiagram tiene algo, el toast de success debe decir que se edito con exito
//si selectedDiagram tiene algo, el toast de error debe decir que no se pudo editar
