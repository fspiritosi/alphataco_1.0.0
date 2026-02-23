'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

import { DataTableDateRangeFilter } from './DataTableDateRangeFilter';
import { DataTableFacetedFilter } from './DataTableFacetedFilter';
import { DataTableFilterOptions } from './DataTableFilterOptions';
import { DataTableTextFilter } from './DataTableTextFilter';
import { DataTableViewOptions } from './DataTableViewOptions';
import type { DataTableToolbarProps } from './types';

/**
 * Barra de herramientas con busqueda, filtros y acciones.
 *
 * Los filtros se organizan en dos zonas visuales:
 * 1. Fila principal: buscador global + filtros facetados (seleccion multiple)
 * 2. Fila secundaria: filtros de texto + filtros de rango de fecha
 *
 * La fila secundaria solo se muestra si hay filtros de ese tipo visibles.
 */
export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Buscar...',
  searchColumn,
  facetedFilters = [],
  showColumnToggle = true,
  toolbarActions,
  exportActions,
  showSearch = false,
  tableId,
  showFilterToggle = false,
  filterVisibility = {},
  onFilterVisibilityChange,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  const searchValue = searchColumn
    ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''
    : (table.getState().globalFilter as string) ?? '';

  const handleSearchChange = (value: string) => {
    if (searchColumn) {
      table.getColumn(searchColumn)?.setFilterValue(value);
    } else {
      table.setGlobalFilter(value);
    }
  };

  // Filtros visibles (excluir los que estan ocultos)
  const visibleFilters = facetedFilters.filter((f) => filterVisibility[f.columnId] !== false);

  // Separar filtros en dos grupos
  const primaryFilters = visibleFilters.filter((f) => f.type !== 'text' && f.type !== 'dateRange');
  const secondaryFilters = visibleFilters.filter((f) => f.type === 'text' || f.type === 'dateRange');

  const hasSecondaryFilters = secondaryFilters.length > 0;

  return (
    <div className="space-y-2">
      {/* Fila principal: busqueda + filtros facetados + acciones */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Input de busqueda */}
          {showSearch && (
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="h-8 w-[150px] lg:w-[250px]"
              data-testid="search-input"
            />
          )}

          {/* Filtros facetados (principal) */}
          {primaryFilters.map((filter) => {
            const column = table.getColumn(filter.columnId);
            if (!column) return null;

            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options ?? []}
                externalCounts={filter.externalCounts}
                disabled={filter.disabled}
              />
            );
          })}

          {/* Boton para limpiar filtros */}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => table.resetColumnFilters()}
              className="h-8 px-2 lg:px-3"
              data-testid="clear-filters"
            >
              Limpiar
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {exportActions}

          {showFilterToggle && tableId && facetedFilters.length > 0 && onFilterVisibilityChange && (
            <DataTableFilterOptions
              filters={facetedFilters}
              filterVisibility={filterVisibility}
              onFilterVisibilityChange={onFilterVisibilityChange}
              tableId={tableId}
            />
          )}

          {showColumnToggle && <DataTableViewOptions table={table} />}

          {toolbarActions}
        </div>
      </div>

      {/* Fila secundaria: filtros de texto + rango de fecha */}
      {hasSecondaryFilters && (
        <>
          <Separator className="opacity-50" />
          <div className="flex flex-wrap items-center gap-2">
            {secondaryFilters.map((filter) => {
              if (filter.type === 'dateRange') {
                return (
                  <DataTableDateRangeFilter key={filter.columnId} columnId={filter.columnId} title={filter.title} />
                );
              }

              if (filter.type === 'text') {
                return (
                  <DataTableTextFilter
                    key={filter.columnId}
                    columnId={filter.columnId}
                    title={filter.title}
                    placeholder={filter.placeholder}
                  />
                );
              }

              return null;
            })}
          </div>
        </>
      )}
    </div>
  );
}
