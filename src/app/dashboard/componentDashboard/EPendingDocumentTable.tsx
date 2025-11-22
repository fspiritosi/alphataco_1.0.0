'use client';
import { useLoggedUserStore } from '@/store/loggedUser';
import { ExpiredDataTable } from '../data-table';
import { ExpiredColums } from '../pedidos/colums';

function EPendingDocumentTable() {
  const employees = useLoggedUserStore((state) => state.pendingDocuments)?.employees;
  return (
    <ExpiredDataTable
      data={employees || []}
      columns={ExpiredColums}
      pending={true}
      localStorageName="dashboardPendingColumns"
    />
  );
}

export default EPendingDocumentTable;
