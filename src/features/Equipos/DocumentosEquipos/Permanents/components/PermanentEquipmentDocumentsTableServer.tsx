'use client';

import { querySelectDistinct } from '@/app/server/GET/probando';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import type { VisibilityState } from '@tanstack/react-table';
import { fetchAllPermanentEquipmentDocumentsData, fetchPermanentEquipmentDocumentsData } from './lib/actions/actions';
import { columnsPermanentEquipmentDocumentServer } from './table-columns';

// 🔑 CRÍTICO: Tipo inferido automáticamente del retorno de la función del servidor
type PermanentEquipmentDocumentsTableProps = {
  initialData?: Awaited<ReturnType<typeof fetchPermanentEquipmentDocumentsData>>;
  savedFilters: string[];
  savedVisibility: VisibilityState;
};

export default function PermanentEquipmentDocumentsTableServer({
  initialData,
  savedFilters,
  savedVisibility,
}: PermanentEquipmentDocumentsTableProps) {
  // 🔑 IMPORTANTE: Función para exportación completa
  const handleFetchAllData = async (options: { sorting: any; columnFilters: any }) => {
    const result = await fetchAllPermanentEquipmentDocumentsData({
      sorting: options.sorting,
      columnFilters: options.columnFilters,
      server: true,
    });
    return result.rows;
  };

  return (
    <BaseDataTable
      columns={columnsPermanentEquipmentDocumentServer}
      savedVisibility={savedVisibility}
      initialData={initialData}
      tableId="permanent-documents-equipment" // 🔑 IMPORTANTE: ID único para cookies
      enableRowSelection={true}
      serverSide={true} // 🔑 CRÍTICO: Cambio principal - ahora server-side
      fetchData={fetchPermanentEquipmentDocumentsData} // 🔑 SIMPLE: Pasar directamente la función
      fetchAllData={handleFetchAllData} // 🔑 IMPORTANTE: Función para exportación
      queryKey="permanent-documents-equipment" // 🔑 IMPORTANTE: Query key único para cache
      toolbarOptions={{
        initialVisibleFilters: savedFilters,
        // ✅ MANTENER: Filtros adaptados para equipos
        filterableColumns: [
          {
            columnId: 'document_types.name',
            title: 'Tipo de Documento',
            config: {
              tableName: 'documents_equipment',
              select: 'document_types.name' as '*',
              relation: '{"document_types": "id_document_types"}',
              p_filters: {
                'document_types.is_it_montlhy': false, // ✅ Documentos permanentes
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
            config: {
              tableName: 'documents_equipment',
              select: 'state' as '*',
              // 🔑 AGREGAR: Relación con document_types
              relation: '{"document_types": "id_document_types"}',
              p_filters: {
                'document_types.is_it_montlhy': false, // ✅ Documentos permanentes
              },
              mapper: (data) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'document_types.mandatory',
            title: 'Mandatorio',
            config: {
              tableName: 'documents_equipment',
              select: 'document_types.mandatory' as '*',
              relation: '{"document_types": "id_document_types"}',
              p_filters: {
                'document_types.is_it_montlhy': false, // ✅ Documentos permanentes
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
                'document_types.is_it_montlhy': false, // ✅ Documentos permanentes
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
            columnId: 'Vencimiento',
            title: 'Fecha de Vencimiento',
            type: 'date-range',
            showFrom: true,
            showTo: true,
            fromPlaceholder: 'Desde',
            toPlaceholder: 'Hasta',
          },
        ],
        // ✅ MANTENER: Búsqueda por equipo (serie)
        searchableColumns: [
          {
            columnId: 'vehicles.serie', // 🔑 DEBE coincidir con id de columna
            placeholder: 'Buscar por equipo...', // ✅ MANTENER: Placeholder adaptado
          },
        ],
        // ✅ MANTENER: Mismas opciones de toolbar
        showExport: true,
        showDocumentDownload: true, // 🔑 MANTENER: Funcionalidad específica de documentos
        showFilterOptions: true,
      }}
    />
  );
}

// 🔑 IMPORTANTE: Exportar el componente como default
export { PermanentEquipmentDocumentsTableServer };
