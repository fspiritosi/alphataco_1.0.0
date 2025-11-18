'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Column, SortingState, Table } from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpIcon, SortAscIcon, X } from 'lucide-react';

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
  table?: Table<TData>;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  table: tableProp,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const isSorted = column.getIsSorted();

  // Usar la tabla pasada como prop o intentar acceder desde la columna
  const table = tableProp || (column as any).table;

  const sortingState: SortingState = table?.getState().sorting || [];

  // Encontrar el índice de esta columna en el array de sorting (para mostrar prioridad)
  const sortIndex = sortingState.findIndex((s) => s.id === column.id);
  const sortPriority = sortIndex >= 0 ? sortIndex + 1 : null;

  const handleSort = (desc: boolean) => {
    if (!table) {
      console.log('⚠️ handleSort - NO HAY TABLA, usando fallback');
      // Fallback al comportamiento original si no hay tabla
      column.toggleSorting(desc);
      return;
    }

    // Obtener el estado actual de sorting
    const currentSorting = table.getState().sorting;

    // Buscar si esta columna ya está en el sorting
    const existingIndex = currentSorting.findIndex((s: any) => s.id === column.id);

    let newSorting;
    if (existingIndex >= 0) {
      // Si ya existe, actualizar su dirección manteniendo su posición
      newSorting = [...currentSorting];
      newSorting[existingIndex] = { id: column.id, desc };
    } else {
      // Si no existe, agregar al final (ordenamiento acumulativo)
      newSorting = [...currentSorting, { id: column.id, desc }];
    }

    // Aplicar el nuevo estado de sorting
    table.setSorting(newSorting);
  };

  const handleClearSort = () => {
    if (!table) {
      return;
    }

    // Remover solo esta columna del sorting
    const currentSorting = table.getState().sorting;
    const newSorting = currentSorting.filter((s: any) => s.id !== column.id);
    table.setSorting(newSorting);
  };

  const handleClearAllSort = () => {
    if (!table) {
      return;
    }

    // Limpiar todo el sorting
    table.setSorting([]);
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent">
            <span>{title}</span>
            {isSorted === 'desc' ? (
              <ArrowDownIcon className="ml-2 h-4 w-4" />
            ) : isSorted === 'asc' ? (
              <ArrowUpIcon className="ml-2 h-4 w-4" />
            ) : (
              <SortAscIcon className="ml-2 h-4 w-4" />
            )}
            {sortPriority && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-[10px] font-medium text-primary-foreground">
                {sortPriority}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => handleSort(false)}>
            <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Ascendente
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSort(true)}>
            <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Descendente
          </DropdownMenuItem>
          {isSorted && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClearSort}>
                <X className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                Limpiar ordenamiento
              </DropdownMenuItem>
            </>
          )}
          {sortingState.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClearAllSort}>
                <X className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                Limpiar todos los ordenamientos
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
