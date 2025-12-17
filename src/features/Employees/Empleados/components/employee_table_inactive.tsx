import { fetchInactiveEmployeesData } from '@/app/server/GET/probando';
import { cookies } from 'next/headers';
import TablaEmployeesSupabase from '../EmpleadosTables/Activos/components/EmployeesTableServer';

async function EmployeeTableInactive() {
  // const employees = fetchAllEmployees();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get(`actualComp`)?.value;
  const savedVisibility = cookiesStore.get(`activeEmployeesServerTable`)?.value;
  const savedFilters = cookiesStore.get(`activeEmployeesServerTable-filters`)?.value;

  //  <EmployeesTableReusable
  //   employeesPromise={employees}
  //   tableId="employees-table"
  //   savedVisibility={JSON.parse(savedVisibility || '{}') as VisibilityState}
  //   savedFilters={JSON.parse(savedFilters || '[]')}
  // />

  const initialData = await fetchInactiveEmployeesData({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
    filters: [
      {
        column: 'company_id',
        operator: 'eq',
        value: company_id,
      },
    ],
  });
  return (
    <TablaEmployeesSupabase
      initialData={initialData}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
    />
  );
}

export default EmployeeTableInactive;
