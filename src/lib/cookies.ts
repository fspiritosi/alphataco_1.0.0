import { Logger } from '@/lib/logger';
// src/lib/cookies.ts
export type FilterValue = string | string[] | { from?: Date | null; to?: Date | null } | undefined;

export type TableFilterState = {
  columnFilters: Array<{
    id: string;
    value: FilterValue;
    type?: 'faceted' | 'search' | 'date-range';
    title?: string;
  }>;
  sorting: Array<{ id: string; desc: boolean }>;
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  columnVisibility: Record<string, boolean>;
};

const logger = new Logger('lib/cookies');
const STORAGE_KEY_PREFIX = 'table-filters-';

export function getTableFilters(tableId: string): TableFilterState | null {
  if (typeof window === 'undefined') return null;

  try {
    const storedData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tableId}`);
    return storedData ? JSON.parse(storedData) : null;
  } catch (e) {
    logger.error('Error leyendo filtros de localStorage', { data: { error: e } });
    return null;
  }
}

export function setTableFilters(tableId: string, filters: TableFilterState) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${tableId}`, JSON.stringify(filters));
  } catch (e) {
    logger.error('Error guardando filtros en localStorage', { data: { error: e } });
  }
}

export function clearTableFilters(tableId: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tableId}`);
}
