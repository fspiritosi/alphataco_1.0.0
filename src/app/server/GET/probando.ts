import { supabaseBrowser } from '@/lib/supabase/browser';
import { supabaseServer } from '@/lib/supabase/server';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { Database } from '../../../../database.types';

// Tipo helper para el query builder de Supabase
type SupabaseQueryBuilder = ReturnType<ReturnType<ReturnType<typeof supabaseBrowser>['from']>['select']>;
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
    server?: boolean;
    company_id_column?: keyof Database['public']['Tables'][TableName]['Row'];
    is_active?: boolean | null;
    permanent_filter?: (query: SupabaseQueryBuilder) => SupabaseQueryBuilder;
  }
) {
  let supabase;
  if (options.server) {
    supabase = await supabaseServer();
  } else {
    supabase = supabaseBrowser();
  }
  // Calcular rango para paginación
  const from = options.pageIndex * options.pageSize;
  const to = from + options.pageSize - 1;

  // Construir query base
  let query = supabase.from(tableName).select(select, { count: 'exact' });

  // Aplicar filtros
  if (options.columnFilters?.length) {
    for (const filter of options.columnFilters) {
      const { id, value } = filter as any;

      if (!value) continue;

      // Manejar filtros de relaciones anidadas (ej: provinces.name, contractor_employee.customers.name)
      if (id.includes('.')) {
        // Para relaciones anidadas, construir la cadena de relación completa
        const parts = id.split('.');
        const columnName = parts[parts.length - 1]; // La última parte es la columna

        if (value === null || value[0] === 'null' || value[0] === null) {
          query = query.is(id, null);
        } else {
          // Para relaciones de múltiples niveles, necesitamos aplicar NOT NULL en cada nivel
          if (parts.length > 2) {
            // Relación de múltiples niveles (ej: contractor_employee.customers.name)

            // Aplicar NOT NULL para cada nivel de la relación
            for (let i = 0; i < parts.length - 1; i++) {
              const relationPath = parts.slice(0, i + 1).join('.');

              query = query.not(relationPath, 'is', null);
            }
          } else {
            // Relación simple (ej: provinces.name)

            const [relationTable] = parts;

            query = query.not(relationTable, 'is', null);
          }
        }

        // Luego aplicar el filtro específico
        // Para filtros múltiples en relaciones - usar operador IN
        if (Array.isArray(value) && value.length > 0 && value[0] !== 'null' && value[0] !== null) {
          query = query.in(id, value);
        }
        // Para filtros de texto en relaciones
        else if (typeof value === 'string' && value.trim()) {
          const parts = id.split('.');
          const columnName = parts[parts.length - 1];
          // Soportar búsqueda por nombre completo cuando el id termina en 'lastname' (e.g., 'employees.lastname')
          if (columnName === 'lastname') {
            const foreignPath = parts.slice(0, -1).join('.');
            // Dividir el valor de búsqueda en palabras individuales
            const searchWords = value
              .trim()
              .split(/\s+/)
              .filter((word) => word.length > 0);

            if (searchWords.length === 1) {
              // Una sola palabra: buscar en firstname O lastname
              const orExpr = `lastname.ilike.*${searchWords[0]}*,firstname.ilike.*${searchWords[0]}*`;
              query = query.or(orExpr, { referencedTable: foreignPath as any });
            } else {
              // Múltiples palabras: cada palabra debe aparecer en firstname O lastname
              // Construir condiciones AND para cada palabra
              searchWords.forEach((word) => {
                const orExpr = `lastname.ilike.*${word}*,firstname.ilike.*${word}*`;
                query = query.or(orExpr, { referencedTable: foreignPath as any });
              });
            }
          } else {
            query = query.ilike(id, `%${value}%`);
          }
        }
      }
      // Filtros en columnas directas de la tabla principal
      else {
        // Filtro de texto (búsqueda)
        if (typeof value === 'string' && value.trim()) {
          // Caso especial para búsqueda en lastname: buscar en firstname y lastname
          if (id === 'lastname') {
            // Dividir el valor de búsqueda en palabras individuales
            const searchWords = value
              .trim()
              .split(/\s+/)
              .filter((word) => word.length > 0);

            if (searchWords.length === 1) {
              // Una sola palabra: buscar en firstname O lastname
              query = query.or(`firstname.ilike.*${searchWords[0]}*,lastname.ilike.*${searchWords[0]}*`);
            } else {
              // Múltiples palabras: cada palabra debe aparecer en firstname O lastname
              searchWords.forEach((word) => {
                query = query.or(`firstname.ilike.*${word}*,lastname.ilike.*${word}*`);
              });
            }
          } else {
            query = query.ilike(id, `%${value}%`);
          }
        }

        // Filtros múltiples (arrays)
        if (Array.isArray(value) && value.length > 0) {
          // Separar valores null de valores normales
          const nullValues = value.filter((v) => v === 'null' || v === null || v === '' || v === undefined);
          const normalValues = value.filter((v) => v !== 'null' && v !== null && v !== '' && v !== undefined);

          // Si hay valores null, aplicar filtro específico para null
          if (nullValues.length > 0) {
            if (normalValues.length > 0) {
              // Combinar filtros: valores normales OR valores null/vacíos
              const normalFilter = `${id}.in.(${normalValues.join(',')})`;
              const nullFilter = `${id}.is.null`;
              query = query.or(`${normalFilter},${nullFilter}`);
            } else {
              // Solo valores null/vacíos - usar filtro simple

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

          // Manejo especial para tablas con columnas day, month, year separadas
          if (id === 'date' && tableName === 'employees_diagram') {
            if (dateRange.from) {
              const fromDate = new Date(dateRange.from);
              const fromDay = fromDate.getDate();
              const fromMonth = fromDate.getMonth() + 1; // getMonth() retorna 0-11
              const fromYear = fromDate.getFullYear();

              // Aplicar condiciones AND para fecha desde
              query = query.or(
                `and(year.gt.${fromYear}),and(year.eq.${fromYear},month.gt.${fromMonth}),and(year.eq.${fromYear},month.eq.${fromMonth},day.gte.${fromDay})`
              );
            }
            if (dateRange.to) {
              const toDate = new Date(dateRange.to);
              const toDay = toDate.getDate();
              const toMonth = toDate.getMonth() + 1; // getMonth() retorna 0-11
              const toYear = toDate.getFullYear();

              // Aplicar condiciones AND para fecha hasta
              query = query.or(
                `and(year.lt.${toYear}),and(year.eq.${toYear},month.lt.${toMonth}),and(year.eq.${toYear},month.eq.${toMonth},day.lte.${toDay})`
              );
            }
          } else {
            // Manejo estándar para columnas de fecha normales
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
  if (typeof options.is_active === 'boolean') {
    query = query.eq('is_active' as any, options.is_active as any);
  }
  // Aplicar filtro permanente si existe
  if (options.permanent_filter) {
    query = options.permanent_filter(query) as typeof query;
  }
  // Ejecutar query
  const { data, error, count } = await query;

  if (error) {
    console.error('🚨 Error en queryWithPagination:', error);
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
  const data = await queryWithPagination(
    'employees',
    'empleado_aptitudes(aptitudes_tecnicas(nombre)),*,types_of_contract(id,name),hierarchy(id,name),company_positions(id,name),work_diagram(id,name),cities(id,name),provinces(id,name),cost_center(id,name),contractor_employee(customers(id,name))',
    {
      ...options,
      // company_id_column: 'company_id',
      sorting: [...options.sorting, { id: 'lastname', desc: true }],
      columnFilters: [...options.columnFilters],
      is_active: true,
      filters: options.filters?.concat([
        {
          column: 'is_active',
          operator: 'eq',
          value: true,
        },
      ]),
    }
  );
  return data;
}
export async function fetchInactiveEmployeesData(options: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'employees'>[];
}) {
  const data = await queryWithPagination(
    'employees',
    'empleado_aptitudes(aptitudes_tecnicas(nombre)),*,types_of_contract(id,name),hierarchy(id,name),company_positions(id,name),work_diagram(id,name),cities(id,name),provinces(id,name),cost_center(id,name),contractor_employee(customers(id,name))',
    {
      ...options,
      sorting: [...options.sorting, { id: 'lastname', desc: true }],
      is_active: false,
      filters: options.filters?.concat([
        {
          column: 'is_active',
          operator: 'eq',
          value: false,
        },
      ]),
    }
  );

  return data;
}

export async function fetchEquipmentData(options: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'vehicles'>[];
  server?: boolean;
}) {
  const data = await queryWithPagination(
    'vehicles',
    '*,brand_vehicles(id,name),model_vehicles(id,name),type(id,name),sub_type(id,name),types_of_vehicles(id,name),contractor_equipment(customers(*)),equipment_owners(id,name),hierarchy(id,name)',
    {
      ...options,
      sorting: [...options.sorting, { id: 'domain', desc: true }],
      company_id_column: 'company_id',
      is_active: true,
      filters: options.filters?.concat([
        {
          column: 'is_active',
          operator: 'eq',
          value: true,
        },
        {
          column: 'type_of_vehicle' as any,
          operator: 'eq' as any,
          value: 1,
        },
      ]),

      server: options.server,
      permanent_filter: (prueba) => {
        let filtered = prueba.eq('type_of_vehicle', 1);

        return filtered;
      },
    }
  );

  return data;
}
export async function onlyFetchEquipmentData(options: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'vehicles'>[];
  server?: boolean;
}) {
  const data = await queryWithPagination(
    'vehicles',
    '*,brand_vehicles(id,name),model_vehicles(id,name),type(id,name),sub_type(id,name),types_of_vehicles(id,name),contractor_equipment(customers(*)),equipment_owners(id,name),hierarchy(id,name)',
    {
      ...options,
      sorting: [...options.sorting, { id: 'domain', desc: true }],
      company_id_column: 'company_id',
      is_active: true,
      columnFilters: [
        ...options.columnFilters,
        {
          id: 'type_of_vehicle',
          value: 2,
        },
      ],
      filters: options.filters,
      server: options.server,
      permanent_filter: (prueba) => {
        let filtered = prueba.eq('type_of_vehicle', 2);

        return filtered;
      },
    }
  );

  return data;
}
export async function fetchInactiveEquipmentData(options: {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'vehicles'>[];
  server?: boolean;
}) {
  const data = await queryWithPagination(
    'vehicles',
    '*,brand_vehicles(id,name),model_vehicles(id,name),type(id,name),sub_type(id,name),types_of_vehicles(id,name),contractor_equipment(customers(*)),equipment_owners(id,name),hierarchy(id,name)',
    {
      ...options,
      sorting: [...options.sorting, { id: 'domain', desc: true }],
      company_id_column: 'company_id',
      is_active: false,
      filters: options.filters,
      server: options.server,
    }
  );

  return data;
}

// Función para obtener todos los datos de empleados sin paginación (para exportación)
export async function fetchAllEmployeesData(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'employees'>[];
  server?: boolean;
}) {
  const result = await queryWithPagination(
    'employees',
    'empleado_aptitudes(aptitudes_tecnicas(nombre)),*,types_of_contract(id,name),hierarchy(id,name),company_positions(id,name),work_diagram(id,name),cities(id,name),provinces(id,name),cost_center(id,name),contractor_employee(customers(id,name))',
    {
      pageIndex: 0,
      pageSize: 10000, // Límite alto para obtener todos los datos
      sorting: [...options.sorting, { id: 'lastname', desc: true }],
      columnFilters: options.columnFilters,
      filters: options.filters?.concat([
        {
          column: 'is_active',
          operator: 'eq',
          value: true,
        },
      ]),
      server: false,
    }
  );

  return result;
}
export async function fetchAllEquipmentsData(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'vehicles'>[];
  server?: boolean;
}) {
  const result = await queryWithPagination(
    'vehicles',
    '*,equipment_owners(id,name),brand_vehicles(id,name),model_vehicles(id,name),type(id,name),sub_type(id,name),types_of_vehicles(id,name),contractor_equipment(customers(*)),hierarchy(id,name)',
    {
      pageIndex: 0,
      pageSize: 10000, // Límite alto para obtener todos los datos
      sorting: [...options.sorting, { id: 'domain', desc: true }],
      columnFilters: options.columnFilters,
      filters: options.filters?.concat([
        {
          column: 'is_active',
          operator: 'eq',
          value: true,
        },
        {
          column: 'type_of_vehicle' as any,
          operator: 'eq' as any,
          value: 2,
        },
      ]),
      server: false,
    }
  );

  return result;
}
export async function otrosFetchAllEquipmentsData(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'vehicles'>[];
  server?: boolean;
}) {
  const result = await queryWithPagination(
    'vehicles',
    '*,equipment_owners(id,name),brand_vehicles(id,name),model_vehicles(id,name),type(id,name),sub_type(id,name),types_of_vehicles(id,name),contractor_equipment(customers(*)),hierarchy(id,name)',
    {
      pageIndex: 0,
      pageSize: 10000, // Límite alto para obtener todos los datos
      sorting: [...options.sorting, { id: 'domain', desc: true }],
      columnFilters: options.columnFilters.concat([
        {
          id: 'type_of_vehicle',
          value: 2,
        },
      ]),
      filters: options.filters?.concat([
        {
          column: 'is_active',
          operator: 'eq',
          value: true,
        },
        {
          column: 'type_of_vehicle' as any,
          operator: 'eq' as any,
          value: 2,
        },
      ]),
      server: false,
    }
  );

  return result;
}
export async function fetchAllInactiveEquipmentsData(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'vehicles'>[];
  server?: boolean;
}) {
  const result = await queryWithPagination(
    'vehicles',
    '*,brand_vehicles(id,name),model_vehicles(id,name),type(id,name),sub_type(id,name),types_of_vehicles(id,name),contractor_equipment(customers(*)),equipment_owners(id,name),hierarchy(id,name)',
    {
      pageIndex: 0,
      pageSize: 10000, // Límite alto para obtener todos los datos
      sorting: [...options.sorting, { id: 'domain', desc: true }],
      columnFilters: options.columnFilters,
      filters: options.filters?.concat([
        {
          column: 'is_active',
          operator: 'eq',
          value: false,
        },
      ]),
      server: false,
    }
  );

  return result;
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

  const { data, error } = await supabase.rpc('select_distinct_values', {
    p_table_name: tableName,
    p_column_path: select,
    p_join_mappings: relation,
    p_multi_join_paths: multiJoinPaths ? JSON.stringify(multiJoinPaths) : null,
    p_filters: JSON.stringify(p_filters),
  });

  if (error) {
    console.error('❌ ERROR:', error);
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
