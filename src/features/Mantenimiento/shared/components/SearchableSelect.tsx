'use client';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Texto adicional por el que tambien se puede buscar (tipo, proveedor, alias, etc.) */
  keywords?: string;
  disabled?: boolean;
  /** Contenido extra que se dibuja a la derecha del label (badges, aclaraciones) */
  trailing?: ReactNode;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  id?: string;
  /** Clases del boton disparador (alto, ancho, tipografia) */
  className?: string;
  /** Clases del popover — por defecto copia el ancho del trigger */
  contentClassName?: string;
}

/**
 * Selector con buscador integrado (Popover + Command).
 *
 * Reemplaza al <Select> plano en las listas largas del modulo de Mantenimiento
 * (sectores, talleres, supervisores, grupos de tareas): escribir es la forma mas
 * rapida de encontrar la opcion, en vez de recorrer la lista a mano.
 *
 * No usar en selects de 2-4 opciones fijas (Si/No, prioridad): ahi el buscador estorba.
 */
export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Sin resultados',
  disabled = false,
  id,
  className,
  contentClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          // Radix ya inyecta type="button" con asChild, pero lo dejamos explicito
          // para que el boton nunca submitee el formulario que lo contiene.
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground', className)}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn('w-[var(--radix-popover-trigger-width)] p-0', contentClassName)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // cmdk filtra por este string: incluimos las keywords para que
                  // el usuario pueda buscar por cualquiera de los datos visibles.
                  value={`${option.label} ${option.keywords ?? ''}`}
                  disabled={option.disabled}
                  onSelect={() => {
                    if (option.disabled) return;
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4 shrink-0', value === option.value ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate">{option.label}</span>
                    {option.trailing}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
