import { supabaseBrowser } from '@/lib/supabase/browser';
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
    filters?: Filter<TableName>[];
  }
) {
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

      console.log('🔍 queryWithPagination - Procesando filtro:', { id, value, type: typeof value });

      // Manejar filtros de relaciones anidadas (ej: provinces.name, contractor_employee.customers.name)
      if (id.includes('.')) {
        console.log('🔗 Filtro de relación detectado:', { id, value });

        // Para relaciones anidadas, construir la cadena de relación completa
        const parts = id.split('.');
        const columnName = parts[parts.length - 1]; // La última parte es la columna

        // Para relaciones de múltiples niveles, necesitamos aplicar NOT NULL en cada nivel
        if (parts.length > 2) {
          // Relación de múltiples niveles (ej: contractor_employee.customers.name)
          console.log('🔗 Relación de múltiples niveles detectada:', { parts });

          // Aplicar NOT NULL para cada nivel de la relación
          for (let i = 0; i < parts.length - 1; i++) {
            const relationPath = parts.slice(0, i + 1).join('.');
            console.log('🚫 Aplicando filtro NOT NULL para nivel:', { relationPath });
            query = query.not(relationPath, 'is', null);
          }
        } else {
          // Relación simple (ej: provinces.name)
          const [relationTable] = parts;
          console.log('🚫 Aplicando filtro NOT NULL para relación simple:', { relationTable });
          query = query.not(relationTable, 'is', null);
        }

        // Luego aplicar el filtro específico
        // Para filtros múltiples en relaciones - usar operador IN
        if (Array.isArray(value) && value.length > 0) {
          console.log('📋 Aplicando filtro IN en relación:', { id, values: value });
          query = query.in(id, value);
        }
        // Para filtros de texto en relaciones
        else if (typeof value === 'string' && value.trim()) {
          console.log('📝 Aplicando filtro de texto en relación:', { id, value });
          query = query.ilike(id, `%${value}%`);
        }
      }
      // Filtros en columnas directas de la tabla principal
      else {
        // Filtro de texto (búsqueda)
        if (typeof value === 'string' && value.trim()) {
          console.log('📝 Aplicando filtro de texto directo:', { id, value });
          query = query.ilike(id, `%${value}%`);
        }

        // Filtros múltiples (arrays)
        if (Array.isArray(value) && value.length > 0) {
          console.log('📋 Aplicando filtro múltiple directo:', { id, values: value });

          // Separar valores null de valores normales
          const nullValues = value.filter((v) => v === 'null' || v === null || v === '' || v === undefined);
          const normalValues = value.filter((v) => v !== 'null' && v !== null && v !== '' && v !== undefined);

          // Si hay valores null, aplicar filtro específico para null
          if (nullValues.length > 0) {
            console.log('🔍 Detectados valores null/vacíos:', { nullValues, normalValues });

            if (normalValues.length > 0) {
              // Combinar filtros: valores normales OR valores null/vacíos
              const normalFilter = `${id}.in.(${normalValues.join(',')})`;
              const nullFilter = `${id}.is.null`;
              query = query.or(`${normalFilter},${nullFilter}`);
            } else {
              // Solo valores null/vacíos - usar filtro simple
              console.log('🎯 Aplicando filtro solo para valores null');
              query = query.is(id, null);
            }
          } else {
            // Solo valores normales
            query = query.in(id, value);
          }
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
  }
  // Aplicar filtros si existen
  if (options.filters && options.filters.length > 0) {
    options.filters.forEach((filter) => {
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
  if (options.sorting && options.sorting.length > 0) {
    for (const sort of options.sorting) {
      // Manejar ordenamiento para relaciones anidadas
      if (sort.id.includes('.')) {
        // Para relaciones anidadas, usar el formato correcto de PostgREST
        const parts = sort.id.split('.');
        const relationTable = parts[0];
        const column = parts.slice(1).join('.');

        // Aplicar ordenamiento en la relación
        query = query.order(`${relationTable}(${column})`, { ascending: sort.desc });
      } else {
        // Para columnas directas
        query = query.order(sort.id, { ascending: sort.desc });
      }
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
  filters?: Filter<'employees'>[];
}) {
  console.log('🚀 fetchEmployeesData - Opciones recibidas:', {
    pageIndex: options.pageIndex,
    pageSize: options.pageSize,
    sorting: options.sorting,
    columnFilters: options.columnFilters,
    filters: options.filters,
  });

  const data = await queryWithPagination(
    'employees',
    '*,hierarchy(id,name),company_positions(id,name),work_diagram(id,name),cities(id,name),provinces(id,name),cost_center(id,name),contractor_employee(customers(id,name))',
    {
      ...options,
      sorting: [...options.sorting, { id: 'lastname', desc: true }],
      filters: options.filters?.concat([
        {
          column: 'is_active',
          operator: 'eq',
          value: true,
        },
      ]),
    }
  );

  console.log('🚀 fetchEmployeesData - Resultado:', data);

  return data;
}
export async function fetchInactiveEmployeesData(options: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'employees'>[];
}) {
  console.log('🚀 fetchEmployeesData - Opciones recibidas:', {
    pageIndex: options.pageIndex,
    pageSize: options.pageSize,
    sorting: options.sorting,
    columnFilters: options.columnFilters,
    filters: options.filters,
  });

  const data = await queryWithPagination(
    'employees',
    '*,hierarchy(id,name),company_positions(id,name),work_diagram(id,name),cities(id,name),provinces(id,name),cost_center(id,name),contractor_employee(customers(id,name))',
    {
      ...options,
      sorting: [...options.sorting, { id: 'lastname', desc: true }],
      filters: options.filters?.concat([
        {
          column: 'is_active',
          operator: 'eq',
          value: false,
        },
      ]),
    }
  );

  console.log('🚀 fetchEmployeesData - Resultado:', data);

  return data;
}

// Función para obtener opciones de filtro dinámicas
export async function getEmployeeFilterOptions(column: string): Promise<{ label: string; value: string }[]> {
  const supabase = supabaseBrowser();

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

export async function querySelectDistinct<
  TableName extends keyof Database['public']['Tables'],
  Query extends string = '*',
>(
  tableName: TableName,
  select: Query,
  relation?: string,
  multiJoinPaths?: {
    joins: Array<{
      from_table: string;
      to_table: string;
      from_column: string;
      to_column: string;
    }>;
    final_column: string;
  },
  p_filters?: Record<string, string | number | boolean | null> | null
) {
  const supabase = supabaseBrowser();

  console.log(p_filters, 'p_filtersp_filters');

  const { data, error } = await supabase.rpc('select_distinct_values', {
    p_table_name: tableName,
    p_column_path: select,
    p_join_mappings: relation,
    p_multi_join_paths: multiJoinPaths ? JSON.stringify(multiJoinPaths) : null,
    p_filters: JSON.stringify(p_filters),
  });

  if (error) {
    console.log('❌ ERROR:', error);
    throw error;
  }

  // Procesar los datos para manejar valores null correctamente
  const processedData =
    data?.map((item: any) => ({
      ...item,
      col_value: item.col_value === 'null' ? null : item.col_value,
      // Añadir una propiedad para mostrar una etiqueta más amigable
      display_value: item.col_value === 'null' ? '(Sin valor)' : item.col_value,
    })) || [];

  return processedData;
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
