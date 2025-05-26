'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createFilterOptions, formatEmployeesForTable } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';
import { fechAllCustomers } from '../actions/create';
import { CustomerForm } from './CustomerForm';
import ServiceTable from './Services/ServiceTable'; // Importación por defecto corregida

import { EquipmentColums } from '@/app/dashboard/equipment/columns';
import { EquipmentTable } from '@/app/dashboard/equipment/data-equipment';
import { fetchAllEquipment } from '@/app/server/GET/actions';
import { EmployeesTableReusable } from '@/features/Employees/Empleados/components/tables/data/employees-table';
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
  const [showForm, setShowForm] = useState(false);

  const handleRowClick = (row: TData) => {
    setSelectedCustomer(row);
    setShowForm(true);
    setIsEditing(false);
  };
  const names = createFilterOptions(data, (customer) => customer.name);
  const cuit = createFilterOptions(data, (customer) => customer.cuit);
  const client_email = createFilterOptions(data, (customer) => customer.client_email);
  const client_phone = createFilterOptions(data, (customer) => customer.client_phone);
  const savedVisibility = savedCustomers ? JSON.parse(savedCustomers) : {};
  const customerEmployees = employees?.filter((employee) =>
    employee.contractor_employee?.some((contractor: any) => contractor.contractor_id?.id === selectedCustomer?.id)
  );
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
              <h3 className="text-xl font-semibold mb-6">Empleados del Cliente</h3>
              <p className="text-muted-foreground">Módulo de empleados en desarrollo...</p>
              <EmployeesTableReusable
                employees={customerEmployees as any}
                tableId="employees-table"
                savedVisibility={savedVisibility}
              />
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
                  customers={[selectedCustomer]}
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
