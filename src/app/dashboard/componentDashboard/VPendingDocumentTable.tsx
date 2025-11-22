'use client';
import { useLoggedUserStore } from '@/store/loggedUser';
import { ExpiredDataTable } from '../data-table';
import { ExpiredColums } from '../pedidos/colums';

function VPendingDocumentTable() {
  const vehicles = useLoggedUserStore((state) => state.pendingDocuments)?.vehicles;
  return (
    <ExpiredDataTable
      data={vehicles || []}
      columns={ExpiredColums}
      pending={true}
      localStorageName="dashboardVPendingColumns"
    />
  );
}

export default VPendingDocumentTable;
