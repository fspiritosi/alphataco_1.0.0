'use server';

import { supabaseBrowser } from '@/lib/supabase/browser';
import { Filter } from '@/shared/actions/supabase-query';
import { Database } from '../../../../../database.types';

export async function query<
  TableName extends keyof Database['public']['Tables'],
  Query extends string = '*',
  selectDistinct = false,
>(
  tableName: TableName,
  select: Query,
  filters?: Filter<TableName>[],
  {
    orderBy,
    ascending = true,
  }: {
    orderBy?: keyof Database['public']['Tables'][TableName]['Row'];
    ascending?: boolean;
  } = {}
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
  if (orderBy) {
    query = query.order(orderBy as string, { ascending });
  }
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function queryPaginated<TableName extends keyof Database['public']['Tables'], Query extends string = '*'>(
  tableName: TableName,
  select: Query,
  {
    page = 1,
    pageSize = 10,
    filters,
    orderBy,
    ascending = true,
    innerData,
  }: {
    page?: number;
    pageSize?: number;
    filters?: Filter<TableName>[];
    orderBy?: keyof Database['public']['Tables'][TableName]['Row'];
    ascending?: boolean;
    innerData?: null | Record<string, string>;
  } = {}
) {
  const supabase = supabaseBrowser();

  if (Object.entries(innerData || {}).length > 0) {
    Object.entries(innerData || {}).forEach(([key, value]) => {
      select = select.replace(key, value) as typeof select;
    });
  }

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
