import { fetchEmployeesData } from '@/app/server/GET/probando';
import EjemploTablaEmployeesSupabase from './pagedata';

async function pageWrapper() {
  // Fetch de datos iniciales en el servidor
  const initialData = await fetchEmployeesData({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });
  return <EjemploTablaEmployeesSupabase initialData={initialData} />;
}

export default pageWrapper;
