import { fetchInactiveEmployeesData } from '@/app/server/GET/probando';
import { cookies } from 'next/headers';
import TablaEmployeesSupabase from './tables/EmployeesTableServer';

async function EmployeeTableInactive() {
  // const employees = fetchAllEmployees();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get(`actualComp`)?.value;
  const savedVisibility = cookiesStore.get(`activeEmployeesServerTable`)?.value;
  const savedFilters = cookiesStore.get(`activeEmployeesServerTable-filters`)?.value;

  // console.log(savedVisibility, 'savedVisibility');

  //  <EmployeesTableReusable
  //   employeesPromise={employees}
  //   tableId="employees-table"
  //   savedVisibility={JSON.parse(savedVisibility || '{}') as VisibilityState}
  //   savedFilters={JSON.parse(savedFilters || '[]')}
  // />
  console.log(company_id, 'company_id');

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
  console.log(initialData.rowCount, 'en total inactivos');
  return (
    <TablaEmployeesSupabase
      initialData={initialData}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
    />
  );
}

export default EmployeeTableInactive;
