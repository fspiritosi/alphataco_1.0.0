'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import * as React from 'react';

interface PatenteSearchInputProps {
  value: string;
  // Recibe el nuevo valor (NO debounced) — el debounce lo aplica el consumer si lo necesita.
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Input compacto de busqueda con icono de lupa y boton X para limpiar.
 * Usado en el header de cada acordeon para filtrar por patente.
 *
 * Mantenido controlado (sin debounce interno) — el filtro se aplica via
 * useMemo en el componente padre, asi cada caracter actualiza la lista
 * sin overhead apreciable (los acordeones cachean su data).
 */
export function PatenteSearchInput({
  value,
  onChange,
  placeholder = 'Buscar patente',
  disabled,
  className,
}: PatenteSearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-9 pl-8 pr-8 text-sm"
        aria-label={placeholder}
      />
      {value.length > 0 && !disabled && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Limpiar busqueda"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
