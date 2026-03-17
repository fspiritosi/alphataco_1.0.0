'use client';

import { querySelectDistinct } from '@/shared/actions/supabase-query';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import type { VisibilityState } from '@tanstack/react-table';
import { fetchAllMonthlyEquipmentDocumentsData, fetchMonthlyEquipmentDocumentsData } from './lib/actions/actions';
import { columnsMonthlyEquipmentDocumentServer } from './table-columns';

// 🔑 CRÍTICO: Tipo inferido automáticamente del retorno de la función del servidor
type MonthlyEquipmentDocumentsTableProps = {
  initialData?: Awaited<ReturnType<typeof fetchMonthlyEquipmentDocumentsData>>;
  savedFilters: string[];
  savedVisibility: VisibilityState;
};

export default function MonthlyEquipmentDocumentsTableServer({
  initialData,
  savedFilters,
  savedVisibility,
}: MonthlyEquipmentDocumentsTableProps) {
  // 🔑 IMPORTANTE: Función para exportación completa
  const handleFetchAllData = async (options: { sorting: any; columnFilters: any }) => {
    const result = await fetchAllMonthlyEquipmentDocumentsData({
      sorting: options.sorting,
      columnFilters: options.columnFilters,
    });
    return result.rows;
  };

  return (
    <BaseDataTable
      columns={columnsMonthlyEquipmentDocumentServer}
      savedVisibility={savedVisibility}
      initialData={initialData}
      tableId="monthly-documents-equipment" // 🔑 IMPORTANTE: ID único para cookies
      enableRowSelection={true}
      serverSide={true} // 🔑 CRÍTICO: Cambio principal - ahora server-side
      fetchData={fetchMonthlyEquipmentDocumentsData} // 🔑 SIMPLE: Pasar directamente la función
      fetchAllData={handleFetchAllData} // 🔑 IMPORTANTE: Función para exportación
      queryKey="monthly-documents-equipment" // 🔑 IMPORTANTE: Query key único para cache
      toolbarOptions={{
        initialVisibleFilters: savedFilters,
        // ✅ MANTENER: Filtros adaptados para equipos mensuales
        filterableColumns: [
          {
            columnId: 'document_types.name',
            title: 'Tipo de Documento',
            config: {
              tableName: 'documents_equipment',
              select: 'document_types.name' as '*',
              relation: '{"document_types": "id_document_types"}',
              p_filters: {
                'document_types.is_it_montlhy': true, // ✅ Documentos mensuales
              },
              mapper: (
                data: Awaited<ReturnType<typeof querySelectDistinct<'document_types', 'document_types.name'>>>
              ) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'state',
            title: 'Estado',
            options: [
              { label: 'Presentado', value: 'presentado' },
              { label: 'Rechazado', value: 'rechazado' },
              { label: 'Aprobado', value: 'aprobado' },
              { label: 'Vencido', value: 'vencido' },
              { label: 'Pendiente', value: 'pendiente' },
            ],
          },
          {
            columnId: 'document_types.mandatory',
            title: 'Mandatorio',
            config: {
              tableName: 'documents_equipment',
              select: 'document_types.mandatory' as '*',
              relation: '{"document_types": "id_document_types"}',
              p_filters: {
                'document_types.is_it_montlhy': true, // ✅ Documentos mensuales
              },
              mapper: (
                data: Awaited<ReturnType<typeof querySelectDistinct<'documents_equipment', 'document_types.mandatory'>>>
              ) => {
                return data.map((value) => ({
                  label: value.display_value === 'true' ? 'Mandatorio' : 'No Mandatorio',
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'document_types.multiresource',
            title: 'Multirecurso',
            config: {
              tableName: 'documents_equipment',
              select: 'document_types.multiresource' as '*',
              relation: '{"document_types": "id_document_types"}',
              p_filters: {
                'document_types.is_it_montlhy': true, // ✅ Documentos mensuales
              },
              mapper: (
                data: Awaited<
                  ReturnType<typeof querySelectDistinct<'documents_equipment', 'document_types.multiresource'>>
                >
              ) => {
                return data.map((value) => ({
                  label: value.display_value === 'true' ? 'Multirecurso' : 'No Multirecurso',
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
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
        // ✅ MANTENER: Búsqueda por equipo (serie)
        searchableColumns: [
          {
            columnId: 'vehicles.domain', // 🔑 DEBE coincidir con id de columna
            placeholder: 'Buscar por equipo...', // ✅ MANTENER: Placeholder adaptado
            // queryWithPagination maneja automáticamente la búsqueda en serie + domain
          },
        ],
        // ✅ MANTENER: Mismas opciones de toolbar
        showExport: false, // ✅ MANTENER: Igual que la implementación original
        showDocumentDownload: true, // 🔑 MANTENER: Funcionalidad específica de documentos
        showFilterOptions: true,
      }}
    />
  );
}

// 🔑 IMPORTANTE: Exportar el componente como default
export { MonthlyEquipmentDocumentsTableServer };
