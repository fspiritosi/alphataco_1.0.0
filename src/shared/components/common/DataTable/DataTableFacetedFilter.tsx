'use client';

import { Check, PlusCircle } from 'lucide-react';
import { useRef } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import type { DataTableFacetedFilterProps } from './types';

/**
 * Filtro faceteado multi-select para columnas del DataTable
 *
 * @example
 * ```tsx
 * <DataTableFacetedFilter
 *   column={table.getColumn('status')}
 *   title="Estado"
 *   options={[
 *     { value: 'PENDING', label: 'Pendiente', icon: Clock },
 *     { value: 'APPROVED', label: 'Aprobado', icon: CheckCircle },
 *   ]}
 * />
 * ```
 */
export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  externalCounts,
  disabled,
  isFetching,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = externalCounts ?? column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as string[]);

  // Guardar la última versión válida de opciones filtradas para evitar saltos
  // durante el re-fetch (cuando externalCounts se vacía momentáneamente).
  const prevVisibleOptionsRef = useRef(options);

  // Opciones visibles en el popover: si hay externalCounts, filtrar por count > 0.
  // Cuando isFetching es true, conservar las opciones previas para evitar flash vacío.
  let visibleOptions: typeof options;
  if (externalCounts && !isFetching) {
    // Estado normal: filtrar opciones por count > 0
    visibleOptions = options.filter((opt) => (externalCounts.get(opt.value) ?? 0) > 0);
  } else if (isFetching) {
    // Re-fetching: usar las opciones actuales si existen, sino las previas
    visibleOptions = options.length > 0 ? options : prevVisibleOptionsRef.current;
  } else {
    // Sin externalCounts: mostrar todas
    visibleOptions = options;
  }

  // Actualizar ref solo cuando tenemos opciones reales (no vacías)
  if (visibleOptions.length > 0) {
    prevVisibleOptionsRef.current = visibleOptions;
  }

  // El trigger muestra skeleton cuando hay valores seleccionados pero las opciones aún
  // no están disponibles para resolver los labels (recarga de página).
  const selectedLabels = options.filter((opt) => selectedValues.has(opt.value));
  const triggerShowsSkeleton = selectedValues.size > 0 && options.length === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed"
          disabled={disabled}
          data-testid={`filter-${column?.id}`}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              {/* Contador compacto (mobile) */}
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selectedValues.size}
              </Badge>
              {/* Badges con labels (desktop) */}
              <div className="hidden space-x-1 lg:flex">
                {triggerShowsSkeleton ? (
                  // Skeleton mientras las opciones no están disponibles para resolver labels
                  Array.from({ length: Math.min(selectedValues.size, 2) }, (_, i) => (
                    <Skeleton key={i} className="h-5 w-16 rounded-sm" />
                  ))
                ) : selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedValues.size} seleccionados
                  </Badge>
                ) : (
                  selectedLabels.map((option) => (
                    <Badge variant="secondary" key={option.value} className="rounded-sm px-1 font-normal">
                      {option.label}
                    </Badge>
                  ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Buscar ${title.toLowerCase()}...`} />
          <CommandList>
            {/* Skeleton del popover: se muestra cuando está cargando Y no hay opciones */}
            {isFetching && visibleOptions.length === 0 ? (
              <CommandGroup>
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                    <Skeleton className="h-4 w-4 rounded-sm" />
                    <Skeleton className="h-4 w-20 rounded-sm" />
                    <Skeleton className="ml-auto h-4 w-6 rounded-sm" />
                  </div>
                ))}
              </CommandGroup>
            ) : (
              <>
                {/* Ocultar "Sin resultados" durante el fetching para evitar flash */}
                {!isFetching && <CommandEmpty>Sin resultados.</CommandEmpty>}
                <CommandGroup className={cn(isFetching && 'opacity-60 transition-opacity')}>
                  {visibleOptions.map((option) => {
                    const isSelected = selectedValues.has(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => {
                          if (isSelected) {
                            selectedValues.delete(option.value);
                          } else {
                            selectedValues.add(option.value);
                          }
                          const filterValues = Array.from(selectedValues);
                          column?.setFilterValue(filterValues.length ? filterValues : undefined);
                        }}
                        data-testid={`filter-option-${option.value}`}
                      >
                        <div
                          className={cn(
                            'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                            isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible'
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                        {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                        <span>{option.label}</span>
                        {facets?.get(option.value) && (
                          <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                            {facets.get(option.value)}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center"
                    data-testid={`filter-clear-${column?.id}`}
                  >
                    Limpiar filtros
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
