import { supabaseServer } from '@/lib/supabase/server';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { Database } from '../../../../database.types';

// Tipo para los operadores de filtro
type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'is'
  | 'in'
  | 'cs'
  | 'cd'
  | 'not.is';

// Tipo para un filtro individual
export type Filter<T extends keyof Database['public']['Tables']> = {
  column: keyof Database['public']['Tables'][T]['Row'] | string;
  operator?: FilterOperator;
  value: any;
};

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
  const supabase = supabaseServer();

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

export async function query<TableName extends keyof Database['public']['Tables'], Query extends string = '*'>(
  tableName: TableName,
  select: Query,
  filters?: Filter<TableName>[]
) {
  const supabase = supabaseServer();
  let query = supabase.from(tableName).select(select);

  // Aplicar filtros si existen
  if (filters && filters.length > 0) {
    filters.forEach((filter) => {
      const { column, operator = 'eq', value } = filter;
      // Manejo especial para el operador 'in' con arrays
      if (operator === 'in' && Array.isArray(value)) {
        // Cuando el valor es un array vacío, ignoramos este filtro
        if (value.length === 0) return;
        // Si solo hay un valor, usamos eq en lugar de in
        if (value.length === 1) {
          query = query.filter(column as string, 'eq', value[0]);
        } else {
          // Para múltiples valores, usamos la sintaxis correcta para in
          query = query.in(column as string, value);
        }
      } else {
        // Para otros operadores, seguimos usando filter
        query = query.filter(column as string, operator, value);
      }
    });
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}
/**
 * Función auxiliar para consultas con paginación
 */
export async function queryPaginated<TableName extends keyof Database['public']['Tables'], Query extends string = '*'>(
  tableName: TableName,
  select: Query,
  {
    page = 1,
    pageSize = 10,
    filters,
    orderBy,
    ascending = true,
  }: {
    page?: number;
    pageSize?: number;
    filters?: Filter<TableName>[];
    orderBy?: keyof Database['public']['Tables'][TableName]['Row'];
    ascending?: boolean;
  } = {}
) {
  const supabase = supabaseServer();
  let query = supabase.from(tableName).select(select, { count: 'exact' });

  // Aplicar filtros
  if (filters && filters.length > 0) {
    filters.forEach((filter) => {
      const { column, operator = 'eq', value } = filter;
      // Manejo especial para el operador 'in' con arrays
      if (operator === 'in' && Array.isArray(value)) {
        // Cuando el valor es un array vacío, ignoramos este filtro
        if (value.length === 0) return;
        // Si solo hay un valor, usamos eq en lugar de in
        if (value.length === 1) {
          query = query.filter(column as string, 'eq', value[0]);
        } else {
          // Para múltiples valores, usamos la sintaxis correcta para in
          query = query.in(column as string, value);
        }
      } else {
        // Para otros operadores, seguimos usando filter
        query = query.filter(column as string, operator, value);
      }
    });
  }

  // Aplicar ordenamiento
  if (orderBy) {
    query = query.order(orderBy as string, { ascending });
  }

  // Aplicar paginación
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error al obtener datos paginados:', error);
    throw error;
  }

  return {
    data,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: count ? Math.ceil(count / pageSize) : 0,
    },
  };
}

//! Documentar como implementar
