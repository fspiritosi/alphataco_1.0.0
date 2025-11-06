'use server';

import { queryWithPagination, type Filter } from '@/app/server/GET/probando';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';

// 🔑 INTERFAZ ESTÁNDAR para documentos mensuales
interface FetchMonthlyDocumentsOptions {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'documents_employees'>[];
}

// ✅ PATRÓN CORRECTO: Documentos mensuales con queryWithPagination
export async function fetchMonthlyDocumentsData(options: FetchMonthlyDocumentsOptions) {
  const data = await queryWithPagination(
    'documents_employees', // 🔑 Tabla principal
    `*,documents_employees_logs(updated_at),document_types!inner(*),employees(*,contractor_employee(*, customers(*)))`,
    {
      ...options,
      sorting: [...options.sorting, { id: 'created_at', desc: true }],
      permanent_filter: (query) => {
        return query.eq('document_types.is_it_montlhy', true).eq('document_types.is_active', true);
      },
      filters: options.filters || [],
      server: true,
    }
  );

  return data;
}

// ✅ PATRÓN CORRECTO: Exportación completa para documentos mensuales
export async function fetchAllMonthlyDocumentsData(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  server?: boolean;
}) {
  const data = await queryWithPagination(
    'documents_employees',
    `*,documents_employees_logs(updated_at),document_types!inner(*),employees(*,contractor_employee(*, customers(*)))`,
    {
      pageIndex: 0,
      pageSize: 10000, // 🔑 Tamaño grande para exportación
      sorting: options.sorting,
      columnFilters: options.columnFilters,
      server: options.server,
      // 🔑 PERMANENT_FILTER: Left joins + not null + filtros mensuales (como original)
      permanent_filter: (query) => {
        return (
          query
            // Filtros para documentos mensuales
            .eq('document_types.is_it_montlhy', true)
            .eq('document_types.applies', 'Persona')
            .eq('document_types.is_active', true)
            // Filtros not null (reemplazando inner joins)
            .not('employees', 'is', null)
            .not('document_types', 'is', null)
        );
      },
    }
  );

  return { rows: data.rows }; // Mantener estructura para compatibilidad
}

// 🔑 IMPORTANTE: Función auxiliar para obtener tipos de documentos mensuales
export async function getMonthlyDocumentTypes() {
  // Esta función puede ser útil para configurar los filtros dinámicamente
  // Los tipos mensuales son: "Svo" y "Art" según la BD
  return [
    { id: '598d08f9-c438-4d3e-93a9-dcec7560be4b', name: 'Svo' },
    { id: 'dc21b3c9-8acc-41fe-ad53-ac3c90ab3478', name: 'Art' },
  ];
}
