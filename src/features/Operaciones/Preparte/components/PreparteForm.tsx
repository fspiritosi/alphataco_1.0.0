// 'use client';

// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
// import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
// import { Input } from '@/components/ui/input';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Textarea } from '@/components/ui/textarea';
// import { cn } from '@/lib/utils';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { Building, CalendarIcon, Check, ChevronsUpDown, X } from 'lucide-react';
// import { useRouter } from 'next/navigation';
// import { useEffect, useMemo, useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { z } from 'zod';
// import {
//   checkDailyReportExists,
//   createDailyReport,
//   createDailyReportCustomerEquipmentRelations,
//   createDailyReportEmployeeRelations,
//   createDailyReportEquipmentRelations,
//   createDailyReportRow,
//   getActiveEmployeesForDailyReport,
//   getActiveEquipmentsForDailyReport,
//   getCustomers,
//   getDailyReportById,
//   updateDailyReportRow,
// } from '@/features/Operaciones/PartesDiarios/actions/actions';

// import { Calendar } from '@/components/ui/calendar';
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// import {
//   Sheet,
//   SheetClose,
//   SheetContent,
//   SheetDescription,
//   SheetFooter,
//   SheetHeader,
//   SheetTitle,
//   SheetTrigger,
// } from '@/components/ui/sheet';
// import { format } from 'date-fns';
// import { es } from 'date-fns/locale';
// import moment from 'moment';
// import { toast } from 'sonner';
// import { transformDailyReports } from '@/features/Operaciones/PartesDiarios/components/DayliReportDetailTable';
// import { SearchEmployee } from '@/features/Operaciones/PartesDiarios/components/SearchEmployee';
// import { SearchEquipment } from '@/features/Operaciones/PartesDiarios/components/SearchEquipment';

// type DailyReportFormProps = {
//   // onSubmit: (data: DailyReportFormValues) => void;
//   // onCancel: () => void;
//   defaultValues?: ReturnType<typeof transformDailyReports>[number] | null;
//   customers: Awaited<ReturnType<typeof getCustomers>>;
//   // customers_services: Awaited<ReturnType<typeof getCustomersServices>>;
//   // service_items: Awaited<ReturnType<typeof getServiceItems>>;
//   employees: Awaited<ReturnType<typeof getActiveEmployeesForDailyReport>>;
//   equipments: Awaited<ReturnType<typeof getActiveEquipmentsForDailyReport>>;
//   dailyReport: Awaited<ReturnType<typeof getDailyReportById>>;
//   selectedRow?: ReturnType<typeof transformDailyReports>[number] | null;
//   setSelectedRow: (row: ReturnType<typeof transformDailyReports>[number] | null) => void;
//   disabled?: boolean;
//   // customersAreas: Awaited<ReturnType<typeof getCustomersAreas>>;
//   // customersSectors: Awaited<ReturnType<typeof getCustomersSectors>>;
//   formattedData: ReturnType<typeof transformDailyReports>;
// };

// export const dailyReportSchema = z
//   .object({
//     requestDate: z.date({
//       required_error: 'La fecha de solicitud es requerida',
//     }),
//     executionDate: z.date({
//       required_error: 'La fecha de ejecución es requerida',
//     }),
//     client: z.string({
//       required_error: 'El cliente es requerido',
//     }),
//   })
//   .refine(
//     (data) => {
//       if (data.executionDate < data.requestDate) {
//         return false;
//       }
//       return true;
//     },
//     {
//       message: 'La fecha de ejecución debe ser mayor o igual a la fecha de solicitud',
//       path: ['executionDate'],
//     }
//   );

// export type DailyReportFormValues = z.infer<typeof dailyReportSchema>;

// export function PreParteForm({
//   defaultValues,
//   customers,
//   setSelectedRow,
//   employees,
//   equipments,
//   selectedRow,
//   disabled,
//   formattedData,
//   dailyReport,
// }: DailyReportFormProps) {
//   const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
//   const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
//   const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null);
//   const [isSectorDisabled, setIsSectorDisabled] = useState<boolean>(true);
//   const [isAreaDisabled, setIsAreaDisabled] = useState<boolean>(true);
//   const router = useRouter();
//   // Filtros de clientes
//   const activeCustomers = customers?.filter((c) => c.is_active) || [];

