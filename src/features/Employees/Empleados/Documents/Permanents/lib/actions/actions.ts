'use server';

import { logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';

const actionLogger = logger.withScope('FetchPermanentEmployeeDocs');

const PERMANENT_DOCS_SELECT =
  '*,document_types(*),employees(id,lastname,firstname,email,picture,document_number)' as const;

interface FetchPermanentDocumentsOptions {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}

export async function fetchInitialPermanentDocuments(options: FetchPermanentDocumentsOptions) {
  const supabase = await supabaseServer();

  const from = options.pageIndex * options.pageSize;
  const to = from + options.pageSize - 1;

  let query = supabase.from('documents_employees').select(PERMANENT_DOCS_SELECT, { count: 'exact' });

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
          const columnName = parts[parts.length - 1];
          if (columnName === 'lastname') {
            const foreignPath = parts.slice(0, -1).join('.');
            const searchWords = value
              .trim()
              .split(/\s+/)
              .filter((word) => word.length > 0);
            if (searchWords.length === 1) {
              query = query.or(`lastname.ilike.*${searchWords[0]}*,firstname.ilike.*${searchWords[0]}*`, {
                referencedTable: foreignPath,
              });
            } else {
              searchWords.forEach((word) => {
                query = query.or(`lastname.ilike.*${word}*,firstname.ilike.*${word}*`, {
                  referencedTable: foreignPath,
                });
              });
            }
          } else {
            query = query.ilike(id, `%${value}%`);
          }
        }
      } else {
        if (typeof value === 'string' && value.trim()) {
          query = query.ilike(id, `%${value}%`);
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

  // Filtros permanentes: solo documentos permanentes con empleados activos
  query = query
    .eq('document_types.is_it_montlhy', false)
    .eq('employees.is_active', true)
    .not('employees', 'is', null)
    .not('document_types', 'is', null);

  // Ordenamiento
  const allSorting = [...(options.sorting || [])];
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
    actionLogger.error('Error fetching permanent employee documents', { data: error });
    throw error;
  }

  const totalRows = count || 0;
  return {
    rows: data || [],
    pageCount: Math.ceil(totalRows / options.pageSize),
    rowCount: totalRows,
  };
}

export async function fetchAllPermanentDocumentsData(options: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}) {
  return fetchInitialPermanentDocuments({
    pageIndex: 0,
    pageSize: 1000000,
    sorting: options.sorting || [],
    columnFilters: options.columnFilters,
  });
}
