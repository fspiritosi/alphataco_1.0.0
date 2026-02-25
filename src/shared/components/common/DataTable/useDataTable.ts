'use client';

import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';

import { DEFAULT_PAGE_SIZE, PARAM_SEPARATOR, parseSearchParams, stateToSearchParams } from './helpers';
import type { DataTableSearchParams, DataTableState } from './types';

// Re-export helpers para conveniencia (pero los server actions deben importar de ./helpers directamente)
export {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  PARAM_SEPARATOR,
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildSearchWhere,
  parseSearchParams,
  stateToPrismaParams,
  stateToSearchParams,
  stripPrefixFromSearchParams,
} from './helpers';

// ============================================================================
// HOOK: useDataTable
// ============================================================================

interface UseDataTableOptions {
  /** Tamaño de página por defecto */
  defaultPageSize?: number;
  /** Columnas que se pueden filtrar via URL */
  filterableColumns?: string[];
  /** ID de la tabla para namespacing de URL params (aísla filtros entre tablas) */
  tableId?: string;
}

interface UseDataTableReturn {
  /** Estado actual parseado */
  state: DataTableState;
  /** Estado de paginación para TanStack Table */
  pagination: PaginationState;
  /** Estado de sorting para TanStack Table */
  sorting: SortingState;
  /** Estado de filtros para TanStack Table */
  columnFilters: ColumnFiltersState;
  /** Callback cuando cambia la paginación */
  onPaginationChange: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void;
  /** Callback cuando cambia el sorting */
  onSortingChange: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  /** Callback cuando cambian los filtros */
  onColumnFiltersChange: (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => void;
  /** Callback para búsqueda global */
  onGlobalFilterChange: (value: string) => void;
  /** Resetear todos los filtros */
  resetFilters: () => void;
  /** Indica si hay una navegación pendiente (transición React) */
  isPending: boolean;
  /** Función para envolver navegaciones en una transición React */
  startTransition: (callback: () => void) => void;
}

/**
 * Hook para manejar el estado del DataTable sincronizado con la URL
 *
 * @example
 * ```tsx
 * const {
 *   state,
 *   pagination,
 *   sorting,
 *   columnFilters,
 *   onPaginationChange,
 *   onSortingChange,
 *   onColumnFiltersChange,
 * } = useDataTable({
 *   defaultPageSize: 20,
 *   filterableColumns: ['status', 'priority'],
 * });
 *
 * const table = useReactTable({
 *   manualPagination: true,
 *   manualSorting: true,
 *   manualFiltering: true,
 *   state: { pagination, sorting, columnFilters },
 *   onPaginationChange,
 *   onSortingChange,
 *   onColumnFiltersChange,
 *   // ...
 * });
 * ```
 */
export function useDataTable(options: UseDataTableOptions = {}): UseDataTableReturn {
  const { defaultPageSize = DEFAULT_PAGE_SIZE, filterableColumns = [], tableId } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Prefijo para namespacing de params en la URL (vacío = sin namespace)
  const prefix = tableId ? `${tableId}${PARAM_SEPARATOR}` : '';

  // Parsear estado actual de la URL (solo params con nuestro prefijo)
  const state = useMemo(() => {
    const params: DataTableSearchParams = {};
    searchParams.forEach((value, key) => {
      if (prefix) {
        // Solo leer params con nuestro prefijo, quitándolo
        if (key.startsWith(prefix)) {
          params[key.slice(prefix.length)] = value;
        }
      } else {
        params[key] = value;
      }
    });
    const parsed = parseSearchParams(params);
    // Aplicar defaultPageSize si no hay pageSize en URL
    if (!searchParams.has(`${prefix}pageSize`)) {
      parsed.pageSize = defaultPageSize;
    }
    return parsed;
  }, [searchParams, defaultPageSize, prefix]);

  // Convertir a formatos de TanStack Table
  const pagination: PaginationState = useMemo(
    () => ({
      pageIndex: state.page,
      pageSize: state.pageSize,
    }),
    [state.page, state.pageSize]
  );

  const sorting: SortingState = useMemo(() => state.sorting, [state.sorting]);

  const columnFilters: ColumnFiltersState = useMemo(() => {
    const filters: ColumnFiltersState = [];

    // Filtro de búsqueda global (si existe)
    if (state.search) {
      filters.push({ id: 'global', value: state.search });
    }

    // Filtros de columnas
    Object.entries(state.filters).forEach(([columnId, values]) => {
      if (filterableColumns.length === 0 || filterableColumns.includes(columnId)) {
        filters.push({ id: columnId, value: values });
      }
    });

    return filters;
  }, [state.search, state.filters, filterableColumns]);

  // Función helper para actualizar URL
  const updateURL = useCallback(
    (newState: Partial<DataTableState>) => {
      const merged = { ...state, ...newState };
      const newParams = stateToSearchParams(merged);

      // Construir URL final preservando params de otras tablas/navegación
      const finalParams = new URLSearchParams();

      if (prefix) {
        // Mantener todos los params que NO pertenecen a esta tabla
        searchParams.forEach((value, key) => {
          if (!key.startsWith(prefix)) {
            finalParams.set(key, value);
          }
        });
        // Agregar los params de esta tabla con prefijo
        newParams.forEach((value, key) => {
          finalParams.set(`${prefix}${key}`, value);
        });
      } else {
        // Sin prefijo: comportamiento original (reemplaza todo)
        newParams.forEach((value, key) => {
          finalParams.set(key, value);
        });
      }

      const queryString = finalParams.toString();
      startTransition(() => {
        router.push(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      });
    },
    [state, pathname, router, startTransition, searchParams, prefix]
  );

  // Handlers
  const onPaginationChange = useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
      updateURL({
        page: newPagination.pageIndex,
        pageSize: newPagination.pageSize,
      });
    },
    [pagination, updateURL]
  );

  const onSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      updateURL({
        sorting: newSorting,
        page: 0, // Reset to first page on sort change
      });
    },
    [sorting, updateURL]
  );

  const onColumnFiltersChange = useCallback(
    (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => {
      const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater;

      // Convertir de ColumnFiltersState a nuestro formato de filters
      const filters: Record<string, string[]> = {};
      let search = '';

      newFilters.forEach((filter) => {
        if (filter.id === 'global') {
          search = filter.value as string;
        } else {
          const value = filter.value;
          filters[filter.id] = Array.isArray(value) ? value : [String(value)];
        }
      });

      updateURL({
        filters,
        search,
        page: 0, // Reset to first page on filter change
      });
    },
    [columnFilters, updateURL]
  );

  const onGlobalFilterChange = useCallback(
    (value: string) => {
      updateURL({
        search: value,
        page: 0,
      });
    },
    [updateURL]
  );

  const resetFilters = useCallback(() => {
    if (prefix) {
      // Solo quitar params de esta tabla, mantener el resto
      const finalParams = new URLSearchParams();
      searchParams.forEach((value, key) => {
        if (!key.startsWith(prefix)) {
          finalParams.set(key, value);
        }
      });
      const queryString = finalParams.toString();
      startTransition(() => {
        router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
      });
    } else {
      startTransition(() => {
        router.push(pathname, { scroll: false });
      });
    }
  }, [pathname, router, startTransition, searchParams, prefix]);

  return {
    state,
    pagination,
    sorting,
    columnFilters,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onGlobalFilterChange,
    resetFilters,
    isPending,
    startTransition,
  };
}
