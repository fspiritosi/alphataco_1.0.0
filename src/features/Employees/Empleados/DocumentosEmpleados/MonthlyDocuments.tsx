'use client';
import { ColumnsMonthly } from '@/app/dashboard/columsMonthly';
import { formatEmployeeDocuments } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { VisibilityState } from '@tanstack/react-table';
import { createFilterOptions } from '../components/utils/utils';
import { PermanentDocumentsDownloadButton } from './PermanentDocumentsDownloadButton';

function MonthlyDocuments({
  monthlyDocuments,
  savedVisibility,
  savedFilters,
}: {
  monthlyDocuments: ReturnType<typeof formatEmployeeDocuments>[];
  savedVisibility: VisibilityState;
  savedFilters: string[];
}) {
  const employeeName = createFilterOptions(monthlyDocuments, (employee) => employee.resource);
  const documentName = createFilterOptions(monthlyDocuments, (document) => document.documentName);

  // console.log(monthlyDocuments[0], 'monthlyDocuments');
  return (
    <BaseDataTable
      tableId="monthly-documents-employees"
      columns={ColumnsMonthly}
      data={monthlyDocuments}
      savedVisibility={savedVisibility}
      toolbarOptions={{
        initialVisibleFilters: savedFilters || [],
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
        extraActions: (table) => <PermanentDocumentsDownloadButton table={table} />,
        // extraActions: <div>keloke</div>,
      }}
    />
  );
}

export default MonthlyDocuments;
