'use client';

import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';

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
  /**
   * Cuando true, usa window.history.replaceState en lugar de router.push.
   * Esto evita re-renders del servidor (no navega) — la tabla debe obtener datos via React Query.
   */
  clientSideNavigation?: boolean;
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
  /** Indica si hay una navegación pendiente (transición React) — siempre false en modo client-side */
  isPending: boolean;
  /** Función para envolver navegaciones en una transición React */
  startTransition: (callback: () => void) => void;
  /** Notifica que la URL cambió externamente (para modo client-side) */
  notifyUrlChange: () => void;
  /** Versión del URL (se incrementa con cada cambio, para reactividad) */
  urlVersion: number;
  /** Si está en modo client-side */
  isClientSide: boolean;
}

/**
 * Hook para manejar el estado del DataTable sincronizado con la URL.
 *
 * Soporta dos modos:
 * - **Server mode** (default): usa router.push, lo que dispara re-renders del servidor.
 * - **Client-side mode**: usa window.history.replaceState — actualiza la URL silenciosamente
 *   sin notificar a Next.js. La tabla debe obtener datos via React Query.
 */
export function useDataTable(options: UseDataTableOptions = {}): UseDataTableReturn {
  const {
    defaultPageSize = DEFAULT_PAGE_SIZE,
    filterableColumns = [],
    tableId,
    clientSideNavigation = false,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPendingTransition, startTransition] = useTransition();

  // Prefijo para namespacing de params en la URL (vacío = sin namespace)
  const prefix = tableId ? `${tableId}${PARAM_SEPARATOR}` : '';

  // For client-side mode: version counter triggers re-parse from window.location.search
  const [urlVersion, setUrlVersion] = useState(0);

  const notifyUrlChange = useCallback(() => {
    setUrlVersion((v) => v + 1);
  }, []);

  // Parsear estado actual
  // - Server mode: lee de useSearchParams() (reactivo a router.push)
  // - Client-side mode: lee de window.location.search (reactivo a urlVersion)
  const state = useMemo(() => {
    const params: DataTableSearchParams = {};

    if (clientSideNavigation && typeof window !== 'undefined') {
      // Leer directamente del browser URL (no del estado interno de Next.js)
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.forEach((value, key) => {
        if (prefix) {
          if (key.startsWith(prefix)) {
            params[key.slice(prefix.length)] = value;
          }
        } else {
          params[key] = value;
        }
      });
    } else {
      // Server mode: usar useSearchParams de Next.js
      searchParams.forEach((value, key) => {
        if (prefix) {
          if (key.startsWith(prefix)) {
            params[key.slice(prefix.length)] = value;
          }
        } else {
          params[key] = value;
        }
      });
    }

    const parsed = parseSearchParams(params);

    // Aplicar defaultPageSize si no hay pageSize en URL
    const pageSizeKey = `${prefix}pageSize`;
    const hasPageSize =
      clientSideNavigation && typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).has(pageSizeKey)
        : searchParams.has(pageSizeKey);

    if (!hasPageSize) {
      parsed.pageSize = defaultPageSize;
    }

    return parsed;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- urlVersion triggers re-read in client-side mode
  }, [searchParams, urlVersion, defaultPageSize, prefix, clientSideNavigation]);

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

  // Helper: leer los searchParams actuales (del lugar correcto según modo)
  const getCurrentSearchParams = useCallback(() => {
    if (clientSideNavigation && typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams(searchParams.toString());
  }, [clientSideNavigation, searchParams]);

  // Función helper para actualizar URL
  const updateURL = useCallback(
    (newState: Partial<DataTableState>) => {
      const merged = { ...state, ...newState };
      const newParams = stateToSearchParams(merged);

      // Construir URL final preservando params de otras tablas/navegación
      const finalParams = new URLSearchParams();
      const currentParams = getCurrentSearchParams();

      if (prefix) {
        // Mantener todos los params que NO pertenecen a esta tabla
        currentParams.forEach((value, key) => {
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

      if (clientSideNavigation) {
        // Actualización silenciosa de URL (NO navega, NO re-renderiza server components)
        const url = queryString ? `${pathname}?${queryString}` : pathname;
        window.history.replaceState(window.history.state, '', url);
        notifyUrlChange();
      } else {
        // Navegación del servidor (comportamiento actual para tablas no migradas)
        startTransition(() => {
          router.push(queryString ? `${pathname}?${queryString}` : pathname, {
            scroll: false,
          });
        });
      }
    },
    [state, pathname, router, startTransition, prefix, clientSideNavigation, notifyUrlChange, getCurrentSearchParams]
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
    if (clientSideNavigation) {
      const currentParams = getCurrentSearchParams();
      if (prefix) {
        // Solo quitar params de esta tabla, mantener el resto
        const keysToDelete: string[] = [];
        currentParams.forEach((_, key) => {
          if (key.startsWith(prefix)) keysToDelete.push(key);
        });
        keysToDelete.forEach((key) => currentParams.delete(key));
        const qs = currentParams.toString();
        window.history.replaceState(window.history.state, '', qs ? `${pathname}?${qs}` : pathname);
      } else {
        window.history.replaceState(window.history.state, '', pathname);
      }
      notifyUrlChange();
    } else {
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
    }
  }, [
    pathname,
    router,
    startTransition,
    searchParams,
    prefix,
    clientSideNavigation,
    notifyUrlChange,
    getCurrentSearchParams,
  ]);

  // En modo client-side, isPending es siempre false (no hay navegación pendiente)
  // El estado de carga viene de React Query (isFetching) en el componente padre
  const isPending = clientSideNavigation ? false : isPendingTransition;

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
    notifyUrlChange,
    urlVersion,
    isClientSide: clientSideNavigation,
  };
}
