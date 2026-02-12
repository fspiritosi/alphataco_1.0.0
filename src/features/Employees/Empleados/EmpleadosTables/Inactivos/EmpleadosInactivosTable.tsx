import { fetchInactiveEmployees } from '@/features/Employees/Empleados/lib/actions/fetch-employees-action';
import { cookies } from 'next/headers';
import TablaEmployeesInactiveServer from './components/EmployeesInactiveTableServer';

async function EmpleadosInactivosTable() {
  const cookiesStore = await cookies();
  const savedVisibility = cookiesStore.get(`inactiveEmployeesServerTable`)?.value;
  const savedFilters = cookiesStore.get(`inactiveEmployeesServerTable-filters`)?.value;
  const initialData = await fetchInactiveEmployees({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });

  return (
    <TablaEmployeesInactiveServer
      initialData={initialData}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
    />
  );
}

export default EmpleadosInactivosTable;
