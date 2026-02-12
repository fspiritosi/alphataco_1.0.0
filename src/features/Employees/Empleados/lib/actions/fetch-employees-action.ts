'use server';

import { logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';

const actionLogger = logger.withScope('FetchEmployeesAction');

const EMPLOYEES_SELECT =
  'empleado_aptitudes(aptitudes_tecnicas(nombre)),*,types_of_contract(id,name),hierarchy(id,name),company_positions(id,name),work_diagram(id,name),cities(id,name),provinces(id,name),cost_center(id,name),contractor_employee(customers(id,name))' as const;

interface FetchEmployeesOptions {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}

async function fetchEmployeesBase(options: FetchEmployeesOptions, isActive: boolean) {
  const supabase = await supabaseServer();

  const from = options.pageIndex * options.pageSize;
  const to = from + options.pageSize - 1;

  let query = supabase.from('employees').select(EMPLOYEES_SELECT, { count: 'exact' });

  // Aplicar filtros de columnas
  if (options.columnFilters?.length) {
    for (const filter of options.columnFilters) {
      const id = filter.id;
      const value = filter.value as string | string[] | null | { from?: Date | null; to?: Date | null };

      if (!value) continue;

      // Manejar filtros de relaciones anidadas (ej: provinces.name, contractor_employee.customers.name)
      if (id.includes('.')) {
        const parts = id.split('.');

        if (value === null || (Array.isArray(value) && (value[0] === 'null' || value[0] === null))) {
          query = query.is(id, null);
        } else {
          // Para relaciones de múltiples niveles, aplicar NOT NULL en cada nivel
          if (parts.length > 2) {
            for (let i = 0; i < parts.length - 1; i++) {
              const relationPath = parts.slice(0, i + 1).join('.');
              query = query.not(relationPath, 'is', null);
            }
          } else {
            const [relationTable] = parts;
            query = query.not(relationTable, 'is', null);
          }
        }

        // Para filtros múltiples en relaciones - usar operador IN
        if (Array.isArray(value) && value.length > 0 && value[0] !== 'null' && value[0] !== null) {
          query = query.in(id, value);
        }
        // Para filtros de texto en relaciones
        else if (typeof value === 'string' && value.trim()) {
          const columnName = parts[parts.length - 1];
          // Soportar búsqueda por nombre completo cuando el id termina en 'lastname'
          if (columnName === 'lastname') {
            const foreignPath = parts.slice(0, -1).join('.');
            const searchWords = value
              .trim()
              .split(/\s+/)
              .filter((word) => word.length > 0);

            if (searchWords.length === 1) {
              const orExpr = `lastname.ilike.*${searchWords[0]}*,firstname.ilike.*${searchWords[0]}*`;
              query = query.or(orExpr, { referencedTable: foreignPath });
            } else {
              searchWords.forEach((word) => {
                const orExpr = `lastname.ilike.*${word}*,firstname.ilike.*${word}*`;
                query = query.or(orExpr, { referencedTable: foreignPath });
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
          if (id === 'lastname') {
            const searchWords = value
              .trim()
              .split(/\s+/)
              .filter((word) => word.length > 0);

            if (searchWords.length === 1) {
              query = query.or(`firstname.ilike.*${searchWords[0]}*,lastname.ilike.*${searchWords[0]}*`);
            } else {
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
          const nullValues = value.filter((v) => v === 'null' || v === null || v === '' || v === undefined);
          const normalValues = value.filter((v) => v !== 'null' && v !== null && v !== '' && v !== undefined);

          if (nullValues.length > 0) {
            if (normalValues.length > 0) {
              const normalFilter = `${id}.in.(${normalValues.join(',')})`;
              const nullFilter = `${id}.is.null`;
              query = query.or(`${normalFilter},${nullFilter}`);
            } else {
              query = query.is(id, null);
            }
          } else {
            query = query.in(id, value);
          }
        }

        // Filtros de rango de fechas
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const dateRange = value as { from?: Date | null; to?: Date | null };
          if (dateRange.from) {
            query = query.gte(id, new Date(dateRange.from).toISOString().split('T')[0]);
          }
          if (dateRange.to) {
            query = query.lte(id, new Date(dateRange.to).toISOString().split('T')[0]);
          }
        }
      }
    }
  }

  // Aplicar filtro de is_active
  query = query.eq('is_active', isActive);

  // Aplicar ordenamiento + default por lastname (A→Z)
  const allSorting = [...options.sorting, { id: 'lastname', desc: false }];
  for (const sort of allSorting) {
    if (sort.id.includes('.')) {
      const parts = sort.id.split('.');
      // PostgREST solo soporta ordenamiento en relaciones de UN nivel
      if (parts.length > 2) continue;

      const relationTable = parts[0];
      const column = parts[1];
      query = query.order(column, {
        ascending: !sort.desc,
        referencedTable: relationTable,
      });
    } else {
      query = query.order(sort.id, { ascending: !sort.desc });
    }
  }

  // Aplicar paginación
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    actionLogger.error('Error fetching employees', { data: error });
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

export async function fetchActiveEmployees(options: FetchEmployeesOptions) {
  return fetchEmployeesBase(options, true);
}

export async function fetchInactiveEmployees(options: FetchEmployeesOptions) {
  return fetchEmployeesBase(options, false);
}

export async function fetchAllActiveEmployees(options: { sorting: SortingState; columnFilters: ColumnFiltersState }) {
  return fetchEmployeesBase(
    {
      pageIndex: 0,
      pageSize: 10000,
      sorting: options.sorting,
      columnFilters: options.columnFilters,
    },
    true
  );
}
