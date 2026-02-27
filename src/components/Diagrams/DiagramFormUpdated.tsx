'use client';

import { CreateDiagrams, UpdateDiagramsById } from '@/app/server/UPDATE/actions';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import {
  getEmployeeDiagramByIdandDate,
  getEmployeesName,
} from '@/features/Employees/Empleados/lib/actions/employeesActions';
import { zodResolver } from '@hookform/resolvers/zod';
import moment from 'moment';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormItemDatePicker } from '../ui/FormItemDatePicker';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Form } from '../ui/form';
import { MultiSelectCombobox } from '../ui/multi-select-combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface ErrorToCreate {
  employee_name: string;
  day: number;
  month: number;
  year: number;
  event_diagram_name: string;
  prev_event: string;
  prev_diagram_entry_id: string;
}

interface DiagramaToCreate {
  day: number;
  month: number;
  year: number;
  employee_id?: string;
  diagram_type?: string;
  event_diagram_name?: string;
  employee_name?: string;
}

type DiagramQueryResult = Awaited<ReturnType<typeof getEmployeeDiagramByIdandDate>>[number];
type ExistingDiagramEntry = DiagramQueryResult & {
  prev_diagram_type: string | null;
};

function DiagramFormUpdated({
  employees,
  diagrams_types,
  defaultId,
}: {
  employees: Awaited<ReturnType<typeof getEmployeesName>>;
  diagrams_types: DiagramType[];
  defaultId?: string;
}) {
  const [errorsDiagrams, setErrorsDiagrams] = useState<ErrorToCreate[]>([]);
  const [succesDiagrams, setSuccesDiagrams] = useState<DiagramaToCreate[]>([]);

  // Incluir legajo en el label para que sea visible y buscable por legajo o nombre
  const employeesOptions = employees.map((employee) => ({
    value: employee.id,
    label: `${employee.file ? `[${employee.file}] ` : ''}${employee.lastname.charAt(0).toUpperCase()}${employee.lastname.slice(1)} ${employee.firstname.charAt(0).toUpperCase()}${employee.firstname.slice(1)}`,
  }));

  const diagramsTypeOptions = diagrams_types.map((type) => ({
    value: type.id,
    label: type.name || '',
  }));

  const FormSchema = z.object({
    dateRange: z
      .object({
        from: z.date(),
        to: z.date(),
      })
      .refine((data) => data.from <= data.to, {
        message: 'La fecha de finalización no puede ser anterior a la fecha de inicio',
        path: ['to'],
      }),
    employee_id: z.array(z.string(), {
      required_error: 'Por favor selecciona un empleado',
    }),
    diagram_type: z.array(z.string(), {
      required_error: 'Por favor selecciona un tipo de diagrama',
    }),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      dateRange: undefined,
      employee_id: defaultId ? [defaultId] : undefined,
    },
  });

  const logicaDeDiagramas = async (data: z.infer<typeof FormSchema>) => {
    const { employee_id, dateRange, diagram_type } = data;

    // Generar todas las fechas entre dateRange.from y dateRange.to
    const startDate = moment(dateRange.from);
    const endDate = moment(dateRange.to);
    const dates: { day: number; month: number; year: number }[] = [];

    const initialDate = {
      day: startDate.date(),
      month: startDate.month() + 1,
      year: startDate.year(),
    };

    const finalDate = {
      day: endDate.date(),
      month: endDate.month() + 1,
      year: endDate.year(),
    };

    while (startDate.isSameOrBefore(endDate)) {
      dates.push({
        day: startDate.date(),
        month: startDate.month() + 1, // Los meses en moment.js son 0-indexed
        year: startDate.year(),
      });
      startDate.add(1, 'day');
    }

    // Consultar diagramas existentes y agruparlos
    const employeeDiagrams = await getEmployeeDiagramByIdandDate(employee_id[0], initialDate, finalDate);

    const existing: ExistingDiagramEntry[] = [];
    const newDates: { day: number; month: number; year: number; diagram_type: string; employee_id: string }[] = [];

    dates.forEach((date) => {
      const existingDiagram = employeeDiagrams.find(
        (diagram) => diagram.day === date.day && diagram.month === date.month && diagram.year === date.year
      );
      if (existingDiagram) {
        existing.push({ ...existingDiagram, prev_diagram_type: existingDiagram.diagram_type?.name || '' });
      } else {
        newDates.push({
          day: date.day,
          month: date.month,
          year: date.year,
          diagram_type: diagram_type[0],
          employee_id: employee_id[0],
        });
      }
    });

    // Mapear los diagramas existentes y nuevos a los estados correspondientes
    const errors: ErrorToCreate[] = existing.map((diagram) => ({
      employee_name: (diagram.employees?.lastname ?? '') + ' ' + (diagram.employees?.firstname ?? ''),
      day: diagram.day,
      month: diagram.month,
      year: diagram.year,
      event_diagram_name: diagrams_types.find((type) => type?.id === form.getValues('diagram_type')[0])?.name || '',
      prev_event: diagram.diagram_type?.name || '',
      prev_diagram_entry_id: diagram?.id,
    }));

    const successes: DiagramaToCreate[] = newDates.map((date) => ({
      employee_name:
        (employees.find((e) => e?.id === employee_id[0])?.lastname ?? '') +
        ' ' +
        (employees.find((e) => e?.id === employee_id[0])?.firstname ?? ''),
      day: date.day,
      month: date.month,
      year: date.year,
      event_diagram_name: diagrams_types.find((type) => type?.id === diagram_type[0])?.name || '',
    }));

    setErrorsDiagrams(errors);
    setSuccesDiagrams(successes);
  };

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    await logicaDeDiagramas(data);
  };

  const updateDiagram = async (diagramToUpdate: ErrorToCreate) => {
    toast.promise(
      async () =>
        await UpdateDiagramsById([
          { diagram_type: form.getValues('diagram_type')[0], diagramId: diagramToUpdate.prev_diagram_entry_id },
        ]),

      {
        loading: 'Actualizando diagrama...',
        success: 'Diagrama actualizado correctamente',
        error: 'Error al actualizar el diagrama',
      }
    );

    setErrorsDiagrams((prev) => prev.filter((d) => d.prev_diagram_entry_id !== diagramToUpdate.prev_diagram_entry_id));
  };

  const updateAll = async (diagramsToUpdate: ErrorToCreate[]) => {
    toast.promise(
      async () =>
        await UpdateDiagramsById(
          diagramsToUpdate?.map((diagram) => ({
            diagram_type: form.getValues('diagram_type')[0],
            diagramId: diagram.prev_diagram_entry_id,
          }))
        ),
      {
        loading: 'Actualizando diagramas...',
        success: 'Diagramas actualizados correctamente',
        error: 'Error al actualizar los diagramas',
      }
    );
    setErrorsDiagrams([]);
  };

  const createDiagram = (diagramToCreate: DiagramaToCreate) => {
    const { day, month, year } = diagramToCreate;

    toast.promise(
      async () =>
        await CreateDiagrams([
          {
            day,
            month,
            year,
            employee_id: form.getValues('employee_id')[0],
            diagram_type: form.getValues('diagram_type')[0],
          },
        ]),
      {
        loading: 'Creando diagrama...',
        success: 'Diagrama creado correctamente',
        error: 'Error al crear el diagrama',
      }
    );
    setSuccesDiagrams((prev) =>
      prev.filter(
        (d) => !(d.day === diagramToCreate.day && d.month === diagramToCreate.month && d.year === diagramToCreate.year)
      )
    );
  };

  const createAll = (diagramsToCreate: DiagramaToCreate[]) => {
    toast.promise(
      async () =>
        await CreateDiagrams(
          diagramsToCreate?.map((diagram) => ({
            day: diagram.day,
            month: diagram.month,
            year: diagram.year,
            employee_id: form.getValues('employee_id')[0],
            diagram_type: form.getValues('diagram_type')[0],
          }))
        ),
      {
        loading: 'Creando diagramas...',
        success: 'Diagramas creados correctamente',
        error: 'Error al crear los diagramas',
      }
    );
    setSuccesDiagrams([]);
  };

  const descartarOne = (index: number, type: 'e' | 's') => {
    if (type === 'e') {
      setErrorsDiagrams((prev) => prev.filter((_, i) => i !== index));
    } else {
      setSuccesDiagrams((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const descartarAll = (type: 'e' | 's') => {
    if (type === 'e') {
      setErrorsDiagrams([]);
    } else {
      setSuccesDiagrams([]);
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <h2 className="text-xl font-bold mb-4">{'Generar Diagrama'}</h2>
            <div className="flex flex-col space-y-3 px-2">
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empleado</FormLabel>
                    <MultiSelectCombobox
                      options={employeesOptions}
                      placeholder="Selecciona un empleado"
                      emptyMessage="No hay empleados"
                      selectedValues={field.value as string[]}
                      onChange={field.onChange}
                      disabled={defaultId ? true : false}
                      maxSelections={1}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="diagram_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de novedad</FormLabel>
                    <MultiSelectCombobox
                      options={diagramsTypeOptions}
                      placeholder="Selecciona un tipo de novedad"
                      emptyMessage="No hay tipos de novedades"
                      selectedValues={field.value as string[]}
                      onChange={field.onChange}
                      maxSelections={1}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItemDatePicker
                name="dateRange"
                control={form.control}
                label="Fechas del diagrama"
                description="Selecciona el rango de fechas para diagrama"
              />
            </div>

            <Button type="button" onClick={() => form.handleSubmit(onSubmit)()} className="mt-4">
              Generar diagramas
            </Button>
          </form>
        </Form>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="pl-6 min-w-[600px] flex flex-col gap-4" defaultSize={70}>
        {errorsDiagrams?.length > 0 && (
          <Card className="bg-red-50 dark:bg-red-950">
            <CardHeader>
              <CardTitle>Diagramas duplicados</CardTitle>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableHead>Nombre Empleado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Novedad Actual</TableHead>
                  <TableHead>Novedad Registrada</TableHead>
                  <TableHead></TableHead>
                </TableHeader>
                {errorsDiagrams?.map((d, index: number) => (
                  <TableBody key={`error-${d.prev_diagram_entry_id}`}>
                    <TableRow>
                      <TableCell>{d.employee_name}</TableCell>
                      <TableCell>
                        {d.day}/{d.month}/{d.year}
                      </TableCell>
                      <TableCell>{d.event_diagram_name}</TableCell>
                      <TableCell>{d.prev_event}</TableCell>
                      <TableCell className="flex gap-2 justify-around">
                        <Button variant={'default'} onClick={() => updateDiagram(d)}>
                          Actualizar
                        </Button>
                        <Button
                          variant={'link'}
                          className="font-bold text-red-600"
                          onClick={() => descartarOne(index, 'e')}
                        >
                          Descartar
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                ))}
              </Table>
            </CardContent>
            {errorsDiagrams?.length > 1 && (
              <CardFooter className="flex justify-around">
                <Button variant={'default'} onClick={() => updateAll(errorsDiagrams)}>
                  Actualizar Todos
                </Button>
                <Button variant={'link'} className="font-bold text-red-600" onClick={() => descartarAll('e')}>
                  Descartar Todos
                </Button>
              </CardFooter>
            )}
          </Card>
        )}
        {succesDiagrams?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Diagramas correctos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableHead>Nombre Empleado</TableHead>
                  <TableHead>Novedad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableHeader>
                {succesDiagrams?.map((d, index: number) => (
                  <TableBody key={`success-${d.day}-${d.month}-${d.year}-${index}`}>
                    <TableRow>
                      <TableCell>{d.employee_name || ''}</TableCell>
                      <TableCell>
                        {diagrams_types.find((type) => type?.id === form.getValues('diagram_type')[0])?.name || ''}
                      </TableCell>
                      <TableCell>
                        {d.day}/{d.month}/{d.year}
                      </TableCell>
                      <TableCell className="flex gap-2 justify-around">
                        <Button variant={'success'} onClick={() => createDiagram(d)}>
                          Crear
                        </Button>
                        <Button
                          variant={'link'}
                          className="font-bold text-red-600"
                          onClick={() => descartarOne(index, 's')}
                        >
                          Descartar
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                ))}
              </Table>
            </CardContent>
            {succesDiagrams?.length > 1 && (
              <CardFooter className="flex justify-around">
                <Button variant={'success'} onClick={() => createAll(succesDiagrams)}>
                  Crear Todos
                </Button>
                <Button variant={'link'} className="font-bold text-red-600" onClick={() => descartarAll('s')}>
                  Descartar Todos
                </Button>
              </CardFooter>
            )}
          </Card>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default DiagramFormUpdated;
