'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Textarea } from '@/components/ui/textarea';
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
  updateDailyReportStatusAndRemitNumber,
} from '@/features/Operaciones/PartesDiarios/actions/actions';
import { transformDailyReports } from '@/features/Operaciones/PartesDiarios/components/DayliReportDetailTable';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building, CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type DailyReportFormProps = {
  // onSubmit: (data: DailyReportFormValues) => void;
  // onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRow: any;
  refetchDailyReport: () => void;
  defaultValues?: ReturnType<typeof transformDailyReports>[number] | null;
  customers: Awaited<ReturnType<typeof getCustomers>>;
  // customers_services: Awaited<ReturnType<typeof getCustomersServices>>;
  // service_items: Awaited<ReturnType<typeof getServiceItems>>;
  employeesPromise: ReturnType<typeof getActiveEmployeesForDailyReport>;
  equipmentsPromise: ReturnType<typeof getActiveEquipmentsForDailyReport>;
  dailyReport: Awaited<ReturnType<typeof getDailyReportById>>;
  // selectedRow?: ReturnType<typeof transformDailyReports>[number] | null;
  setSelectedRow: (row: ReturnType<typeof transformDailyReports>[number] | null) => void;
  disabled?: boolean;
  // customersAreas: Awaited<ReturnType<typeof getCustomersAreas>>;
  // customersSectors: Awaited<ReturnType<typeof getCustomersSectors>>;
  formattedData: ReturnType<typeof transformDailyReports>;
  isCreating?: boolean; // Nueva prop para indicar modo creación
};

export const dailyReportSchema = z
  .object({
    date: z.date().optional(), // Campo de fecha para modo creación
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
    status: z
      .enum(['pendiente', 'sin_recursos_asignados', 'ejecutado', 'reprogramado', 'cancelado', 'en_certificacion'])
      .default('en_certificacion'), // Estado inicial para modo creación
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
      if (data.status === 'en_certificacion') {
        return data.remit_number && data.remit_number.trim() !== '';
      }
      return true;
    },
    {
      message: 'El número de remito es obligatorio cuando el estado es "En certificación"',
      path: ['remit_number'],
    }
  )
  .refine(
    (data) => {
      // Validación: Al menos 1 empleado O 1 equipo propio (para modo creación)
      const hasEmployees = data.employees && data.employees.length > 0;
      const hasEquipment = data.equipment && data.equipment.length > 0;
      return hasEmployees || hasEquipment;
    },
    {
      message: 'Debe seleccionar al menos un empleado o un equipo propio',
      path: ['employees'],
    }
  );