//   const form = useForm<DailyReportFormValues>({
//     resolver: zodResolver(dailyReportSchema),
//     defaultValues: {
//       requestDate: '',
//       executionDate: '',
//       client: '',
//     },
//   });

//   const currentEmployeesWatch = form.watch('employees');
//   const currentEquipmentWatch = form.watch('equipment');

//   // Funciones para detectar duplicados
//   const checkEmployeeDuplicates = (employeeIds: string[]) => {
//     if (!formattedData || !employeeIds?.length) return [];

//     const duplicates: string[] = [];

//     employeeIds.forEach((employeeId) => {
//       const duplicateRows = formattedData.filter((row) => {
//         // Excluir la fila actual si estamos editando
//         if (selectedRow && row.id === selectedRow.id) return false;

//         return row.employees_references?.some((emp) => emp.id === employeeId);
//       });

//       if (duplicateRows.length > 0) {
//         const employee = employees?.find((emp) => emp.id === employeeId);
//         if (employee) {
//           duplicates.push(`${employee.lastname} ${employee.firstname}`);
//         }
//       }
//     });

//     return duplicates;
//   };

//   const checkEquipmentDuplicates = (equipmentIds: string[]) => {
//     if (!formattedData || !equipmentIds?.length) return [];

//     const duplicates: string[] = [];

//     equipmentIds.forEach((equipmentId) => {
//       const duplicateRows = formattedData.filter((row) => {
//         // Excluir la fila actual si estamos editando
//         if (selectedRow && row.id === selectedRow.id) return false;

//         return row.equipment_references?.some((eq) => eq.id === equipmentId);
//       });

//       if (duplicateRows.length > 0) {
//         const equipment = equipments?.find((eq) => eq.id === equipmentId);
//         if (equipment) {
//           duplicates.push(`${equipment.domain}`);
//         }
//       }
//     });

//     return duplicates;
//   };

//   // Detectar duplicados en tiempo real
//   const duplicateEmployees = checkEmployeeDuplicates(currentEmployeesWatch || []);
//   const duplicateEquipments = checkEquipmentDuplicates(currentEquipmentWatch || []);

//   // If arrays have different lengths, they've changed
//   // If arrays have same length, check if any item is different
//   const equipmentHasChanged = selectedRow?.equipment_references
//     ? selectedRow.equipment_references.length > (currentEquipmentWatch?.length || 0) ||
//       !selectedRow.equipment_references.every((equipment) => currentEquipmentWatch?.includes(equipment.id!))
//     : false;

//   const employeeHasChanged = selectedRow?.employees_references
//     ? selectedRow.employees_references.length > (currentEmployeesWatch?.length || 0) ||
//       !selectedRow.employees_references.every((employee) => currentEmployeesWatch?.includes(employee.id!))
//     : false;
//   const onSubmit = async (data: DailyReportFormValues) => {
//     //Si equipmentHasChanged o employeeHasChanged es true y reasigment_reason es null, mostrar error
//     if (equipmentHasChanged || employeeHasChanged) {
//       if (!data.reasigment_reason) {
//         form.setError('reasigment_reason', {
//           type: 'manual',
//           message: 'Debe ingresar un motivo de reasignación',
//         });
//         return;
//       }
//     }

//     // Asegurarse de que los empleados sean un array de IDs
//     const employeeIds = Array.isArray(data.employees)
//       ? data.employees.filter((emp): emp is string => typeof emp === 'string')
//       : [];

//     // Asegurarse de que los equipos sean un array de IDs
//     const equipmentIds = Array.isArray(data.equipment)
//       ? data.equipment.filter((eq): eq is string => typeof eq === 'string')
//       : [];

//     const equipos_clienteIds = Array.isArray(data.equipos_cliente)
//       ? data.equipos_cliente.filter((eq): eq is string => typeof eq === 'string')
//       : [];

//     const rowData = {
//       customer_id: data.client,
//       requestDate: data.requestDate,
//       executionDate: data.executionDate,
//       daily_report_id: dailyReport[0]?.id,
//     };

//     toast.promise(
//       async () => {
//         if (selectedRow) {
//           const employeeIdsUpdated =
//             employees?.filter((emp) => data?.employees?.includes(emp.id))?.map((emp) => emp.id) || [];
//           const equipmentIdsUpdated =
//             equipments?.filter((eq) => data?.equipment?.includes(eq.id))?.map((eq) => eq.id) || [];

