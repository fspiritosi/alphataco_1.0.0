'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from '@tanstack/react-table';
import * as React from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { saveTableColumnVisibility } from '@/shared/actions/table-preferences';

import { DataTablePagination } from './DataTablePagination';
import { DataTablePendingProvider } from './DataTablePendingContext';
import { DataTableToolbar } from './DataTableToolbar';
import { _DataTableExportButton } from './_DataTableExportButton';
import { stateToSearchParams } from './helpers';
import type { DataTableFacetedFilterConfig, DataTableProps, DataTableSearchParams } from './types';
import { useDataTable } from './useDataTable';

/**
 * Detecta qué columnIds tienen un filtro activo en los searchParams dados.
 * Maneja tanto filtros facetados/texto (key = columnId) como dateRange (key = columnId_from / columnId_to).
 * Los `facetedFilters` se usan para mapear los sufijos _from/_to al columnId base.
 */
function getActiveFilterColumnIds(
  searchParams: DataTableSearchParams,
  facetedFilters: DataTableFacetedFilterConfig[]
): Set<string> {
  const reservedKeys = new Set(['page', 'pageSize', 'sort', 'sortBy', 'sortOrder', 'search']);
  const active = new Set<string>();

  // Construir un índice de columnas dateRange para detectar los sufijos _from/_to
  const dateRangeColumnIds = new Set(
    facetedFilters.filter((f) => f.type === 'dateRange').map((f) => f.columnId)
  );

  Object.entries(searchParams).forEach(([key, value]) => {
    if (reservedKeys.has(key) || !value) return;

    // Comprobar si es un sufijo _from o _to de un filtro dateRange
    if (key.endsWith('_from') || key.endsWith('_to')) {
      const suffix = key.endsWith('_from') ? '_from' : '_to';
      const baseKey = key.slice(0, key.length - suffix.length);
      if (dateRangeColumnIds.has(baseKey)) {
        active.add(baseKey);
        return;
      }
    }

    // Filtro normal (faceted o texto): la key ES el columnId
    if (!reservedKeys.has(key)) {
      active.add(key);
    }
  });

  return active;
}

/**
 * DataTable Server-Side con soporte para paginación, sorting y filtros.
 *
 * Soporta dos modos de operación:
 *
 * **Server mode** (default): El estado se sincroniza con la URL via router.push,
 * lo que dispara re-renders del servidor. Los datos llegan via props desde SSR.
 *
 * **Client-side mode** (cuando se pasa `queryFn`): Usa window.history.replaceState
 * para actualizar la URL silenciosamente (sin navegación) y React Query para
 * obtener datos. El resultado: filtros instantáneos sin re-renderizar otras tabs.
 */
