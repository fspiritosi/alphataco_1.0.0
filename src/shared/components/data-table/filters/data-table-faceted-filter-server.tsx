'use client';

import { querySelectDistinct } from '@/app/server/GET/probando';
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
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import type { Column } from '@tanstack/react-table';
import { CheckIcon, PlusCircleIcon } from 'lucide-react';
import type * as React from 'react';
import { Database } from '../../../../../database.types';

interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

// Tipado genérico para la configuración del filtro con inferencia automática
export interface FacetedFilterConfig<TableName extends keyof Database['public']['Tables'], Query extends string> {
  tableName: TableName;
  select: Query;
  relation?: string;
  p_filters?: Record<string, string | number | boolean | null> | null;
  multiJoinPaths?: {
    joins: Array<{
      from_table: string;
      to_table: string;
      from_column: string;
      to_column: string;
    }>;
    final_column: string;
  };
  mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<TableName, Query>>>) => Option[];
}
interface DataTableFacetedFilterProps<
  TData,
  TValue,
  TableName extends keyof Database['public']['Tables'],
  Query extends string = '*',
> {
  column?: Column<TData, TValue>;
  title?: string;
  options?: Option[];
  disabled?: boolean;
  config?: FacetedFilterConfig<TableName, Query>;
  hasNullFilter?: boolean;
}

export function DataTableFacetedFilter<TData, TValue, TableName extends keyof Database['public']['Tables'] = never>({
  column,
  title,
  options: staticOptions,
  disabled,
  config,
  hasNullFilter = false,
}: DataTableFacetedFilterProps<TData, TValue, TableName>) {
  const selectedValues = new Set(column?.getFilterValue() as string[]);

  const { data: fetchedOptions, isLoading } = useQuery({
    queryKey: [
      `filter-options-${config?.tableName}-${config?.select}-${JSON.stringify(config?.p_filters)}-${config?.relation || ''}-${config?.multiJoinPaths ? JSON.stringify(config.multiJoinPaths) : ''}`,
    ],
    queryFn: async () => {
      if (!config) return [];
      // La función query es genérica y el tipo se infiere automáticamente
      const data = await querySelectDistinct(
        config.tableName,
        config.select,
        config.relation,
        config.multiJoinPaths,
        config.p_filters
      );

      return config.mapper(data || []);
    },
    enabled: !!config,
    staleTime: 5 * 60 * 1000,
  });

  const options = config ? fetchedOptions : staticOptions;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed bg-transparent" disabled={disabled}>
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedValues.size} seleccionados
                  </Badge>
                ) : (
                  options
                    ?.filter((option) => selectedValues.has(option.value))
                    .map((option) => (
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
          <CommandInput placeholder={title} />
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Cargando...</div>
            ) : !options || options.length === 0 ? (
              <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selectedValues.has(option.value);
                  const isDisabled = hasNullFilter && option.value !== null && option.value !== 'null';
                  return (
                    <CommandItem
                      key={option.value}
                      disabled={isDisabled}
                      onSelect={() => {
                        if (isDisabled) return;
                        if (isSelected) {
                          selectedValues.delete(option.value);
                        } else {
                          selectedValues.add(option.value);
                        }
                        const filterValues = Array.from(selectedValues);
                        column?.setFilterValue(filterValues.length ? filterValues : undefined);
                      }}
                      className={cn(isDisabled && 'opacity-50 cursor-not-allowed')}
                    >
                      <div
                        className={cn(
                          'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                          isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible',
                          isDisabled && 'opacity-30'
                        )}
                      >
                        <CheckIcon className={cn('h-4 w-4')} />
                      </div>
                      {option.icon && (
                        <option.icon className={cn('mr-2 h-4 w-4 text-muted-foreground', isDisabled && 'opacity-30')} />
                      )}
                      <span className={cn(isDisabled && 'opacity-30')}>{option.label}</span>
                      {option.count !== undefined && (
                        <span
                          className={cn(
                            'ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs',
                            isDisabled && 'opacity-30'
                          )}
                        >
                          {option.count}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center"
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
