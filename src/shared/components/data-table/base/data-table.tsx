'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import * as React from 'react';
// import { DataTableToolbar, type BulkActionProps } from "./data-table-toolbar"
import { cn } from '@/lib/utils';
import { keepPreviousData, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { Row, Table as TableType, Updater } from '@tanstack/react-table';
import { DataTableToolbar, type BulkActionProps } from '../toolbars/data-table-toolbar-base';
import { DataTablePagination } from './data-table-pagination';

interface FilterableColumn<TData> {
  columnId: string;
  title: string;
  options?: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  type?: 'date-range';
  showFrom?: boolean;
  showTo?: boolean;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  defaultValues?: {
    from: Date | null;
    to: Date | null;
  };
}

interface SearchableColumn {
  columnId: string;
  placeholder?: string;
}

interface ToolbarOptions<TData> {
  filterableColumns?: FilterableColumn<TData>[];
  searchableColumns?: SearchableColumn[];
  showViewOptions?: boolean;
  showFilterOptions?: boolean;
  initialVisibleFilters: string[];
  extraActions?: React.ReactNode | ((table: TableType<TData>) => React.ReactNode);
  bulkAction?: BulkActionProps<TData>;
  showDocumentDownload?: boolean;
  showExport?: boolean;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean) | undefined;
  data?: TData[]; // Hacer opcional para server-side
  onRowClick?: (row: TData) => void;
  toolbarOptions?: ToolbarOptions<TData>;
  initialData?: {
    rows: TData[];
    pageCount: number;
    rowCount: number;
  };
  paginationComponent?: React.ReactNode;
  className?: string;
  tableId?: string;
  initialColumnVisibility?: VisibilityState;
  savedVisibility: VisibilityState;
  row_classname?: (row: TData) => string | string;
  bulkAction?: BulkActionProps<TData>;
  onColumnFiltersChange?: (filters: Updater<ColumnFiltersState>) => void;
  onRowSelectionChange?: (rows: TData[]) => void;
  // Nuevas props para server-side pagination
  serverSide?: boolean;
  fetchData?: (options: {
    pageIndex: number;
    pageSize: number;
    sorting: SortingState;
    columnFilters: ColumnFiltersState;
  }) => Promise<{
    rows: TData[];
    pageCount: number;
    rowCount: number;
  }>;
  queryKey?: string;
}
const queryClient = new QueryClient();
export function BaseDataTable<TData, TValue>({
  columns,
  data: clientData,
  onRowClick,
  toolbarOptions,
  paginationComponent,
  className = '',
  tableId,
  savedVisibility,
  row_classname,
  onColumnFiltersChange,
  enableRowSelection = true,
  onRowSelectionChange,
  serverSide = false,
  fetchData,
  queryKey = 'table-data',
  initialData,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [pageIndex, setPageIndex] = React.useState<number>(0);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(savedVisibility || {});

  // Crear el estado de paginación para React Query
  const pagination = React.useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize]
  );

  // Query para server-side data
  const dataQuery = useQuery({
    queryKey: [queryKey, pagination, sorting, columnFilters],
    queryFn: () =>
      fetchData?.({
        pageIndex,
        pageSize,
        sorting,
        columnFilters,
      }),
    placeholderData: keepPreviousData,
    enabled: serverSide && !!fetchData,
    initialData:
      initialData && pageIndex === 0 && columnFilters.length === 0 && sorting.length === 0 ? initialData : undefined,
  });

  // Usar datos del servidor o datos del cliente
  const tableData = serverSide ? dataQuery.data?.rows ?? [] : clientData ?? [];
  const defaultData = React.useMemo(() => [], []);

  const table = useReactTable({
    data: tableData.length > 0 ? tableData : defaultData,
    columns,
    rowCount: serverSide ? dataQuery.data?.rowCount ?? 0 : undefined,

    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const currentPagination = { pageIndex, pageSize };
        const newPagination = updater(currentPagination);
        if (newPagination.pageSize !== pageSize) {
          setPageSize(newPagination.pageSize);
        }
        if (newPagination.pageIndex !== pageIndex) {
          setPageIndex(newPagination.pageIndex);
        }
      } else {
        if (updater.pageSize !== pageSize) {
          setPageSize(updater.pageSize);
        }
        if (updater.pageIndex !== pageIndex) {
          setPageIndex(updater.pageIndex);
        }
      }
    },
    onRowSelectionChange: (rows) => {
      const newSelection = typeof rows === 'function' ? rows(rowSelection) : rows;
      setRowSelection(newSelection);
      if (onRowSelectionChange) {
        const selectedRows = Object.keys(newSelection)
          .filter((key) => newSelection[key])
          .map((key) => tableData[Number.parseInt(key)]);
        onRowSelectionChange(selectedRows);
      }
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: (updater) => {
      const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
      setColumnFilters(newFilters);

      // Reset a la primera página cuando cambian los filtros
      if (serverSide) {
        setPageIndex(0);
      }

      if (onColumnFiltersChange) {
        onColumnFiltersChange(newFilters);
      }
    },
    onColumnVisibilityChange: (visibility) => {
      setColumnVisibility(visibility);
    },
    enableRowSelection: enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: serverSide ? undefined : getFilteredRowModel(),
    getPaginationRowModel: serverSide ? undefined : getPaginationRowModel(),
    getSortedRowModel: serverSide ? undefined : getSortedRowModel(),
    getFacetedRowModel: serverSide ? undefined : getFacetedRowModel(),
    getFacetedUniqueValues: serverSide ? undefined : getFacetedUniqueValues(),
    manualPagination: serverSide,
    manualSorting: serverSide,
    manualFiltering: serverSide,
  });

  // Loading state para server-side
  const isLoading = serverSide && dataQuery.isFetching;

  return (
    <QueryClientProvider client={queryClient}>
      <div className={`space-y-4 ${className} w-full grid grid-cols-1`}>
        {toolbarOptions && (
          <DataTableToolbar
            table={table}
            showExport={toolbarOptions.showExport}
            showDocumentDownload={toolbarOptions.showDocumentDownload}
            filterableColumns={toolbarOptions.filterableColumns}
            searchableColumns={toolbarOptions.searchableColumns}
            initialVisibleFilters={toolbarOptions.initialVisibleFilters}
            showViewOptions={toolbarOptions.showViewOptions}
            bulkAction={toolbarOptions.bulkAction}
            extraActions={
              typeof toolbarOptions.extraActions === 'function'
                ? toolbarOptions.extraActions(table)
                : toolbarOptions.extraActions
            }
            tableId={tableId}
            isLoading={isLoading}
          />
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span>Cargando...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table?.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    className={
                      typeof row_classname === 'string'
                        ? cn(row_classname, onRowClick && 'hover:cursor-pointer')
                        : row_classname
                          ? row_classname(row.original)
                          : onRowClick
                            ? 'hover:cursor-pointer'
                            : ''
                    }
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={() => onRowClick && onRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Sin resultados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {paginationComponent ? (
          React.cloneElement(paginationComponent as React.ReactElement, {
            table,
            isLoading,
            totalRows: serverSide ? dataQuery.data?.rowCount : undefined,
          })
        ) : (
          <DataTablePagination
            table={table}
            isLoading={isLoading}
            totalRows={serverSide ? dataQuery.data?.rowCount : undefined}
          />
        )}
      </div>
    </QueryClientProvider>
  );
}
