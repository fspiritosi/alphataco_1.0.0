'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff, ListOrdered, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import type { DataTableColumnHeaderProps } from './types';

/**
 * Header de columna con soporte para sorting (single y multi) y ocultamiento
 *
 * - Click normal en Asc/Desc: reemplaza todo el sorting con esta columna
 * - Shift+Click en Asc/Desc: agrega al multi-sort
 * - "Sin ordenar": quita esta columna del sorting
 * - "Agregar al ordenamiento": agrega al multi-sort (Asc)
 *
 * Cuando hay multi-sort activo, se muestra un badge con el indice de orden (1, 2, 3...)
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sortIndex = column.getSortIndex();
  const isSorted = column.getIsSorted();

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            data-testid={`column-header-${column.id}`}
          >
            <span>{title}</span>
            {isSorted === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : isSorted === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
            {/* Badge con indice de multi-sort */}
            {sortIndex >= 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                {sortIndex + 1}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={(e) => column.toggleSorting(false, e.shiftKey)}
            data-testid={`sort-asc-${column.id}`}
          >
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Ascendente
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => column.toggleSorting(true, e.shiftKey)}
            data-testid={`sort-desc-${column.id}`}
          >
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Descendente
          </DropdownMenuItem>
          {/* Agregar al multi-sort sin necesidad de Shift */}
          {!isSorted && (
            <DropdownMenuItem onClick={() => column.toggleSorting(false, true)} data-testid={`sort-multi-${column.id}`}>
              <ListOrdered className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Agregar al ordenamiento
            </DropdownMenuItem>
          )}
          {isSorted && (
            <DropdownMenuItem onClick={() => column.clearSorting()} data-testid={`sort-clear-${column.id}`}>
              <X className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Sin ordenar
            </DropdownMenuItem>
          )}
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)} data-testid={`hide-column-${column.id}`}>
                <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                Ocultar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
