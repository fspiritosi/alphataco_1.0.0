'use client';
import { ExpiredColumsEquipmentDocument } from '@/app/dashboard/columsEquipmentDocument';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { PermanentDocumentsDownloadButton } from '@/features/Employees/Empleados/DocumentosEmpleados/PermanentDocumentsDownloadButton';
import { formatSimpleVehiculesDocuments } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { VisibilityState } from '@tanstack/react-table';

function MonthlyDocumentsEquipment({
  monthlyDocuments,
  savedVisibility,
  savedFilter,
}: {
  monthlyDocuments: ReturnType<typeof formatSimpleVehiculesDocuments>[];
  savedVisibility: VisibilityState;
  savedFilter: string[];
}) {
  const equipmentName = createFilterOptions(monthlyDocuments, (equipment) => equipment.resource);
  const documentName = createFilterOptions(monthlyDocuments, (document) => document.documentName);

  // Use the new allocated_to_names field which already contains the names as strings
  const allocatedTo = createFilterOptions(
    monthlyDocuments.flatMap((doc) => doc.allocated_to_names || []),
    (name) => name
  );

  return (
    <BaseDataTable
      tableId="monthly-documents-vehicles"
      columns={ExpiredColumsEquipmentDocument}
      data={monthlyDocuments}
      savedVisibility={savedVisibility}
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
            options: createFilterOptions(monthlyDocuments, (doc) => doc.serie || ''),
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
        extraActions: (table) => <PermanentDocumentsDownloadButton table={table} />,
        // extraActions: <div>keloke</div>,
      }}
    />
  );
}

export default MonthlyDocumentsEquipment;
