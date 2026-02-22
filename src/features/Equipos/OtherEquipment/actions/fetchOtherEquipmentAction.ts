'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';

const logger = new Logger('FetchOtherEquipmentAction');

const OTHER_EQUIPMENT_SELECT =
  '*,type(id,name,generates_qr),sub_type(id,name),brand_vehicles(id,name),model_vehicles(id,name),equipment_owners(id,name),hierarchy(id,name),cost_center(id,name),vehicles(id,domain),contractor_other_equipment(customers(id,name))' as const;

interface FetchOtherEquipmentOptions {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}

async function fetchOtherEquipmentBase(options: FetchOtherEquipmentOptions, isActive: boolean) {
  const supabase = await supabaseServer();

  const from = options.pageIndex * options.pageSize;
  const to = from + options.pageSize - 1;

  let query = supabase.from('other_equipment').select(OTHER_EQUIPMENT_SELECT, { count: 'exact' });

  // Aplicar filtros de columnas
  if (options.columnFilters?.length) {
    for (const filter of options.columnFilters) {
      const id = filter.id;
      const value = filter.value as string | string[] | null;

      if (!value) continue;

      // Manejar filtros de relaciones anidadas
      if (id.includes('.')) {
        const parts = id.split('.');

        if (value === null || (Array.isArray(value) && (value[0] === 'null' || value[0] === null))) {
          query = query.is(id, null);
        } else {
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

        if (Array.isArray(value) && value.length > 0 && value[0] !== 'null' && value[0] !== null) {
          query = query.in(id, value);
        } else if (typeof value === 'string' && value.trim()) {
          query = query.ilike(id, `%${value}%`);
        }
      }
      // Filtros en columnas directas
      else {
        if (typeof value === 'string' && value.trim()) {
          if (id === 'serial_number') {
            query = query.or(`serial_number.ilike.*${value}*,intern_number.ilike.*${value}*`);
          } else {
            query = query.ilike(id, `%${value}%`);
          }
        }

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
      }
    }
  }

  // Filtro de is_active
  query = query.eq('is_active', isActive);

  // Ordenamiento + default por created_at desc
  const allSorting = [...options.sorting, { id: 'created_at', desc: true }];
  for (const sort of allSorting) {
    if (sort.id.includes('.')) {
      const parts = sort.id.split('.');
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

  // Paginación
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    logger.error('Error fetching other equipment', { data: { error } });
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

export async function fetchActiveOtherEquipment(options: FetchOtherEquipmentOptions) {
  return fetchOtherEquipmentBase(options, true);
}

export async function fetchAllActiveOtherEquipment(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}) {
  return fetchOtherEquipmentBase(
    {
      pageIndex: 0,
      pageSize: 10000,
      sorting: options.sorting,
      columnFilters: options.columnFilters,
    },
    true
  );
}
