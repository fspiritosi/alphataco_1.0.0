import { columnsEmployeeDocument } from '@/app/dashboard/columsEmployeeDocument';
import { fetchEmployeePermanentDocuments } from '@/app/server/GET/actions';
import { formatEmployeeDocumentsSimple } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { VisibilityState } from '@tanstack/react-table';
import { cookies } from 'next/headers';
import { createFilterOptions } from '../components/utils/utils';

async function PermanentDocumentsServer() {
  const permanentDocuments = (await fetchEmployeePermanentDocuments()).map(formatEmployeeDocumentsSimple);
  const cookiesStore = cookies();
  const savedVisibilityPermanent = cookiesStore.get(`permanent-documents-employees`)?.value;
  const savedFiltersPermanent = cookiesStore.get(`permanent-documents-employees-filters`)?.value;

  const employeeName = createFilterOptions(permanentDocuments, (employee) => employee.resource);
  const documentName = createFilterOptions(permanentDocuments, (document) => document.documentName);
  // Use the new allocated_to_names field which already contains the names as strings
  const allocatedTo = createFilterOptions(
    permanentDocuments.flatMap((doc) => doc.allocated_to_names || []),
    (name) => name
  );
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
        columns={columnsEmployeeDocument}
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
              columnId: 'Tipo de Documento',
              title: 'Tipo de Documento',
              options: createFilterOptions(permanentDocuments, (doc) => doc.documentName || ''),
            },
            {
              columnId: 'Afectado a',
              title: 'Afectado a',
              options: allocatedTo,
            },
            {
              columnId: 'Mandatorio',
              title: 'Mandatorio',
              options: createFilterOptions(permanentDocuments, (doc) => doc.mandatory || ''),
            },
            {
              columnId: 'Estado',
              title: 'Estado',
              options: createFilterOptions(permanentDocuments, (doc) => doc.state || ''),
            },
            {
              columnId: 'Multirecurso',
              title: 'Multirecurso',
              options: createFilterOptions(permanentDocuments, (doc) => doc.multiresource || ''),
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

export default PermanentDocumentsServer;
