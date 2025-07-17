import { supabaseBrowser } from '@/lib/supabase/browser';
import { supabaseServer } from '@/lib/supabase/server';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';

// Tipos base para la respuesta paginada
interface PaginatedResponse<T> {
  rows: T[];
  pageCount: number;
  rowCount: number;
}

// Función genérica mejorada para queries con paginación
export async function queryWithPagination<
  TableName extends keyof Database['public']['Tables'],
  Query extends string = '*',
>(
  tableName: TableName,
  select: Query,
  options: {
    pageIndex: number;
    pageSize: number;
    sorting?: SortingState;
    columnFilters?: ColumnFiltersState;
  }
): Promise<PaginatedResponse<any>> {
  const supabase = supabaseBrowser();

  // Calcular rango para paginación
  const from = options.pageIndex * options.pageSize;
  const to = from + options.pageSize - 1;

  // Construir query base
  let query = supabase.from(tableName).select(select, { count: 'exact' });

  // Aplicar filtros
  if (options.columnFilters) {
    for (const filter of options.columnFilters) {
      const { id, value } = filter;

      if (!value) continue;

      // Filtro de texto (búsqueda)
      if (typeof value === 'string' && value.trim()) {
        query = query.ilike(id, `%${value}%`);
      }

      // Filtros múltiples (arrays)
      if (Array.isArray(value) && value.length > 0) {
        query = query.in(id, value);
      }

      // Filtros de rango de fechas
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const dateRange = value as { from?: Date | null; to?: Date | null };
        if (dateRange.from) {
          query = query.gte(id, dateRange.from.toISOString().split('T')[0]);
        }
        if (dateRange.to) {
          query = query.lte(id, dateRange.to.toISOString().split('T')[0]);
        }
      }
    }
  }

  // Aplicar ordenamiento
  if (options.sorting && options.sorting.length > 0) {
    for (const sort of options.sorting) {
      query = query.order(sort.id, { ascending: !sort.desc });
    }
  }

  // Aplicar paginación
  query = query.range(from, to);

  // Ejecutar query
  const { data, error, count } = await query;

  console.log(data, 'data');

  if (error) {
    throw error;
  }

  const totalRows = count || 0;
  const pageCount = Math.ceil(totalRows / options.pageSize);

  return {
    rows: data || [],
    pageCount,
    rowCount: totalRows,
  };
}

// Función específica para empleados (ejemplo)
export async function fetchEmployeesData(options: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}) {
  return queryWithPagination('employees', 'id,firstname,lastname,email,created_at,status', options);
}

// Función para obtener opciones de filtro dinámicas
export async function getEmployeeFilterOptions(column: string): Promise<{ label: string; value: string }[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase.from('employees').select(column).not(column, 'is', null);

  if (error) {
    console.error('Error fetching filter options:', error);
    return [];
  }

  // Obtener valores únicos
  const uniqueValues = [...new Set(data?.map((item) => item[column as any]).filter(Boolean))];

  return uniqueValues.map((value) => ({
    label: String(value),
    value: String(value),
  }));
}

// Función original mantenida para compatibilidad
export async function query<TableName extends keyof Database['public']['Tables'], Query extends string = '*'>(
  tableName: TableName,
  select: Query
) {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from(tableName).select(select);

  if (error) {
    throw error;
  }

  return data;
}
