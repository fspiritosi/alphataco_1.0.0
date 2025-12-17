import { fetchInactiveEmployeesData } from '@/app/server/GET/probando';
import { cookies } from 'next/headers';
import TablaEmployeesInactiveServer from './components/EmployeesInactiveTableServer';

async function EmpleadosInactivosTable() {
  const cookiesStore = await cookies();
  const savedVisibility = cookiesStore.get(`inactiveEmployeesServerTable`)?.value;
  const savedFilters = cookiesStore.get(`inactiveEmployeesServerTable-filters`)?.value;
  const company_id = cookiesStore.get(`actualComp`)?.value;
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
    <TablaEmployeesInactiveServer
      initialData={initialData}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
    />
  );
}

export default EmpleadosInactivosTable;
