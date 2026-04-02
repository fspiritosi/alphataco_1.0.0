'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { type DiagramEmployee } from '../actions/diagram-search-actions';

interface Props {
  employees: DiagramEmployee[];
  selectedIds: string[];
  maxEmployees: number;
  isSearching: boolean;
  hasSearched: boolean;
  hasMoreData: boolean;
  onToggle: (employeeId: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: () => void;
  onLoadMore: () => void;
}

export function EmployeeSelectionGrid({
  employees,
  selectedIds,
  maxEmployees,
  isSearching,
  hasSearched,
  hasMoreData,
  onToggle,
  onSelectAll,
  onClearSelection,
  onLoadMore,
}: Props) {
  const handleSelectAll = () => {
    const allIds = employees.map((emp) => emp.value);
    const limitedIds = allIds.slice(0, maxEmployees);
    onSelectAll(limitedIds);
    if (allIds.length > maxEmployees) {
      toast.warning(`Solo se seleccionaron los primeros ${maxEmployees} empleados debido al límite máximo.`);
    }
  };

  // Loading state: searching and no employees loaded yet
  if (isSearching && employees.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Empty after search
  if (employees.length === 0 && hasSearched && !isSearching) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No se encontraron empleados con los filtros aplicados.
      </p>
    );
  }

  // No search yet
  if (employees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Para mostrar empleados debe aplicar al menos un filtro.
      </p>
    );
  }

  // Has employees
  return (
    <div className="space-y-3">
      {/* Info banner when there are more results */}
      {hasMoreData && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Hay más empleados disponibles. Cargue más resultados o ajuste los filtros para refinar la búsqueda.
        </div>
      )}

      {/* Header: count + actions */}
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">
          Empleados seleccionados ({selectedIds.length}/{maxEmployees})
        </Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
            Seleccionar Todos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            disabled={selectedIds.length === 0}
          >
            Limpiar Selección
          </Button>
        </div>
      </div>

      {/* Scrollable employee grid */}
      <div className="max-h-96 overflow-y-auto rounded-md border">
        <div className="grid grid-cols-1 gap-2 p-2 lg:grid-cols-3">
          {employees.map((employee) => {
            const isSelected = selectedIds.includes(employee.value);
            return (
              <button
                key={employee.value}
                type="button"
                onClick={() => onToggle(employee.value)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                  isSelected ? 'border-blue-400 bg-blue-50 text-blue-900' : 'border-border bg-background'
                }`}
              >
                {/* Checkbox indicator */}
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-muted-foreground'
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <svg
                      viewBox="0 0 12 12"
                      fill="none"
                      className="h-3 w-3 text-white"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="1,6 5,10 11,2" />
                    </svg>
                  )}
                </span>

                {/* Legajo + name */}
                <span className="truncate">
                  {employee.file != null && (
                    <span className="font-mono text-xs text-muted-foreground mr-1">[{employee.file.toString()}]</span>
                  )}
                  {employee.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Load more */}
      {hasMoreData && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={onLoadMore} disabled={isSearching}>
            {isSearching ? 'Cargando...' : 'Cargar más empleados'}
          </Button>
        </div>
      )}
    </div>
  );
}
