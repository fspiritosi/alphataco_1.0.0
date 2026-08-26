'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedDatePicker } from '@/components/ui/enhanced-datepicket';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { CreateDiagrams, UpdateDiagramsById } from '@/features/Employees/Diagrams/actions/diagram-mutations';
import { DayCommentCell } from '@/features/Employees/Diagrams/components/DayCommentCell';
import { DiagramLoadSummary } from '@/features/Employees/Diagrams/components/DiagramLoadSummary';
import { diagramFormSchema, type DiagramFormValues } from '@/features/Employees/Diagrams/schemas/diagram-form-schema';
import {
  getEmployeeDiagramByIdandDate,
  getEmployeesName,
} from '@/features/Employees/Empleados/lib/actions/employeesActions';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

// El empleado y la novedad a aplicar son iguales en todas las filas de una carga, asi que
// no viajan por fila: se muestran una sola vez en el resumen (ver DiagramLoadSummary).
interface ErrorToCreate {
  day: number;
  month: number;
  year: number;
  /** Novedad que el dia ya tenia registrada y que se va a reemplazar. */
  prev_event: string;
  prev_diagram_entry_id: string;
  /** Comentario propio del dia. `undefined` = usa el comentario general de la carga. */
  comments?: string;
}

interface DiagramaToCreate {
  day: number;
  month: number;
  year: number;
  employee_id?: string;
  diagram_type?: string;
  /** Comentario propio del dia. `undefined` = usa el comentario general de la carga. */
  comments?: string;
}

type DiagramQueryResult = Awaited<ReturnType<typeof getEmployeeDiagramByIdandDate>>[number];
type ExistingDiagramEntry = DiagramQueryResult & {
  prev_diagram_type: string | null;
};

/** Clave estable de un dia dentro de la lista de diagramas a crear. */
const dayKey = (diagram: { day: number; month: number; year: number }) =>
  `${diagram.year}-${diagram.month}-${diagram.day}`;

/** Fecha del dia en formato DD/MM/YYYY para mostrar y para los nombres accesibles. */
const formatDayLabel = (diagram: { day: number; month: number; year: number }) =>
  moment(`${diagram.year}-${diagram.month}-${diagram.day}`, 'YYYY-M-D').format('DD/MM/YYYY');