export function DataTable<TData extends Record<string, unknown>, TValue = unknown>({
  columns,
  data: propData,
  totalRows: propTotalRows,
  searchParams = {},
  facetedFilters = [],
  searchPlaceholder = 'Buscar...',
  searchColumn,
  showColumnToggle = true,
  showRowSelection = false,
  enableRowSelection = false,
  onRowSelectionChange,
  onRowSelectionIdsChange,
  clearSelectionTrigger,
  emptyMessage = 'No se encontraron resultados.',
  pageSizeOptions,
  toolbarActions,
  exportConfig,
  showExportButton = true,
  showSearch = false,
  initialColumnVisibility = {},
  tableId,
  paramNamespace,
  showFilterToggle = false,
  initialFilterVisibility = {},
  'data-testid': dataTestId = 'data-table',
  isFetchingFacets,
  rowClassName,
  // Client-side mode props
  queryFn,
  queryKey: queryKeyProp,
  onStateChange,
}: DataTableProps<TData, TValue>) {
  const isClientSide = !!queryFn;

  // Estado de selección de filas (local)
  const [rowSelection, setRowSelection] = React.useState({});

  // Estado de visibilidad de columnas (local, inicializado con las visibilidades por defecto)
  const [columnVisibility, setColumnVisibility] = React.useState(initialColumnVisibility);

  // Estado de visibilidad de filtros.
  // Al inicializar, forzamos a "visible" cualquier columna que tenga un filtro activo en la URL
  // aunque no esté en las preferencias guardadas del usuario. Esto evita el estado "fantasma"
  // donde la tabla filtra datos pero no muestra ningún chip visible al usuario.
  // IMPORTANTE: no se persiste en BD — solo vive en memoria mientras dure la sesión.
  const [filterVisibility, setFilterVisibility] = React.useState<Record<string, boolean>>(() => {
    const activeColumnIds = getActiveFilterColumnIds(searchParams ?? {}, facetedFilters);
    if (activeColumnIds.size === 0) return initialFilterVisibility;

    // Combinar: preferencias del usuario base + forzar true para columnas activas
    const merged: Record<string, boolean> = { ...initialFilterVisibility };
    activeColumnIds.forEach((columnId) => {
      // Solo forzar visible si la columna existe en la configuración de filtros
      const isKnownFilter = facetedFilters.some((f) => f.columnId === columnId);
      if (isKnownFilter && merged[columnId] !== true) {
        merged[columnId] = true;
      }
    });
    return merged;
  });

  // Hook para manejar estado sincronizado con URL
  const filterableColumns = facetedFilters.map((f) => f.columnId);
  const {
    state,
    pagination,
    sorting,
    columnFilters,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onGlobalFilterChange,
    resetFilters,
    isPending: isNavigationPending,
    startTransition,
    notifyUrlChange,
    urlVersion,
  } = useDataTable({
    filterableColumns,
    tableId: paramNamespace,
    clientSideNavigation: isClientSide,
  });

  // ---- Client-side data fetching (cuando queryFn está presente) ----

  // Convertir state a DataTableSearchParams para queryFn y onStateChange
  const stateSearchParams = React.useMemo(() => {
    const urlParams = stateToSearchParams(state);
    const obj: DataTableSearchParams = {};
    urlParams.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }, [state]);

  // Derivar facetParams (sin page/sort) para lazy-load de facets individuales
  const facetParams = React.useMemo(() => {
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = stateSearchParams;
    return rest;
  }, [stateSearchParams]);

  // Detectar si hay filtros activos en el estado (incluyendo _from/_to de dateRange).
  // Esto se usa para activar el botón "Limpiar filtros" independientemente de si las
  // columnas están visibles en el toolbar o no.
  const hasActiveFilters = React.useMemo(() => {
    return Object.entries(state.filters).some(([, values]) => values.length > 0);
  }, [state.filters]);

  // Notificar al padre cuando el estado cambia (para facets y queries dependientes)
  const onStateChangeRef = React.useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  React.useEffect(() => {
    onStateChangeRef.current?.(stateSearchParams);
  }, [stateSearchParams]);

  // React Query para fetch client-side
  // NO usar initialData — se aplica a cada query key nuevo (cada filtro), dando datos SSR incorrectos.
  // En su lugar: placeholderData: keepPreviousData muestra datos anteriores mientras carga,
  // y propData es fallback en el primer render (antes de la primera fetch).
  const { data: queryResult, isPlaceholderData } = useQuery({
    queryKey: [...(queryKeyProp ?? ['data-table']), stateSearchParams],
    queryFn: () => queryFn!(stateSearchParams),
    placeholderData: keepPreviousData,
    enabled: isClientSide,
  });

  // Datos finales para la tabla
  const tableData = isClientSide ? queryResult?.data ?? propData : propData;
  const tableTotalRows = isClientSide ? queryResult?.total ?? propTotalRows : propTotalRows;
  // isPlaceholderData = true SOLO cuando se muestra data stale de un query key anterior
  // (mientras se fetch data nueva). false cuando se muestra data real del cache → sin efecto disabled.
  const isPending = isClientSide ? isPlaceholderData : isNavigationPending;

  // Calcular pageCount basado en totalRows
  const pageCount = Math.ceil(tableTotalRows / pagination.pageSize);

  // Configurar tabla con TanStack Table
  const table = useReactTable({
    data: tableData,
    columns,
    pageCount,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    // Row IDs estables: si el dato tiene `id`, usarlo; si no, usar el índice.
    // Esto evita que la selección "salte" a otras filas al cambiar de página o re-fetch.
    getRowId: (row, index) => {
      const maybeId = (row as { id?: string | number }).id;
      return typeof maybeId === 'string' || typeof maybeId === 'number' ? String(maybeId) : String(index);
    },
    // Row selection
    enableRowSelection,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newSelection);

      // Callback con IDs (cross-page): las claves del map son IDs gracias a getRowId.
      if (onRowSelectionIdsChange) {
        const ids = Object.keys(newSelection).filter((key) => newSelection[key as keyof typeof newSelection]);
        onRowSelectionIdsChange(ids);
      }

      // Callback con filas (solo página actual): para compatibilidad con consumers
      // existentes que necesitan los objetos completos.
      if (onRowSelectionChange) {
        const rowsById = new Map<string, TData>();
        for (const r of tableData) {
          const maybeId = (r as { id?: string | number }).id;
          if (typeof maybeId === 'string' || typeof maybeId === 'number') {
            rowsById.set(String(maybeId), r);
          }
        }
        const selectedRows: TData[] = [];
        for (const key of Object.keys(newSelection)) {
          if (!newSelection[key as keyof typeof newSelection]) continue;
          const fromCurrentPage = rowsById.get(key);
          if (fromCurrentPage) selectedRows.push(fromCurrentPage);
        }
        onRowSelectionChange(selectedRows);
      }
    },
    // Column visibility (local)
    onColumnVisibilityChange: setColumnVisibility,
    // Server-side pagination
    manualPagination: true,
    onPaginationChange,
    // Server-side sorting (multi-sort habilitado)
    manualSorting: true,
    enableMultiSort: true,
    isMultiSortEvent: (e: unknown) => (e as KeyboardEvent).shiftKey,
    onSortingChange,
    // Server-side filtering
    manualFiltering: true,
    onColumnFiltersChange,
    // Row models
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Persistir visibilidad de columnas con debounce de 1 segundo
  React.useEffect(() => {
    if (!tableId) return;

    const timer = setTimeout(() => {
      saveTableColumnVisibility(tableId, columnVisibility);
    }, 1000);

    return () => clearTimeout(timer);
  }, [columnVisibility, tableId]);

  // Reset externo de la selección (skip initial render para no disparar al montar).
  const skipFirstClearRef = React.useRef(true);
  React.useEffect(() => {
    if (clearSelectionTrigger === undefined) return;
    if (skipFirstClearRef.current) {
      skipFirstClearRef.current = false;
      return;
    }
    setRowSelection({});
  }, [clearSelectionTrigger]);

  return (
    <DataTablePendingProvider
      value={{
        isPending,
        startTransition,
        isClientSide,
        notifyUrlChange,
        urlVersion,
      }}
    >
      <div className="space-y-4" data-testid={dataTestId}>
        {/* Toolbar */}
        <DataTableToolbar
          table={table}
          searchPlaceholder={searchPlaceholder}
          searchColumn={searchColumn}
          facetedFilters={facetedFilters}
          showColumnToggle={showColumnToggle}
          tableId={tableId}
          showFilterToggle={showFilterToggle}
          filterVisibility={filterVisibility}
          onFilterVisibilityChange={setFilterVisibility}
          paramNamespace={paramNamespace}
          isFetchingFacets={isFetchingFacets}
          facetParams={facetParams}
          onSearchChange={onGlobalFilterChange}
          searchValue={state.search}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
          exportActions={
            exportConfig && showExportButton ? (
              <_DataTableExportButton columns={columns} exportConfig={exportConfig} />
            ) : undefined
          }
          toolbarActions={toolbarActions}
          showSearch={showSearch}
        />

        {/* Table */}
        <div className="rounded-md border overflow-auto max-h-[60vh]">
          <Table containerClassName="overflow-x-visible overflow-y-visible min-w-fit">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className="sticky top-0 z-10 dark:bg-slate-900 bg-white"
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className={cn('transition-opacity duration-150', isPending && 'opacity-50 pointer-events-none')}>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    data-testid={`table-row-${row.id}`}
                    className={rowClassName ? rowClassName(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <DataTablePagination
          table={table}
          totalRows={tableTotalRows}
          pageSizeOptions={pageSizeOptions}
          showRowSelection={showRowSelection && enableRowSelection}
        />
      </div>
    </DataTablePendingProvider>
  );
}
