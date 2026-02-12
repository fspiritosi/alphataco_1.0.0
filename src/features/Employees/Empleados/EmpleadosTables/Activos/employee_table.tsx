import { fetchActiveEmployees } from '@/features/Employees/Empleados/lib/actions/fetch-employees-action';
import { cookies } from 'next/headers';
import TablaEmployeesSupabase from './components/EmployeesTableServer';

async function EmployeeTable() {
  const cookiesStore = await cookies();
  const savedVisibility = cookiesStore.get(`activeEmployeesServerTable`)?.value;
  const savedFilters = cookiesStore.get(`activeEmployeesServerTable-filters`)?.value;

  const initialData = await fetchActiveEmployees({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });
  return (
    <TablaEmployeesSupabase
      initialData={initialData}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
    />
  );
}

export default EmployeeTable;
