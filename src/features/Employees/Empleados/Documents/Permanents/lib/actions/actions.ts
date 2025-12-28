import { Filter, queryWithPagination } from '@/app/server/GET/probando';
import { ColumnFiltersState, SortingState } from '@tanstack/react-table';

export async function fetchInitialPermanentDocuments(options: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'documents_employees'>[];
}) {
  // documents_employees', '*,document_types(id,name),employees(id,lastname,firstname)
  const data = await queryWithPagination(
    'documents_employees',
    '*,document_types(*),employees(id,lastname,firstname,email,picture,document_number)',
    {
      ...options,
      sorting: options.sorting || [],
      filters: options.filters || [],
      permanent_filter: (query) => {
        return query
          .eq('document_types.is_it_montlhy', false)
          .eq('employees.is_active', true)
          .not('employees', 'is', null)
          .not('document_types', 'is', null);
      },
    }
  );

  return data;
}

// Función para obtener todos los datos de permanent documents sin paginación (para exportación)
export async function fetchAllPermanentDocumentsData(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'documents_employees'>[];
  server?: boolean;
}) {
  const result = await queryWithPagination(
    'documents_employees',
    '*,document_types(*),employees(id,lastname,firstname,email,picture,document_number)',
    {
      pageIndex: 0,
      pageSize: 1000000, // Límite alto para obtener todos los datos
      sorting: options.sorting || [],
      columnFilters: options.columnFilters,
      filters: options.filters,
      server: false,
      permanent_filter: (query) => {
        return query
          .eq('document_types.is_it_montlhy', false)
          .not('employees', 'is', null)
          .not('document_types', 'is', null);
      },
    }
  );

  return result;
}
