'use client';

import { query } from '@/app/server/GET/probando';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { zodResolver } from '@hookform/resolvers/zod';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormItemDatePicker } from '../ui/FormItemDatePicker';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// Configuración de límites (fácil de ajustar)
const DATE_RESTRICTIONS = {
  minDate: new Date(), // Hoy
  maxDaysRange: 90, // 3 meses máximo
  maxEmployees: 100, // 100 empleados máximo
};

// Schema de validación
const formSchema = z.object({
  employeeIds: z
    .array(z.string())
    .min(1, 'Selecciona al menos un empleado')
    .max(DATE_RESTRICTIONS.maxEmployees, `Máximo ${DATE_RESTRICTIONS.maxEmployees} empleados`),
  diagramTypeId: z.string().min(1, 'Selecciona un tipo de diagrama'),
  dateRange: z
    .object({
      from: z.date().min(DATE_RESTRICTIONS.minDate, 'Solo fechas desde hoy en adelante'),
      to: z.date(),
    })
    .refine((data) => {
      const diffDays = Math.ceil((data.to.getTime() - data.from.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= DATE_RESTRICTIONS.maxDaysRange;
    }, `Máximo ${DATE_RESTRICTIONS.maxDaysRange} días permitidos`),
});

type FormData = z.infer<typeof formSchema>;

interface ConflictRecord {
  employee_id: string;
  employee_name: string;
  day: number;
  month: number;
  year: number;
  date_formatted: string;
  current_diagram_type: string;
  current_diagram_name: string;
  current_diagram_color: string;
  is_used_in_operations: boolean;
  operation_details: string;
  can_update: boolean;
  conflict_type: string;
}

interface Props {
  onSubmit: (data: any) => void;
  onConflictsFound: (conflicts: any, formData: any) => void;
  onNoConflicts: () => void;
  onProcessingComplete: (result: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const fetchEmployees = async () => {
  const employees = await query('employees', 'id, firstname, lastname, workflow_diagram', [
    { column: 'is_active', value: true },
  ]);
  return employees;
};

const fetchDiagramTypes = async (company_id: string) => {
  const diagramTypes = await query('diagram_type', 'id, name, color, short_description, work_active', [
    { column: 'is_active', value: true },
    { column: 'company_id', value: company_id },
  ]);
  return diagramTypes;
};

export function DiagramMassiveForm({
  onSubmit,
  onConflictsFound,
  onNoConflicts,
  onProcessingComplete,
  loading,
  setLoading,
}: Props) {
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof fetchEmployees>>>([]);
  const [diagramTypes, setDiagramTypes] = useState<Awaited<ReturnType<typeof fetchDiagramTypes>>>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Awaited<ReturnType<typeof fetchEmployees>>>([]);
  const supabase = supabaseBrowser();
  const company_id = Cookies.get('actualComp');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeIds: [],
      diagramTypeId: '',
      dateRange: {
        from: new Date(),
        to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
      },
    },
  });

  // Cargar empleados y tipos de diagrama
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar empleados activos
        const employeesData = await fetchEmployees();
        // if (employeesError) throw employeesError;
        setEmployees(employeesData || []);

        // Cargar tipos de diagrama activos para trabajo
        const diagramTypesData = await fetchDiagramTypes(company_id || '');
        setDiagramTypes(diagramTypesData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Error al cargar los datos');
      }
    };

    loadData();
  }, [supabase]);

  // Actualizar empleados seleccionados cuando cambian los IDs
  useEffect(() => {
    const employeeIds = form.watch('employeeIds');
    const selected = employees.filter((emp) => employeeIds.includes(emp.id));
    setSelectedEmployees(selected);
  }, [form.watch('employeeIds'), employees]);

  const handleEmployeeToggle = (employeeId: string) => {
    const currentIds = form.getValues('employeeIds');
    const newIds = currentIds.includes(employeeId)
      ? currentIds.filter((id) => id !== employeeId)
      : [...currentIds, employeeId];

    form.setValue('employeeIds', newIds);
  };

  const estimateRecords = (employeeCount: number, days: number) => {
    const totalRecords = employeeCount * days;
    const estimatedTime = Math.ceil(totalRecords / 1000) * 2; // 2 seg por cada 1000 registros

    return {
      totalRecords,
      estimatedTime: `${estimatedTime} segundos`,
      batches: Math.ceil(totalRecords / 1000),
    };
  };

  const handleVerifyAndSubmit = async (data: FormData) => {
    setLoading(true);

    try {
      // Verificar conflictos usando la función SQL
      const { data: conflicts, error } = await supabase.rpc('check_diagram_conflicts_with_operations', {
        p_employee_ids: data.employeeIds,
        p_diagram_type_id: data.diagramTypeId,
        p_date_from: data.dateRange.from.toISOString().split('T')[0],
        p_date_to: data.dateRange.to.toISOString().split('T')[0],
      });

      if (error) {
        console.error('Error checking conflicts:', error);
        toast.error('Error al verificar conflictos');
        return;
      }

      if (conflicts && conflicts.length > 0) {
        // Separar conflictos por tipo
        const operationConflicts = conflicts.filter((c: ConflictRecord) => c.conflict_type === 'USED_IN_OPERATIONS');
        const simpleConflicts = conflicts.filter((c: ConflictRecord) => c.conflict_type === 'SIMPLE_CONFLICT');

        onConflictsFound({ operationConflicts, simpleConflicts }, data);
      } else {
        // No hay conflictos, proceder directamente
        await executeCreation(data);
      }
    } catch (error) {
      console.error('Error in verification:', error);
      toast.error('Error en la verificación');
    } finally {
      setLoading(false);
    }
  };

  const executeCreation = async (data: FormData) => {
    setLoading(true);

    try {
      const { data: result, error } = await supabase.rpc('create_massive_diagrams_with_validations', {
        p_employee_ids: data.employeeIds,
        p_diagram_type_id: data.diagramTypeId,
        p_date_from: data.dateRange.from.toISOString().split('T')[0],
        p_date_to: data.dateRange.to.toISOString().split('T')[0],
      });

      if (error) {
        console.error('Error creating diagrams:', error);
        toast.error('Error al crear los diagramas');
        return;
      }

      onProcessingComplete(result);
      toast.success('Diagramas procesados correctamente');
    } catch (error) {
      console.error('Error in creation:', error);
      toast.error('Error en la creación');
    } finally {
      setLoading(false);
    }
  };

  const watchedValues = form.watch();
  const employeeCount = watchedValues.employeeIds?.length || 0;
  const dateRange = watchedValues.dateRange;
  const days =
    dateRange?.from && dateRange?.to
      ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;
  const estimate = estimateRecords(employeeCount, days);

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleVerifyAndSubmit)} className="space-y-6">
          {/* Selección de tipo de diagrama */}
          <FormField
            control={form.control}
            name="diagramTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Diagrama</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo de diagrama" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {diagramTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: type.color }} />
                          <span>{type.name}</span>
                          <Badge variant="outline">{type.short_description}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Selección de rango de fechas */}
          <FormField
            control={form.control}
            name="dateRange"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rango de Fechas</FormLabel>
                <FormItemDatePicker
                  name="dateRange"
                  control={form.control}
                  label="Fechas del diagrama"
                  description="Selecciona el rango de fechas para diagrama"
                  disabled={(date) => date < DATE_RESTRICTIONS.minDate}
                />
                <div className="text-sm text-muted-foreground">
                  Solo se permiten fechas desde hoy en adelante (máximo {DATE_RESTRICTIONS.maxDaysRange} días)
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Selección de empleados */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FormLabel>
                Empleados ({employeeCount}/{DATE_RESTRICTIONS.maxEmployees})
              </FormLabel>
              <div className="text-sm text-muted-foreground">Máximo {DATE_RESTRICTIONS.maxEmployees} empleados</div>
            </div>

            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                      form.getValues('employeeIds').includes(employee.id)
                        ? 'bg-blue-50 border border-blue-200'
                        : 'border border-gray-200'
                    }`}
                    onClick={() => handleEmployeeToggle(employee.id)}
                  >
                    <input
                      type="checkbox"
                      checked={form.getValues('employeeIds').includes(employee.id)}
                      onChange={() => handleEmployeeToggle(employee.id)}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {employee.firstname} {employee.lastname}
                      </div>
                      {!employee.workflow_diagram && (
                        <div className="text-xs text-red-500">Sin diagrama de trabajo</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {form.formState.errors.employeeIds && (
              <div className="text-sm text-red-500">{form.formState.errors.employeeIds.message}</div>
            )}
          </div>

          {/* Resumen y estimación */}
          {employeeCount > 0 && days > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen de la Operación</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{employeeCount}</div>
                    <div className="text-sm text-muted-foreground">Empleados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{days}</div>
                    <div className="text-sm text-muted-foreground">Días</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{estimate.totalRecords}</div>
                    <div className="text-sm text-muted-foreground">Registros</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{estimate.estimatedTime}</div>
                    <div className="text-sm text-muted-foreground">Tiempo Est.</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" className="w-full" disabled={loading || employeeCount === 0}>
            {loading ? 'Verificando...' : 'Verificar y Crear Diagramas'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
