'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building, CalendarIcon, Check, ChevronsUpDown, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  checkDailyReportExists,
  createDailyReport,
  createDailyReportCustomerEquipmentRelations,
  createDailyReportEmployeeRelations,
  createDailyReportEquipmentRelations,
  createDailyReportRow,
  getActiveEmployeesForDailyReport,
  getActiveEquipmentsForDailyReport,
  getCustomers,
  getDailyReportById,
  updateDailyReportRow,
} from '../actions/actions';

import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDailyReportFormStore } from '@/stores/dailyReportFormStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import moment from 'moment';
import { toast } from 'sonner';
import {
  buildEmployeeIndex,
  buildEquipmentIndex,
  filterEmployeesByCustomer,
  filterEquipmentsByCustomer,
} from '../utils/employeeEquipmentIndex';
import { transformDailyReports } from './DayliReportDetailTable';
import { SearchEmployee } from './SearchEmployee';
import { SearchEquipment } from './SearchEquipment';

type DailyReportFormProps = {
  refetchDailyReport: () => void;
  customers?: Awaited<ReturnType<typeof getCustomers>>;
  employees?: Awaited<ReturnType<typeof getActiveEmployeesForDailyReport>>;
  equipments?: Awaited<ReturnType<typeof getActiveEquipmentsForDailyReport>>;
  dailyReport: Awaited<ReturnType<typeof getDailyReportById>>;
  disabled?: boolean;
  formattedData: ReturnType<typeof transformDailyReports>;
};

export const dailyReportSchema = z
  .object({
    customer: z.string().min(1, 'Debe seleccionar un cliente'),
    services: z.string().min(1, 'Debe seleccionar un servicio'),
    item: z.string().min(1, 'Debe seleccionar un ítem'),
    completed_day: z.boolean().nullable().optional(),
    completed_night: z.boolean().nullable().optional(),
    employees: z.array(z.string()).default([]).optional(),
    equipment: z.array(z.string()).default([]).optional(),
    equipos_cliente: z.array(z.string()).max(2, 'Solo se pueden seleccionar 2 equipos cliente').default([]).optional(),
    type_service: z
      .enum(['mensual', 'adicional', 'adicional_permanente'], {
        required_error: 'Debe seleccionar un tipo de servicio',
        invalid_type_error: 'Debe seleccionar un tipo de servicio',
      })
      .optional(),
    working_day: z.string().min(1, 'Debe seleccionar un tipo de jornada'),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    status: z.string().default('pendiente'),
    description: z.string().optional(),
    document_path: z.string().optional(),
    sector_service_id: z.string().optional(),
    areas_service_id: z.string().optional(),
    remit_number: z.string().optional(),
    cancel_reason: z.string().optional(),
    reprogram_date: z.date().optional(),
    reasigment_reason: z.string().optional(),
  })
  // .refine(
  //   (data) => {
  //     // Si el estado es 'ejecutado', el campo remit_number es obligatorio
  //     if (data.status === 'ejecutado') {
  //       return data.remit_number && data.remit_number.trim() !== '';
  //     }
  //     return true;
  //   },
  //   {
  //     message: 'El número de remito es obligatorio cuando el estado es "Ejecutado"',
  //     path: ['remit_number'],
  //   }
  // )
  .refine(
    (data) => {
      if (data.working_day === 'por horario') {
        return data.start_time && data.end_time;
      }
      return true;
    },
    {
      message: 'Debe ingresar horario de inicio y fin si la jornada es "por horario"',
      path: ['start_time', 'end_time'],
    }
  )
  .refine(
    (data) => {
      if (data.status === 'cancelado') {
        return data.cancel_reason && data.cancel_reason.trim() !== '';
      }
      return true;
    },
    {
      message: 'El motivo de cancelación es obligatorio cuando el estado es "Cancelado"',
      path: ['cancel_reason'],
    }
  )
  .refine(
    (data) => {
      if (data.status === 'reprogramado') {
        return data.reprogram_date;
      }
      return true;
    },
    {
      message: 'La fecha de reprogramación es obligatoria cuando el estado es "Reprogramado"',
      path: ['reprogram_date'],
    }
  )
  .refine(
    (data) => {
      if (data.status === 'ejecutado') {
        return (data?.employees?.length || 0) > 0 || (data?.equipment?.length || 0) > 0;
      }
      return true;
    },
    {
      message: 'Debe seleccionar al menos un empleado o equipo cuando el estado es "Ejecutado"',
      path: ['employees'], // Solo un path para que funcione correctamente
    }
  );

