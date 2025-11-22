import { cookies } from 'next/headers';
import { fetchEquipmentExpiringDocuments } from '../../../../app/dashboard/componentDashboard/actions/server-actions';
import DocumentsTableServer from './DocumentsTableServer';

export default async function DocumentsTableServerWrapper() {
  const cookiesStore = cookies();

  // 🔑 IMPORTANTE: Gestión de cookies para persistencia
  const savedVisibility = cookiesStore.get('dashboard-vehicles-table-expiring-documents')?.value;
  const savedFilter = cookiesStore.get('dashboard-vehicles-table-expiring-documents-filters')?.value;

  // 🔑 IMPORTANTE: Carga de datos iniciales
  const initialData = await fetchEquipmentExpiringDocuments({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });

  return (
    <div className="px-4 pb-4">
      <DocumentsTableServer
        initialData={initialData}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        savedFilters={savedFilter ? JSON.parse(savedFilter) : []}
      />
    </div>
  );
}
