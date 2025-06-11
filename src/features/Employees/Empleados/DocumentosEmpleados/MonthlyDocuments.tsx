import { ColumnsMonthly } from '@/app/dashboard/columsMonthly';
import { fetchEmployeeMonthlyDocuments } from '@/app/server/GET/actions';
import { formatEmployeeDocuments } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { cookies } from 'next/headers';
import { createFilterOptions } from '../components/utils/utils';

async function MonthlyDocuments({}) {
  const monthlyDocuments = (await fetchEmployeeMonthlyDocuments()).map(formatEmployeeDocuments);
  const cookiesStore = cookies();
  const savedVisibilityMonthly = cookiesStore.get(`monthly-documents-employees`)?.value;
  const savedFiltersMonthly = cookiesStore.get(`monthly-documents-employees-filters`)?.value;
  const employeeName = createFilterOptions(monthlyDocuments, (employee) => employee.resource);
  const documentName = createFilterOptions(monthlyDocuments, (document) => document.documentName);

  return (
    <BaseDataTable
      tableId="monthly-documents-employees"
      columns={ColumnsMonthly}
      data={monthlyDocuments}
      savedVisibility={savedVisibilityMonthly ? JSON.parse(savedVisibilityMonthly) : []}
      toolbarOptions={{
        initialVisibleFilters: savedFiltersMonthly ? JSON.parse(savedFiltersMonthly) : [],
        filterableColumns: [
          {
            columnId: 'Empleado',
            title: 'Empleado',
            options: employeeName,
          },
          {
            columnId: 'Documento',
            title: 'Documento',
            options: documentName,
          },
          {
            columnId: 'Periodo',
            title: 'Periodo',
            type: 'date-range',
            fromPlaceholder: 'Desde (Periodo)',
            toPlaceholder: 'Hasta (Periodo)',
            showFrom: true,
            showTo: true,
          },
        ],
        showExport: false,
        showDocumentDownload: true,
        // extraActions: <div>keloke</div>,
      }}
    />
  );
}

export default MonthlyDocuments;