export type DailyReportFormValues = z.infer<typeof dailyReportSchema>;
type CustomersArray = Awaited<ReturnType<typeof getCustomers>>;
type CustomerType = NonNullable<NonNullable<CustomersArray>[number]>;
export function DailyReportForm({
  customers,
  employees,
  equipments,
  disabled,
  formattedData,
  dailyReport,
  refetchDailyReport,
}: DailyReportFormProps) {
  // Consumir el store de Zustand
  const selectedRow = useDailyReportFormStore((state) => state.selectedRow);
  const selectedCustomerId = useDailyReportFormStore((state) => state.selectedCustomerId);
  const selectedServiceId = useDailyReportFormStore((state) => state.selectedServiceId);
  const selectedCustomer = useDailyReportFormStore((state) => state.selectedCustomer);
  const isLoadingEmployees = useDailyReportFormStore((state) => state.isLoadingEmployees);
  const isLoadingEquipments = useDailyReportFormStore((state) => state.isLoadingEquipments);
  const closeModal = useDailyReportFormStore((state) => state.closeModal);
  const setSelectedCustomerId = useDailyReportFormStore((state) => state.setSelectedCustomerId);
  const setSelectedServiceId = useDailyReportFormStore((state) => state.setSelectedServiceId);
  const setSelectedCustomer = useDailyReportFormStore((state) => state.setSelectedCustomer);
  const setIsLoadingEmployees = useDailyReportFormStore((state) => state.setIsLoadingEmployees);
  const setIsLoadingEquipments = useDailyReportFormStore((state) => state.setIsLoadingEquipments);

  // useTransition para operaciones pesadas
  const [isPending, startTransition] = useTransition();

  // Estados locales (no del store)
  const [isSectorDisabled, setIsSectorDisabled] = useState<boolean>(true);
  const [isAreaDisabled, setIsAreaDisabled] = useState<boolean>(true);

  // Estados para índices de empleados y equipos
  const [employeeIndex, setEmployeeIndex] = useState<Map<string, NonNullable<typeof employees>>>(new Map());
  const [equipmentIndex, setEquipmentIndex] = useState<Map<string, NonNullable<typeof equipments>>>(new Map());
  const router = useRouter();
  // Filtros de clientes
  const activeCustomers = customers?.filter((c) => c.is_active) || [];

  const form = useForm<DailyReportFormValues>({
    resolver: zodResolver(dailyReportSchema),
    defaultValues: {
      customer: '',
      services: '',
      item: '',
      employees: [],
      equipment: [],
      working_day: '',
      start_time: '',
      end_time: '',
      status: '',
      description: '',
      document_path: '',
      sector_service_id: undefined,
      areas_service_id: undefined,
      remit_number: '',
      equipos_cliente: [],
      cancel_reason: '',
      type_service: undefined,
    },
  });

  const currentEmployeesWatch = form.watch('employees');
  const currentEquipmentWatch = form.watch('equipment');

  // 🔥 CONSTRUCCIÓN DE ÍNDICES UNA SOLA VEZ (con useTransition para no bloquear UI)
  useEffect(() => {
    setIsLoadingEmployees(true);
    setIsLoadingEquipments(true);

    startTransition(() => {
      // Construir índices de empleados y equipos
      const empIndex = buildEmployeeIndex(employees);
      const eqIndex = buildEquipmentIndex(equipments);

      setEmployeeIndex(empIndex);
      setEquipmentIndex(eqIndex);

      setIsLoadingEmployees(false);
      setIsLoadingEquipments(false);
    });
  }, [employees, equipments]); // Solo cuando cambian los datos base

  // 🔥 FILTRADO INSTANTÁNEO CON useMemo (desde índices pre-construidos)
  const { assignedEmployees, unassignedEmployees, allEmployees } = useMemo(
    () => filterEmployeesByCustomer(selectedCustomerId, employeeIndex, employees),
    [selectedCustomerId, employeeIndex, employees]
  );

  const { assignedEquipments, unassignedEquipments, allEquipments } = useMemo(
    () => filterEquipmentsByCustomer(selectedCustomerId, equipmentIndex, equipments),
    [selectedCustomerId, equipmentIndex, equipments]
  );

  // Funciones para detectar duplicados
  const checkEmployeeDuplicates = (employeeIds: string[]) => {
    if (!formattedData || !employeeIds?.length) return [];

    const duplicates: string[] = [];

    employeeIds.forEach((employeeId) => {
      const duplicateRows = formattedData.filter((row) => {
        // Excluir la fila actual si estamos editando
        if (selectedRow && row.id === selectedRow.id) return false;

        return row.employees_references?.some((emp) => emp.id === employeeId);
      });

      if (duplicateRows.length > 0) {
        const employee = employees?.find((emp) => emp.id === employeeId);
        if (employee) {
          duplicates.push(`${employee.lastname} ${employee.firstname}`);
        }
      }
    });

    return duplicates;
  };

  const checkEquipmentDuplicates = (equipmentIds: string[]) => {
    if (!formattedData || !equipmentIds?.length) return [];

    const duplicates: string[] = [];

    equipmentIds.forEach((equipmentId) => {
      const duplicateRows = formattedData.filter((row) => {
        // Excluir la fila actual si estamos editando
        if (selectedRow && row.id === selectedRow.id) return false;

        return row.equipment_references?.some((eq) => eq.id === equipmentId);
      });

      if (duplicateRows.length > 0) {
        const equipment = equipments?.find((eq) => eq.id === equipmentId);
        if (equipment) {
          duplicates.push(`${equipment.domain}`);
        }
      }
    });

    return duplicates;
  };

  // Funciones para detectar empleados y equipos no asignados
  const checkUnassignedEmployees = (employeeIds: string[]) => {
    if (!employeeIds?.length) return [];

    return employeeIds.filter((employeeId) => {
      const employee = employees?.find((emp) => emp.id === employeeId);
      return employee && !employee.contractor_employee?.some((ce) => ce.customers?.id === selectedCustomerId);
    });
  };

  const checkUnassignedEquipments = (equipmentIds: string[]) => {
    if (!equipmentIds?.length) return [];

    return equipmentIds.filter((equipmentId) => {
      const equipment = equipments?.find((eq) => eq.id === equipmentId);
      return equipment && !equipment.contractor_equipment?.some((ce) => ce.customers?.id === selectedCustomerId);
    });
  };

  // Detectar duplicados y no asignados en tiempo real
  const duplicateEmployees = checkEmployeeDuplicates(currentEmployeesWatch || []);
  const duplicateEquipments = checkEquipmentDuplicates(currentEquipmentWatch || []);
  const unassignedEmployeesSelected = checkUnassignedEmployees(currentEmployeesWatch || []);
  const unassignedEquipmentsSelected = checkUnassignedEquipments(currentEquipmentWatch || []);

  // If arrays have different lengths, they've changed
  // If arrays have same length, check if any item is different
  const equipmentHasChanged = selectedRow?.equipment_references
    ? selectedRow.equipment_references.length > (currentEquipmentWatch?.length || 0) ||
      !selectedRow.equipment_references.every((equipment) => currentEquipmentWatch?.includes(equipment.id!))
    : false;

  const employeeHasChanged = selectedRow?.employees_references
    ? selectedRow.employees_references.length > (currentEmployeesWatch?.length || 0) ||
      !selectedRow.employees_references.every((employee) => currentEmployeesWatch?.includes(employee.id!))
    : false;
  const onSubmit = async (data: DailyReportFormValues) => {
    //Si equipmentHasChanged o employeeHasChanged es true y reasigment_reason es null, mostrar error
    if (equipmentHasChanged || employeeHasChanged) {
      if (!data.reasigment_reason) {
        form.setError('reasigment_reason', {
          type: 'manual',
          message: 'Debe ingresar un motivo de reasignación',
        });
        return;
      }
    }

    // Asegurarse de que los empleados sean un array de IDs
    const employeeIds = Array.isArray(data.employees)
      ? data.employees.filter((emp): emp is string => typeof emp === 'string')
      : [];

    // Asegurarse de que los equipos sean un array de IDs
    const equipmentIds = Array.isArray(data.equipment)
      ? data.equipment.filter((eq): eq is string => typeof eq === 'string')
      : [];

    const equipos_clienteIds = Array.isArray(data.equipos_cliente)
      ? data.equipos_cliente.filter((eq): eq is string => typeof eq === 'string')
      : [];

    const rowData = {
      customer_id: data.customer,
      service_id: data.services,
      item_id: data.item,
      working_day: data.working_day,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      description: data.description,
      daily_report_id: dailyReport[0]?.id,
      // Set status to 'ejecutado' if both completed_day and completed_night are true
      status:
        data.completed_day && data.completed_night ? 'ejecutado' : (data.status as DailyReportRowStatus) || 'pendiente',
      areas_service_id: data.areas_service_id || null,
      sector_service_id: data.sector_service_id || null,
      remit_number: data.remit_number || null,
      type_service: data.type_service,
      cancel_reason: data.cancel_reason || null,
      completed_day: data.completed_day || null,
      completed_night: data.completed_night || null,
    };

    toast.promise(
      async () => {
        if (selectedRow) {
          const employeeIdsUpdated =
            employees?.filter((emp) => data?.employees?.includes(emp.id))?.map((emp) => emp.id) || [];
          const equipmentIdsUpdated =
            equipments?.filter((eq) => data?.equipment?.includes(eq.id))?.map((eq) => eq.id) || [];

          // Modo edición
          await updateDailyReportRow(
            selectedRow.id,
            rowData,
            employeeIdsUpdated,
            equipmentIdsUpdated,
            data?.equipos_cliente || [],
            {
              equipmentHasChanged,
              employeeHasChanged,
              reassignmentReason: data.reasigment_reason || '',
            }
          );
          if (rowData.status === 'reprogramado') {
            const existingReports = await checkDailyReportExists([format(data.reprogram_date!, 'yyyy-MM-dd')]);
            if (existingReports.length > 0) {
              await createDailyReportRow([
                {
                  ...rowData,
                  status: 'sin_recursos_asignados',
                  daily_report_id: existingReports[0].id,
                },
              ]);
            } else {
              const createdReports = await createDailyReport([format(data.reprogram_date!, 'yyyy-MM-dd')]);
              await createDailyReportRow([
                {
                  ...rowData,
                  status: 'sin_recursos_asignados',
                  daily_report_id: createdReports?.[0].id,
                },
              ]);
            }
          }
        } else {
          // Modo creación
          const createdRow = await createDailyReportRow([
            {
              ...rowData,
              status: !employeeIds.length && !equipmentIds.length ? 'sin_recursos_asignados' : 'pendiente',
            },
          ]);

          // Crear relaciones con empleados si existen
          if (employeeIds.length > 0) {
            await createDailyReportEmployeeRelations(createdRow[0].id, employeeIds);
          }

          // Crear relaciones con equipos si existen
          if (equipmentIds.length > 0) {
            await createDailyReportEquipmentRelations(createdRow[0].id, equipmentIds);
          }

          if (equipos_clienteIds.length > 0) {
            await createDailyReportCustomerEquipmentRelations(createdRow[0].id, equipos_clienteIds);
          }
        }

        // Actualizar la lista

        // Cerrar el modal y limpiar
        refetchDailyReport();
        router.refresh();
        document.getElementById('close-button-daily-report')?.click();
        await refetchDailyReport();

        // Limpiar el store
        closeModal();

        // Resetear el formulario
        form.reset({
          customer: '',
          services: '',
          item: '',
          equipos_cliente: [],
          employees: [],
          equipment: [],
          working_day: '',
          start_time: '',
          end_time: '',
          description: '',
          sector_service_id: '',
          areas_service_id: '',
          remit_number: '',
          type_service: undefined,
          cancel_reason: '',
        });

        // Restablecer los estados locales
        setSelectedCustomerId(null);
        setSelectedServiceId(null);
      },
      {
        loading: selectedRow ? 'Actualizando parte diario...' : 'Creando parte diario...',
        success: selectedRow ? 'Parte diario actualizado exitosamente' : 'Parte diario creado exitosamente',
        error: selectedRow ? 'Error al actualizar parte diario' : 'Error al crear parte diario',
      }
    );
  };

  // 🔥 SETEAR VALORES DEL FORMULARIO CUANDO SE ABRE EL MODAL (una sola vez)
  useEffect(() => {
    console.log('🔥 [FormValues] useEffect triggered', {
      hasSelectedRow: !!selectedRow,
      hasSelectedCustomer: !!selectedCustomer,
      hasSelectedServiceId: !!selectedServiceId,
      selectedRow: selectedRow?.id,
      selectedCustomer: selectedCustomer?.name,
      selectedServiceId,
    });

    if (!selectedRow || !selectedCustomer) {
      console.log('⚠️ [FormValues] Early return - missing data');
      return;
    }

    console.log('✅ [FormValues] Setting form values...');

    // Setear valores del formulario directamente
    form.setValue('customer', selectedCustomer.id);
    form.setValue('type_service', selectedRow.type_service as 'mensual' | 'adicional' | 'adicional_permanente');
    form.setValue('status', selectedRow.status as any);
    form.setValue('working_day', selectedRow.working_day || '');
    form.setValue('start_time', selectedRow.start_time?.substring(0, 5) || '');
    form.setValue('end_time', selectedRow.end_time?.substring(0, 5) || '');
    form.setValue('description', selectedRow.description || '');
    form.setValue('document_path', selectedRow.document_path || '');
    form.setValue('cancel_reason', selectedRow.cancel_reason || '');
    form.setValue('completed_day', selectedRow.completed_day || false);
    form.setValue('completed_night', selectedRow.completed_night || false);

    // Verificar sectores y áreas
    const hasSectors = selectedCustomer.customer_services?.some((s) => s.service_sectors?.length > 0);
    const hasAreas = selectedCustomer.customer_services?.some((s) => s.service_areas?.length > 0);
    setIsSectorDisabled(!hasSectors);
    setIsAreaDisabled(!hasAreas);

    // Setear sector y área
    if (selectedRow.sector_customer_id) {
      form.setValue('sector_service_id', selectedRow.sector_customer_id);
    }
    if (selectedRow.areas_customer_id) {
      form.setValue('areas_service_id', selectedRow.areas_customer_id);
    }

    // Setear servicio (ya viene del store)
    if (selectedServiceId) {
      form.setValue('services', selectedServiceId);

      // Buscar y setear ítem
      const service = selectedCustomer.customer_services?.find((s) => s.id === selectedServiceId);
      if (service?.service_items?.length && selectedRow.item) {
        const item = service.service_items.find(
          (i) => i.id === selectedRow.data_to_clone?.item_id || i.item_name === selectedRow.item
        );
        if (item) {
          form.setValue('item', item.id);
        }
      }
    }

    // Setear empleados
    if (selectedRow.employees_references) {
      const employeeIds = selectedRow.employees_references.map((emp) => emp.id || '');
      form.setValue('employees', employeeIds);
    }

    // Setear equipos del cliente
    if (selectedRow.customer_equipment) {
      const equipos_clienteIds = selectedRow.customer_equipment.map((eq) => eq.id || '');
      form.setValue('equipos_cliente', equipos_clienteIds);
    }

    // Setear equipos propios
    if (selectedRow.equipment_references?.length) {
      const equipmentIds = selectedRow.equipment_references.map((eq) => eq.id || '');
      form.setValue('equipment', equipmentIds);
    }

    console.log('✅ [FormValues] Form values set successfully');
  }, [selectedRow, selectedCustomer, selectedServiceId]); // Depende de todos los datos necesarios

  // Filtrar servicios activos del cliente seleccionado
  const customerServices = useMemo(() => {
    if (!selectedCustomer?.customer_services?.length) return [];

    return selectedCustomer.customer_services.filter(
      (service) => service.is_active && (!service.service_validity || new Date(service.service_validity) >= new Date())
    );
  }, [selectedCustomer]);

  // Filtrar ítems activos del servicio seleccionado
  const serviceItems = useMemo(() => {
    if (!selectedServiceId || !selectedCustomer?.customer_services?.length) return [];

    // Buscar el servicio seleccionado
    const selectedService = selectedCustomer.customer_services.find((service) => service.id === selectedServiceId);

    // Retornar los ítems activos del servicio seleccionado
    return selectedService?.service_items?.filter((item) => item.is_active) || [];
  }, [selectedCustomer, selectedServiceId]);

  // ✅ Los empleados y equipos ya se filtran arriba con los helpers optimizados

  // Manejar cambio de cliente
  const handleCustomerChange = (customerId: string) => {
    const customer = customers?.find((c) => c.id === customerId);
    if (customer) {
      // Actualizar store
      setSelectedCustomer(customer);
      setSelectedCustomerId(customerId);

      // Actualizar formulario
      form.setValue('customer', customerId);
      form.setValue('services', '');
      form.setValue('item', '');
      form.setValue('sector_service_id', undefined);
      form.setValue('areas_service_id', undefined);
      form.setValue('equipos_cliente', []);

      // Limpiar servicio seleccionado
      setSelectedServiceId(null);

      // Verificar si el cliente tiene sectores y áreas disponibles
      const hasSectors = customer.customer_services?.some((s) => s.service_sectors?.length > 0);
      const hasAreas = customer.customer_services?.some((s) => s.service_areas?.length > 0);

      setIsSectorDisabled(!hasSectors);
      setIsAreaDisabled(!hasAreas);
    }
  };
  // ✅ Ya no necesitamos este useEffect, el useMemo serviceItems ya maneja esto

  // Manejar cambio de servicio
  const handleServiceChange = (serviceId: string) => {
    // Actualizar store
    setSelectedServiceId(serviceId);

    // Actualizar formulario
    form.setValue('services', serviceId);
    form.setValue('item', '');
  };

  const onCancel = () => {
    // Cerrar el modal físicamente
    document.getElementById('close-button-daily-report')?.click();

    // Limpiar el store (esto limpia selectedRow, selectedCustomerId, etc.)
    closeModal();

    // Limpiar valores del formulario
    form.reset({
      customer: '',
      services: '',
      item: '',
      employees: [],
      equipment: [],
      working_day: '',
      start_time: '',
      end_time: '',
      description: '',
      sector_service_id: '',
      areas_service_id: '',
      remit_number: '',
      type_service: undefined,
      cancel_reason: '',
      reprogram_date: undefined,
      equipos_cliente: [],
    });

    // Restablecer estados locales
    setIsSectorDisabled(true);
    setIsAreaDisabled(true);
  };

  // Estado para controlar la habilitación de los campos
  // ✅ Calculado directamente, sin useEffect
  const isServiceDisabled = !selectedCustomerId;

  const workingDayOptions = [
    { label: 'Jornada 8 horas', value: 'Jornada 8 horas' },
    { label: 'Jornada 12 horas', value: 'Jornada 12 horas' },
    { label: 'Jornada 24 horas', value: 'Jornada 24 horas' },
    { label: 'Por horario', value: 'por horario' },
  ];

  const handleOpenChange = (open: boolean) => {
    if (!open && selectedRow) {
      onCancel();
    }
  };

  return (
    <div>
      <Sheet onOpenChange={handleOpenChange}>
        <SheetTrigger className={cn(disabled && 'hidden')} asChild>
          <Button id="open-button-daily-report" variant="default">
            {selectedRow ? 'Editar' : 'Agregar'}
          </Button>
        </SheetTrigger>
        <SheetContent className="sm:max-w-screen-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedRow ? 'Editar' : 'Agregar'} Parte Diario</SheetTitle>
            <SheetDescription>
              {selectedRow
                ? 'Actualice los campos necesarios para modificar el parte diario.'
                : 'Complete los campos para agregar un nuevo parte diarios.'}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Cliente */}
                <div className="space-y-4 rounded-lg dark:bg-slate-900 bg-slate-50 p-4 w-full">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Datos del Cliente
                  </h4>
                  <div className="grid grid-cols-1 gap-4 w-full">
                    <FormField
                      control={form.control}
                      name="customer"
                      render={({ field }) => (
                        <FormItem className="flex flex-col w-full">
                          <FormLabel>Cliente</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  disabled={disabled || selectedRow != null}
                                  className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                                  data-testid="customer-select-button"
                                >
                                  {field.value
                                    ? customers?.find((customer) => customer.id === field.value)?.name
                                    : 'Seleccionar cliente'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="max-w-[400px] p-0">
                              <Command>
                                <CommandInput placeholder="Buscar cliente..." className="h-9" />
                                <CommandList>
                                  <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                                  <div className="px-3 py-1.5 text-xs text-muted-foreground">
                                    Nota: Los clientes dados de baja no se muestran en la lista.
                                  </div>

                                  {/* Clientes activos */}
                                  <CommandGroup heading="Clientes activos">
                                    {activeCustomers.map((customer) => (
                                      <CommandItem
                                        value={customer.name}
                                        key={customer.id}
                                        data-testid={`customer-option-${customer.id}`}
                                        onSelect={() => {
                                          handleCustomerChange(customer.id);
                                          setSelectedServiceId(null);
                                          setSelectedCustomer(customer);
                                        }}
                                      >
                                        {customer.name}
                                        <Check
                                          className={cn(
                                            'ml-auto h-4 w-4',
                                            customer.id === field.value ? 'opacity-100' : 'opacity-0'
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Servicio */}
                    <FormField
                      control={form.control}
                      name="services"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Servicio</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  disabled={isServiceDisabled || disabled}
                                  className={cn(
                                    'w-full justify-between',
                                    !field.value && 'text-muted-foreground',
                                    isServiceDisabled && 'opacity-50 cursor-not-allowed'
                                  )}
                                  data-testid="service-select-button"
                                >
                                  {field.value
                                    ? customerServices.find((service) => service.id === field.value)?.service_name
                                    : selectedCustomerId
                                      ? 'Seleccionar servicio'
                                      : 'Seleccione un cliente primero'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="max-w-[400px] p-0">
                              <Command>
                                <CommandInput
                                  placeholder="Buscar servicio..."
                                  className="h-9"
                                  disabled={isServiceDisabled}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {!selectedCustomerId
                                      ? 'Seleccione un cliente primero.'
                                      : customerServices.length === 0
                                        ? 'No hay servicios activos para este cliente.'
                                        : 'No se encontraron servicios que coincidan.'}
                                  </CommandEmpty>
                                  {selectedCustomerId && (
                                    <div className="px-3 py-1.5 text-xs text-muted-foreground">
                                      Nota: Los servicios vencidos o de baja no se muestran en la lista.
                                    </div>
                                  )}

                                  {(() => {
                                    if (!selectedCustomerId) return null;

                                    if (customerServices.length === 0) {
                                      return (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                          No hay servicios activos para este cliente.
                                        </div>
                                      );
                                    }

                                    return (
                                      <CommandGroup>
                                        {customerServices.map((service) => {
                                          return (
                                            <CommandItem
                                              value={service.service_name || ''}
                                              key={service.id}
                                              data-testid={`service-option-${service.id}`}
                                              onSelect={() => handleServiceChange(service.id)}
                                            >
                                              <div className="flex items-center justify-between w-full">
                                                <span>{service.service_name}</span>
                                              </div>
                                              <Check
                                                className={cn(
                                                  'ml-auto h-4 w-4',
                                                  service.id === field.value ? 'opacity-100' : 'opacity-0'
                                                )}
                                              />
                                            </CommandItem>
                                          );
                                        })}
                                      </CommandGroup>
                                    );
                                  })()}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Ítem */}
                    <FormField
                      control={form.control}
                      name="item"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Ítem</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  disabled={!selectedServiceId || disabled}
                                  className={cn(
                                    'w-full justify-between',
                                    !field.value && 'text-muted-foreground',
                                    !selectedServiceId && 'opacity-50 cursor-not-allowed'
                                  )}
                                  data-testid="item-select-button"
                                >
                                  {field.value
                                    ? serviceItems.find((item) => item.id === field.value)?.item_name ||
                                      'Ítem no encontrado'
                                    : selectedServiceId
                                      ? 'Seleccionar ítem'
                                      : 'Seleccione un servicio primero'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-full p-0">
                              <Command>
                                <CommandInput
                                  placeholder={!selectedServiceId ? 'Seleccione un servicio primero' : 'Buscar ítem...'}
                                  className="h-9"
                                  disabled={!selectedServiceId}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {!selectedServiceId
                                      ? 'Seleccione un servicio primero.'
                                      : serviceItems.length === 0
                                        ? 'No hay ítems disponibles para este servicio.'
                                        : 'No se encontraron ítems que coincidan.'}
                                  </CommandEmpty>
                                  {!selectedServiceId && (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                      Por favor, seleccione un servicio primero.
                                    </div>
                                  )}

                                  {selectedServiceId &&
                                    (() => {
                                      if (!selectedServiceId) return null;

                                      if (serviceItems.length === 0) {
                                        return (
                                          <div className="py-6 text-center text-sm text-muted-foreground">
                                            No hay ítems disponibles para este servicio.
                                          </div>
                                        );
                                      }

                                      return (
                                        <CommandGroup>
                                          {serviceItems.map((item) => {
                                            const isSelected = item.id === field.value;

                                            return (
                                              <CommandItem
                                                value={`${item.id}-${item.item_name}`} // Usamos ID y nombre para búsqueda
                                                key={item.id}
                                                data-testid={`item-option-${item.id}`}
                                                onSelect={() => {
                                                  form.setValue('item', item.id);
                                                }}
                                                className={cn('group', isSelected ? '' : '')}
                                              >
                                                <div className="flex items-center justify-between w-full">
                                                  <span>{item.item_name}</span>
                                                  {item.measure_units?.unit && (
                                                    <Badge variant="outline" className="ml-2">
                                                      {item.measure_units.unit}
                                                    </Badge>
                                                  )}
                                                </div>
                                                <Check
                                                  className={cn(
                                                    'ml-2 h-4 w-4',
                                                    isSelected ? 'opacity-100' : 'opacity-0'
                                                  )}
                                                />
                                              </CommandItem>
                                            );
                                          })}
                                        </CommandGroup>
                                      );
                                    })()}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Sector del Cliente */}
                    <FormField
                      control={form.control}
                      name="sector_service_id"
                      render={({ field }) => {
                        // Filtrar sectores del cliente seleccionado
                        // const customerSectors =
                        //   Array.from(
                        //     new Set(
                        //       selectedCustomer?.customer_services
                        //         ?.flatMap((service) => service.service_sectors || [])
                        //         .filter((sector) => sector.sectors)
                        //         .map((sector) => ({
                        //           id: sector.id,
                        //           name: sector.sectors?.name || '',
                        //           description: sector.sectors?.descripcion_corta || '',
                        //         }))
                        //     )
                        //   ) || [];
                        const customerSectors = Array.from(
                          new Set(
                            selectedCustomer?.customer_services
                              ?.flatMap((service) => service.service_sectors || [])
                              .filter((sector) => sector.sectors && sector.service_id === selectedServiceId)
                              .map((sector) => ({
                                sector_id: sector.sectors?.id,
                                id: sector.id,
                              }))
                          )
                        ).map((data) => ({
                          id: data.id,
                          name:
                            selectedCustomer?.customer_services
                              ?.flatMap((service) => service.service_sectors || [])
                              .find((sector) => sector.sectors?.id === data.sector_id)?.sectors?.name || '',
                          description:
                            selectedCustomer?.customer_services
                              ?.flatMap((service) => service.service_sectors || [])
                              .find((sector) => sector.sectors?.id === data.sector_id)?.sectors?.descripcion_corta ||
                            '',
                        }));

                        // Encontrar el sector seleccionado
                        const selectedSector = customerSectors.find((sector) => sector.id === field.value);

                        return (
                          <FormItem className="flex flex-col">
                            <FormLabel>Sector del Cliente (Opcional)</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    disabled={isSectorDisabled || disabled}
                                    className={cn(
                                      'w-full justify-between',
                                      !field.value && 'text-muted-foreground',
                                      isSectorDisabled && 'opacity-50 cursor-not-allowed'
                                    )}
                                  >
                                    {selectedSector?.name ||
                                      (selectedCustomer
                                        ? customerSectors.length > 0
                                          ? 'Seleccionar sector (opcional)'
                                          : 'No hay sectores disponibles'
                                        : 'Seleccione un cliente primero')}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-full p-0">
                                <Command>
                                  <CommandInput
                                    placeholder="Buscar sector..."
                                    className="h-9"
                                    disabled={isSectorDisabled}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      {!selectedCustomerId
                                        ? 'Seleccione un cliente primero.'
                                        : customerSectors.length === 0
                                          ? 'No hay sectores disponibles para este cliente.'
                                          : 'No se encontraron sectores que coincidan.'}
                                    </CommandEmpty>
                                    {customerSectors.length > 0 && (
                                      <CommandGroup>
                                        {customerSectors.map((sector) => (
                                          <CommandItem
                                            value={sector.name || ''}
                                            key={sector.id}
                                            onSelect={() => {
                                              form.setValue('sector_service_id', sector.id, { shouldDirty: true });
                                            }}
                                          >
                                            {sector.name || 'Sin nombre'}
                                            <Check
                                              className={cn(
                                                'ml-auto h-4 w-4',
                                                sector.id === field.value ? 'opacity-100' : 'opacity-0'
                                              )}
                                            />
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Área del Cliente */}
                    <FormField
                      control={form.control}
                      name="areas_service_id"
                      render={({ field }) => {
                        // Filtrar áreas del cliente seleccionado
                        const customerAreas = Array.from(
                          new Set(
                            selectedCustomer?.customer_services
                              ?.flatMap((service) => service.service_areas || [])
                              .filter((area) => area.areas_cliente && area.service_id === selectedServiceId)
                              .map((area) => {
                                return {
                                  id: area.id,
                                  area_id: area.areas_cliente?.id,
                                };
                              })
                          )
                        ).map((data) => ({
                          id: data.id,
                          name:
                            selectedCustomer?.customer_services
                              ?.flatMap((service) => service.service_areas || [])
                              .find((area) => area.areas_cliente?.id === data.area_id)?.areas_cliente?.nombre || '',
                          description:
                            selectedCustomer?.customer_services
                              ?.flatMap((service) => service.service_areas || [])
                              .find((area) => area.areas_cliente?.id === data.area_id)?.areas_cliente
                              ?.descripcion_corta || '',
                        }));

                        // Encontrar el área seleccionada
                        const selectedArea = customerAreas.find((area) => area.id === field.value);

                        return (
                          <FormItem className="flex flex-col">
                            <FormLabel>Área del Cliente</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    disabled={isAreaDisabled || disabled}
                                    className={cn(
                                      'w-full justify-between',
                                      !field.value && 'text-muted-foreground',
                                      isAreaDisabled && 'opacity-50 cursor-not-allowed'
                                    )}
                                  >
                                    {selectedArea?.name ||
                                      (selectedCustomer
                                        ? customerAreas.length > 0
                                          ? 'Seleccionar área'
                                          : 'No hay áreas disponibles'
                                        : 'Seleccione un cliente primero')}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-full p-0">
                                <Command>
                                  <CommandInput
                                    placeholder="Buscar área..."
                                    className="h-9"
                                    disabled={isAreaDisabled}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      {!selectedCustomerId
                                        ? 'Seleccione un cliente primero.'
                                        : customerAreas.length === 0
                                          ? 'No hay áreas disponibles para este cliente.'
                                          : 'No se encontraron áreas que coincidan.'}
                                    </CommandEmpty>
                                    {customerAreas.length > 0 && (
                                      <CommandGroup>
                                        {customerAreas.map((area) => (
                                          <CommandItem
                                            value={area.name || ''}
                                            key={area.id}
                                            onSelect={() => {
                                              form.setValue('areas_service_id', area.id, { shouldDirty: true });
                                            }}
                                          >
                                            {area.name || 'Sin nombre'}
                                            <Check
                                              className={cn(
                                                'ml-auto h-4 w-4',
                                                area.id === field.value ? 'opacity-100' : 'opacity-0'
                                              )}
                                            />
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Equipos del Cliente */}
                    <FormField
                      control={form.control}
                      name="equipos_cliente"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Equipos del Cliente</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  disabled={disabled}
                                  className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                                >
                                  {field.value && field.value.length > 0
                                    ? `${field.value.length} equipos del cliente seleccionados`
                                    : 'Seleccionar equipos del cliente'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                              <Command>
                                <CommandInput placeholder="Buscar equipos..." />
                                <CommandEmpty>No se encontraron equipos.</CommandEmpty>
                                <CommandGroup className="max-h-[200px] overflow-y-auto">
                                  {selectedCustomer?.equipos_clientes?.map((equipo) => {
                                    const isSelected = field.value?.includes(equipo.id);
                                    const maxSelected = (field.value?.length || 0) >= 1;
                                    const isDisabled = !isSelected && maxSelected;

                                    return (
                                      <CommandItem
                                        value={equipo.name || equipo.type || ''}
                                        key={equipo.id}
                                        disabled={isDisabled}
                                        onSelect={() => {
                                          if (isDisabled) return;

                                          const newValue = isSelected
                                            ? field.value?.filter((v: string) => v !== equipo.id) || []
                                            : [...(field.value || []), equipo.id];
                                          field.onChange(newValue);
                                        }}
                                        className={cn(
                                          isDisabled && 'opacity-50 cursor-not-allowed',
                                          isSelected && 'bg-accent/50'
                                        )}
                                      >
                                        <Check
                                          className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                                        />
                                        {equipo.name} ({equipo.type})
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Campo de estado - Solo visible en modo edición */}
                {selectedRow && (
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => {
                      // Obtener el valor actual del estado
                      const currentStatusWatch = form.watch('status');
                      // const currentStatus = field.value as string;

                      return (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              if (value !== 'ejecutado') {
                                form.setValue('remit_number', '');
                              }
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem
                                className="hover:bg-accent"
                                value="ejecutado"
                                disabled={
                                  field.value === 'sin_recursos_asignados' ||
                                  //Si la fecha del aprte es para mañana, no se puede pasar a ejecutado
                                  moment(dailyReport[0].date).isSameOrAfter(moment().add(1, 'day'))
                                }
                              >
                                Ejecutado
                              </SelectItem>
                              <SelectItem className="hover:bg-accent" value="reprogramado">
                                Reprogramado
                              </SelectItem>
                              <SelectItem className="hover:bg-accent" value="cancelado">
                                Cancelado
                              </SelectItem>
                              <SelectItem value="pendiente" disabled>
                                Pendiente
                              </SelectItem>
                              <SelectItem value="sin_recursos_asignados" disabled>
                                Sin recursos asignados
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />

                          {/* Campo de número de remito - Solo visible cuando el estado es 'ejecutado' */}
                          {/* {currentStatusWatch === 'ejecutado' && ( */}
                          {false && (
                            <div className="mt-6">
                              <FormField
                                control={form.control}
                                name="remit_number"
                                render={({ field: remitField }) => (
                                  <FormItem>
                                    <FormLabel>Número de Remito</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Ingrese el número de remito"
                                        {...remitField}
                                        value={remitField.value || ''}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                          {currentStatusWatch === 'cancelado' && (
                            <div className="mt-6">
                              <FormField
                                control={form.control}
                                name="cancel_reason"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Motivo de cancelación</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Ingrese el motivo de cancelación"
                                        {...field}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                          {currentStatusWatch === 'reprogramado' && (
                            <div className="mt-6">
                              <FormField
                                control={form.control}
                                name="reprogram_date"
                                render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                    <FormLabel className="mt-2">Fecha de reprogramación</FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant={'outline'}
                                            className={cn(
                                              'pl-3 text-left font-normal',
                                              !field.value && 'text-muted-foreground'
                                            )}
                                          >
                                            {field.value ? (
                                              format(field.value, 'PPP', { locale: es })
                                            ) : (
                                              <span>Seleccionar fecha</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={field.onChange}
                                          disabled={(date) => moment(date).isBefore(moment())}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </FormItem>
                      );
                    }}
                  />
                )}

                {/* Empleados */}
                <FormField
                  control={form.control}
                  name="employees"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Empleados</FormLabel>
                      {duplicateEmployees.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-2">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">Empleados duplicados detectados</h3>
                              <div className="mt-2 text-sm text-yellow-700">
                                <p>Los siguientes empleados ya están asignados en otras filas del parte diario:</p>
                                <ul className="list-disc list-inside mt-1">
                                  {duplicateEmployees.map((employee, index) => (
                                    <li key={index}>{employee}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {unassignedEmployeesSelected.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-2">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-orange-800">Empleados no asignados al cliente</h3>
                              <div className="mt-2 text-sm text-orange-700">
                                <p>Los siguientes empleados no están asignados al cliente seleccionado:</p>
                                <ul className="list-disc list-inside mt-1">
                                  {unassignedEmployeesSelected.map((employeeId) => {
                                    const employee = employees?.find((emp) => emp.id === employeeId);
                                    return employee ? (
                                      <li key={employeeId}>
                                        {employee.lastname.charAt(0).toUpperCase() +
                                          employee.lastname.slice(1).toLowerCase()}{' '}
                                        {employee.firstname.charAt(0).toUpperCase() +
                                          employee.firstname.slice(1).toLowerCase()}
                                      </li>
                                    ) : null;
                                  })}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <SearchEmployee
                        field={field as any}
                        employees={allEmployees}
                        selectedCustomerId={selectedCustomerId}
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={!selectedCustomerId}
                              className={cn(
                                'w-full justify-between',
                                !field.value?.length && 'text-muted-foreground',
                                !selectedCustomerId && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              {field.value?.length
                                ? `${field.value.length} empleado${field.value.length > 1 ? 's' : ''} seleccionado${field.value.length > 1 ? 's' : ''}`
                                : selectedCustomerId
                                  ? 'Seleccionar empleados'
                                  : 'Seleccione un cliente primero'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Buscar empleados..." />
                            <CommandList>
                              <CommandEmpty>
                                {!selectedCustomerId
                                  ? 'Seleccione un cliente primero.'
                                  : allEmployees.length === 0
                                    ? 'No hay empleados activos disponibles.'
                                    : 'No se encontraron empleados que coincidan.'}
                              </CommandEmpty>
                              {selectedCustomerId && (
                                <div className="px-3 py-1.5 text-xs text-muted-foreground">
                                  Nota: Los empleados marcados en naranja no están asignados al cliente seleccionado.
                                </div>
                              )}

                              {!selectedCustomerId && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  Por favor, seleccione un cliente primero.
                                </div>
                              )}

                              {selectedCustomerId && allEmployees.length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No hay empleados activos disponibles.
                                </div>
                              )}

                              {selectedCustomerId &&
                                allEmployees.length > 0 &&
                                (() => {
                                  // Obtener todas las posiciones únicas para todos los empleados
                                  const positionsMap: Record<string, (typeof allEmployees)[0][]> = {};

                                  // Agrupar todos los empleados por posición
                                  allEmployees.forEach((employee) => {
                                    const position = employee.company_positions?.name || 'Sin posición';

                                    if (!positionsMap[position]) {
                                      positionsMap[position] = [];
                                    }
                                    positionsMap[position].push(employee);
                                  });

                                  // Convertir a array y ordenar por posición
                                  const positionsArray = Object.keys(positionsMap).sort();

                                  return positionsArray.map((position) => (
                                    <CommandGroup
                                      key={position}
                                      heading={position.charAt(0).toUpperCase() + position.slice(1)}
                                    >
                                      {positionsMap[position].map((employee) => {
                                        // Verificar si el empleado está asignado al cliente
                                        const isAssigned = employee.contractor_employee?.some(
                                          (ce) => ce.customers?.id === selectedCustomerId
                                        );

                                        return (
                                          <CommandItem
                                            value={employee.firstname + employee.lastname}
                                            key={employee.id}
                                            onSelect={() => {
                                              const currentValues = field.value || [];
                                              const newValues = currentValues.includes(employee.id)
                                                ? currentValues.filter((id) => id !== employee.id)
                                                : [...currentValues, employee.id];

                                              field.onChange(newValues);
                                            }}
                                            className={cn(
                                              !isAssigned && 'text-orange-700 bg-orange-50 hover:bg-orange-100'
                                            )}
                                          >
                                            <div className="flex items-center justify-between w-full">
                                              <div className="flex items-center">
                                                <Check
                                                  className={cn(
                                                    'mr-2 h-4 w-4 capitalize',
                                                    !isAssigned && 'text-orange-600',
                                                    field.value?.includes(employee.id) ? 'opacity-100' : 'opacity-0'
                                                  )}
                                                />
                                                {employee.lastname.replace(
                                                  /\w\S*/g,
                                                  (txt) => txt.charAt(0).toUpperCase() + txt.slice(1)
                                                ) +
                                                  ' ' +
                                                  employee.firstname.replace(
                                                    /\w\S*/g,
                                                    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1)
                                                  )}
                                              </div>
                                              {!isAssigned && (
                                                <Badge
                                                  variant="outline"
                                                  className="ml-2 bg-orange-100 text-orange-800 border-orange-300"
                                                >
                                                  No asignado
                                                </Badge>
                                              )}
                                            </div>
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  ));
                                })()}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value?.map((employeeId) => {
                          const employee = employees?.find((emp) => emp.id === employeeId);
                          if (!employee) return null;

                          const displayName = `${employee.lastname.charAt(0).toUpperCase() + employee.lastname.slice(1).toLowerCase()} ${employee.firstname.charAt(0).toUpperCase() + employee.firstname.slice(1).toLowerCase()}`;

                          // Verificar si el empleado está asignado al cliente
                          const isAssigned = employee.contractor_employee?.some(
                            (ce) => ce.customers?.id === selectedCustomerId
                          );

                          return (
                            <div
                              key={employeeId}
                              className={cn(
                                'text-xs px-2 py-1 rounded-md flex items-center gap-1',
                                isAssigned
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-orange-100 text-orange-800 border border-orange-300'
                              )}
                            >
                              {displayName}
                              {!isAssigned && (
                                <Badge
                                  variant="outline"
                                  className="ml-1 bg-orange-200 text-orange-900 border-orange-400 text-[10px] px-1 py-0"
                                >
                                  No asignado
                                </Badge>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const currentValues = field.value || [];
                                  const newValues = currentValues.filter((id) => id !== employeeId);
                                  field.onChange(newValues);
                                }}
                                className={cn('ml-1 hover:opacity-80', isAssigned ? 'text-primary' : 'text-orange-800')}
                              >
                                <X className="h-3 w-3 text-red-500" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Equipos */}
                <FormField
                  control={form.control}
                  name="equipment"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Equipos propios</FormLabel>
                      {duplicateEquipments.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-2">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">Equipos duplicados detectados</h3>
                              <div className="mt-2 text-sm text-yellow-700">
                                <p>Los siguientes equipos ya están asignados en otras filas del parte diario:</p>
                                <ul className="list-disc list-inside mt-1">
                                  {duplicateEquipments.map((equipment, index) => (
                                    <li key={index}>{equipment}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {unassignedEquipmentsSelected.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-2">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-orange-800">Equipos no asignados al cliente</h3>
                              <div className="mt-2 text-sm text-orange-700">
                                <p>Los siguientes equipos no están asignados al cliente seleccionado:</p>
                                <ul className="list-disc list-inside mt-1">
                                  {unassignedEquipmentsSelected.map((equipmentId) => {
                                    const equipment = equipments?.find((eq) => eq.id === equipmentId);
                                    return equipment ? (
                                      <li key={equipmentId}>{equipment.domain || equipment.serie}</li>
                                    ) : null;
                                  })}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <SearchEquipment
                        field={field as any}
                        equipment={allEquipments}
                        selectedCustomerId={selectedCustomerId}
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={!selectedCustomerId}
                              className={cn(
                                'w-full justify-between',
                                !field.value?.length && 'text-muted-foreground',
                                !selectedCustomerId && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              {field.value?.length
                                ? `${field.value.length} equipo${field.value.length > 1 ? 's' : ''} seleccionado${field.value.length > 1 ? 's' : ''}`
                                : selectedCustomerId
                                  ? 'Seleccionar equipos'
                                  : 'Seleccione un cliente primero'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Buscar equipos..." />
                            <CommandList>
                              <CommandEmpty>
                                {!selectedCustomerId
                                  ? 'Seleccione un cliente primero.'
                                  : allEquipments.length === 0
                                    ? 'No hay equipos activos disponibles.'
                                    : 'No se encontraron equipos que coincidan.'}
                              </CommandEmpty>
                              {selectedCustomerId && (
                                <div className="px-3 py-1.5 text-xs text-muted-foreground">
                                  Nota: Los equipos marcados en naranja no están asignados al cliente seleccionado.
                                </div>
                              )}

                              {!selectedCustomerId && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  Por favor, seleccione un cliente primero.
                                </div>
                              )}

                              {selectedCustomerId && allEquipments.length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No hay equipos activos disponibles.
                                </div>
                              )}

                              {selectedCustomerId &&
                                allEquipments.length > 0 &&
                                (() => {
                                  // Obtener todos los tipos únicos para todos los equipos
                                  const typesMap: Record<string, (typeof allEquipments)[0][]> = {};

                                  // Agrupar todos los equipos por tipo
                                  allEquipments.forEach((equipment) => {
                                    const type = equipment.type?.name || 'Sin tipo';

                                    if (!typesMap[type]) {
                                      typesMap[type] = [];
                                    }
                                    typesMap[type].push(equipment);
                                  });

                                  // Convertir a array y ordenar por tipo
                                  const typesArray = Object.keys(typesMap).sort();

                                  return typesArray.map((type) => (
                                    <CommandGroup key={type} heading={type.charAt(0).toUpperCase() + type.slice(1)}>
                                      {typesMap[type].map((equipment) => {
                                        // Verificar si el equipo está asignado al cliente
                                        const isAssigned = equipment.contractor_equipment?.some(
                                          (ce) => ce.customers?.id === selectedCustomerId
                                        );

                                        return (
                                          <CommandItem
                                            value={equipment.domain || ''}
                                            key={equipment.id}
                                            onSelect={() => {
                                              const currentValues = field.value || [];
                                              const newValues = currentValues.includes(equipment.id)
                                                ? currentValues.filter((id) => id !== equipment.id)
                                                : [...currentValues, equipment.id];
                                              field.onChange(newValues);
                                            }}
                                            className={cn(
                                              !isAssigned && 'text-orange-700 bg-orange-50 hover:bg-orange-100'
                                            )}
                                          >
                                            <div className="flex items-center justify-between w-full">
                                              <div className="flex items-center">
                                                <Check
                                                  className={cn(
                                                    'mr-2 h-4 w-4',
                                                    !isAssigned && 'text-orange-600',
                                                    field.value?.includes(equipment.id) ? 'opacity-100' : 'opacity-0'
                                                  )}
                                                />
                                                {equipment.domain || equipment.serie}
                                              </div>
                                              {!isAssigned && (
                                                <Badge
                                                  variant="outline"
                                                  className="ml-2 bg-orange-100 text-orange-800 border-orange-300"
                                                >
                                                  No asignado
                                                </Badge>
                                              )}
                                            </div>
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  ));
                                })()}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value?.map((equipmentId) => {
                          const equipment = equipments?.find((eq) => eq.id === equipmentId);
                          if (!equipment) return null;

                          const displayName = equipment.domain || equipment.serie;

                          // Verificar si el equipo está asignado al cliente
                          const isAssigned = equipment.contractor_equipment?.some(
                            (ce) => ce.customers?.id === selectedCustomerId
                          );

                          return (
                            <div
                              key={equipmentId}
                              className={cn(
                                'text-xs px-2 py-1 rounded-md flex items-center gap-1',
                                isAssigned
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-orange-100 text-orange-800 border border-orange-300'
                              )}
                            >
                              {displayName}
                              {!isAssigned && (
                                <Badge
                                  variant="outline"
                                  className="ml-1 bg-orange-200 text-orange-900 border-orange-400 text-[10px] px-1 py-0"
                                >
                                  No asignado
                                </Badge>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const currentValues = field.value || [];
                                  const newValues = currentValues.filter((id) => id !== equipmentId);
                                  field.onChange(newValues);
                                }}
                                className={cn('ml-1 hover:opacity-80', isAssigned ? 'text-primary' : 'text-orange-800')}
                              >
                                <X className="h-3 w-3 text-red-500" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* reasigment_reason */}

                {(equipmentHasChanged || employeeHasChanged) && (
                  <FormField
                    control={form.control}
                    name="reasigment_reason"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Motivo de reasignación</FormLabel>
                        <FormControl>
                          <Input placeholder="Ingrese el motivo de la reasignación" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Jornada */}
                <FormField
                  control={form.control}
                  name="working_day"
                  render={({ field }) => {
                    console.log(field.value);

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Jornada</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                                data-testid="working-day-select-button"
                              >
                                {field.value
                                  ? workingDayOptions.find((day) => day.value === field.value)?.label
                                  : 'Seleccionar jornada'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="max-w-[400px] p-0">
                            <Command>
                              <CommandInput placeholder="Buscar jornada..." className="h-9" />
                              <CommandList>
                                <CommandEmpty>No se encontraron jornadas.</CommandEmpty>
                                <CommandGroup>
                                  {workingDayOptions.map((day) => (
                                    <CommandItem
                                      value={day.label}
                                      key={day.value}
                                      data-testid={`working-day-option-${day.value.replace(/ /g, '-')}`}
                                      onSelect={() => {
                                        const previousValue = form.getValues('working_day');
                                        form.setValue('working_day', day.value);

                                        // Si el valor anterior era 'por horario' o si el nuevo valor no es 'por horario', limpiar las horas
                                        if (previousValue === 'por horario' || day.value !== 'por horario') {
                                          form.setValue('start_time', '');
                                          form.setValue('end_time', '');
                                        }
                                      }}
                                    >
                                      {day.label}
                                      <Check
                                        className={cn(
                                          'ml-auto h-4 w-4',
                                          day.value === field.value ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                {form.watch('status') === 'pendiente' &&
                  form.watch('working_day') === 'jornada 24 horas' &&
                  selectedRow && (
                    <div className="flex flex-row gap-4 items-center">
                      <FormField
                        control={form.control}
                        name="completed_day"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value || undefined} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className=" font-normal m-0">Completado Día</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="completed_night"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value || undefined} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Completado Noche</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                {/* Horario (condicional) */}
                {form.watch('working_day') === 'por horario' && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de inicio</FormLabel>
                          <Input type="time" {...field} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de fin</FormLabel>
                          <Input type="time" {...field} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Tipo de servicio */}
                <FormField
                  control={form.control}
                  name="type_service"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de servicio</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem
                                defaultValue={field.value}
                                defaultChecked={field.value === 'mensual'}
                                value="mensual"
                                data-testid="type-service-mensual"
                              />
                            </FormControl>
                            <FormLabel className="font-normal">Mensual</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem
                                defaultValue={field.value}
                                defaultChecked={field.value === 'adicional'}
                                value="adicional"
                                data-testid="type-service-adicional"
                              />
                            </FormControl>
                            <FormLabel className="font-normal">Adicional</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem
                                defaultValue={field.value}
                                defaultChecked={field.value === 'adicional_permanente'}
                                value="adicional_permanente"
                              />
                            </FormControl>
                            <FormLabel className="font-normal">Adicional Permanente</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Descripción */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ingrese una descripción" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4 pt-4">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                  </Button>
                  <Button type="submit">{selectedRow ? 'Actualizar' : 'Crear'}</Button>
                </div>
              </form>
            </Form>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button className="hidden" id="close-button-daily-report" />
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
