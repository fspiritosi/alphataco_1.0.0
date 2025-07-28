'use client';

import { Button } from '@/components/ui/button';
import type { Table } from '@tanstack/react-table';
import { X } from 'lucide-react';
import * as React from 'react';
import { DataTableExportExcel } from '../base/data-table-export-excel';
import { DataTableFilterOptions } from '../base/data-table-filter-options';
import { DataTableSearchInput } from '../base/data-table-search-input';
import { DataTableViewOptions } from '../base/data-table-view-options';
import { DataTableDatePicker } from '../filters/data-table-date-picker';
import { DataTableFacetedFilter } from '../filters/data-table-faceted-filter-server';
// import { DataTableFilterOptions } from "./data-table-filter-options"
// import { DataTableViewOptions } from "./data-table-view-options"
// import { DataTableDatePicker } from "./data-table-date-picker"
// import { DataTableFacetedFilter } from "./data-table-faceted-filter"

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

export interface BulkActionProps<TData> {
  enabled?: boolean;
  label?: string;
  icon?: React.ReactNode;
  onClick: (rows: TData[]) => void;
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterableColumns?: FilterableColumn<TData>[];
  searchableColumns?: SearchableColumn[];
  showViewOptions?: boolean;
  showFilterOptions?: boolean;
  initialVisibleFilters?: string[];
  extraActions?: React.ReactNode | ((table: Table<TData>) => React.ReactNode);
  showExport?: boolean;
  showDocumentDownload?: boolean;
  tableId?: string;
  bulkAction?: BulkActionProps<TData>;
  isLoading?: boolean; // Nueva prop
}

export function DataTableToolbar<TData>({
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
  isLoading = false, // Nueva prop
}: DataTableToolbarProps<TData>) {
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

  return (
    <div className="flex items-center justify-between">
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
            console.log('🔍 Toolbar - Rendering search input for column:', {
              columnId: column.columnId,
              tableColumn: !!tableColumn,
              isVisible: columnVisibility[column.columnId] !== false,
              currentValue: tableColumn?.getFilterValue(),
            });

            return tableColumn && columnVisibility[column.columnId] !== false ? (
              <DataTableSearchInput
                key={column.columnId}
                placeholder={column.placeholder || `Buscar...`}
                value={(tableColumn.getFilterValue() as string) ?? ''}
                onChange={(value) => {
                  console.log('🎯 Toolbar - Search input onChange:', { columnId: column.columnId, value });
                  tableColumn.setFilterValue(value);
                }}
                className="h-8 w-[150px] lg:w-[250px]"
                disabled={isLoading}
                debounceMs={500}
              />
            ) : null;
          })}

        {filterableColumns.length > 0 &&
          visibleFilters.length > 0 &&
          filterableColumns
            .filter((column) => visibleFilters.includes(column.columnId))
            .map((column) => {
              const tableColumn = table.getColumn(column.columnId);
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
                  options={column.options || []}
                  disabled={isLoading}
                />
              ) : null;
            })}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              console.log('🧹 Clear filters button clicked');
              console.log('🧹 Current column filters:', table.getState().columnFilters);
              console.log('🧹 Searchable columns:', searchableColumns);

              // Limpiar todos los filtros de columna
              table.resetColumnFilters();
              console.log('🧹 After resetColumnFilters:', table.getState().columnFilters);

              // Limpiar filtros de fecha
              setDateFilters({});

              // Limpiar específicamente los filtros de búsqueda
              searchableColumns.forEach((column) => {
                const tableColumn = table.getColumn(column.columnId);
                if (tableColumn) {
                  const currentValue = tableColumn.getFilterValue();
                  console.log(`🧹 Clearing search filter for ${column.columnId}:`, {
                    currentValue,
                    willSetTo: '',
                  });
                  tableColumn.setFilterValue('');
                  console.log(`🧹 After clearing ${column.columnId}:`, tableColumn.getFilterValue());
                }
              });

              console.log('🧹 Final column filters after clear:', table.getState().columnFilters);
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
        {showExport && (
          <DataTableExportExcel table={table} fileName={tableId ? `${tableId}_export` : 'tabla_exportada'} />
        )}
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
