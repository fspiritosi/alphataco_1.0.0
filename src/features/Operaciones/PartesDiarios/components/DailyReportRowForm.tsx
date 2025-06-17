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
import { Building, CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import moment from 'moment';
import { toast } from 'sonner';
import { transformDailyReports } from './DayliReportDetailTable';

type DailyReportFormProps = {
  // onSubmit: (data: DailyReportFormValues) => void;
  // onCancel: () => void;
  defaultValues?: ReturnType<typeof transformDailyReports>[number] | null;
  customers: Awaited<ReturnType<typeof getCustomers>>;
  // customers_services: Awaited<ReturnType<typeof getCustomersServices>>;
  // service_items: Awaited<ReturnType<typeof getServiceItems>>;
  employees: Awaited<ReturnType<typeof getActiveEmployeesForDailyReport>>;
  equipments: Awaited<ReturnType<typeof getActiveEquipmentsForDailyReport>>;
  dailyReport: Awaited<ReturnType<typeof getDailyReportById>>;
  selectedRow?: ReturnType<typeof transformDailyReports>[number] | null;
  setSelectedRow: (row: ReturnType<typeof transformDailyReports>[number] | null) => void;
  disabled?: boolean;
  // customersAreas: Awaited<ReturnType<typeof getCustomersAreas>>;
  // customersSectors: Awaited<ReturnType<typeof getCustomersSectors>>;
};

export const dailyReportSchema = z
  .object({
    customer: z.string().min(1, 'Debe seleccionar un cliente'),
    services: z.string().min(1, 'Debe seleccionar un servicio'),
    item: z.string().min(1, 'Debe seleccionar un ítem'),
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
  .refine(
    (data) => {
      // Si el estado es 'ejecutado', el campo remit_number es obligatorio
      if (data.status === 'ejecutado') {
        return data.remit_number && data.remit_number.trim() !== '';
      }
      return true;
    },
    {
      message: 'El número de remito es obligatorio cuando el estado es "Ejecutado"',
      path: ['remit_number'],
    }
  )
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
  defaultValues,
  customers,
  setSelectedRow,
  employees,
  equipments,
  selectedRow,
  disabled,
  dailyReport,
}: DailyReportFormProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null);
  const [isSectorDisabled, setIsSectorDisabled] = useState<boolean>(true);
  const [isAreaDisabled, setIsAreaDisabled] = useState<boolean>(true);
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
      sector_service_id: '',
      areas_service_id: '',
      remit_number: '',
      equipos_cliente: [],
      cancel_reason: '',
      type_service: defaultValues?.type_service || undefined,
      // ...defaultValues,
    },
  });

  const currentEmployeesWatch = form.watch('employees');
  const currentEquipmentWatch = form.watch('equipment');

  // If arrays have different lengths, they've changed
  // If arrays have same length, check if any item is different
  const equipmentHasChanged = selectedRow?.equipment_references
    ? selectedRow.equipment_references.length !== currentEquipmentWatch?.length ||
      !selectedRow.equipment_references.every((equipment) => currentEquipmentWatch?.includes(equipment.id!))
    : false;

  //Verificar que TODOS los ids sean iguales y esteen en el array
  const employeeHasChanged = selectedRow?.employees_references
    ? selectedRow.employees_references.length !== currentEmployeesWatch?.length ||
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
      status: (data.status as DailyReportRowStatus) || 'pendiente',
      areas_service_id: data.areas_service_id,
      sector_service_id: data.sector_service_id,
      remit_number: data.remit_number || null,
      type_service: data.type_service,
      cancel_reason: data.cancel_reason || null,
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
        document.getElementById('close-button-daily-report')?.click();

        // Si estamos en modo edición, limpiar el selectedRow
        if (selectedRow) {
          setSelectedRow(null);
        }

        // Resetear el formulario
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
        });

        // Restablecer los estados locales
        setSelectedCustomerId(null);
        setSelectedServiceId(null);
        router.refresh();
      },
      {
        loading: selectedRow ? 'Actualizando parte diario...' : 'Creando parte diario...',
        success: selectedRow ? 'Parte diario actualizado exitosamente' : 'Parte diario creado exitosamente',
        error: selectedRow ? 'Error al actualizar parte diario' : 'Error al crear parte diario',
      }
    );
  };

  useEffect(() => {
    // Si hay valores por defecto pero no hay cliente seleccionado
    if (defaultValues?.data_to_clone?.customer_id && !selectedCustomer) {
      const customer = customers?.find((c) => c.id === defaultValues.data_to_clone.customer_id);
      if (customer) {
        setSelectedCustomer(customer);
        setSelectedCustomerId(customer.id);
        form.setValue('customer', customer.id);
        // return; // Salir temprano, el resto se ejecutará en el siguiente render
      }
    }
    // Si hay valores por defecto, establecer type_service inmediatamente
    if (defaultValues?.type_service) {
      form.setValue('type_service', defaultValues.type_service as 'mensual' | 'adicional' | 'adicional_permanente');
    }
    if (defaultValues?.status) {
      form.setValue(
        'status',
        defaultValues.status as
          | 'pendiente'
          | 'sin_recursos_asignados'
          | 'ejecutado'
          | 'reprogramado'
          | 'cancelado'
          | '.'
          | '..'
      );
    }

    if (defaultValues && selectedCustomer) {
      const customer = selectedCustomer;
      form.setValue('customer', customer.id);
      setSelectedCustomerId(customer.id);

      // Verificar si el cliente tiene sectores y áreas disponibles
      const hasSectors = customer.customer_services?.some((s) => s.service_sectors?.length > 0);
      const hasAreas = customer.customer_services?.some((s) => s.service_areas?.length > 0);
      setIsSectorDisabled(!hasSectors);
      setIsAreaDisabled(!hasAreas);

      // Buscar y establecer el servicio
      if (defaultValues.services) {
        const service = customer.customer_services?.find(
          (s) => s.id === defaultValues.services || s.service_name === defaultValues.services
        );

        if (service?.id) {
          form.setValue('services', service.id);
          setSelectedServiceId(service.id);

          // Buscar y establecer el ítem
          if (service.service_items?.length > 0 && defaultValues.item) {
            const item = service.service_items.find(
              (i) => i.id === defaultValues.item || i.item_name === defaultValues.item
            );
            if (item) {
              form.setValue('item', item.id);
            }
          }
        }
      }

      // Establecer valores básicos
      form.setValue('working_day', defaultValues.working_day || '');
      form.setValue('start_time', defaultValues.start_time?.substring(0, 5) || '');
      form.setValue('end_time', defaultValues.end_time?.substring(0, 5) || '');
      form.setValue('status', defaultValues.status || 'pendiente');
      form.setValue('description', defaultValues.description || '');
      form.setValue('document_path', defaultValues.document_path || '');
      form.setValue('type_service', defaultValues.type_service as 'mensual' | 'adicional');
      form.setValue('cancel_reason', defaultValues.cancel_reason || '');

      // Establecer sector
      if (defaultValues.sector_customer_id) {
        form.setValue('sector_service_id', defaultValues.sector_customer_id);
      }

      // Establecer área
      if (defaultValues.areas_customer_id) {
        form.setValue('areas_service_id', defaultValues.areas_customer_id);
      }

      // Establecer empleados
      if (defaultValues.employees_references) {
        const employeeIds = defaultValues.employees_references.map((emp) => emp.id || '');
        form.setValue('employees', employeeIds);
      }

      if (defaultValues.customer_equipment) {
        const equipos_clienteIds = defaultValues.customer_equipment.map((eq) => eq.id || '');
        form.setValue('equipos_cliente', equipos_clienteIds);
      }

      // Establecer equipos
      if (Array.isArray(defaultValues.equipment_references) && defaultValues.equipment_references.length > 0) {
        const equipmentIds = defaultValues.equipment_references.map((eq) => eq.id || '');
        form.setValue('equipment', equipmentIds);
      }
    }
  }, [selectedCustomer, defaultValues, form, customers, selectedServiceId]);

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

  // Filtrar empleados del cliente seleccionado
  const filteredEmployees = useMemo(() => {
    if (!selectedCustomerId) return [];
    return (
      employees?.filter(
        (employee) =>
          employee.is_active &&
          employee.contractor_employee?.some((ce) => ce.contractor_id === selectedCustomerId) &&
          employee.workflow_diagram // Verificar si tiene diagrama de trabajo
      ) || []
    );
  }, [employees, selectedCustomerId]);

  // Filtrar equipos del cliente seleccionado
  const filteredEquipments = useMemo(() => {
    if (!selectedCustomerId) return [];
    return (
      equipments?.filter((equipment) =>
        equipment.contractor_equipment?.some((ce) => ce.contractor_id === selectedCustomerId)
      ) || []
    );
  }, [equipments, selectedCustomerId]);

  // Manejar cambio de cliente
  const handleCustomerChange = (customerId: string) => {
    const customer = customers?.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer); // Ahora es un array
      setSelectedCustomerId(customerId);
      form.setValue('customer', customerId);
      form.setValue('services', '');
      form.setValue('item', '');
      form.setValue('sector_service_id', '');
      form.setValue('areas_service_id', '');
      setSelectedServiceId(null);

      // Verificar si el cliente tiene sectores y áreas disponibles
      const hasSectors = customer.customer_services?.some((s) => s.service_sectors?.length > 0);
      const hasAreas = customer.customer_services?.some((s) => s.service_areas?.length > 0);

      setIsSectorDisabled(!hasSectors);
      setIsAreaDisabled(!hasAreas);
    }
  };
  // Efecto para controlar la habilitación del campo de ítem
  useEffect(() => {
    if (selectedServiceId && selectedCustomer?.customer_services?.length) {
      // Buscar el servicio seleccionado
      const selectedService = selectedCustomer.customer_services.find((service) => service.id === selectedServiceId);

      // Verificar si el servicio tiene ítems activos
      const hasItems = selectedService?.service_items?.some((item) => item.is_active) || false;

      // Si no hay ítems, limpiar el valor
      if (!hasItems) {
        form.setValue('item', '');
      }
    } else {
      form.setValue('item', '');
    }
  }, [selectedServiceId, selectedCustomer, form]);

  // Manejar cambio de servicio
  const handleServiceChange = (serviceId: string) => {
    form.setValue('services', serviceId);
    form.setValue('item', '');
    setSelectedServiceId(serviceId);
  };

  const onCancel = () => {
    // Cerrar el modal
    document.getElementById('close-button-daily-report')?.click();

    // Si estamos en modo edición, limpiar el selectedRow
    if (selectedRow) {
      setSelectedRow(null);
    }

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
    });

    // Restablecer estados
    setSelectedCustomerId(null);
    setSelectedServiceId(null);
    setIsServiceDisabled(true);
    setIsSectorDisabled(true); // Asegurar que el campo de sector esté deshabilitado
    setIsAreaDisabled(true); // Asegurar que el campo de área esté deshabilitado
  };

  // Estado para controlar la habilitación de los campos
  const [isServiceDisabled, setIsServiceDisabled] = useState<boolean>(true);

  // Efecto para habilitar/deshabilitar el select de servicio
  useEffect(() => {
    setIsServiceDisabled(!selectedCustomerId);
  }, [selectedCustomerId]);

  const workingDayOptions = [
    { label: 'Jornada 8 horas', value: 'jornada 8 horas' },
    { label: 'Jornada 12 horas', value: 'jornada 12 horas' },
    { label: 'Jornada 24 horas', value: 'jornada 24 horas' },
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
                : 'Complete los campos para agregar un nuevo parte diario.'}
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
                                  disabled={disabled}
                                  className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
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
                              .filter((sector) => sector.sectors)
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
                            <FormLabel>Sector del Cliente</FormLabel>
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
                                          ? 'Seleccionar sector'
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
                              .filter((area) => area.areas_cliente)
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
                                    const maxSelected = (field.value?.length || 0) >= 2;
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
                          {currentStatusWatch === 'ejecutado' && (
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
                                  : filteredEmployees.length === 0
                                    ? 'No hay empleados activos para este cliente.'
                                    : 'No se encontraron empleados que coincidan.'}
                              </CommandEmpty>
                              {selectedCustomerId && (
                                <div className="px-3 py-1.5 text-xs text-muted-foreground">
                                  Nota: Los empleados no afectados y sin diagrama no se muestran en la lista.
                                </div>
                              )}

                              {!selectedCustomerId && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  Por favor, seleccione un cliente primero.
                                </div>
                              )}

                              {selectedCustomerId && filteredEmployees.length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No hay empleados activos para este cliente.
                                </div>
                              )}

                              {selectedCustomerId && filteredEmployees.length > 0 && (
                                <CommandGroup>
                                  {filteredEmployees.map((employee) => (
                                    <CommandItem
                                      value={employee.id}
                                      key={employee.id}
                                      onSelect={() => {
                                        const currentValues = field.value || [];
                                        const newValues = currentValues.includes(employee.id)
                                          ? currentValues.filter((id) => id !== employee.id)
                                          : [...currentValues, employee.id];
                                        field.onChange(newValues);
                                      }}
                                    >
                                      <div className="flex items-center">
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            field.value?.includes(employee.id) ? 'opacity-100' : 'opacity-0'
                                          )}
                                        />
                                        {employee.firstname + ' ' + employee.lastname}
                                      </div>
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
                  )}
                />

                {/* Equipos */}
                <FormField
                  control={form.control}
                  name="equipment"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Equipos propios</FormLabel>
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
                                  : filteredEquipments.length === 0
                                    ? 'No hay equipos activos para este cliente.'
                                    : 'No se encontraron equipos que coincidan.'}
                              </CommandEmpty>
                              {selectedCustomerId && (
                                <div className="px-3 py-1.5 text-xs text-muted-foreground">
                                  Nota: Los equipos no operativos ni afectados al cliente seleccionado no se muestran en
                                  la lista.
                                </div>
                              )}

                              {!selectedCustomerId && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  Por favor, seleccione un cliente primero.
                                </div>
                              )}

                              {selectedCustomerId && filteredEquipments.length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No hay equipos activos para este cliente.
                                </div>
                              )}

                              {selectedCustomerId && filteredEquipments.length > 0 && (
                                <CommandGroup>
                                  {filteredEquipments.map((equipment) => (
                                    <CommandItem
                                      value={equipment.intern_number || equipment.domain || ''}
                                      key={equipment.id}
                                      disabled={!selectedCustomerId}
                                      onSelect={() => {
                                        const currentValues = field.value || [];
                                        const newValues = currentValues.includes(equipment.id)
                                          ? currentValues.filter((id) => id !== equipment.id)
                                          : [...currentValues, equipment.id];
                                        field.onChange(newValues);
                                      }}
                                    >
                                      <div className="flex items-center">
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            field.value?.includes(equipment.id) ? 'opacity-100' : 'opacity-0'
                                          )}
                                        />
                                        {equipment.domain || equipment.intern_number}
                                      </div>
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
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Jornada</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
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
                  )}
                />

                {/* Horario (condicional) */}
                {/* {form.watch('working_day') === 'por horario' && (
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
                )} */}

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