//           // Modo edición
//           await updateDailyReportRow(
//             selectedRow.id,
//             rowData,
//             employeeIdsUpdated,
//             equipmentIdsUpdated,
//             data?.equipos_cliente || [],
//             {
//               equipmentHasChanged,
//               employeeHasChanged,
//               reassignmentReason: data.reasigment_reason || '',
//             }
//           );
//           if (rowData.executionDate) {
//             const existingReports = await checkDailyReportExists([format(data.executionDate, 'yyyy-MM-dd')]);
//             if (existingReports.length > 0) {
//               await createDailyReportRow([
//                 {
//                   ...rowData,
//                   status: 'sin_recursos_asignados',
//                   daily_report_id: existingReports[0].id,
//                 },
//               ]);
//             } else {
//               const createdReports = await createDailyReport([format(data.executionDate, 'yyyy-MM-dd')]);
//               await createDailyReportRow([
//                 {
//                   ...rowData,
//                   status: 'sin_recursos_asignados',
//                   daily_report_id: createdReports?.[0].id,
//                 },
//               ]);
//             }
//           }
//         } else {
//           // Modo creación
//           const createdRow = await createDailyReportRow([
//             {
//               ...rowData,
//               status: !employeeIds.length && !equipmentIds.length ? 'sin_recursos_asignados' : 'pendiente',
//             },
//           ]);

//           // Crear relaciones con empleados si existen
//           if (employeeIds.length > 0) {
//             await createDailyReportEmployeeRelations(createdRow[0].id, employeeIds);
//           }

//           // Crear relaciones con equipos si existen
//           if (equipmentIds.length > 0) {
//             await createDailyReportEquipmentRelations(createdRow[0].id, equipmentIds);
//           }

//           if (equipos_clienteIds.length > 0) {
//             await createDailyReportCustomerEquipmentRelations(createdRow[0].id, equipos_clienteIds);
//           }
//         }

//         // Actualizar la lista

//         // Cerrar el modal y limpiar
//         document.getElementById('close-button-daily-report')?.click();

//         // Si estamos en modo edición, limpiar el selectedRow
//         if (selectedRow) {
//           setSelectedRow(null);
//         }

//         // Resetear el formulario
//         form.reset({
//           client: '',
//           requestDate: '',
//           executionDate: '',
//         });

//         // Restablecer los estados locales
//         setSelectedCustomerId(null);
//         setSelectedServiceId(null);
//         router.refresh();
//       },
//       {
//         loading: selectedRow ? 'Actualizando parte diario...' : 'Creando parte diario...',
//         success: selectedRow ? 'Parte diario actualizado exitosamente' : 'Parte diario creado exitosamente',
//         error: selectedRow ? 'Error al actualizar parte diario' : 'Error al crear parte diario',
//       }
//     );
//   };

//   useEffect(() => {
//     // Si hay valores por defecto pero no hay cliente seleccionado
//     if (defaultValues?.data_to_clone?.customer_id && !selectedCustomer) {
//       const customer = customers?.find((c) => c.id === defaultValues.data_to_clone.customer_id);
//       if (customer) {
//         setSelectedCustomer(customer);
//         setSelectedCustomerId(customer.id);
//         form.setValue('client', customer.id);
//         // return; // Salir temprano, el resto se ejecutará en el siguiente render
//       }
//     }
//     // Si hay valores por defecto, establecer type_service inmediatamente
//     if (defaultValues?.type_service) {
//       form.setValue('type_service', defaultValues.type_service as 'mensual' | 'adicional' | 'adicional_permanente');
//     }
//     if (defaultValues?.status) {
//       form.setValue(
//         'status',
//         defaultValues.status as
//           | 'pendiente'
//           | 'sin_recursos_asignados'
//           | 'ejecutado'
//           | 'reprogramado'
//           | 'cancelado'
//           | '.'
//           | '..'
//       );
//     }

//     if (defaultValues && selectedCustomer) {
//       const customer = selectedCustomer;
//       form.setValue('client', customer.id);
//       setSelectedCustomerId(customer.id);

//       // Verificar si el cliente tiene sectores y áreas disponibles
//       const hasSectors = customer.customer_services?.some((s) => s.service_sectors?.length > 0);
//       const hasAreas = customer.customer_services?.some((s) => s.service_areas?.length > 0);
//       setIsSectorDisabled(!hasSectors);
//       setIsAreaDisabled(!hasAreas);

