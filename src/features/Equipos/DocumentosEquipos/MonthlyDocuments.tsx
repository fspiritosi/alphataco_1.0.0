'use client';
import { ColumnsMonthly } from '@/app/dashboard/columsMonthly';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { PermanentDocumentsDownloadButton } from '@/features/Employees/Empleados/DocumentosEmpleados/PermanentDocumentsDownloadButton';
import { formatVehiculesDocuments } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { VisibilityState } from '@tanstack/react-table';

function MonthlyDocumentsEquipment({
  monthlyDocuments,
  savedVisibility,
  savedFilter,
}: {
  monthlyDocuments: ReturnType<typeof formatVehiculesDocuments>[];
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const employeeName = createFilterOptions(monthlyDocuments, (employee) => employee.resource);
  const documentName = createFilterOptions(monthlyDocuments, (document) => document.documentName);

  // console.log(monthlyDocuments[0], 'monthlyDocuments');
  return (
    <BaseDataTable
      tableId="monthly-documents-vehicles"
      columns={ColumnsMonthly}
      data={monthlyDocuments}
      savedVisibility={savedVisibility}
      toolbarOptions={{
        initialVisibleFilters: savedFilter || [],
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

export default MonthlyDocumentsEquipment;
