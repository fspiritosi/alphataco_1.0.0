'use server';

import { queryWithPagination, type Filter } from '@/app/server/GET/probando';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import moment from 'moment';
import { cookies } from 'next/headers';

// 🔑 Interfaz para parámetros de paginación
interface FetchDataOptions {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'documents_employees'>[];
}

interface FetchEquipmentDataOptions {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'documents_equipment'>[];
}

// 🔑 Función para obtener documentos de empleados a vencer (con paginación)
export async function fetchEmployeeExpiringDocuments(options: FetchDataOptions) {
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    return { rows: [], rowCount: 0, pageCount: 0 };
  }

  const nextMonth = moment().add(1, 'month').endOf('day').toISOString();

  const data = await queryWithPagination(
    'documents_employees',
    '*,document_types(*),employees(id,lastname,firstname,email,picture,document_number)',
    {
      ...options,
      server: true,
      filters: options.filters || [],
      permanent_filter: (query) => {
        return query
          .eq('document_types.is_it_montlhy', false)
          .eq('employees.is_active', true)
          .eq('employees.company_id', company_id)
          .not('employees', 'is', null)
          .not('document_types', 'is', null)
          .not('validity', 'is', null)
          .lte('validity', nextMonth)
          .order('validity', { ascending: true });
      },
    }
  );

  return data;
}

// 🔑 Función para exportación (sin paginación)
export async function fetchAllEmployeeExpiringDocuments(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'documents_employees'>[];
}) {
  const data = await fetchEmployeeExpiringDocuments({
    pageIndex: 0,
    pageSize: 10000,
    sorting: options.sorting,
    columnFilters: options.columnFilters,
    filters: options.filters,
  });

  return data.rows;
}

// 🔑 Función para obtener documentos de vehículos a vencer (con paginación)
export async function fetchEquipmentExpiringDocuments(options: FetchEquipmentDataOptions) {
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    return { rows: [], rowCount: 0, pageCount: 0 };
  }

  const nextMonth = moment().add(1, 'month').endOf('day').toISOString();

  const data = await queryWithPagination(
    'documents_equipment',
    '*,document_types(*),vehicles(id,domain,serie,intern_number)',
    {
      ...options,
      sorting: [...options.sorting, { id: 'validity', desc: false }],
      filters: options.filters || [],
      server: true,
      permanent_filter: (query) => {
        return query
          .eq('document_types.is_it_montlhy', false)
          .eq('document_types.is_active', true)
          .eq('vehicles.company_id', company_id)
          .not('vehicles', 'is', null)
          .not('document_types', 'is', null)
          .not('validity', 'is', null)
          .lte('validity', nextMonth)
          .order('validity', { ascending: true });
      },
    }
  );

  return data;
}

// 🔑 Función para exportación (sin paginación)
export async function fetchAllEquipmentExpiringDocuments(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  filters?: Filter<'documents_equipment'>[];
}) {
  const data = await fetchEquipmentExpiringDocuments({
    pageIndex: 0,
    pageSize: 10000,
    sorting: options.sorting,
    columnFilters: options.columnFilters,
    filters: options.filters,
  });

  return data.rows;
}