//       // Buscar y establecer el servicio
//       if (defaultValues.services) {
//         const service = customer.customer_services?.find(
//           (s) => s.id === defaultValues.services || s.service_name === defaultValues.services
//         );

//         if (service?.id) {
//           form.setValue('services', service.id);
//           setSelectedServiceId(service.id);

//           // Buscar y establecer el ítem
//           if (service.service_items?.length > 0 && defaultValues.item) {
//             const item = service.service_items.find(
//               (i) => i.id === defaultValues.item || i.item_name === defaultValues.item
//             );
//             if (item) {
//               form.setValue('item', item.id);
//             }
//           }
//         }
//       }

//       // Establecer valores básicos
//       form.setValue('working_day', defaultValues.working_day || '');
//       form.setValue('start_time', defaultValues.start_time?.substring(0, 5) || '');
//       form.setValue('end_time', defaultValues.end_time?.substring(0, 5) || '');
//       form.setValue('status', defaultValues.status || 'pendiente');
//       form.setValue('description', defaultValues.description || '');
//       form.setValue('document_path', defaultValues.document_path || '');
//       form.setValue('type_service', defaultValues.type_service as 'mensual' | 'adicional');
//       form.setValue('cancel_reason', defaultValues.cancel_reason || '');
//       form.setValue('start_time', defaultValues.start_time?.substring(0, 5) || '');
//       form.setValue('end_time', defaultValues.end_time?.substring(0, 5) || '');

//       // Establecer sector
//       if (defaultValues.sector_customer_id) {
//         form.setValue('sector_service_id', defaultValues.sector_customer_id);
//       }

//       // Establecer área
//       if (defaultValues.areas_customer_id) {
//         form.setValue('areas_service_id', defaultValues.areas_customer_id);
//       }

//       // Establecer empleados
//       if (defaultValues.employees_references) {
//         const employeeIds = defaultValues.employees_references.map((emp) => emp.id || '');
//         form.setValue('employees', employeeIds);
//       }

//       if (defaultValues.customer_equipment) {
//         const equipos_clienteIds = defaultValues.customer_equipment.map((eq) => eq.id || '');
//         form.setValue('equipos_cliente', equipos_clienteIds);
//       }

//       // Establecer equipos
//       if (Array.isArray(defaultValues.equipment_references) && defaultValues.equipment_references.length > 0) {
//         const equipmentIds = defaultValues.equipment_references.map((eq) => eq.id || '');
//         form.setValue('equipment', equipmentIds);
//       }
//     }
//   }, [selectedCustomer, defaultValues, form, customers, selectedServiceId]);

//   // Filtrar servicios activos del cliente seleccionado
//   const customerServices = useMemo(() => {
//     if (!selectedCustomer?.customer_services?.length) return [];

//     return selectedCustomer.customer_services.filter(
//       (service) => service.is_active && (!service.service_validity || new Date(service.service_validity) >= new Date())
//     );
//   }, [selectedCustomer]);

//   // Filtrar ítems activos del servicio seleccionado
//   const serviceItems = useMemo(() => {
//     if (!selectedServiceId || !selectedCustomer?.customer_services?.length) return [];

//     // Buscar el servicio seleccionado
//     const selectedService = selectedCustomer.customer_services.find((service) => service.id === selectedServiceId);

//     // Retornar los ítems activos del servicio seleccionado
//     return selectedService?.service_items?.filter((item) => item.is_active) || [];
//   }, [selectedCustomer, selectedServiceId]);

//   // Filtrar empleados del cliente seleccionado
//   const filteredEmployees = useMemo(() => {
//     if (!selectedCustomerId) return [];
//     return (
//       employees?.filter(
//         (employee) =>
//           employee.is_active &&
//           employee.contractor_employee?.some((ce) => ce.customers?.id === selectedCustomerId) &&
//           (employee.workflow_diagram || employee.employees_diagram?.length > 0) // Verificar si tiene diagrama de trabajo
//       ) || []
//     );
//   }, [employees, selectedCustomerId]);

//   // Filtrar equipos del cliente seleccionado
//   const filteredEquipments = useMemo(() => {
//     if (!selectedCustomerId) return [];
//     return (
//       equipments?.filter((equipment) =>
//         equipment.contractor_equipment?.some((ce) => ce.customers?.id === selectedCustomerId)
//       ) || []
//     );
//   }, [equipments, selectedCustomerId]);

