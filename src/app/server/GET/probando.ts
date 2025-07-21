import { supabaseBrowser } from '@/lib/supabase/browser';
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

/**
 * Función query con soporte para filtros
 * @param tableName Nombre de la tabla
 * @param select Columnas a seleccionar (puede incluir relaciones)
 * @param filters Array opcional de filtros
 * @returns Datos tipados según la tabla
 *
 * @example
 * // Consulta básica
 * const data = await query('employees', '*');
 *
 * // Con filtro de igualdad
 * const activeEmployees = await query('employees', '*', [
 *   { column: 'is_active', value: true }
 * ]);
 *
 * // Con múltiples filtros y operadores
 * const filteredEmployees = await query('employees', '*', [
 *   { column: 'firstname', operator: 'ilike', value: '%Juan%' },
 *   { column: 'company_id', value: '123' }
 * ]);
 */
export async function query<TableName extends keyof Database['public']['Tables'], Query extends string = '*'>(
  tableName: TableName,
  select: Query,
  filters?: Filter<TableName>[]
) {
  const supabase = supabaseBrowser();
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
  const supabase = supabaseBrowser();
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
