import { cookies } from 'next/headers';
import EmployeesTableServer from './EmployeesTableServer';
import { fetchEmployeeExpiringDocuments } from './actions/server-actions';

export default async function EmployeesTableServerWrapper() {
  const cookiesStore = cookies();

  // 🔑 IMPORTANTE: Gestión de cookies para persistencia
  const savedVisibility = cookiesStore.get('dashboard-employees-table-expiring-documents')?.value;
  const savedFilter = cookiesStore.get('dashboard-employees-table-expiring-documents-filters')?.value;

  // 🔑 IMPORTANTE: Carga de datos iniciales
  const initialData = await fetchEmployeeExpiringDocuments({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });

  return (
    <div className="px-4 pb-4">
      <EmployeesTableServer
        initialData={initialData}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        savedFilters={savedFilter ? JSON.parse(savedFilter) : []}
      />
    </div>
  );
}
