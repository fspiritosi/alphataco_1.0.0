'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermanentDocumentsDownloadButton } from '@/features/Employees/Empleados/DocumentosEmpleados/PermanentDocumentsDownloadButton';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { ColumnFiltersState, SortingState, Table } from '@tanstack/react-table';
import { X } from 'lucide-react';
import * as React from 'react';
import { Database } from '../../../../../database.types';
import { DataTableExportExcel } from '../base/data-table-export-excel';
import { DataTableExportExcelServer } from '../base/data-table-export-excel-server';
import { DataTableFilterOptions } from '../base/data-table-filter-options';
import { DataTableViewOptions } from '../base/data-table-view-options';
import { DataTableDatePicker } from '../filters/data-table-date-picker';
import { DataTableFacetedFilter, FacetedFilterConfig } from '../filters/data-table-faceted-filter-server';

// Ahora FilterableColumn es genérico para TableName y Query
interface FilterableColumn<TData, TableName extends keyof Database['public']['Tables'], Query extends string = '*'> {
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
  config?: FacetedFilterConfig<TableName, Query>; // Usa ambos tipos genéricos
}

interface SearchableColumn {
  columnId: string;
  placeholder?: string;
}

export interface BulkActionProps<TData> {
  enabled?: boolean;
  label?: string;
  icon?: React.ReactNode;
  onClick: (rows: TData[]) => void;
}

