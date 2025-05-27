// 'use client';
import { getNextMonthExpiringDocumentsVehicles } from '@/app/server/GET/actions';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { formatVehiculesDocuments } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { VisibilityState } from '@tanstack/react-table';
import { cookies } from 'next/headers';
import { ExpiredDocumentColumsEquipment } from './table/ExpiredDocumentColumsEquipment';

async function DocumentsTable() {
  // const documentsToShow = useLoggedUserStore((state) => state.documentsToShow);
  // const setShowLastMonthDocuments = useLoggedUserStore((state) => state.setShowLastMonthDocuments);

  const data = await getNextMonthExpiringDocumentsVehicles();
  const formatedData = (data ?? []).map(formatVehiculesDocuments).filter((e) => e.validity !== '');

  const documents = createFilterOptions(
    formatedData,
    (document) => document.documentName
    // FileText // Icono para documentos
  );

  const employees = createFilterOptions(
    formatedData,
    (document) => document.resource
    // User // Icono para documentos
  );

  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get(`dashboard-vehicles-table-expiring-documents`)?.value;
  const savedFilters = cookiesStore.get(`dashboard-vehicles-table-expiring-documents-filters`)?.value;

  return (
    <div className="px-4 pb-4">
      {/* <ExpiringDocumentTable columns={ExpiredDocumentColumsEquipment} data={formatedData} /> */}
      <BaseDataTable
        columns={ExpiredDocumentColumsEquipment}
        data={formatedData}
        tableId="dashboard-vehicles-table-expiring-documents"
        savedVisibility={JSON.parse(savedVisibility || '{}') as VisibilityState}
        toolbarOptions={{
          initialVisibleFilters: JSON.parse(savedFilters || '[]'),
          filterableColumns: [
            {
              columnId: 'Documentos',
              title: 'Tipo de Documento',
              options: documents,
            },
            {
              columnId: 'Equipment',
              title: 'Equipo',
              options: employees,
            },
          ],
          // searchableColumns: [
          //   {
          //     columnId: 'Documentos',
          //     placeholder: 'Buscar por tipo de documento',
          //   },
          // ],
        }}
      />
    </div>
  );
}

export default DocumentsTable;