//   // Manejar cambio de cliente
//   const handleCustomerChange = (customerId: string) => {
//     const customer = customers?.find((c) => c.id === customerId);
//     if (customer) {
//       setSelectedCustomer(customer); // Ahora es un array
//       setSelectedCustomerId(customerId);
//       form.setValue('client', customerId);
//       form.setValue('services', '');
//       form.setValue('item', '');
//       form.setValue('sector_service_id', '');
//       form.setValue('areas_service_id', '');
//       setSelectedServiceId(null);

//       // Verificar si el cliente tiene sectores y áreas disponibles
//       const hasSectors = customer.customer_services?.some((s) => s.service_sectors?.length > 0);
//       const hasAreas = customer.customer_services?.some((s) => s.service_areas?.length > 0);

//       setIsSectorDisabled(!hasSectors);
//       setIsAreaDisabled(!hasAreas);
//     }
//   };
//   // Efecto para controlar la habilitación del campo de ítem
//   useEffect(() => {
//     if (selectedServiceId && selectedCustomer?.customer_services?.length) {
//       // Buscar el servicio seleccionado
//       const selectedService = selectedCustomer.customer_services.find((service) => service.id === selectedServiceId);

//       // Verificar si el servicio tiene ítems activos
//       const hasItems = selectedService?.service_items?.some((item) => item.is_active) || false;

//       // Si no hay ítems, limpiar el valor
//       if (!hasItems) {
//         form.setValue('item', '');
//       }
//     } else {
//       form.setValue('item', '');
//     }
//   }, [selectedServiceId, selectedCustomer, form]);

//   // Manejar cambio de servicio
//   const handleServiceChange = (serviceId: string) => {
//     form.setValue('services', serviceId);
//     form.setValue('item', '');
//     setSelectedServiceId(serviceId);
//   };

//   const onCancel = () => {
//     // Cerrar el modal
//     document.getElementById('close-button-daily-report')?.click();

//     // Si estamos en modo edición, limpiar el selectedRow
//     if (selectedRow) {
//       setSelectedRow(null);
//     }

//     // Limpiar valores del formulario
//     form.reset({
//       client: '',
//       requestDate: '',
//       executionDate: '',
//     });

//     // Restablecer estados
//     setSelectedCustomerId(null);
//     setSelectedServiceId(null);
//     setIsServiceDisabled(true);
//     setIsSectorDisabled(true); // Asegurar que el campo de sector esté deshabilitado
//     setIsAreaDisabled(true); // Asegurar que el campo de área esté deshabilitado
//   };

//   // Estado para controlar la habilitación de los campos
//   const [isServiceDisabled, setIsServiceDisabled] = useState<boolean>(true);

//   // Efecto para habilitar/deshabilitar el select de servicio
//   useEffect(() => {
//     setIsServiceDisabled(!selectedCustomerId);
//   }, [selectedCustomerId]);

//   const workingDayOptions = [
//     { label: 'Jornada 8 horas', value: 'jornada 8 horas' },
//     { label: 'Jornada 12 horas', value: 'jornada 12 horas' },
//     { label: 'Jornada 24 horas', value: 'jornada 24 horas' },
//     { label: 'Por horario', value: 'por horario' },
//   ];

//   const handleOpenChange = (open: boolean) => {
//     if (!open && selectedRow) {
//       setSelectedRow(null);
//     }
//   };

