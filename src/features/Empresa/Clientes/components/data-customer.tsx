'use client';

import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmployeesTableReusable } from '@/features/Employees/Empleados/components/tables/data/employees-table';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { EquipmentTable } from '@/features/Equipos/Equipos/components/data-equipment';
import { EquipmentColums } from '@/features/Equipos/Equipos/components/equipment-columns';
import { PermissionGuard } from '@/features/Permissions';
import { fetchAllEquipment } from '@/shared/actions/equipment.actions';
// import { fetchAllEmployees } from '@/shared/actions/employees.actions';
import { fetchAllEmployees2 } from '@/shared/actions/employees.actions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { assignEmployeesToCustomer, assignEquipmentsToCustomer } from '../actions';
import { fechAllCustomers, fechAllDataCustomersById } from '../actions/create';
import { CustomerForm } from './CustomerForm';
import ServiceTable from './Services/ServiceTable';
// Form related imports removed for simplicity

interface Customer {
  id: string;
  name: string;
  cuit: number;
  client_email: string | null;
  client_phone: number | null;
  address: string | null;
  is_active: boolean | null;
  company_id: string;
  reason_for_termination?: string | null;
  termination_date?: string | null;
  contractor_employee?: Array<{
    employees: {
      id: string;
      firstname: string;
      lastname: string;
      // Agrega otras propiedades de empleado según sea necesario
    };
  }>;
}

interface Employee {
  id: string;
  firstname: string;
  lastname: string;
  email: string | null;
  phone: string;
  document_number: string;
  document_type: 'DNI' | 'LE' | 'LC' | 'PASAPORTE' | null;
  cuil: string;
  gender: 'Masculino' | 'Femenino' | 'No Declarado' | null;
  born_date: string | null;
  birthplace: string;
  marital_status: 'Casado' | 'Soltero' | 'Divorciado' | 'Viudo' | 'Separado' | 'Union de hecho' | null;
  nationality: 'Argentina' | 'Extranjero' | null;
  street: string;
  street_number: string;
  city: number | null;
  province: number;
  postal_code: string | null;
  company_id: string | null;
  company_position: string | null;
  hierarchical_position: string | null;
  cost_center_id: string | null;
  guild_id: string | null;
  affiliate_status: 'Dentro de convenio' | 'Fuera de convenio' | null;
  status: 'Avalado' | 'No avalado' | 'Incompleto' | 'Completo' | 'Completo con doc vencida' | null;
  is_active: boolean | null;
  created_at: string;
  updated_at?: string;
  termination_date: string | null;
  reason_for_termination:
    | 'Despido sin causa'
    | 'Renuncia'
    | 'Despido con causa'
    | 'Acuerdo de partes'
    | 'Fin de contrato'
    | 'Fallecimiento'
    | null;
  allocated_to?: string[] | null;
  category_id?: string | null;
  covenants_id?: string | null;
  date_of_admission?: string;
  file?: string;
  level_of_education?: 'Primario' | 'Secundario' | 'Terciario' | 'Universitario' | 'PosGrado' | null;
  normal_hours?: string | null;
  picture?: string | null;
  type_of_contract?: string | null;
  workflow_diagram?: string | null;

  // Nested objects
  company_positions: {
    id: string;
    name: string | null;
    hierarchical_position_id: string[] | null;
    is_active: boolean | null;
    created_at: string;
  } | null;

  hierarchy: {
    id: string;
    name: string;
    is_active: boolean | null;
    created_at: string;
  } | null;

  cities: {
    id: number;
    name: string;
    province_id: number;
    created_at: string;
  } | null;

  provinces: {
    id: number;
    name: string;
    created_at: string;
  } | null;

  work_diagram: {
    id: string;
    name: string;
    active_working_days: number | null;
    inactive_working_days: number | null;
    inactive_novelty: string | null;
    is_active: boolean | null;
    created_at: string;
  } | null;

  countries: {
    id: string;
    name: string;
    created_at: string;
  } | null;

  cost_center: {
    id: string;
    name: string;
    is_active: boolean | null;
    created_at: string;
  } | null;

  contractor_employee: Array<{
    id: string;
    contractor_id: string | null;
    employee_id: string | null;
    created_at: string;
  }>;
}

