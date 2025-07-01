'use client';
import { ExpiredColumsEquipmentDocument } from '@/app/dashboard/columsEquipmentDocument';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { PermanentDocumentsDownloadButton } from '@/features/Employees/Empleados/DocumentosEmpleados/PermanentDocumentsDownloadButton';
import { formatSimpleVehiculesDocuments } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { VisibilityState } from '@tanstack/react-table';

function PermanentDocumentsEquipment({
  permanentDocuments,
  savedVisibility,
  savedFilter,
}: {
  permanentDocuments: ReturnType<typeof formatSimpleVehiculesDocuments>[];
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const equipmentName = createFilterOptions(permanentDocuments, (equipment) => equipment.resource);
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
        tableId="permanent-documents-vehicles"
        savedVisibility={JSON.parse(savedVisibility || '{}') as VisibilityState}
      /> */}
      <BaseDataTable
        tableId="permanent-documents-vehicles"
        columns={ExpiredColumsEquipmentDocument}
        data={permanentDocuments}
        toolbarOptions={{
          initialVisibleFilters: savedFilter || [],
          filterableColumns: [
            {
              columnId: 'Equipo',
              title: 'Equipo',
              options: equipmentName,
            },
            {
              columnId: 'Documento',
              title: 'Documento',
              options: documentName,
            },
            {
              columnId: 'Serie',
              title: 'Serie',
              options: createFilterOptions(permanentDocuments, (doc) => doc.serie || ''),
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
          extraActions: (table) => <PermanentDocumentsDownloadButton table={table} />,
          // extraActions: <div>keloke</div>,
        }}
        savedVisibility={savedVisibility}
      />
    </div>
  );
}

export default PermanentDocumentsEquipment;
