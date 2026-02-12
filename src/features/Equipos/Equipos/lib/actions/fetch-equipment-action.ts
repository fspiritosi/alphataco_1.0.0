'use server';

import { logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';

const actionLogger = logger.withScope('FetchEquipmentAction');

const EQUIPMENT_SELECT =
  '*,brand_vehicles(id,name),model_vehicles(id,name),type(id,name),sub_type(id,name),types_of_vehicles(id,name),contractor_equipment(customers(*)),equipment_owners(id,name),hierarchy(id,name)' as const;

interface FetchEquipmentOptions {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}

type EquipmentType = 'vehicles' | 'others' | 'inactive';

async function buildEquipmentQuery(options: FetchEquipmentOptions, equipmentType: EquipmentType) {
  const supabase = await supabaseServer();

  const from = options.pageIndex * options.pageSize;
  const to = from + options.pageSize - 1;

  let query = supabase.from('vehicles').select(EQUIPMENT_SELECT, { count: 'exact' });

  // Aplicar filtros de columnas
  if (options.columnFilters?.length) {
    for (const filter of options.columnFilters) {
      const id = filter.id;
      const value = filter.value as string | string[] | null | { from?: Date | null; to?: Date | null };

      if (!value) continue;

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
      } else {
        if (typeof value === 'string' && value.trim()) {
          if (id === 'domain') {
            query = query.ilike(id, `%${value}%`);
          } else {
            query = query.ilike(id, `%${value}%`);
          }
        }
        if (Array.isArray(value) && value.length > 0) {
          const nullValues = value.filter((v) => v === 'null' || v === null || v === '' || v === undefined);
          const normalValues = value.filter((v) => v !== 'null' && v !== null && v !== '' && v !== undefined);
          if (nullValues.length > 0) {
            if (normalValues.length > 0) {
              query = query.or(`${id}.in.(${normalValues.join(',')}),${id}.is.null`);
            } else {
              query = query.is(id, null);
            }
          } else {
            query = query.in(id, value);
          }
        }
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

  // Aplicar filtros específicos de cada tipo
  if (equipmentType === 'vehicles') {
    query = query.eq('is_active', true).eq('type_of_vehicle', 1);
  } else if (equipmentType === 'others') {
    query = query.eq('is_active', true).eq('type_of_vehicle', 2);
  } else {
    query = query.eq('is_active', false);
  }

  // Ordenamiento + default por domain
  const allSorting = [...options.sorting, { id: 'domain', desc: true }];
  for (const sort of allSorting) {
    if (sort.id.includes('.')) {
      const parts = sort.id.split('.');
      if (parts.length > 2) continue;
      query = query.order(parts[1], { ascending: !sort.desc, referencedTable: parts[0] });
    } else {
      query = query.order(sort.id, { ascending: !sort.desc });
    }
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    actionLogger.error('Error fetching equipment', { data: error });
    throw error;
  }

  const totalRows = count || 0;
  return {
    rows: data || [],
    pageCount: Math.ceil(totalRows / options.pageSize),
    rowCount: totalRows,
  };
}

// Vehículos (type_of_vehicle = 1, activos)
export async function fetchVehiclesData(options: FetchEquipmentOptions) {
  return buildEquipmentQuery(options, 'vehicles');
}

export async function fetchAllVehiclesData(options: { sorting: SortingState; columnFilters: ColumnFiltersState }) {
  const result = await fetchVehiclesData({
    pageIndex: 0,
    pageSize: 10000,
    sorting: options.sorting,
    columnFilters: options.columnFilters,
  });
  return result;
}

// Otros (type_of_vehicle = 2, activos)
export async function fetchOtherEquipmentData(options: FetchEquipmentOptions) {
  return buildEquipmentQuery(options, 'others');
}

export async function fetchAllOtherEquipmentData(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}) {
  const result = await fetchOtherEquipmentData({
    pageIndex: 0,
    pageSize: 10000,
    sorting: options.sorting,
    columnFilters: options.columnFilters,
  });
  return result;
}

// Dados de Baja (inactivos, sin filtro de tipo)
export async function fetchInactiveEquipmentData(options: FetchEquipmentOptions) {
  return buildEquipmentQuery(options, 'inactive');
}

export async function fetchAllInactiveEquipmentData(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}) {
  const result = await fetchInactiveEquipmentData({
    pageIndex: 0,
    pageSize: 10000,
    sorting: options.sorting,
    columnFilters: options.columnFilters,
  });
  return result;
}
