'use client';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, CheckSquare, ChevronsUpDown, Loader2, Square } from 'lucide-react';
import * as React from 'react';
import { CardDescription } from './card';

interface Option {
  label: string;
  value: string;
  cuit?: string;
}

interface MultiSelectComboboxProps {
  options: Option[];
  placeholder: string;
  emptyMessage: string;
  selectedValues: string | string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  selectedResourceDocuments?: EmployeeDocument[];
  showSelectAll?: boolean;
  maxSelections?: null | number;
  'data-testid'?: string;
  isLoading?: boolean;
}

export function MultiSelectCombobox({
  options,
  placeholder,
  emptyMessage,
  selectedValues,
  selectedResourceDocuments,
  onChange,
  disabled = false,
  showSelectAll = false,
  maxSelections = null,
  'data-testid': dataTestId,
  isLoading = false,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    // Convertir a array si es necesario
    const currentValues = Array.isArray(selectedValues) ? selectedValues : selectedValues ? [selectedValues] : [];

    if (maxSelections === 1) {
      // Para selección única, devuelve string
      const newValue = currentValues[0] === value ? '' : value;
      onChange([newValue]);
      return;
    }

    if (maxSelections && currentValues.length >= maxSelections) {
      if (currentValues.includes(value)) {
        // Si se hace clic en un valor ya seleccionado, deseleccionarlo
        onChange(currentValues.filter((v) => v !== value));
        return;
      }
      // Reemplazar el primer valor seleccionado
      const newValues = [...currentValues];
      newValues[0] = value;
      onChange(newValues);
      return;
    }

    const updatedValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    onChange(updatedValues);
  };

  // Get selectable options (options that aren't disabled)
  const selectableOptions = options?.filter(
    (option) => !selectedResourceDocuments?.some((document) => document.applies === option.value)
  );
  const selectableValues = selectableOptions?.map((option) => option.value) ?? [];

  const handleSelectAll = () => {
    // If all selectable options are already selected, deselect all
    // Otherwise, select all options that aren't disabled
    const allSelected = selectableValues.every((value) => selectedValues.includes(value));

    if (allSelected) {
      // Deselect all
      onChange([]);
    } else {
      // Select all selectable options
      onChange(selectableValues);
    }
  };
  const getSelectedLabel = (value: string) => {
    const option = options.find((opt) => opt.value === value);
    if (option) return option.label;
    if (isLoading) return 'Cargando...';
    return value;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid={dataTestId}
        >
          {isLoading && selectedValues?.length > 0 ? (
            <CardDescription className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Cargando...
            </CardDescription>
          ) : selectedValues?.length > 0 ? (
            maxSelections === 1 ? (
              <CardDescription className="flex flex-wrap gap-1">
                {getSelectedLabel(Array.isArray(selectedValues) ? selectedValues[0] : selectedValues).toString()}
              </CardDescription>
            ) : (
              <CardDescription className="flex flex-wrap gap-1">
                {selectedValues.length} recursos seleccionados
              </CardDescription>
            )
          ) : (
            placeholder
          )}
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder={`Buscar ${placeholder.toLowerCase()}...`} />
          <CommandEmpty>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando opciones...
              </div>
            ) : (
              emptyMessage
            )}
          </CommandEmpty>
          {showSelectAll && (
            <div className="px-2 py-1 border-b flex items-center">
              <div
                className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground transition-colors"
                onClick={handleSelectAll}
              >
                {selectableOptions.every((option) => selectedValues.includes(option.value)) ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span className="text-xs">Seleccionar todos</span>
              </div>
            </div>
          )}
          <CommandGroup className="max-h-64 overflow-auto">
            {options?.map((option) => (
              <CommandItem
                disabled={selectedResourceDocuments?.some((document) => document.applies === option.value)}
                key={option.value}
                value={option.label}
                onSelect={() => handleSelect(option.value)}
                data-testid={dataTestId ? `${dataTestId}-option-${option.value}` : undefined}
              >
                <Check
                  className={cn('mr-2 h-4 w-4', selectedValues?.includes(option.value) ? 'opacity-100' : 'opacity-0')}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
