import { columnsEmployeeDocument } from '@/app/dashboard/columsEmployeeDocument';
import { fetchEmployeeMonthlyDocuments } from '@/app/server/GET/actions';
import { formatEmployeeDocumentsSimple } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { cookies } from 'next/headers';
import { createFilterOptions } from '../components/utils/utils';

async function MonthlyDocuments({}) {
  const monthlyDocuments = (await fetchEmployeeMonthlyDocuments()).map(formatEmployeeDocumentsSimple);
  const cookiesStore = cookies();
  const savedVisibilityMonthly = cookiesStore.get(`monthly-documents-employees`)?.value;
  const savedFiltersMonthly = cookiesStore.get(`monthly-documents-employees-filters`)?.value;
  const employeeName = createFilterOptions(monthlyDocuments, (employee) => employee.resource);
  const documentName = createFilterOptions(monthlyDocuments, (document) => document.documentName);

  const allocatedTo = createFilterOptions(
    monthlyDocuments.flatMap((doc) => doc.allocated_to_names || []),
    (name) => name
  );

  return (
    <BaseDataTable
      tableId="monthly-documents-employees"
      columns={columnsEmployeeDocument}
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
            columnId: 'Tipo de Documento',
            title: 'Tipo de Documento',
            options: createFilterOptions(monthlyDocuments, (doc) => doc.documentName || ''),
          },
          {
            columnId: 'Afectado a',
            title: 'Afectado a',
            options: allocatedTo,
          },
          {
            columnId: 'Mandatorio',
            title: 'Mandatorio',
            options: createFilterOptions(monthlyDocuments, (doc) => doc.mandatory || ''),
          },
          {
            columnId: 'Estado',
            title: 'Estado',
            options: createFilterOptions(monthlyDocuments, (doc) => doc.state || ''),
          },
          {
            columnId: 'Multirecurso',
            title: 'Multirecurso',
            options: createFilterOptions(monthlyDocuments, (doc) => doc.multiresource || ''),
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
