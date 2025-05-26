'use client';
import { ExpiredColums } from '@/app/dashboard/colums';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { PermanentDocumentsDownloadButton } from '@/features/Employees/Empleados/DocumentosEmpleados/PermanentDocumentsDownloadButton';
import { formatVehiculesDocuments } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { VisibilityState } from '@tanstack/react-table';

function PermanentDocumentsEquipment({
  permanentDocuments,
  savedVisibility,
  savedFilter,
}: {
  permanentDocuments: ReturnType<typeof formatVehiculesDocuments>[];
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const employeeName = createFilterOptions(permanentDocuments, (employee) => employee.resource);
  const documentName = createFilterOptions(permanentDocuments, (document) => document.documentName);

  return (
    <div>
      {/* <EmployeesTableReusable
        row_classname="text-red-500"
        employees={formattedEmployees}
        tableId="permanent-documents-vehicles"
        savedVisibility={JSON.parse(savedVisibility || '{}') as VisibilityState}
      /> */}
      <BaseDataTable
        tableId="permanent-documents-vehicles"
        columns={ExpiredColums}
        data={permanentDocuments}
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

export default PermanentDocumentsEquipment;
