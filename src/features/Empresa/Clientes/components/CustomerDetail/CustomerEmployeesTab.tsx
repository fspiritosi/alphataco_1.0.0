'use client';

import { EmployeesTableReusable } from '@/features/Employees/Empleados/components/tables/data/employees-table';
import { PermissionGuard } from '@/features/Permissions';
import { fetchAllEmployees2 } from '@/shared/actions/employees.actions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { VisibilityState } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import {
  getCustomerEmployeeAssignments,
  updateCustomerEmployeeAssignments,
  type AssignmentChanges,
} from '../../actions/assignments.server';
import type { CustomerRow } from '../../lib/serializers';
import { AssignmentDialog } from './AssignmentDialog';

interface CustomerEmployeesTabProps {
  customer: CustomerRow;
  savedVisibility: VisibilityState;
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

/**
 * Pestaña "Empleados": los afectados al cliente (tabla) y el modal de altas/bajas.
 * `fetchAllEmployees2` trae todos los empleados de la empresa con `contractor_employee`
 * filtrado a este cliente: sirve para la tabla (los que tienen afectación) y para las
 * opciones del selector (todos).
 */
export function CustomerEmployeesTab({ customer, savedVisibility }: CustomerEmployeesTabProps) {
  const queryClient = useQueryClient();
  const queryKey = ['customer-employees', customer.id] as const;

  const { data: employees = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchAllEmployees2(customer.id),
    staleTime: 60 * 1000,
  });

  const assignedEmployees = useMemo(
    () => employees.filter((employee) => employee.contractor_employee.length > 0),
    [employees]
  );

  const options = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: `[${employee.file}] ${capitalize(employee.lastname)} ${capitalize(employee.firstname)}`,
      })),
    [employees]
  );

  const saveAssignments = (changes: AssignmentChanges) => updateCustomerEmployeeAssignments(customer.id, changes);

  return (
    <div className="p-6 rounded-lg border">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Empleados del Cliente</h3>
        <PermissionGuard module="comercial" tab="empleados-cliente" action="update">
          <AssignmentDialog
            triggerLabel="Cargar empleados"
            title="Seleccionar empleados"
            description={`Asigná los empleados que trabajan para ${customer.name}.`}
            fieldLabel="Empleados"
            placeholder="Buscar por legajo o nombre..."
            emptyMessage="No se encontraron empleados"
            options={options}
            nouns={{ singular: 'empleado', plural: 'empleados' }}
            loadBaseline={() => getCustomerEmployeeAssignments(customer.id)}
            save={saveAssignments}
            onSaved={() => queryClient.invalidateQueries({ queryKey })}
          />
        </PermissionGuard>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <EmployeesTableReusable
          transformedEmployees={assignedEmployees}
          tableId="employees-table"
          savedVisibility={savedVisibility}
        />
      )}
    </div>
  );
}
