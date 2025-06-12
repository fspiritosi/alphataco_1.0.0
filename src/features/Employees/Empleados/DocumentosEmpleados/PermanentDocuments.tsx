import { ExpiredColums } from '@/app/dashboard/colums';
import { fetchEmployeePermanentDocuments } from '@/app/server/GET/actions';
import { formatEmployeeDocuments } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { VisibilityState } from '@tanstack/react-table';
import { cookies } from 'next/headers';
import { createFilterOptions } from '../components/utils/utils';

async function PermanentDocuments() {
  const permanentDocuments = (await fetchEmployeePermanentDocuments()).map(formatEmployeeDocuments);
  const cookiesStore = cookies();
  const savedVisibilityPermanent = cookiesStore.get(`permanent-documents-employees`)?.value;
  const savedFiltersPermanent = cookiesStore.get(`permanent-documents-employees-filters`)?.value;

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
          initialVisibleFilters: JSON.parse(savedFiltersPermanent || '[]'),
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
          showDocumentDownload: true,
          showExport: false,
          // extraActions: (table) => <PermanentDocumentsDownloadButton table={table} />,
          // extraActions: <div>keloke</div>,
        }}
        savedVisibility={JSON.parse(savedVisibilityPermanent || '{}') as VisibilityState}
      />
    </div>
  );
}

export default PermanentDocuments;
