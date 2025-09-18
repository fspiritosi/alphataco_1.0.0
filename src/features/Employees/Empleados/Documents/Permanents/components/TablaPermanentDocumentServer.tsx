'use client';

import type { VisibilityState } from '@tanstack/react-table';
// import { fetchEmployeesData } from "@/lib/supabase-query"
import { querySelectDistinct } from '@/app/server/GET/probando';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { fetchAllPermanentDocumentsData, fetchInitialPermanentDocuments } from '../lib/actions/actions';
import { columnsEmployeeDocumentServer } from './table-colum';

// Tipo inferido automáticamente del retorno de Supabase

export default function TablaPermanentDocumentServer({
  initialData,
  savedFilters,
  savedVisibility,
}: {
  initialData?: Awaited<ReturnType<typeof fetchInitialPermanentDocuments>>;
  savedFilters: string[];
  savedVisibility: VisibilityState;
}) {
  // Función wrapper para la exportación que devuelve solo los datos
  const handleFetchAllData = async (options: { sorting: any; columnFilters: any }) => {
    const result = await fetchAllPermanentDocumentsData({
      sorting: options.sorting,
      columnFilters: options.columnFilters,
      server: true,
    });
    return result.rows; // Solo devolver los datos, no la estructura de paginación
  };
  // Definición de columnas

  return (
    <BaseDataTable
      columns={columnsEmployeeDocumentServer}
      savedVisibility={savedVisibility}
      initialData={initialData}
      tableId="permanent-documents-employees"
      enableRowSelection={true}
      // Configuración para server-side con Supabase

      serverSide={true}
      fetchData={fetchInitialPermanentDocuments}
      fetchAllData={handleFetchAllData}
      queryKey="permanent-documents-employees"
      toolbarOptions={{
        initialVisibleFilters: savedFilters,
        filterableColumns: [
          {
            columnId: 'document_types.name',
            title: 'Tipo de Documento',
            config: {
              tableName: 'documents_employees',
              select: 'document_types.name' as '*',
              relation: '{"document_types": "id_document_types"}',
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
              tableName: 'documents_employees',
              select: 'state' as '*',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'documents_employees', 'state'>>>) => {
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
              tableName: 'documents_employees',
              select: 'document_types.mandatory' as '*',
              relation: '{"document_types": "id_document_types"}',
              mapper: (
                data: Awaited<ReturnType<typeof querySelectDistinct<'documents_employees', 'document_types.mandatory'>>>
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
              tableName: 'documents_employees',
              select: 'document_types.multiresource' as '*',
              relation: '{"document_types": "id_document_types"}',
              mapper: (
                data: Awaited<
                  ReturnType<typeof querySelectDistinct<'documents_employees', 'document_types.multiresource'>>
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
        searchableColumns: [
          {
            columnId: 'employees.lastname',
            placeholder: 'Buscar por empleado...',
          },
        ],
        showExport: true,
        showDocumentDownload: true,
        showFilterOptions: true,
      }}
    />
  );
}
