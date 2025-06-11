import { fetchAllEmployeesInactives } from '@/shared/actions/employees.actions';
import { cookies } from 'next/headers';
import { formatEmployeesForTable } from '../components/utils/utils';

async function EmpleadosInactivosTable() {
  const employees = await fetchAllEmployeesInactives();
  const formattedEmployees = formatEmployeesForTable(employees);
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get(`employees-inactivos-table`)?.value;

  // console.log(savedVisibility, 'savedVisibility');

  return (
    <div>
      {/* <EmployeesTableReusable
        row_classname="text-red-500"
        employees={formattedEmployees}
        tableId="employees-inactivos-table"
        savedVisibility={JSON.parse(savedVisibility || '{}') as VisibilityState}
      /> */}
    </div>
  );
}

export default EmpleadosInactivosTable;
