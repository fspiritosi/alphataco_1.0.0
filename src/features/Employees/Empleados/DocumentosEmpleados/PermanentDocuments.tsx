'use client';
import { ExpiredColums } from '@/app/dashboard/colums';
import { formatEmployeeDocuments } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { VisibilityState } from '@tanstack/react-table';
import { createFilterOptions } from '../components/utils/utils';
import { PermanentDocumentsDownloadButton } from './PermanentDocumentsDownloadButton';

function PermanentDocuments({
  permanentDocuments,
  savedVisibility,
  savedFilters,
}: {
  permanentDocuments: ReturnType<typeof formatEmployeeDocuments>[];
  savedVisibility: VisibilityState;
  savedFilters: string[];
}) {
  const employeeName = createFilterOptions(permanentDocuments, (employee) => employee.resource);
  const documentName = createFilterOptions(permanentDocuments, (document) => document.documentName);

  return (
    <div>
      {/* <EmployeesTableReusable
        row_classname="text-red-500"
        employees={formattedEmployees}
        tableId="permanent-documents-employees"
        savedVisibility={JSON.parse(savedVisibility || '{}') as VisibilityState}
      /> */}
      <BaseDataTable
        tableId="permanent-documents-employees"
        columns={ExpiredColums}
        data={permanentDocuments}
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
              columnId: 'Vencimiento',
              title: 'Vigencia',
              type: 'date-range',
              fromPlaceholder: 'Desde (Vencimiento)',
              toPlaceholder: 'Hasta (Vencimiento)',
              showFrom: true,
              showTo: true,
            },
          ],
          extraActions: (table) => <PermanentDocumentsDownloadButton table={table} />,
          // extraActions: <div>keloke</div>,
        }}
        savedVisibility={savedVisibility}
      />
    </div>
  );
}

export default PermanentDocuments;