// Componente SearchInput con debounce
interface SearchInputProps {
  placeholder?: string;
  onFilterChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

function SearchInput({ placeholder, onFilterChange, className, disabled }: SearchInputProps) {
  const [searchValue, setSearchValue] = React.useState('');
  const debouncedSearchValue = useDebounce(searchValue, 300);

  React.useEffect(() => {
    onFilterChange(debouncedSearchValue);
  }, [debouncedSearchValue]);

  return (
    <Input
      placeholder={placeholder}
      value={searchValue}
      onChange={(event) => setSearchValue(event.target.value)}
      className={className}
      disabled={disabled}
    />
  );
}

// DataTableToolbarProps también es genérico para Query
interface DataTableToolbarProps<
  TData,
  TableName extends keyof Database['public']['Tables'],
  Query extends string = '*',
> {
  table: Table<TData>;
  filterableColumns?: FilterableColumn<TData, TableName, Query>[];
  searchableColumns?: SearchableColumn[];
  showViewOptions?: boolean;
  showFilterOptions?: boolean;
  initialVisibleFilters?: string[];
  extraActions?: React.ReactNode | ((table: Table<TData>) => React.ReactNode);
  showExport?: boolean;
  showDocumentDownload?: boolean;
  tableId?: string;
  bulkAction?: BulkActionProps<TData>;
  isLoading?: boolean;
  // Para exportación del servidor
  serverSide?: boolean;
  fetchAllData?: (options: { sorting: SortingState; columnFilters: ColumnFiltersState }) => Promise<TData[]>;
}

export function DataTableToolbar<
  TData,
  TableName extends keyof Database['public']['Tables'],
  Query extends string = '*',
>({
  table,
  filterableColumns = [],
  searchableColumns = [],
  showViewOptions = true,
  showFilterOptions = true,
  initialVisibleFilters,
  extraActions,
  showExport = true,
  showDocumentDownload = false,
  tableId,
  bulkAction,
  isLoading = false,
  serverSide = false,
  fetchAllData,
}: DataTableToolbarProps<TData, TableName, Query>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const columnVisibility = table.getState().columnVisibility;

  const [visibleFilters, setVisibleFilters] = React.useState<string[]>(initialVisibleFilters || []);

  const [dateFilters, setDateFilters] = React.useState<{ [columnId: string]: { from: Date | null; to: Date | null } }>(
    () => {
      const initialFilters: { [columnId: string]: { from: Date | null; to: Date | null } } = {};

      filterableColumns.forEach((column) => {
        if (column.type === 'date-range' && column.defaultValues) {
          initialFilters[column.columnId] = {
            from: column.defaultValues.from,
            to: column.defaultValues.to,
          };

          const tableColumn = table.getColumn(column.columnId);
          if (tableColumn) {
            setTimeout(() => {
              tableColumn.setFilterValue(column.defaultValues);
            }, 0);
          }
        }
      });

      return initialFilters;
    }
  );

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelectedRows = selectedRows.length > 0;
  // const

  return (
    <div className="flex items-center justify-between z-50">
      <div className="flex flex-1 items-center gap-2 flex-wrap">
        {bulkAction?.enabled && hasSelectedRows && (
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1"
            onClick={() => {
              const selectedData = selectedRows.map((row) => row.original);
              bulkAction.onClick(selectedData);
            }}
            disabled={isLoading}
          >
            {bulkAction.icon}
            {bulkAction.label || `Acción (${selectedRows.length})`}
          </Button>
        )}
        {searchableColumns.length > 0 &&
          searchableColumns.map((column) => {
            const tableColumn = table.getColumn(column.columnId);
            return tableColumn && columnVisibility[column.columnId] !== false ? (
              <SearchInput
                key={column.columnId}
                placeholder={column.placeholder || `Buscar...`}
                onFilterChange={(value) => tableColumn.setFilterValue(value)}
                className="h-8 w-[150px] lg:w-[250px]"
                disabled={isLoading}
              />
            ) : null;
          })}

        {filterableColumns.length > 0 &&
          visibleFilters.length > 0 &&
          filterableColumns
            .filter((column) => visibleFilters.includes(column.columnId))
            .map((column) => {
              const tableColumn = table.getColumn(column.columnId);
              const filterForThisColumn = tableColumn?.getFilterValue();
              // Verificar si esta columna específica tiene un filtro null
              const hasNullFilter = Array.isArray(filterForThisColumn) && filterForThisColumn.includes('null');

              if (column.type === 'date-range') {
                const current = dateFilters[column.columnId] || { from: null, to: null };
                return (
                  <div key={column.columnId} className="flex items-center space-x-2">
                    {column.showFrom !== false && (
                      <DataTableDatePicker
                        date={current.from}
                        setDate={(date: Date | null) => {
                          const newFilter = { ...current, from: date };
                          setDateFilters((prev) => ({ ...prev, [column.columnId]: newFilter }));
                          tableColumn?.setFilterValue(newFilter);
                        }}
                        label={column.fromPlaceholder || 'Desde'}
                        clearFilter={() => {
                          const newFilter = { ...current, from: null };
                          setDateFilters((prev) => ({ ...prev, [column.columnId]: newFilter }));
                          if (!newFilter.from && !newFilter.to) {
                            tableColumn?.setFilterValue(undefined);
                          } else {
                            tableColumn?.setFilterValue(newFilter);
                          }
                        }}
                        disabled={isLoading}
                      />
                    )}
                    {column.showTo !== false && (
                      <DataTableDatePicker
                        date={current.to}
                        setDate={(date: Date | null) => {
                          const newFilter = { ...current, to: date };
                          setDateFilters((prev) => ({ ...prev, [column.columnId]: newFilter }));
                          tableColumn?.setFilterValue(newFilter);
                        }}
                        label={column.toPlaceholder || 'Hasta'}
                        clearFilter={() => {
                          const newFilter = { ...current, to: null };
                          setDateFilters((prev) => ({ ...prev, [column.columnId]: newFilter }));
                          if (!newFilter.from && !newFilter.to) {
                            tableColumn?.setFilterValue(undefined);
                          } else {
                            tableColumn?.setFilterValue(newFilter);
                          }
                        }}
                        disabled={isLoading}
                      />
                    )}
                  </div>
                );
              }
              return tableColumn && columnVisibility[column.columnId] !== false ? (
                <DataTableFacetedFilter
                  key={column.columnId}
                  column={tableColumn}
                  title={column.title}
                  options={column.options}
                  config={column.config as any} // Pasamos el config
                  disabled={isLoading}
                  hasNullFilter={hasNullFilter}
                />
              ) : null;
            })}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              setDateFilters({});
            }}
            className="h-8 px-2 lg:px-3"
            disabled={isLoading}
          >
            Limpiar filtros
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}

        {isLoading && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
            <span>Actualizando...</span>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2 flex-wrap">
        {typeof extraActions === 'function' ? extraActions(table) : extraActions}
        {showDocumentDownload && <PermanentDocumentsDownloadButton table={table} />}
        {showExport &&
          (serverSide && fetchAllData ? (
            <DataTableExportExcelServer table={table} fetchAllData={fetchAllData} />
          ) : (
            <DataTableExportExcel table={table} />
          ))}
        {showFilterOptions && filterableColumns.length > 0 && (
          <DataTableFilterOptions
            filterableColumns={filterableColumns}
            visibleFilters={visibleFilters}
            onVisibilityChange={setVisibleFilters}
            tableId={tableId}
            columnVisibility={columnVisibility}
          />
        )}
        {showViewOptions && <DataTableViewOptions table={table} tableId={tableId} />}
      </div>
    </div>
  );
}
