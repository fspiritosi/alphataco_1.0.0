'use client';

import { querySelectDistinct } from '@/app/server/GET/probando';
import { Card } from '@/components/ui/card';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import type { VisibilityState } from '@tanstack/react-table';
import { fetchAllMonthlyDocumentsData, fetchMonthlyDocumentsData } from '../lib/actions/actions';
import { columnsMonthlyDocumentServer } from './table-columns';

// 🔑 CRÍTICO: Tipo inferido automáticamente del retorno de la función del servidor
type MonthlyDocumentsTableProps = {
  initialData?: Awaited<ReturnType<typeof fetchMonthlyDocumentsData>>;
  savedFilters: string[];
  savedVisibility: VisibilityState;
};

export default function MonthlyDocumentsTableServer({
  initialData,
  savedFilters,
  savedVisibility,
}: MonthlyDocumentsTableProps) {
  // 🔑 IMPORTANTE: Función para exportación completa
  const handleFetchAllData = async (options: { sorting: any; columnFilters: any }) => {
    const result = await fetchAllMonthlyDocumentsData({
      sorting: options.sorting,
      columnFilters: options.columnFilters,
    });
    return result.rows;
  };

  return (
    <Card className="p-6">
      <BaseDataTable
        columns={columnsMonthlyDocumentServer}
        savedVisibility={savedVisibility}
        initialData={initialData}
        tableId="monthly-documents-employees" // 🔑 IMPORTANTE: ID único para cookies
        enableRowSelection={true}
        serverSide={true} // 🔑 CRÍTICO: Cambio principal - ahora server-side
        fetchData={fetchMonthlyDocumentsData} // 🔑 SIMPLE: Pasar directamente la función
        fetchAllData={handleFetchAllData} // 🔑 IMPORTANTE: Función para exportación
        queryKey="monthly-documents-employees" // 🔑 IMPORTANTE: Query key único para cache
        toolbarOptions={{
          initialVisibleFilters: savedFilters,
          // ✅ MANTENER: Mismos filtros que la implementación original
          filterableColumns: [
            {
              columnId: 'document_types.name',
              title: 'Tipo de Documento',
              config: {
                tableName: 'documents_employees',
                select: 'document_types.name' as '*',
                relation: '{"document_types": "id_document_types"}',
                p_filters: {
                  'document_types.is_it_montlhy': true, // ✅ Ahora funciona
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
                tableName: 'documents_employees',
                select: 'document_types.mandatory' as '*',
                relation: '{"document_types": "id_document_types"}',
                p_filters: {
                  'document_types.is_it_montlhy': true, // ✅ Ahora funciona
                },
                mapper: (
                  data: Awaited<
                    ReturnType<typeof querySelectDistinct<'documents_employees', 'document_types.mandatory'>>
                  >
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
                p_filters: {
                  'document_types.is_it_montlhy': true, // ✅ Ahora funciona
                },
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
              columnId: 'period',
              title: 'Periodo',
              type: 'date-range',
              fromPlaceholder: 'Desde (Periodo)',
              toPlaceholder: 'Hasta (Periodo)',
              showFrom: true,
              showTo: true,
            },
          ],
          // ✅ MANTENER: Búsqueda por empleado (igual que la implementación original)
          searchableColumns: [
            {
              columnId: 'employees.lastname', // 🔑 DEBE coincidir con id de columna
              placeholder: 'Buscar por empleado...', // ✅ MANTENER: Mismo placeholder
            },
          ],
          showExport: true,
          showDocumentDownload: true,
          showFilterOptions: true,
        }}
      />
    </Card>
  );
}

// 🔑 IMPORTANTE: Exportar el componente como default
export { MonthlyDocumentsTableServer };
