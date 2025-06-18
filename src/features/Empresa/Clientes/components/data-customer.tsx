'use client';

import { EquipmentColums } from '@/app/dashboard/equipment/columns';
import { EquipmentTable } from '@/app/dashboard/equipment/data-equipment';
import { fetchAllEquipment } from '@/app/server/GET/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmployeesTableReusable } from '@/features/Employees/Empleados/components/tables/data/employees-table';
import { createFilterOptions, formatEmployeesForTable } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { fechAllCustomers } from '../actions/create';
import { CustomerForm } from './CustomerForm';
import ServiceTable from './Services/ServiceTable'; // Importación por defecto corregida
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
  employees?: ReturnType<typeof formatEmployeesForTable>;
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
}

export function DataCustomers<TData extends Customer, TValue>({
  columns,
  data,
  savedCustomers,
  company_id,
  id,
  employees,
  equipments,
  services = [],
  areas = [],
  sectors = [],
  itemsList = [],
  measureUnitsList = [],
  savedFilters,
  savedFiltersEquipmentTable,
  savedFiltersServiceTable,
  savedVisibilityEquipment,
}: DataCustomersProps<TData, TValue>) {
  const [selectedCustomer, setSelectedCustomer] = useState<TData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Estado para manejar los empleados seleccionados
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dialogSelectedEmployees, setDialogSelectedEmployees] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Opciones para el MultiSelectCombobox
  const employeeOptions = (employees ?? []).map((emp) => ({
    label: emp.fullName || 'Sin nombre',
    value: String(emp.id),
  }));

  // Filtrar empleados asignados al cliente seleccionado
  const customerEmployees =
    employees?.filter((employee) => {
      const isAssigned =
        employee.contractor_employee?.some((contractor: any) => {
          const contractorId = contractor.contractor_id?.id || contractor.contractor_id;
          const isMatch = contractorId === selectedCustomer?.id;
          if (isMatch) {
            console.log('Empleado asignado:', employee.id, 'al cliente:', selectedCustomer?.id);
          }
          return isMatch;
        }) || false;

      console.log('Empleado:', employee.id, 'está asignado:', isAssigned);
      return isAssigned;
    }) || [];

  // Sincronizar empleados seleccionados del cliente solo al abrir el modal
  useEffect(() => {
    if (isDialogOpen) {
      setDialogSelectedEmployees(customerEmployees.map((emp) => String(emp.id)));
    }
  }, [isDialogOpen, customerEmployees]);

  // Manejar la apertura/cierre del diálogo
  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
  };
  const handleSubmit = (data: any) => {
    console.log(data);
  };
  // Guardar empleados seleccionados (persistente y server action)
  const handleSaveEmployees = async () => {
    if (!selectedCustomer) return;
    await asignarEmpleadosACliente(selectedCustomer.id, dialogSelectedEmployees);
    setSelectedEmployees(dialogSelectedEmployees);
    setIsDialogOpen(false);
  };

  // Ejemplo de server action (puedes mover esto a otro archivo)
  async function asignarEmpleadosACliente(clienteId: string, empleadosIds: string[]) {
    // Lógica para actualizar la tabla contractor_employee
  }

  const [showForm, setShowForm] = useState(false);

  const handleRowClick = (row: TData) => {
    setSelectedCustomer(row);
    setShowForm(true);
    setIsEditing(false);
  };
  console.log(employees);
  const transformEmployeeData = (employee: any) => ({
    ...employee,
    city: employee.city ? parseInt(employee.city) : null,
    province: employee.province ? parseInt(employee.province) : null,
    company_position: employee.company_position || null,
    hierarchical_position: employee.hierarchical_position || null,
    workflow_diagram: employee.workflow_diagram || null,
  });

  // Depuración: Ver estructura de los empleados y sus relaciones
  console.log('Todos los empleados:', employees);
  console.log('Cliente seleccionado:', selectedCustomer?.id);

  // Transformar los datos de los empleados
  const transformedEmployees = customerEmployees.map(transformEmployeeData);
  console.log('Empleados transformados:', transformedEmployees);

  // Efecto para depuración
  // useEffect(() => {
  //   console.log('selectedEmployees actualizado:', selectedEmployees);
  //   console.log('customerEmployees:', customerEmployees);

  //   // Verificar que los empleados seleccionados sean válidos
  //   if (selectedEmployees.some(id => typeof id !== 'string')) {
  //     console.error('Error: Algunos IDs de empleados no son strings', selectedEmployees);
  //   }
  // }, [selectedEmployees, customerEmployees]);
  const names = createFilterOptions(data, (customer) => customer.name);
  const cuit = createFilterOptions(data, (customer) => customer.cuit);
  const client_email = createFilterOptions(data, (customer) => customer.client_email);
  const client_phone = createFilterOptions(data, (customer) => customer.client_phone);
  const savedVisibility = savedCustomers ? JSON.parse(savedCustomers) : {};
  // Esta variable ya no es necesaria porque la movimos arriba
  const customerEquipments = equipments?.filter((equipment) => {
    // Verifica si el equipo está asignado directamente al cliente
    const isDirectlyAllocated = equipment.allocated_to
      ? equipment.allocated_to.includes(selectedCustomer?.id || '')
      : false;

    // Verifica si el equipo está vinculado a través de contractor_equipment
    const isContractorEquipment = equipment.contractor_equipment?.some(
      (contractor) => contractor.contractor_id?.id === selectedCustomer?.id
    );

    return isDirectlyAllocated || isContractorEquipment;
  });
  const employeeOptions1 = (employees || []).map((emp) => {
    const id = emp?.id ? String(emp.id) : '';
    return {
      value: id,
      label: `${emp.firstname || ''} ${emp.lastname || ''} (${emp.document_number || 'Sin documento'})`,
      ...emp,
    };
  });
  // Si estamos viendo/editar un cliente existente (pestañas)
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
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="gh_orange">Cargar empleados</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Seleccionar empleados</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="space-y-4 w-full">
                        <MultiSelectCombobox
                          options={employeeOptions1}
                          selectedValues={selectedEmployees}
                          onChange={(values) => {
                            console.log('Nueva selección de empleados:', values);
                            if (Array.isArray(values)) {
                              // Crear un nuevo array con valores únicos
                              const uniqueValues = Array.from(new Set(values));
                              setSelectedEmployees(uniqueValues);
                            }
                          }}
                          placeholder="Buscar empleados..."
                          emptyMessage="No se encontraron empleados"
                        />
                      </div>

                      <div className="flex justify-end space-x-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            console.log('Cancel button clicked');
                            setIsDialogOpen(false);
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={async () => {
                            // TODO: Implement save functionality
                            console.log('Saving employees:', selectedEmployees);
                            // TODO: Implement save functionality here
                            console.log('Save button clicked');
                            setIsDialogOpen(false);
                          }}
                          disabled={selectedEmployees.length === 0}
                        >
                          Guardar ({selectedEmployees.length})
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {transformedEmployees.length > 0 ? (
                <EmployeesTableReusable
                  onRowClick={(employee) => handleRowClick(employee as any)}
                  employeesPromise={Promise.resolve(transformedEmployees)}
                  tableId="employees-table"
                  savedVisibility={savedVisibility}
                />
              ) : (
                <div className="text-center py-4 text-muted-foreground">No hay empleados asignados a este cliente.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="equipos">
            <div className=" p-6 rounded-lg border">
              <h3 className="text-xl font-semibold mb-6">Equipos del Cliente</h3>
              <p className="text-muted-foreground">Módulo de equipos en desarrollo...</p>
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
          ],
        }}
      />
    </div>
  );
}
