'use client';

import { cn } from '@/lib/utils';
import type { VehicleStatus } from '../types';

interface ConditionChipProps {
  status: VehicleStatus;
  label: string;
  count: number;
  dotClass: string;
  // Mapeo de dotClass → border/bg cuando esta selected.
  ringClass: string;
  tintClass: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}

/**
 * Chip clickeable de condicion operativa.
 * Comportamiento multi-select toggle: cada chip suma/quita el estado al filtro global.
 *
 * - disabled (count=0): atenuado, cursor-not-allowed, no clickeable
 * - default: borde fino, bg card/40
 * - selected: borde + fondo tintado del color del dot
 */
export function ConditionChip({
  status,
  label,
  count,
  dotClass,
  ringClass,
  tintClass,
  selected,
  disabled,
  onClick,
}: ConditionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${label} (${count})`}
      title={disabled ? 'Sin equipos en este estado' : undefined}
      className={cn(
        'flex items-center gap-2 rounded-md border px-2.5 py-1 transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer hover:scale-[1.02] hover:border-foreground/30',
        selected ? cn('border-transparent', ringClass, tintClass) : 'bg-card/40'
      )}
      data-status={status}
    >
      <span className={cn('h-2 w-2 rounded-full shrink-0', dotClass)} aria-hidden />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums">{count}</span>
    </button>
  );
}