export type DailyReportFormValues = z.infer<typeof dailyReportSchema>;
type CustomersArray = Awaited<ReturnType<typeof getCustomers>>;
type CustomerType = NonNullable<NonNullable<CustomersArray>[number]>;
export function DailyReportForm({
  open,
  onOpenChange,
  defaultValues,
  customers,
  setSelectedRow,
  employeesPromise,
  equipmentsPromise,
  selectedRow,
  disabled,
  formattedData,
  dailyReport,
  refetchDailyReport,
  isCreating = false,
}: DailyReportFormProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null);
  const [isSectorDisabled, setIsSectorDisabled] = useState<boolean>(true);
  const [isAreaDisabled, setIsAreaDisabled] = useState<boolean>(true);

  const activeCustomers = customers?.filter((c) => c.is_active) || [];
  const router = useRouter();

  const form = useForm<DailyReportFormValues>({
    resolver: zodResolver(dailyReportSchema),
    defaultValues: {
      date: isCreating ? undefined : undefined,
      customer: '',
      services: '',
      item: '',
      employees: [],
      equipment: [],
      working_day: '',
      start_time: '',
      end_time: '',
      status: isCreating ? 'en_certificacion' : 'pendiente',
      description: '',
      document_path: '',
      sector_service_id: '',
      areas_service_id: '',
      remit_number: isCreating ? '' : '',
      equipos_cliente: [],
      cancel_reason: '',
      type_service: defaultValues?.type_service || undefined,
    },
  });

  const currentEmployeesWatch = form.watch('employees');
  const currentEquipmentWatch = form.watch('equipment');
  const currentStatus = form.watch('status');
  const currentDate = form.watch('date');

  // Obtener fecha del parte diario para mostrar en el header
  const reportDate = useMemo(() => {
    if (isCreating) {
      return currentDate ? format(currentDate, 'dd/MM/yyyy', { locale: es }) : null;
    } else {
      // Función helper para parsear fecha en formato DD-MM-YYYY
      const parseDate = (dateValue: string | Date): string | null => {
        if (!dateValue) return null;

        try {
          // Si es string y tiene formato DD-MM-YYYY
          if (typeof dateValue === 'string' && dateValue.includes('-')) {
            const parts = dateValue.split('-');
            // Verificar si es formato DD-MM-YYYY (primer parte tiene 2 dígitos)
            if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2) {
              const parsedDate = parse(dateValue, 'dd-MM-yyyy', new Date());
              return format(parsedDate, 'dd/MM/yyyy', { locale: es });
            }
          }
          // Si es Date o formato ISO, usar directamente
          return format(new Date(dateValue), 'dd/MM/yyyy', { locale: es });
        } catch (error) {
          // Si falla el parseo, mostrar la fecha tal como viene
          return typeof dateValue === 'string' ? dateValue : null;
        }
      };

      // En modo edición, usar la fecha del selectedRow o del dailyReport
      if (selectedRow?.date) {
        return parseDate(selectedRow.date);
      } else if (dailyReport && 'date' in dailyReport && dailyReport.date) {
        return parseDate(dailyReport.date as string);
      }
      return null;
    }
  }, [isCreating, currentDate, selectedRow, dailyReport]);

  // Re-validar el formulario cuando cambie el status
  // useEffect(() => {
  //   if (currentStatus === 'en_certificacion') {
  //     form.trigger('remit_number');
  //   }
  // }, [currentStatus, form]);

  // const checkEmployeeDuplicates = (employeeIds: string[]) => {
  //   if (!formattedData || !employeeIds?.length) return [];
  //   const duplicates: string[] = [];
  //   employeeIds.forEach((employeeId) => {
  //     const duplicateRows = formattedData.filter((row) => {
  //       if (selectedRow && row.id === selectedRow.id) return false;
  //       return row.employees_references?.some((emp) => emp.id === employeeId);
  //     });
  //   });
  //   return duplicates;
  // };

  // const checkEquipmentDuplicates = (equipmentIds: string[]) => {
  //   if (!formattedData || !equipmentIds?.length) return [];
  //   const duplicates: string[] = [];
  //   equipmentIds.forEach((equipmentId) => {
  //     const duplicateRows = formattedData.filter((row) => {
  //       if (selectedRow && row.id === selectedRow.id) return false;
  //       return row.equipment_references?.some((eq) => eq.id === equipmentId);
  //     });
  //   });
  //   return duplicates;
  // };

  const equipmentHasChanged = selectedRow?.equipment_references
    ? selectedRow.equipment_references.length > (currentEquipmentWatch?.length || 0) ||
      !selectedRow.equipment_references.every((equipment: any) => currentEquipmentWatch?.includes(equipment.id!))
    : false;

  const employeeHasChanged = selectedRow?.employees_references
    ? selectedRow.employees_references.length > (currentEmployeesWatch?.length || 0) ||
      !selectedRow.employees_references.every((employee: any) => currentEmployeesWatch?.includes(employee.id!))
    : false;

  const onSubmit = async (data: DailyReportFormValues) => {
    try {
      if (isCreating) {
        // MODO CREACIÓN
        if (!data.date) {
          toast.error('Debe seleccionar una fecha.');
          return;
        }

        if (!data.remit_number) {
          toast.error('El número de remito es obligatorio.');
          return;
        }

        const formattedDate = format(data.date, 'yyyy-MM-dd');

        // 1. Verificar si existe daily_report para esa fecha
        const existingReports = await checkDailyReportExists([formattedDate]);
        let dailyReportId: string;

        if (existingReports && existingReports.length > 0) {
          dailyReportId = existingReports[0].id;
        } else {
          // 2. Crear daily_report si no existe
          const createdReports = await createDailyReport([formattedDate]);
          if (!createdReports || createdReports.length === 0) {
            toast.error('Error al crear el parte diario.');
            return;
          }
          dailyReportId = createdReports[0].id;
        }

        // 3. Crear daily_report_row
        const rowData = {
          daily_report_id: dailyReportId,
          customers_id: data.customer,
          customer_services_id: data.services,
          service_items_id: data.item,
          working_day: data.working_day,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          status: 'en_certificacion',
          description: data.description || null,
          type_service: data.type_service || null,
          areas_service_id: data.areas_service_id || null,
          sector_service_id: data.sector_service_id || null,
          remit_number: data.remit_number,
          completed_day: data.completed_day || false,
          completed_night: data.completed_night || false,
        };

        const createdRows = await createDailyReportRow([rowData as any]);
        if (!createdRows || createdRows.length === 0) {
          toast.error('Error al crear la línea del parte diario.');
          return;
        }

        const newRowId = createdRows[0].id;

        // 4. Crear relaciones de empleados
        if (data.employees && data.employees.length > 0) {
          await createDailyReportEmployeeRelations(newRowId, data.employees);
        }

        // 5. Crear relaciones de equipos
        if (data.equipment && data.equipment.length > 0) {
          await createDailyReportEquipmentRelations(newRowId, data.equipment);
        }

        // 6. Crear relaciones de equipos de cliente
        if (data.equipos_cliente && data.equipos_cliente.length > 0) {
          await createDailyReportCustomerEquipmentRelations(newRowId, data.equipos_cliente);
        }

        toast.success('Línea creada exitosamente.');
      } else {
        // MODO EDICIÓN
        const currentStatusInRow = selectedRow?.status;
        const isChangingToCertificacion = data.status === 'en_certificacion';

        if (isChangingToCertificacion) {
          if (!data.remit_number) {
            form.trigger('remit_number');
            toast.error('El número de remito es obligatorio para el estado "En certificación".');
            return;
          }
          if (currentStatusInRow !== 'ejecutado') {
            toast.error('El estado solo puede cambiar a "en_certificacion" si el parte ya está en estado "ejecutado".');
            return;
          }
        }

        const updateData = {
          status: data.status,
          remit_number: isChangingToCertificacion ? data.remit_number : null,
        };
        await updateDailyReportStatusAndRemitNumber(selectedRow.id, updateData as any);

        toast.success('Parte diario actualizado exitosamente.');
      }

      document.getElementById('close-button-daily-report')?.click();
      setSelectedRow(null);
      form.reset();
      setSelectedCustomerId(null);
      setSelectedServiceId(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error(isCreating ? 'Error al crear la línea.' : 'Error al actualizar el parte diario.');
    }
    refetchDailyReport();
    router.refresh();
  };
  // En tu archivo DailyReportRowForm.tsx

  // ...

  // Rellena el formulario con los datos de la fila seleccionada
  // En tu archivo DailyReportRowForm.tsx
  // En tu archivo DailyReportRowForm.tsx

  // ...

  // Rellena el formulario con los datos de la fila seleccionada
  // Reemplaza el useEffect existente por este
  useEffect(() => {
    if (selectedRow) {
      const dataToReset = {
        ...selectedRow,
        date: new Date(selectedRow.date),
        employees: selectedRow.employees_references?.map((e: any) => e.id) || [],
        equipment: selectedRow.equipment_references?.map((e: any) => e.id) || [],
        customers_id: selectedRow.data_to_clone?.customer_id,
        customer_services_id: selectedRow.data_to_clone?.service_id,
        service_items_id: selectedRow.data_to_clone?.item_id,
        service_areas_id: selectedRow.data_to_clone?.areas_service_id,
        service_sectors_id: selectedRow.data_to_clone?.sector_service_id,
        // Agrega estas dos líneas para pasar el nombre y el ID
        area: selectedRow.area,
        sector: selectedRow.sector,
        remit_number: selectedRow.remit_number,
        description: selectedRow.description,
        status: selectedRow.status,
        start_time: selectedRow.start_time,
        end_time: selectedRow.end_time,
        working_day: selectedRow.working_day,
        completed_day: selectedRow.completed_day,
        completed_night: selectedRow.completed_night,
        customer_equipment: selectedRow.customer_equipment,
      };

      form.reset(dataToReset);
    }
  }, [selectedRow, form]);
  //                       👆  👆  Agrega estas dependencias  👆  👆

  // ...

  // ...

  const customerServices = useMemo(() => {
    if (!selectedCustomer?.customer_services?.length) return [];

    return selectedCustomer.customer_services.filter(
      (service) => service.is_active && (!service.service_validity || new Date(service.service_validity) >= new Date())
    );
  }, [selectedCustomer, selectedRow]);

  const serviceItems = useMemo(() => {
    if (!selectedServiceId || !selectedCustomer?.customer_services?.length) return [];

    const selectedService = selectedCustomer.customer_services.find((service) => service.id === selectedServiceId);

    return selectedService?.service_items?.filter((item) => item.is_active) || [];
  }, [selectedCustomer, selectedServiceId, selectedRow]);

  const handleCustomerChange = (customerId: string) => {
    const customer = customers?.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setSelectedCustomerId(customerId);
      form.setValue('customer', customerId);
      form.setValue('services', '');
      form.setValue('item', '');
      form.setValue('sector_service_id', '');
      form.setValue('areas_service_id', '');
      setSelectedServiceId(null);

      const hasSectors = customer.customer_services?.some((s) => s.service_sectors?.length > 0);
      const hasAreas = customer.customer_services?.some((s) => s.service_areas?.length > 0);

      setIsSectorDisabled(!hasSectors);
      setIsAreaDisabled(!hasAreas);
    }
  };
  useEffect(() => {
    if (selectedServiceId && selectedCustomer?.customer_services?.length) {
      const selectedService = selectedCustomer.customer_services.find((service) => service.id === selectedServiceId);

      const hasItems = selectedService?.service_items?.some((item) => item.is_active) || false;

      if (!hasItems) {
        form.setValue('item', '');
      }
    } else {
      form.setValue('item', '');
    }
  }, [selectedServiceId, selectedCustomer, form]);

  const handleServiceChange = (serviceId: string) => {
    form.setValue('services', serviceId);
    form.setValue('item', '');
    setSelectedServiceId(serviceId);
  };

  const onCancel = () => {
    document.getElementById('close-button-daily-report')?.click();

    if (selectedRow) {
      setSelectedRow(null);
    }

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

    setSelectedCustomerId(null);
    setSelectedServiceId(null);
    setSelectedCustomer(null);
    setIsServiceDisabled(true);
    setIsSectorDisabled(true);
    setIsAreaDisabled(true);
  };

  const [isServiceDisabled, setIsServiceDisabled] = useState<boolean>(true);

  useEffect(() => {
    setIsServiceDisabled(!selectedCustomerId);
  }, [selectedCustomerId]);

  const workingDayOptions = [
    { label: 'Jornada 8 horas', value: 'jornada 8 horas' },
    { label: 'Jornada 12 horas', value: 'jornada 12 horas' },
    { label: 'Jornada 24 horas', value: 'jornada 24 horas' },
    { label: 'Por horario', value: 'por horario' },
  ];

  const handleOpenChange = (open: boolean) => {
    if (!open && selectedRow) {
      onCancel();
    }
  };

  return (
    <div>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          {/* <Button id="open-button-daily-report" variant="default">
            {selectedRow ? 'Editar' : 'Agregar'}
          </Button> */}
        </SheetTrigger>
        <SheetContent className="sm:max-w-screen-md overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>{isCreating ? 'Crear Línea de Parte Diario' : 'Editar Parte Diario'}</SheetTitle>
              {reportDate && (
                <Badge variant="outline" className="text-sm font-normal">
                  Fecha: {reportDate}
                </Badge>
              )}
            </div>
            <SheetDescription>
              {isCreating
                ? 'Complete los campos para crear una nueva línea. Estado inicial: En certificación.'
                : 'Actualice los campos necesarios para modificar el parte diario.'}
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
                    {/* Campo de Fecha - Solo visible en modo creación */}
                    {isCreating && (
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha del Parte Diario *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'w-full pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, 'PPP', { locale: es })
                                    ) : (
                                      <span>Seleccione una fecha</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
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
                                  disabled={!isCreating} // Editable solo en modo creación
                                  className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                                >
                                  {isCreating
                                    ? field.value
                                      ? activeCustomers.find((c) => c.id === field.value)?.name
                                      : 'Seleccionar cliente'
                                    : selectedRow?.customer}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="max-w-[400px] p-0">
                              <Command>
                                <CommandInput placeholder="Buscar cliente..." className="h-9" disabled={!isCreating} />
                                <CommandList>
                                  <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                                  <div className="px-3 py-1.5 text-xs text-muted-foreground">
                                    Nota: Los clientes dados de baja no se muestran en la lista.
                                  </div>
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
                                        disabled={!isCreating}
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
                                  disabled={!isCreating} // Editable solo en modo creación
                                  className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                                >
                                  {isCreating
                                    ? field.value
                                      ? customerServices.find((s) => s.id === field.value)?.service_name
                                      : 'Seleccionar servicio'
                                    : selectedRow?.services}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="max-w-[400px] p-0">
                              <Command>
                                <CommandInput placeholder="Buscar servicio..." className="h-9" disabled={!isCreating} />
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
                                              disabled={!isCreating}
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
                                  disabled={!isCreating} // Editable solo en modo creación
                                  className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                                >
                                  {isCreating
                                    ? field.value
                                      ? serviceItems.find((i) => i.id === field.value)?.item_name
                                      : 'Seleccionar ítem'
                                    : selectedRow?.item}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-full p-0">
                              <Command>
                                <CommandInput
                                  placeholder={!selectedServiceId ? 'Seleccione un servicio primero' : 'Buscar ítem...'}
                                  className="h-9"
                                  disabled={!isCreating}
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
                                                value={`${item.id}-${item.item_name}`}
                                                key={item.id}
                                                onSelect={() => {
                                                  form.setValue('item', item.id);
                                                }}
                                                className={cn('group', isSelected ? '' : '')}
                                                disabled
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
                        const customerSectors = Array.from(
                          new Set(
                            selectedCustomer?.customer_services
                              ?.flatMap((service) => service.service_sectors || [])
                              .filter((sector) => sector.sectors && sector.service_id === selectedServiceId)
                              .map((sector) => ({ sector_id: sector.sectors?.id, id: sector.id }))
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
                                    {selectedRow?.sector || 'Seleccionar sector'}
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
                                return { id: area.id, area_id: area.areas_cliente?.id };
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
                                    {selectedRow?.area || 'Seleccionar área'}
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
                  </div>
                </div>

                {/* Fecha y Horario */}
                <div className="space-y-4 rounded-lg dark:bg-slate-900 bg-slate-50 p-4 w-full">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Fechas y Horarios
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {/* Tipo de jornada */}
                    <FormField
                      control={form.control}
                      name="working_day"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Jornada</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                              disabled={!isCreating} // Editable solo en modo creación
                            >
                              {workingDayOptions.map((option) => (
                                <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value={option.value} disabled={!isCreating} />
                                  </FormControl>
                                  <FormLabel className="font-normal">{option.label}</FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Horas */}
                    {form.watch('working_day') === 'por horario' && (
                      <>
                        <div className="flex flex-col gap-4">
                          <FormField
                            control={form.control}
                            name="start_time"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hora de inicio</FormLabel>
                                <FormControl>
                                  <Input type="time" disabled={!isCreating} {...field} />
                                </FormControl>
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
                                <FormControl>
                                  <Input type="time" disabled={!isCreating} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {/* Empleados */}
                <div className="space-y-4 rounded-lg dark:bg-slate-900 bg-slate-50 p-4 w-full">
                  <div className="pt-2 gap-4 w-full">
                    <FormField
                      control={form.control}
                      name="employees"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Empleados</FormLabel>
                          <FormControl>
                            <Input disabled={true} value={selectedRow?.employees?.join(', ') || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="equipment"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Equipos Empresa</FormLabel>
                          <FormControl>
                            <Input disabled={true} value={selectedRow?.equipment?.join(', ') || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="equipos_cliente"
                      render={({ field }) => {
                        // Extraer solo los nombres de los equipos si es un array de objetos
                        const equipmentNames = Array.isArray(selectedRow?.customer_equipment)
                          ? selectedRow.customer_equipment
                              .map((eq: any) =>
                                typeof eq === 'object' ? eq.name || eq.equipment_name || 'Equipo sin nombre' : eq
                              )
                              .filter(Boolean)
                              .join(', ')
                          : '';

                        return (
                          <FormItem className="flex flex-col">
                            <FormLabel>Equipos de Cliente</FormLabel>
                            <FormControl>
                              <Input disabled={true} value={equipmentNames} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </div>
                {/* Estado */}
                <div className="space-y-4 rounded-lg dark:bg-slate-900 bg-slate-50 p-4 w-full">
                  <div className="grid grid-cols-1 gap-4 w-full">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => {
                        const isEditable = !disabled;
                        const statusOptions = [
                          { value: 'pendiente', label: 'Pendiente' },
                          { value: 'sin_recursos_asignados', label: 'Sin recursos asignados' },
                          { value: 'ejecutado', label: 'Ejecutado' },
                          { value: 'reprogramado', label: 'Reprogramado' },
                          { value: 'cancelado', label: 'Cancelado' },
                          { value: 'en_certificacion', label: 'En certificación' },
                        ];

                        // Filter options based on current status - only show ejecutado and en_certificacion
                        const filteredOptions = statusOptions.filter(
                          (opt) => opt.value === 'ejecutado' || opt.value === 'en_certificacion'
                        );

                        return (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar estado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {filteredOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage>
                              {form.formState.errors.status && (
                                <span className="text-error">{form.formState.errors.status.message}</span>
                              )}
                            </FormMessage>
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                  <div className="space-y-4 rounded-lg dark:bg-slate-900 bg-slate-50 p-4 w-full">
                    {/* Número de remito */}
                    {currentStatus === 'en_certificacion' && (
                      <FormField
                        control={form.control}
                        name="remit_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de remito</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Número de remito"
                                disabled={currentStatus !== 'en_certificacion' || disabled}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage>{form.formState.errors.remit_number?.message}</FormMessage>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
                {/* Descripción */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          disabled={!isCreating}
                          placeholder="Ingrese una descripción"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-4 pt-4">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const formData = form.getValues();
                      onSubmit(formData).catch(console.error);
                    }}
                  >
                    {isCreating ? 'Crear' : 'Actualizar'}
                  </Button>
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