interface ContractorEmployee {
  id: string;
  contractor_id: string | null;
  employee_id: string | null;
  created_at: string;
}

interface DataCustomersProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[] | any;
  data: Awaited<ReturnType<typeof fechAllCustomers>>;
  savedCustomers?: string;
  company_id: string;
  id?: string;
  // employees?: ReturnType<typeof formatEmployeesForTable>;
  // equipmentsPromise: ReturnType<typeof fetchAllEquipment>
  // Nuevas props para servicios
  services?: any[];
  areas?: any[];
  sectors?: any[];
  itemsList?: any[];
  measureUnitsList?: any[];
  savedFilters: string[];
  savedFiltersEquipmentTable: string[];
  savedFiltersServiceTable: string[];
  savedVisibilityEquipment: VisibilityState;
  // employeesPromise: ReturnType<typeof fetchAllEmployees>
  allEmployees?: { label: string; value: string }[];
}

export function DataCustomers<TData extends Customer, TValue>({
  columns,
  data,
  savedCustomers,
  company_id,
  id,
  // employees,
  // equipmentsPromise,
  services = [],
  areas = [],
  sectors = [],
  itemsList = [],
  measureUnitsList = [],
  savedFilters,
  savedFiltersEquipmentTable,
  savedFiltersServiceTable,
  // employeesPromise,
  savedVisibilityEquipment,
  allEmployees,
}: DataCustomersProps<TData, TValue>) {
  // Timestamp de inicio del componente

  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<
    Awaited<ReturnType<typeof fechAllDataCustomersById>>[0] | null
  >(null);

  // Estado para empleados
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [equipments, setEquipment] = useState<Awaited<ReturnType<typeof fetchAllEquipment>>>();
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState(false);
  const [isEquipmentLoading, setIsEquipmentLoading] = useState(false);

  // Manejador para cargar datos del cliente
  const handleSelectCustomer = async (customer: Awaited<ReturnType<typeof fechAllCustomers>>[number]) => {
    if (!customer?.id) return;

    setIsLoading(true);
    setIsEmployeesLoading(true);
    setIsEquipmentLoading(true);

    try {
      setSelectedCustomer(null);
      setEmployees([]);

      const customerData = await fechAllDataCustomersById(customer.id);
      if (customerData?.[0]) {
        setSelectedCustomer(customerData[0]);
        setIsEmployeesLoading(false);
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar empleados cuando cambia el cliente seleccionado
  useEffect(() => {
    const loadEmployees = async () => {
      if (!selectedCustomer?.id) return;

      setIsEmployeesLoading(true);
      try {
        const employeesData = await fetchAllEmployees2(selectedCustomer.id);
        setEmployees(employeesData);
      } catch (error) {
        console.error('Error loading employees:', error);
      } finally {
        setIsEmployeesLoading(false);
      }
    };

    loadEmployees();
  }, [selectedCustomer?.id]);

  // Cargar equipos cuando cambia el cliente seleccionado
  useEffect(() => {
    const loadEquipment = async () => {
      if (!selectedCustomer?.id) return;

      setIsEquipmentLoading(true);
      try {
        const equipmentData = await fetchAllEquipment();
        setEquipment(equipmentData);
      } catch (error) {
        console.error('Error loading equipment:', error);
      } finally {
        setIsEquipmentLoading(false);
      }
    };

    loadEquipment();
  }, [selectedCustomer?.id]);

  const handleRowClick = (row: TData) => {
    const customer = row as unknown as Awaited<ReturnType<typeof fechAllCustomers>>[number];
    setSelectedCustomer(customer as any);
    setShowForm(true);
    setIsEditing(false);

    // Cargar datos adicionales en segundo plano
    handleLoadAdditionalData(customer.id);
  };

  const handleLoadAdditionalData = async (customerId: string) => {
    if (!customerId) return;

    setIsLoading(true);
    try {
      const customerData = await fechAllDataCustomersById(customerId);
      if (customerData?.[0]) {
        setSelectedCustomer((prev) => ({ ...prev, ...customerData[0] }));

        if (customerData[0].contractor_employee?.length) {
          const employeeList = customerData[0].contractor_employee
            .map((ce) => ce.employees)
            .filter(
              (e): e is NonNullable<typeof e> =>
                e !== null &&
                typeof e.id === 'string' &&
                typeof e.firstname === 'string' &&
                typeof e.lastname === 'string'
            )
            .map((e) => ({
              ...e,
              affiliate_status: e.affiliate_status || null,
              allocated_to: e.allocated_to || null,
            })) as Employee[];

          setEmployees(employeeList);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos adicionales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Medir tiempo de resolución de employeesPromise
  // const [allEmployees,setAllEmployees] = useState<{label:string,value:string}[]>([])

  useEffect(() => {
    if (selectedCustomer?.id) {
      setEmployees(
        selectedCustomer?.contractor_employee
          ?.map((employee) => employee.employees)
          .filter((e): e is NonNullable<typeof e> => e !== null && e !== undefined)
          .sort((a, b) => (a?.lastname || '').localeCompare(b?.lastname || ''))
      );
    }
  }, [selectedCustomer?.id]);

  useEffect(() => {
    const fetchEquipment = async () => {
      const equipment = await fetchAllEquipment();
      setEquipment(equipment);
    };
    fetchEquipment();
  }, [selectedCustomer?.id]);

  // const employees =  fetchAllEmployees();

  // const equipments =  fetchAllEquipment();

  // Medir tiempo de resolución de equipmentsPromise

  // Iniciar medición del procesamiento de datos

  const [isEditing, setIsEditing] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Leer las cookies necesarias para la persistencia de filtros
  const visibilityCookie = Cookies.get('customers-table');
  const filtersCookie = Cookies.get('customers-table-filters');

  // Inicializar la visibilidad y los filtros desde las cookies
  const savedVisibility = visibilityCookie ? JSON.parse(visibilityCookie) : {};
  const savedFiltersFromCookie = filtersCookie ? JSON.parse(filtersCookie) : savedFilters || [];

  const fetchEmployees = async () => {
    setIsEmployeesLoading(true);
    const employees = await fetchAllEmployees2(selectedCustomer?.id!);
    setEmployees(employees);
    setIsEmployeesLoading(false);
  };

  // Memoize the customer employees filter
  const customerEmployees = React.useMemo(() => {
    if (!employees || !selectedCustomer) {
      return [];
    }

    return employees.filter((employee) => {
      return (
        employee?.contractor_employee?.some((contractor: ContractorEmployee) => {
          if (!contractor.contractor_id) return false;
          const contractorId = contractor.contractor_id;
          return contractorId === selectedCustomer.id;
        }) || false
      );
    });
  }, [employees, selectedCustomer, isEmployeeDialogOpen]);
  // Formulario para empleados
  const form = useForm({
    defaultValues: {
      employees: [] as string[],
      customer_id: '',
    },
  });

  // Obtener IDs de equipos asignados al cliente actual a través de contractor_equipment
  const assignedEquipmentIds = React.useMemo(() => {
    if (!selectedCustomer || !equipments) return [];

    return equipments
      .filter((equip) => {
        return equip.contractor_equipment?.some(
          (contractor: any) =>
            (typeof contractor.contractor_id === 'object' && contractor.contractor_id?.id === selectedCustomer.id) ||
            contractor.contractor_id === selectedCustomer.id
        );
      })
      .map((equip) => String(equip.id));
  }, [selectedCustomer, equipments]);

  // Formulario para equipos
  const equipmentForm = useForm({
    defaultValues: {
      equipments: [] as string[],
    },
  });

  // Obtener IDs de empleados asignados al cliente actual a través de contractor_employee
  const assignedEmployeeIds = React.useMemo(() => {
    if (!selectedCustomer || !employees) return [];

    return employees
      .filter((emp) => {
        return emp?.contractor_employee?.some(
          (contractor: any) =>
            (typeof contractor.contractor_id === 'object' && contractor.contractor_id?.id === selectedCustomer.id) ||
            contractor.contractor_id === selectedCustomer.id
        );
      })
      .map((emp) => String(emp?.id));
  }, [selectedCustomer, employees]);

  // Sincronizar empleados seleccionados cuando se abre el diálogo
  useEffect(() => {
    if (selectedCustomer) {
      // Actualizar el formulario con los IDs de empleados asignados
      form.setValue('employees', assignedEmployeeIds, { shouldValidate: true });
    }
  }, [isEmployeeDialogOpen, selectedCustomer, assignedEmployeeIds, form]);

  // Reset form when dialog is closed
  useEffect(() => {
    if (!isDialogOpen) {
      form.reset({ employees: [] });
    }
  }, [isDialogOpen, form]);

  // // Manejar la apertura/cierre del diálogo de empleados
  const handleEmployeeDialogOpenChange = () => {
    if (isEmployeeDialogOpen) {
      setIsEmployeeDialogOpen(false);
      form.reset({ employees: [] });
    } else {
      // Establecer los empleados ya asignados cuando se abre el diálogo
      form.reset({ employees: assignedEmployeeIds });
      setIsEmployeeDialogOpen(true);
    }
  };

  // Manejar la apertura/cierre del diálogo de equipos
  const handleEquipmentDialogOpenChange = (open: boolean) => {
    if (!open) {
      setIsEquipmentDialogOpen(false);
      equipmentForm.reset({ equipments: [] });
    } else {
      // Establecer los equipos ya asignados cuando se abre el diálogo
      equipmentForm.reset({ equipments: assignedEquipmentIds });
      setIsEquipmentDialogOpen(true);
    }
  };

  // Manejador para enviar los equipos seleccionados
  const handleEquipmentSubmit = async (formData: { equipments: string[] }) => {
    if (!selectedCustomer) return;

    try {
      const equipmentIds = Array.isArray(formData.equipments) ? formData.equipments.filter(Boolean) : [];

      // Asignar los equipos al cliente
      await assignEquipmentsToCustomer(selectedCustomer.id, equipmentIds);

      toast.success('Equipos asignados correctamente');
      setIsEquipmentDialogOpen(false);
      equipmentForm.reset({ equipments: [] });

      // Refrescar la lista de equipos
      router.refresh();
    } catch (error) {
      console.error('Error al asignar equipos:', error);
      toast.error('Error al asignar los equipos');
    }
  };

  const handleSubmit = async (formData: { employees: string[] }) => {
    if (!selectedCustomer) return;
    try {
      const employeeIds = Array.isArray(formData.employees) ? formData.employees.filter(Boolean) : [];

      // Asignar los empleados al cliente
      await assignEmployeesToCustomer(selectedCustomer.id, employeeIds);

      toast.success('Empleados asignados correctamente');
      setIsEmployeeDialogOpen(false);
      form.reset({ employees: [] });

      // Refrescar la lista de empleados
    } catch (error) {
      toast.error('Error al actualizar los empleados');
    }
    router.refresh();
    await fetchEmployees();
  };

  // Memoize transformed employees (completo para la tabla)
  const transformedEmployees = React.useMemo(() => {
    return customerEmployees.map((employee) => ({
      ...employee,
      city: employee.city ? Number(employee.city) : null,
      province: employee.province ? Number(employee.province) : null,
      company_position: employee.company_position || null,
      hierarchical_position: employee.hierarchical_position || null,
      work_diagram: employee.work_diagram || null,
    }));
  }, [customerEmployees]);
  // Datos optimizados para el multiselect - siempre mostrar todos los empleados
  const multiselectEmployees = React.useMemo(() => {
    if (!employees) return [];

    return employees.map((emp) => ({
      value: String(emp?.id),
      label: `${emp?.lastname ? emp.lastname.charAt(0).toUpperCase() + emp.lastname.slice(1) : ''} ${emp?.firstname ? emp.firstname.charAt(0).toUpperCase() + emp.firstname.slice(1) : ''}`,
    }));
  }, [employees]);
  // Using the memoized version of assignedEmployeeIds from above
  const names = createFilterOptions(data, (customer) => customer.name);
  const cuit = createFilterOptions(data, (customer) => customer.cuit);
  const client_email = createFilterOptions(data, (customer) => customer.client_email);
  const client_phone = createFilterOptions(data, (customer) => customer.client_phone);
  const active_customer = createFilterOptions(data, (customer) => (customer.is_active ? 'Activo' : 'Inactivo'));

  // const savedVisibility = savedCustomers ? JSON.parse(savedCustomers) : {};
  // Memoize customer equipments filter
  const customerEquipments = React.useMemo(() => {
    if (!equipments || !selectedCustomer) return [];

    return equipments.filter((equipment) => {
      // Verifica si el equipo está vinculado a través de contractor_equipment
      return (
        equipment.contractor_equipment?.some(
          (contractor: any) => contractor.contractor_id?.id === selectedCustomer.id
        ) || false
      );
    });
  }, [equipments, selectedCustomer]);
  // Usar los datos optimizados para el multiselect
  // Esto evita pasar todo el objeto del empleado al componente
  const employeeOptions1 = multiselectEmployees;
  // Si estamos viendo/editar un cliente existente (pestañas)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Detalles del Cliente {selectedCustomer?.name}</h2>
          <Button variant="outline" onClick={() => (id || selectedCustomer) && setShowForm(false)}>
            Cerrar
          </Button>
        </div>

        <Tabs defaultValue="detalle">
          <TabsList>
            <TabsTrigger value="detalle">Detalle</TabsTrigger>
            <TabsTrigger value="empleados">Empleados</TabsTrigger>
            <TabsTrigger value="equipos">Equipos</TabsTrigger>
            {/* Hereda permisos de comercial/service */}
            <PermissionGuard module="comercial" tab="service" action="view">
              <TabsTrigger value="contratos">Contratos</TabsTrigger>
            </PermissionGuard>
          </TabsList>

          <TabsContent value="detalle">
            <div className=" p-6 rounded-lg border">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Información del Cliente</h3>
                <PermissionGuard module="comercial" tab="detalle-cliente" action="update">
                  <Button variant="gh_orange" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? 'Deshabilitar edición' : 'Habilitar edición'}
                  </Button>
                </PermissionGuard>
              </div>
              <CustomerForm
                customer={selectedCustomer}
                company_id={company_id}
                readOnly={!isEditing}
                onSuccess={() => {
                  setIsEditing(false);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="empleados">
            <div className=" p-6 rounded-lg border">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Empleados del Cliente</h3>
                <PermissionGuard module="comercial" tab="empleados-cliente" action="update">
                  <Dialog open={isEmployeeDialogOpen} onOpenChange={() => handleEmployeeDialogOpenChange()}>
                    <DialogTrigger asChild>
                      <Button variant="gh_orange">Cargar empleados</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Seleccionar empleados</DialogTitle>
                        <DialogDescription>
                          Asigná los empleados que trabajan para {selectedCustomer?.name ?? 'este cliente'}.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full space-y-6 pt-2">
                          {selectedCustomer && (
                            <input type="hidden" {...form.register('customer_id')} value={selectedCustomer.id} />
                          )}
                          <FormField
                            control={form.control}
                            name="employees"
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>Empleados</FormLabel>
                                <FormControl>
                                  <MultiSelectCombobox
                                    options={allEmployees || []}
                                    emptyMessage="No se encontraron empleados"
                                    selectedValues={Array.isArray(field.value) ? field.value.map(String) : []}
                                    onChange={(values) => {
                                      field.onChange(values);
                                    }}
                                    placeholder="Buscar empleados..."
                                    showSelectAll={true}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter className="gap-2 sm:gap-2">
                            <DialogClose asChild>
                              <Button type="button" variant="outline">
                                Cancelar
                              </Button>
                            </DialogClose>
                            <Button type="submit" variant="default">
                              Asignar empleados
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </PermissionGuard>
              </div>

              {/* {transformedEmployees.length > 0 ? ( */}
              {isEmployeesLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="animate-spin" />
                </div>
              ) : (
                <EmployeesTableReusable
                  onRowClick={(employee) => handleRowClick(employee as any)}
                  // employeesPromise={Promise.resolve(transformedEmployees)}
                  transformedEmployees={
                    (employees?.filter((employee) => {
                      const hasMatchingContractor =
                        employee?.contractor_employee?.some((contractor: any) => {
                          const contractorId = contractor.contractor_id?.id || contractor.contractor_id;
                          return contractorId === selectedCustomer?.id;
                        }) || false;

                      return hasMatchingContractor;
                    }) as any) || []
                  }
                  tableId="employees-table"
                  savedVisibility={savedVisibility}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="equipos">
            <div className="p-6 rounded-lg border">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Equipos del Cliente</h3>
                <PermissionGuard module="comercial" tab="equipos-cliente" action="update">
                  <Dialog open={isEquipmentDialogOpen} onOpenChange={handleEquipmentDialogOpenChange}>
                    <DialogTrigger asChild>
                      <Button variant="gh_orange">Asignar Equipos</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Seleccionar Equipos</DialogTitle>
                        <DialogDescription>
                          Asigná los equipos que trabajan para {selectedCustomer?.name ?? 'este cliente'}.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...equipmentForm}>
                        <form
                          onSubmit={equipmentForm.handleSubmit(handleEquipmentSubmit)}
                          className="w-full space-y-6 pt-2"
                        >
                          {selectedCustomer && <input type="hidden" name="customer_id" value={selectedCustomer.id} />}
                          <FormField
                            control={equipmentForm.control}
                            name="equipments"
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>Equipos</FormLabel>
                                <FormControl>
                                  <MultiSelectCombobox
                                    options={
                                      equipments?.map((equip) => ({
                                        value: String(equip.id),
                                        label: equip.domain as string,
                                      })) || []
                                    }
                                    emptyMessage="No se encontraron equipos"
                                    selectedValues={Array.isArray(field.value) ? field.value.map(String) : []}
                                    onChange={(values) => {
                                      field.onChange(values);
                                    }}
                                    placeholder="Buscar equipos..."
                                    showSelectAll={true}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter className="gap-2 sm:gap-2">
                            <DialogClose asChild>
                              <Button type="button" variant="outline">
                                Cancelar
                              </Button>
                            </DialogClose>
                            <Button type="submit" variant="gh_orange">
                              Guardar
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </PermissionGuard>
              </div>
              {isEquipmentLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <EquipmentTable
                  savedFilters={savedFiltersEquipmentTable}
                  columns={EquipmentColums || []}
                  data={customerEquipments || []}
                  savedVisibility={savedVisibilityEquipment}
                />
              )}
            </div>
          </TabsContent>

          {/* Hereda permisos de comercial/service */}
          <PermissionGuard module="comercial" tab="service" action="view">
            <TabsContent value="contratos">
              <div className=" p-6 rounded-lg border">
                <h3 className="text-xl font-semibold mb-6">Contratos del Cliente</h3>
                {selectedCustomer ? (
                  <ServiceTable
                    services={services.filter((service) => service.customer_id === selectedCustomer.id)}
                    customers={[selectedCustomer] as any}
                    company_id={company_id}
                    areas={areas}
                    sectors={sectors}
                    itemsList={itemsList}
                    measureUnitsList={measureUnitsList}
                    hideCreateButton={false}
                    savedFilter={savedFiltersServiceTable}
                  />
                ) : (
                  <p className="text-muted-foreground">Seleccione un cliente para ver sus contratos</p>
                )}
              </div>
            </TabsContent>
          </PermissionGuard>
        </Tabs>
      </div>
    );
  }

  // Si no estamos en modo edición ni hay un ID seleccionado, mostramos la tabla con opción de crear
  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <Dialog>
              <PermissionGuard module="comercial" tab="customers" action="create">
                <DialogTrigger asChild>
                  <Button id="" variant="gh_orange">
                    Registrar Cliente
                  </Button>
                </DialogTrigger>
              </PermissionGuard>
              <DialogContent className="max-w-4xl">
                <CustomerForm
                  company_id={company_id}
                  onSuccess={() => {
                    // Cerrar el diálogo después de guardar
                    const dialog = document.getElementById('close-dialog-customer') as HTMLElement;
                    if (dialog) dialog.click();
                  }}
                />
                <DialogClose id="close-dialog-customer" className="hidden" />
              </DialogContent>
            </Dialog>
          </div>

          <BaseDataTable
            data={(data as unknown as TData[]) || []}
            savedVisibility={savedVisibility}
            columns={columns}
            tableId="customers-table"
            onRowClick={handleRowClick}
            toolbarOptions={{
              initialVisibleFilters: savedFiltersFromCookie,
              filterableColumns: [
                {
                  columnId: 'Nombre',
                  title: 'Nombre',
                  options: names,
                },
                {
                  columnId: 'Cuit',
                  title: 'Cuit',
                  options: cuit,
                },
                {
                  columnId: 'Email',
                  title: 'Email',
                  options: client_email,
                },
                {
                  columnId: 'Telefono',
                  title: 'Telefono',
                  options: client_phone,
                },
                {
                  columnId: 'Estado',
                  title: 'Estado',
                  options: active_customer,
                },
              ],
            }}
          />
        </div>
      )}
    </div>
  );
}
