'use client';

import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import type { VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import {
  fetchAllEmployeeExpiringDocuments,
  fetchEmployeeExpiringDocuments,
} from '../../../../app/dashboard/componentDashboard/actions/server-actions';
import { employeesExpiringColumnsServer } from '../../../../app/dashboard/componentDashboard/table/employees-expiring-columns-server';

export default function EmployeesTableServer({
  initialData,
  savedFilters,
  savedVisibility,
}: {
  initialData: Awaited<ReturnType<typeof fetchEmployeeExpiringDocuments>>;
  savedFilters: string[];
  savedVisibility: VisibilityState;
}) {
  const company_id = Cookies.get('actualComp');

  // Función wrapper para la exportación
  const handleFetchAllData = async (options: { sorting: any; columnFilters: any }) => {
    const result = await fetchAllEmployeeExpiringDocuments({
      sorting: options.sorting,
      columnFilters: options.columnFilters,
    });
    return result;
  };

  return (
    <BaseDataTable
      columns={employeesExpiringColumnsServer}
      savedVisibility={savedVisibility}
      initialData={initialData}
      tableId="dashboard-employees-table-expiring-documents"
      enableRowSelection={false}
      serverSide={true}
      fetchData={fetchEmployeeExpiringDocuments}
      fetchAllData={handleFetchAllData}
      queryKey={`dashboard-employees-expiring-${company_id}`}
      toolbarOptions={{
        initialVisibleFilters: savedFilters,
        filterableColumns: [
          {
            columnId: 'validity',
            title: 'Fecha de Vencimiento',
            type: 'date-range',
            showFrom: true,
            showTo: true,
            fromPlaceholder: 'Desde',
            toPlaceholder: 'Hasta',
          },
        ],
        searchableColumns: [
          {
            columnId: 'employees.lastname',
            placeholder: 'Buscar por empleado...',
          },
          {
            columnId: 'document_types.name',
            placeholder: 'Buscar por tipo de documento...',
          },
        ],
        showFilterOptions: true,
        showExport: true,
      }}
    />
  );
}
