'use client';

import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import type { VisibilityState } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import {
  fetchAllEquipmentExpiringDocuments,
  fetchEquipmentExpiringDocuments,
} from '../../../../app/dashboard/componentDashboard/actions/server-actions';
import { equipmentExpiringColumnsServer } from '../../../../app/dashboard/componentDashboard/table/equipment-expiring-columns-server';

export default function DocumentsTableServer({
  initialData,
  savedFilters,
  savedVisibility,
}: {
  initialData: Awaited<ReturnType<typeof fetchEquipmentExpiringDocuments>>;
  savedFilters: string[];
  savedVisibility: VisibilityState;
}) {
  const company_id = Cookies.get('actualComp');

  // Función wrapper para la exportación
  const handleFetchAllData = async (options: { sorting: any; columnFilters: any }) => {
    const result = await fetchAllEquipmentExpiringDocuments({
      sorting: options.sorting,
      columnFilters: options.columnFilters,
    });
    return result;
  };

  return (
    <BaseDataTable
      columns={equipmentExpiringColumnsServer}
      savedVisibility={savedVisibility}
      initialData={initialData}
      tableId="dashboard-vehicles-table-expiring-documents"
      enableRowSelection={false}
      serverSide={true}
      fetchData={fetchEquipmentExpiringDocuments}
      fetchAllData={handleFetchAllData}
      queryKey={`dashboard-vehicles-expiring-${company_id}`}
      toolbarOptions={{
        initialVisibleFilters: savedFilters,
        filterableColumns: [
          {
            columnId: 'validity',
            title: 'Fecha de Vencimiento',
            type: 'date-range',
            showFrom: true,
            showTo: true,
            fromPlaceholder: 'Desde',
            toPlaceholder: 'Hasta',
          },
        ],
        searchableColumns: [
          {
            columnId: 'vehicles.domain',
            placeholder: 'Buscar por dominio...',
          },
          {
            columnId: 'document_types.name',
            placeholder: 'Buscar por tipo de documento...',
          },
        ],
        showFilterOptions: true,
        showExport: true,
      }}
    />
  );
}
