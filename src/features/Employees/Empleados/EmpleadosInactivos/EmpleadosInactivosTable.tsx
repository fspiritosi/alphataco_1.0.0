import { fetchAllEmployeesInactives } from '@/shared/actions/employees.actions';
import { VisibilityState } from '@tanstack/react-table';
import { cookies } from 'next/headers';
import { EmployeesTableReusable } from '../components/tables/data/employees-table';

async function EmpleadosInactivosTable() {
  const employees = fetchAllEmployeesInactives();
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get(`employees-inactivos-table`)?.value;

  return (
    <div>
      <EmployeesTableReusable
        row_classname="text-red-500"
        employeesPromise={employees}
        tableId="employees-inactivos-table"
        savedVisibility={JSON.parse(savedVisibility || '{}') as VisibilityState}
      />
    </div>
  );
}

export default EmpleadosInactivosTable;