function DiagramFormUpdated({ diagrams_types, defaultId }: { diagrams_types: DiagramType[]; defaultId?: string }) {
  const [errorsDiagrams, setErrorsDiagrams] = useState<ErrorToCreate[]>([]);
  const [succesDiagrams, setSuccesDiagrams] = useState<DiagramaToCreate[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  // Bloquea los botones de alta/actualizacion mientras hay una operacion en curso
  const [isProcessing, setIsProcessing] = useState(false);
  // Se incrementa al limpiar el formulario para remontar los date pickers (ver resetFormForNextLoad)
  const [datePickersKey, setDatePickersKey] = useState(0);
  // Identifica la carga vigente: si se genera otra mientras una operacion esta en vuelo, el
  // reset de la anterior no debe vaciar el formulario de la nueva.
  const currentLoadRef = useRef(0);

  // Cargar empleados on-demand via React Query (no SSR bulk)
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees-names-for-diagrams'],
    queryFn: () => getEmployeesName(),
    staleTime: 5 * 60 * 1000,
  });

  // Incluir legajo en el label para que sea visible y buscable por legajo o nombre
  const employeesOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: `${employee.file ? `[${employee.file}] ` : ''}${employee.lastname.charAt(0).toUpperCase()}${employee.lastname.slice(1)} ${employee.firstname.charAt(0).toUpperCase()}${employee.firstname.slice(1)}`,
      })),
    [employees]
  );

  const diagramsTypeOptions = useMemo(
    () =>
      diagrams_types.map((type) => ({
        value: type.id,
        label: type.name || '',
      })),
    [diagrams_types]
  );

  const form = useForm<DiagramFormValues>({
    resolver: zodResolver(diagramFormSchema),
    defaultValues: {
      employee_id: defaultId ? [defaultId] : undefined,
      comments: '',
      customize_comments: false,
    },
  });

  // Solo se observan el interruptor y los dos selectores (cambian de a un click): el
  // comentario general lo lee cada celda por su cuenta para que tipearlo no re-renderice
  // el formulario entero.
  const customizeComments = form.watch('customize_comments');
  const selectedEmployeeId = form.watch('employee_id')?.[0];
  const selectedDiagramTypeId = form.watch('diagram_type')?.[0];

  // Se resuelven contra el valor vigente del formulario, que es el mismo que se guarda al
  // crear o actualizar: lo que muestra el resumen es lo que se va a persistir.
  const selectedEmployeeLabel = employeesOptions.find((option) => option.value === selectedEmployeeId)?.label;
  const selectedDiagramTypeLabel = diagramsTypeOptions.find((option) => option.value === selectedDiagramTypeId)?.label;

  /**
   * Comentario final que se guarda para un dia: el general cuando la personalizacion
   * esta apagada o el dia no fue tocado, y el propio del dia cuando si lo fue.
   */
  const resolveComment = (diagram: { comments?: string }) => {
    const general = (form.getValues('comments') ?? '').trim();
    if (!form.getValues('customize_comments')) return general;
    return (diagram.comments ?? general).trim();
  };

  const setSuccessComment = (key: string, comments: string | undefined) => {
    setSuccesDiagrams((prev) => prev.map((d) => (dayKey(d) === key ? { ...d, comments } : d)));
  };

  const setErrorComment = (diagramId: string, comments: string | undefined) => {
    setErrorsDiagrams((prev) => prev.map((d) => (d.prev_diagram_entry_id === diagramId ? { ...d, comments } : d)));
  };

  const logicaDeDiagramas = async (data: DiagramFormValues) => {
    const { employee_id, date_from, date_to, diagram_type } = data;

    // Generar todas las fechas entre date_from y date_to
    const startDate = moment(date_from);
    const endDate = moment(date_to);
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
      day: diagram.day,
      month: diagram.month,
      year: diagram.year,
      prev_event: diagram.diagram_type?.name || '',
      prev_diagram_entry_id: diagram?.id,
    }));

    const successes: DiagramaToCreate[] = newDates.map((date) => ({
      day: date.day,
      month: date.month,
      year: date.year,
    }));

    currentLoadRef.current += 1;
    setErrorsDiagrams(errors);
    setSuccesDiagrams(successes);
    setHasGenerated(true);
  };

  const onSubmit = async (data: DiagramFormValues) => {
    await logicaDeDiagramas(data);
  };

  /** Deja el formulario como recien abierto, listo para la proxima carga. */
  const resetFormForNextLoad = () => {
    form.reset({
      // Cuando se entra desde la ficha de un empleado el empleado viene fijo (y el combo
      // deshabilitado): ese no se limpia.
      employee_id: defaultId ? [defaultId] : undefined,
      diagram_type: undefined,
      date_from: undefined,
      date_to: undefined,
      comments: '',
      customize_comments: false,
    });
    // Los date pickers guardan el texto tipeado en su propio estado interno, asi que el
    // reset del formulario no vacia el input: se los remonta cambiandoles la key.
    setDatePickersKey((key) => key + 1);
    setHasGenerated(false);
  };

  /**
   * Ejecuta la operacion contra la BD y, si con esto no queda ninguna fila pendiente en las
   * dos tablas, limpia el formulario cuando la promesa termina bien. Se limpia al terminar
   * la carga completa y no fila por fila, porque puede seguir habiendo trabajo en la otra
   * tabla. Ojo: las server actions loguean los errores por fila y no los propagan, asi que
   * "termino bien" significa "la operacion no lanzo", no "se guardaron todas las filas".
   */
  const runDiagramOperation = (
    operation: Promise<unknown>,
    messages: { loading: string; success: string; error: string },
    remainingErrors: ErrorToCreate[],
    remainingSuccess: DiagramaToCreate[]
  ) => {
    toast.promise(operation, messages);

    // El boton queda deshabilitado hasta que la BD responde, para no repetir la operacion
    setIsProcessing(true);
    operation.finally(() => setIsProcessing(false));

    if (remainingErrors.length > 0 || remainingSuccess.length > 0) return;

    const load = currentLoadRef.current;

    operation
      .then(() => {
        // Si mientras tanto se genero otra carga, esa manda: no se le vacia el formulario.
        if (currentLoadRef.current !== load) return;
        resetFormForNextLoad();
      })
      .catch(() => {
        // El toast ya avisa del error y el formulario se conserva para poder reintentar.
      });
  };

  const updateDiagram = (diagramToUpdate: ErrorToCreate) => {
    // Los valores del formulario se leen ahora, antes de cualquier reset posterior.
    const diagramType = form.getValues('diagram_type')[0];
    const comments = resolveComment(diagramToUpdate);
    const remainingErrors = errorsDiagrams.filter(
      (d) => d.prev_diagram_entry_id !== diagramToUpdate.prev_diagram_entry_id
    );

    setErrorsDiagrams(remainingErrors);

    runDiagramOperation(
      UpdateDiagramsById([
        {
          diagram_type: diagramType,
          diagramId: diagramToUpdate.prev_diagram_entry_id,
          // Sin comentario no se pisa el que ya tenia el dia registrado
          ...(comments ? { comments } : {}),
        },
      ]),
      {
        loading: 'Actualizando diagrama...',
        success: 'Diagrama actualizado correctamente',
        error: 'No se pudo actualizar el diagrama. Volvé a intentar.',
      },
      remainingErrors,
      succesDiagrams
    );
  };

  const updateAll = (diagramsToUpdate: ErrorToCreate[]) => {
    const diagramType = form.getValues('diagram_type')[0];
    const payload = diagramsToUpdate?.map((diagram) => {
      const comments = resolveComment(diagram);
      return {
        diagram_type: diagramType,
        diagramId: diagram.prev_diagram_entry_id,
        ...(comments ? { comments } : {}),
      };
    });

    setErrorsDiagrams([]);

    runDiagramOperation(
      UpdateDiagramsById(payload),
      {
        loading: 'Actualizando diagramas...',
        success: `Se actualizaron ${payload.length} diagramas`,
        error: 'No se pudieron actualizar los diagramas. Volvé a intentar.',
      },
      [],
      succesDiagrams
    );
  };

  const createDiagram = (diagramToCreate: DiagramaToCreate) => {
    const { day, month, year } = diagramToCreate;
    const employeeId = form.getValues('employee_id')[0];
    const diagramType = form.getValues('diagram_type')[0];
    const comments = resolveComment(diagramToCreate);
    const remainingSuccess = succesDiagrams.filter(
      (d) => !(d.day === diagramToCreate.day && d.month === diagramToCreate.month && d.year === diagramToCreate.year)
    );

    setSuccesDiagrams(remainingSuccess);

    runDiagramOperation(
      CreateDiagrams([
        {
          day,
          month,
          year,
          employee_id: employeeId,
          diagram_type: diagramType,
          comments: comments || null,
        },
      ]),
      {
        loading: 'Creando diagrama...',
        success: 'Diagrama creado correctamente',
        error: 'No se pudo crear el diagrama. Volvé a intentar.',
      },
      errorsDiagrams,
      remainingSuccess
    );
  };

  const createAll = (diagramsToCreate: DiagramaToCreate[]) => {
    const employeeId = form.getValues('employee_id')[0];
    const diagramType = form.getValues('diagram_type')[0];
    const payload = diagramsToCreate?.map((diagram) => ({
      day: diagram.day,
      month: diagram.month,
      year: diagram.year,
      employee_id: employeeId,
      diagram_type: diagramType,
      comments: resolveComment(diagram) || null,
    }));

    setSuccesDiagrams([]);

    runDiagramOperation(
      CreateDiagrams(payload),
      {
        loading: 'Creando diagramas...',
        success: `Se crearon ${payload.length} diagramas`,
        error: 'No se pudieron crear los diagramas. Volvé a intentar.',
      },
      errorsDiagrams,
      []
    );
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

  const hasResults = errorsDiagrams?.length > 0 || succesDiagrams?.length > 0;

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={30} minSize={24}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <h2 className="mb-4 text-xl font-bold">{'Generar Diagrama'}</h2>
            <div className="flex flex-col gap-6 px-2">
              {/* Identificacion: a quien y que novedad se le carga */}
              <div className="flex flex-col space-y-3">
                <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empleado</FormLabel>
                      <MultiSelectCombobox
                        options={employeesOptions}
                        placeholder={isLoadingEmployees ? 'Cargando empleados...' : 'Selecciona un empleado'}
                        emptyMessage={isLoadingEmployees ? 'Cargando...' : 'No hay empleados'}
                        selectedValues={field.value as string[]}
                        onChange={field.onChange}
                        disabled={!!defaultId || isLoadingEmployees}
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
              </div>

              {/* Periodo: se puede escribir la fecha o elegirla en el calendario */}
              <div className="flex flex-col space-y-3">
                <FormField
                  control={form.control}
                  name="date_from"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha desde</FormLabel>
                      <FormControl>
                        <EnhancedDatePicker
                          key={`date-from-${datePickersKey}`}
                          date={field.value}
                          setDate={(date) => field.onChange(date)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date_to"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha hasta</FormLabel>
                      <FormControl>
                        <EnhancedDatePicker
                          key={`date-to-${datePickersKey}`}
                          date={field.value}
                          setDate={(date) => field.onChange(date)}
                        />
                      </FormControl>
                      <FormDescription>Escribí las fechas como DD/MM/AAAA o elegilas en el calendario.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Comentario de la carga + personalizacion por dia */}
              <div className="flex flex-col space-y-3">
                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comentarios (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej: certificado médico presentado"
                          className="min-h-20"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Se guarda en todos los días del rango, salvo los que personalices.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customize_comments"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="cursor-pointer font-normal">Personalizar comentario por día</FormLabel>
                    </FormItem>
                  )}
                />
                {customizeComments && (
                  <p className="text-muted-foreground text-xs">
                    Cada día quedó con el comentario general y podés cambiar solo los que necesites, en la columna
                    “Comentario” de la derecha.
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="mt-6" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Generando...' : 'Generar diagramas'}
            </Button>
          </form>
        </Form>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="flex min-w-[600px] flex-col gap-4 pl-6" defaultSize={70}>
        {!hasResults && (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-sm">
            {hasGenerated ? (
              <>
                <p className="font-medium">No quedan diagramas pendientes de esta carga.</p>
                <p>Generá un nuevo rango para seguir cargando novedades.</p>
              </>
            ) : (
              <>
                <p className="font-medium">Todavía no generaste diagramas.</p>
                <p>Completá el formulario y presioná “Generar diagramas” para revisar el detalle día por día.</p>
              </>
            )}
          </div>
        )}
        {hasResults && (
          <DiagramLoadSummary employeeLabel={selectedEmployeeLabel} diagramTypeLabel={selectedDiagramTypeLabel} />
        )}
        {errorsDiagrams?.length > 0 && (
          <Card className="bg-red-50 dark:bg-red-950">
            <CardHeader>
              <CardTitle>Diagramas duplicados</CardTitle>
              <CardDescription>
                Estos días ya tienen una novedad cargada. Al actualizarlos se reemplaza la novedad registrada; si dejás
                el comentario vacío se conserva el que ya tenían.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Novedad registrada</TableHead>
                    {customizeComments && <TableHead className="w-full">Comentario</TableHead>}
                    <TableHead className="w-px">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorsDiagrams?.map((d, index: number) => (
                    <TableRow key={`error-${d.prev_diagram_entry_id}`}>
                      <TableCell className="align-top tabular-nums">{formatDayLabel(d)}</TableCell>
                      <TableCell className="align-top">{d.prev_event}</TableCell>
                      {customizeComments && (
                        <TableCell className="w-full min-w-0 align-top">
                          <DayCommentCell
                            control={form.control}
                            dateLabel={formatDayLabel(d)}
                            value={d.comments}
                            onChange={(value) => setErrorComment(d.prev_diagram_entry_id, value)}
                            onResetToGeneral={() => setErrorComment(d.prev_diagram_entry_id, undefined)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="w-px align-top">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant={'default'}
                            size="sm"
                            onClick={() => updateDiagram(d)}
                            aria-label={`Actualizar el diagrama del ${formatDayLabel(d)}`}
                          >
                            Actualizar
                          </Button>
                          <Button
                            type="button"
                            variant={'link'}
                            size="sm"
                            className="font-bold text-red-600"
                            onClick={() => descartarOne(index, 'e')}
                            aria-label={`Descartar el diagrama del ${formatDayLabel(d)}`}
                          >
                            Descartar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            {errorsDiagrams?.length > 1 && (
              <CardFooter className="flex justify-around">
                <Button type="button" variant={'default'} onClick={() => updateAll(errorsDiagrams)}>
                  Actualizar Todos
                </Button>
                <Button
                  type="button"
                  variant={'link'}
                  className="font-bold text-red-600"
                  onClick={() => descartarAll('e')}
                >
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
              <CardDescription>Días sin novedad cargada: se van a crear con el comentario indicado.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    {customizeComments && <TableHead className="w-full">Comentario</TableHead>}
                    <TableHead className="w-px">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {succesDiagrams?.map((d, index: number) => (
                    <TableRow key={`success-${dayKey(d)}`}>
                      <TableCell className="align-top tabular-nums">{formatDayLabel(d)}</TableCell>
                      {customizeComments && (
                        <TableCell className="w-full min-w-0 align-top">
                          <DayCommentCell
                            control={form.control}
                            dateLabel={formatDayLabel(d)}
                            value={d.comments}
                            onChange={(value) => setSuccessComment(dayKey(d), value)}
                            onResetToGeneral={() => setSuccessComment(dayKey(d), undefined)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="w-px align-top">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant={'success'}
                            size="sm"
                            onClick={() => createDiagram(d)}
                            disabled={isProcessing}
                            aria-label={`Crear el diagrama del ${formatDayLabel(d)}`}
                          >
                            Crear
                          </Button>
                          <Button
                            type="button"
                            variant={'link'}
                            size="sm"
                            className="font-bold text-red-600"
                            onClick={() => descartarOne(index, 's')}
                            aria-label={`Descartar el diagrama del ${formatDayLabel(d)}`}
                          >
                            Descartar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            {succesDiagrams?.length > 1 && (
              <CardFooter className="flex justify-around">
                <Button
                  type="button"
                  variant={'success'}
                  onClick={() => createAll(succesDiagrams)}
                  disabled={isProcessing}
                >
                  Crear Todos
                </Button>
                <Button
                  type="button"
                  variant={'link'}
                  className="font-bold text-red-600"
                  onClick={() => descartarAll('s')}
                >
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
