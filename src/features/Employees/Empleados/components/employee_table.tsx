import { fetchEmployeesData } from '@/app/server/GET/probando';
import { cookies } from 'next/headers';
import TablaEmployeesSupabase from './tables/EmployeesTableServer';

async function EmployeeTable() {
  // const employees = fetchAllEmployees();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get(`actualComp`)?.value;
  const savedVisibility = cookiesStore.get(`activeEmployeesServerTable`)?.value;
  const savedFilters = cookiesStore.get(`activeEmployeesServerTable-filters`)?.value;

  const initialData = await fetchEmployeesData({
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
