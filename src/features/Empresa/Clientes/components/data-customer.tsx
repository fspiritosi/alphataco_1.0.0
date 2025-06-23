'use client';

import React from 'react';

import { EquipmentColums } from '@/app/dashboard/equipment/columns';
import { EquipmentTable } from '@/app/dashboard/equipment/data-equipment';
import { fetchAllEquipment } from '@/app/server/GET/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmployeesTableReusable } from '@/features/Employees/Empleados/components/tables/data/employees-table';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { fetchAllEmployees } from '@/shared/actions/employees.actions';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { assignEmployeesToCustomer, assignEquipmentsToCustomer } from '../actions';
import { fechAllCustomers } from '../actions/create';
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
}

interface DataCustomersProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[] | any;
  data: Awaited<ReturnType<typeof fechAllCustomers>>;
  savedCustomers?: string;
  company_id: string;
  id?: string;
  // employees?: ReturnType<typeof formatEmployeesForTable>;
  equipments?: Awaited<ReturnType<typeof fetchAllEquipment>>;
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
  employeesData: Awaited<ReturnType<typeof fetchAllEmployees>>;
}

export function DataCustomers<TData extends Customer, TValue>({
  columns,
  data,
  savedCustomers,
  company_id,
  id,
  // employees,
  equipments,
  services = [],
  areas = [],
  sectors = [],
  itemsList = [],
  measureUnitsList = [],
  savedFilters,
  savedFiltersEquipmentTable,
  savedFiltersServiceTable,
  employeesData,
  savedVisibilityEquipment,
}: DataCustomersProps<TData, TValue>) {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<TData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof fetchAllEmployees>>>(employeesData || []);
  // State for form reset when dialog closes

  const fetchEmployees = async () => {
    const employees = await fetchAllEmployees();
    setEmployees(employees);
  };

  // Memoize the customer employees filter
  const customerEmployees = React.useMemo(() => {
    if (!employees || !selectedCustomer) {
      console.log('No employees or selected customer');
      return [];
    }

    console.log('memo customer');

    const filtered = employees.filter((employee) => {
      const hasMatchingContractor =
        employee.contractor_employee?.some((contractor: any) => {
          const contractorId = contractor.contractor_id?.id || contractor.contractor_id;
          console.log('Checking contractor:', {
            employeeId: employee.id,
            contractorId,
            selectedCustomerId: selectedCustomer.id,
            matches: contractorId === selectedCustomer.id,
          });
          return contractorId === selectedCustomer.id;
        }) || false;

      console.log(`Employee ${employee.id} has matching contractor:`, hasMatchingContractor);
      return hasMatchingContractor;
    });

    console.log('Filtered customer employees:', filtered);
    return filtered;
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
    console.log('memo equipment');

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
    console.log('memo employee');

    return employees
      .filter((emp) => {
        return emp.contractor_employee?.some(
          (contractor: any) =>
            (typeof contractor.contractor_id === 'object' && contractor.contractor_id?.id === selectedCustomer.id) ||
            contractor.contractor_id === selectedCustomer.id
        );
      })
      .map((emp) => String(emp.id));
  }, [selectedCustomer, employees]);

  // Sincronizar empleados seleccionados cuando se abre el diálogo
  useEffect(() => {
    console.log('useEffect employee');
    console.log('isEmployeeDialogOpen', isEmployeeDialogOpen);
    console.log('selectedCustomer', selectedCustomer);
    if (selectedCustomer) {
      console.log('Sincronizando empleados asignados:', {
        assignedEmployeeIds,
        customerId: selectedCustomer.id,
      });

      console.log('assignedEmployeeIds', assignedEmployeeIds);
      // Actualizar el formulario con los IDs de empleados asignados
      form.setValue('employees', assignedEmployeeIds, { shouldValidate: true });
    }
  }, [isEmployeeDialogOpen, selectedCustomer, assignedEmployeeIds, form]);

  // Reset form when dialog is closed
  useEffect(() => {
    console.log('useEffect employee');
    if (!isDialogOpen) {
      form.reset({ employees: [] });
    }
  }, [isDialogOpen, form]);

  // // Manejar la apertura/cierre del diálogo de empleados
  const handleEmployeeDialogOpenChange = () => {
    console.log('handleEmployeeDialogOpenChange');
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
    console.log('handleEquipmentDialogOpenChange');
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
    console.log('handleEquipmentSubmit');

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
      console.error('Error al guardar empleados:', error);
      toast.error('Error al actualizar los empleados');
    }
    router.refresh();
    await fetchEmployees();
  };

  // // Server action para asignar empleados a un cliente
  // async function asignarEmpleadosACliente(clienteId: string, empleadosIds: string[]) {
  //   try {
  //     const response = await assignEmployeesToCustomer(clienteId, empleadosIds);

  //     if (!response.success) {
  //       throw new Error(response.error || 'Error desconocido al asignar empleados');
  //     }

  //     return response;
  //   } catch (error) {
  //     console.error('Error en asignarEmpleadosACliente:', error);
  //     throw error;
  //   }
  // }

  const [showForm, setShowForm] = useState(false);

  const handleRowClick = (row: TData) => {
    setSelectedCustomer(row);
    setShowForm(true);
    setIsEditing(false);
  };

  const transformEmployeeData = React.useCallback((employee: any) => {
    console.log('transformEmployeeData');

    return {
      ...employee,
      city: employee.city ? parseInt(employee.city) : null,
      province: employee.province ? parseInt(employee.province) : null,
      company_position: employee.company_position || null,
      hierarchical_position: employee.hierarchical_position || null,
      workflow_diagram: employee.workflow_diagram || null,
    };
  }, []);

  // Memoize transformed employees (completo para la tabla)
  const transformedEmployees = React.useMemo(() => {
    console.log('transformedEmployees');
    console.log(customerEmployees);
    return customerEmployees.map(transformEmployeeData);
  }, [customerEmployees, isEmployeeDialogOpen, employees]);
  // Datos optimizados para el multiselect - siempre mostrar todos los empleados
  const multiselectEmployees = React.useMemo(() => {
    if (!employees) return [];
    console.log('multiselectEmployees');

    return employees.map((emp) => ({
      value: String(emp.id),
      label: `${emp.lastname ? emp.lastname.charAt(0).toUpperCase() + emp.lastname.slice(1) : ''} ${emp.firstname ? emp.firstname.charAt(0).toUpperCase() + emp.firstname.slice(1) : ''}`,
    }));
  }, [employees]);
  // Using the memoized version of assignedEmployeeIds from above
  const names = createFilterOptions(data, (customer) => customer.name);
  const cuit = createFilterOptions(data, (customer) => customer.cuit);
  const client_email = createFilterOptions(data, (customer) => customer.client_email);
  const client_phone = createFilterOptions(data, (customer) => customer.client_phone);
  const active_customer = createFilterOptions(data, (customer) => (customer.is_active ? 'Activo' : 'Inactivo'));

  const savedVisibility = savedCustomers ? JSON.parse(savedCustomers) : {};
  // Memoize customer equipments filter
  const customerEquipments = React.useMemo(() => {
    console.log('customerEquipments');
    if (!equipments || !selectedCustomer) return [];

    return equipments.filter((equipment) => {
      // Verifica si el equipo está vinculado a través de contractor_equipment
      return (
        equipment.contractor_equipment?.some((contractor) => contractor.contractor_id?.id === selectedCustomer.id) ||
        false
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
          <h2 className="text-2xl font-bold">Detalles del Cliente</h2>
          <Button variant="outline" onClick={() => (id || selectedCustomer) && setShowForm(false)}>
            Cerrar
          </Button>
        </div>

        <Tabs defaultValue="detalle">
          <TabsList>
            <TabsTrigger value="detalle">Detalle</TabsTrigger>
            <TabsTrigger value="empleados">Empleados</TabsTrigger>
            <TabsTrigger value="equipos">Equipos</TabsTrigger>
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
          </TabsList>

          <TabsContent value="detalle">
            <div className=" p-6 rounded-lg border">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Información del Cliente</h3>
                <Button variant="gh_orange" onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? 'Deshabilitar edición' : 'Habilitar edición'}
                </Button>
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
                <Dialog open={isEmployeeDialogOpen} onOpenChange={() => handleEmployeeDialogOpenChange()}>
                  <DialogTrigger asChild>
                    <Button variant="gh_orange">Cargar empleados</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Seleccionar empleados</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="space-y-4 w-full">
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 w-[300px]">
                            {selectedCustomer && (
                              <input type="hidden" {...form.register('customer_id')} value={selectedCustomer.id} />
                            )}
                            <FormField
                              control={form.control}
                              name="employees"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Empleados</FormLabel>
                                  <FormControl>
                                    <MultiSelectCombobox
                                      options={multiselectEmployees}
                                      emptyMessage="No se encontraron empleados"
                                      selectedValues={Array.isArray(field.value) ? field.value.map(String) : []}
                                      onChange={(values) => {
                                        console.log('Empleados seleccionados:', values);
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
                            <div className="flex justify-end space-x-2 pt-4">
                              <DialogClose asChild>
                                <Button type="button" variant="outline">
                                  Cancelar
                                </Button>
                              </DialogClose>
                              <Button type="submit" variant="default">
                                Asignar empleados
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* {transformedEmployees.length > 0 ? ( */}
              <EmployeesTableReusable
                onRowClick={(employee) => handleRowClick(employee as any)}
                // employeesPromise={Promise.resolve(transformedEmployees)}
                transformedEmployees={
                  (employees?.filter((employee) => {
                    const hasMatchingContractor =
                      employee.contractor_employee?.some((contractor: any) => {
                        const contractorId = contractor.contractor_id?.id || contractor.contractor_id;
                        console.log('Checking contractor:', {
                          employeeId: employee.id,
                          contractorId,
                          selectedCustomerId: selectedCustomer?.id,
                          matches: contractorId === selectedCustomer?.id,
                        });
                        return contractorId === selectedCustomer?.id;
                      }) || false;

                    console.log(`Employee ${employee.id} has matching contractor:`, hasMatchingContractor);
                    return hasMatchingContractor;
                  }) as any) || []
                }
                tableId="employees-table"
                savedVisibility={savedVisibility}
              />
              {/* ) : ( */}
              {/* <div className="text-center py-4 text-muted-foreground">No hay empleados asignados a este cliente.</div> */}
              {/* )} */}
            </div>
          </TabsContent>

          <TabsContent value="equipos">
            <div className="p-6 rounded-lg border">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Equipos del Cliente</h3>
                <Dialog open={isEquipmentDialogOpen} onOpenChange={handleEquipmentDialogOpenChange}>
                  <DialogTrigger asChild>
                    <Button variant="gh_orange">Asignar Equipos</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Seleccionar Equipos</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="space-y-4 w-full">
                        <Form {...equipmentForm}>
                          <form
                            onSubmit={equipmentForm.handleSubmit(handleEquipmentSubmit)}
                            className="space-y-4 w-[300px]"
                          >
                            {selectedCustomer && <input type="hidden" name="customer_id" value={selectedCustomer.id} />}
                            <FormField
                              control={equipmentForm.control}
                              name="equipments"
                              render={({ field }) => (
                                <FormItem>
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
                            <div className="flex justify-end space-x-2 pt-4">
                              <DialogClose asChild>
                                <Button type="button" variant="outline">
                                  Cancelar
                                </Button>
                              </DialogClose>
                              <Button type="submit" variant="gh_orange">
                                Guardar
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <EquipmentTable
                savedFilters={savedFiltersEquipmentTable}
                columns={EquipmentColums || []}
                data={customerEquipments || []}
                savedVisibility={savedVisibilityEquipment}
              />
            </div>
          </TabsContent>

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
        </Tabs>
      </div>
    );
  }

  // Si no estamos en modo edición ni hay un ID seleccionado, mostramos la tabla con opción de crear
  return (
    <div>
      <div className="mb-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="gh_orange">Registrar Cliente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <CustomerForm
              company_id={company_id}
              onSuccess={() => {
                // Cerrar el diálogo después de guardar
                const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
                if (dialog) dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
              }}
            />
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
          initialVisibleFilters: savedFilters || [],
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
  );
}