//   return (
//     <Sheet onOpenChange={handleOpenChange}>
//       <SheetTrigger asChild>
//         <Button id="open-button-daily-report" variant="default">
//           {selectedRow ? 'Editar Preparte' : 'Nuevo Preparte'}
//         </Button>
//       </SheetTrigger>
//       <SheetContent className="w-full sm:max-w-md md:max-w-2xl lg:max-w-4xl overflow-y-auto">
//         <SheetHeader>
//           <SheetTitle>{selectedRow ? 'Editar Preparte' : 'Nuevo Preparte'}</SheetTitle>
//           <SheetDescription>
//             Complete los datos del preparte. Los campos marcados con * son obligatorios.
//           </SheetDescription>
//         </SheetHeader>
//         <Form {...form}>
//           <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
//             <div className="grid grid-cols-1 gap-4">
//               {/* Cliente */}
//               <FormField
//                 control={form.control}
//                 name="client"
//                 render={({ field }) => (
//                   <FormItem className="flex flex-col w-full">
//                     <FormLabel>Cliente *</FormLabel>
//                     <Popover>
//                       <PopoverTrigger asChild>
//                         <FormControl>
//                           <Button
//                             variant="outline"
//                             role="combobox"
//                             disabled={disabled}
//                             className={cn(
//                               'w-full justify-between',
//                               !field.value && 'text-muted-foreground'
//                             )}
//                           >
//                             {field.value
//                               ? customers?.find((customer) => customer.id === field.value)?.name || 'Cliente no encontrado'
//                               : 'Seleccionar cliente'}
//                             <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//                           </Button>
//                         </FormControl>
//                       </PopoverTrigger>
//                       <PopoverContent className="w-[400px] p-0">
//                         <Command>
//                           <CommandInput placeholder="Buscar cliente..." className="h-9" />
//                           <CommandList>
//                             <CommandEmpty>No se encontraron clientes.</CommandEmpty>
//                             <CommandGroup>
//                               {customers?.map((customer) => (
//                                 <CommandItem
//                                   value={customer.name || ''}
//                                   key={customer.id}
//                                   onSelect={() => {
//                                     form.setValue('client', customer.id);
//                                     setSelectedCustomerId(customer.id);
//                                   }}
//                                 >
//                                   {customer.name}
//                                   <Check
//                                     className={cn(
//                                       'ml-auto h-4 w-4',
//                                       customer.id === field.value ? 'opacity-100' : 'opacity-0'
//                                     )}
//                                   />
//                                 </CommandItem>
//                               ))}
//                             </CommandGroup>
//                           </CommandList>
//                         </Command>
//                       </PopoverContent>
//                     </Popover>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />

//               {/* Fecha de solicitud */}
//               <FormField
//                 control={form.control}
//                 name="requestDate"
//                 render={({ field }) => (
//                   <FormItem className="flex flex-col">
//                     <FormLabel>Fecha de solicitud *</FormLabel>
//                     <Popover>
//                       <PopoverTrigger asChild>
//                         <FormControl>
//                           <Button
//                             variant={'outline'}
//                             className={cn(
//                               'pl-3 text-left font-normal',
//                               !field.value && 'text-muted-foreground'
//                             )}
//                           >
//                             {field.value ? (
//                               format(field.value, 'PPP', { locale: es })
//                             ) : (
//                               <span>Seleccionar fecha</span>
//                             )}
//                             <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
//                           </Button>
//                         </FormControl>
//                       </PopoverTrigger>
//                       <PopoverContent className="w-auto p-0" align="start">
//                         <Calendar
//                           mode="single"
//                           selected={field.value}
//                           onSelect={field.onChange}
//                           disabled={(date) => date < new Date()}
//                           initialFocus
//                         />
//                       </PopoverContent>
//                     </Popover>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />

//               {/* Fecha de ejecución */}
//               <FormField
//                 control={form.control}
//                 name="executionDate"
//                 render={({ field }) => (
//                   <FormItem className="flex flex-col">
//                     <FormLabel>Fecha de ejecución *</FormLabel>
//                     <Popover>
//                       <PopoverTrigger asChild>
//                         <FormControl>
//                           <Button
//                             variant={'outline'}
//                             className={cn(
//                               'pl-3 text-left font-normal',
//                               !field.value && 'text-muted-foreground'
//                             )}
//                           >
//                             {field.value ? (
//                               format(field.value, 'PPP', { locale: es })
//                             ) : (
//                               <span>Seleccionar fecha</span>
//                             )}
//                             <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
//                           </Button>
//                         </FormControl>
//                       </PopoverTrigger>
//                       <PopoverContent className="w-auto p-0" align="start">
//                         <Calendar
//                           mode="single"
//                           selected={field.value}
//                           onSelect={field.onChange}
//                           disabled={(date) => date < new Date()}
//                           initialFocus
//                         />
//                       </PopoverContent>
//                     </Popover>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//             </div>

//             <SheetFooter className="pt-4">
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={() => {
//                   form.reset();
//                   setSelectedCustomerId(null);
//                   setSelectedServiceId(null);
//                 }}
//               >
//                 Limpiar
//               </Button>
//               <Button type="submit" disabled={disabled}>
//                 {selectedRow ? 'Actualizar' : 'Crear'}
//               </Button>
//             </SheetFooter>
//           </form>
//         </Form>
//       </SheetContent>
//     </Sheet>
//   );
// }
