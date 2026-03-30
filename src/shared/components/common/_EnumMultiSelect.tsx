'use client';

import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

interface EnumOption {
  value: string;
  label: string;
}

interface EnumMultiSelectProps {
  /** Etiqueta del campo */
  label: string;
  /** Opciones disponibles */
  options: EnumOption[];
  /** Valores seleccionados */
  selected: string[];
  /** Callback cuando cambian los seleccionados */
  onChange: (values: string[]) => void;
  /** Campo deshabilitado */
  disabled?: boolean;
  /** Icono decorativo del grupo */
  icon?: LucideIcon;
}

// ============================================
// COMPONENTE
// ============================================

export function _EnumMultiSelect({
  label,
  options,
  selected,
  onChange,
  disabled = false,
  icon: Icon,
}: EnumMultiSelectProps) {
  const handleToggle = (value: string) => {
    if (disabled) return;

    const isSelected = selected.includes(value);
    if (isSelected) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string) => {
    if (disabled) return;
    onChange(selected.filter((v) => v !== value));
  };

  const selectedCount = selected.length;

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {label}
        {selectedCount > 0 && (
          <Badge variant="secondary" className="ml-1 text-xs">
            {selectedCount}
          </Badge>
        )}
      </Label>

      {/* Chips de opciones */}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => handleToggle(option.value)}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Badges de seleccionados (solo si hay más de 3 opciones seleccionadas) */}
      {selected.length > 3 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {selected.map((value) => {
            const option = options.find((o) => o.value === value);
            if (!option) return null;
            return (
              <Badge key={value} variant="secondary" className="gap-1 pr-1">
                <span>{option.label}</span>
                <button
                  type="button"
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={() => handleRemove(value)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  <span className="sr-only">Quitar {option.label}</span>
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
