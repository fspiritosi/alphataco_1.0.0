'use client';

import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import type { OwnershipCategory } from '../types';

interface OwnershipCardProps {
  category: OwnershipCategory;
  count: number;
  percent: number;
  color: string;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
}

/**
 * Card clickeable de la leyenda del donut.
 * Toggle del drill-down: click activa/desactiva el filtro por categoria.
 * - Default: borde sutil, fondo card/40
 * - Hover: borde mas fuerte, scale leve
 * - Selected: borde + fondo del color de la categoria, chevron revelado
 * - Dimmed: opacity 50% (cuando OTRA card esta selected)
 */
export function OwnershipCard({
  category,
  count,
  percent,
  color,
  selected,
  dimmed,
  onClick,
}: OwnershipCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-all duration-150',
        'hover:bg-card hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-current shadow-sm' : 'bg-card/40 hover:border-foreground/20',
        dimmed && 'opacity-50 hover:opacity-100'
      )}
      style={
        selected
          ? { borderColor: color, backgroundColor: `color-mix(in oklab, ${color} 10%, transparent)`, color }
          : undefined
      }
    >
      <span
        className="h-3 w-3 rounded-full shrink-0 transition-transform group-hover:scale-110"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className={cn('text-sm font-medium flex-1', selected ? 'text-foreground' : 'text-foreground')}>
        {category}
      </span>
      <span className="text-sm tabular-nums font-semibold text-foreground">{count}</span>
      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{percent}%</span>
      <ChevronRight
        className={cn(
          'h-3.5 w-3.5 shrink-0 transition-all',
          selected ? 'opacity-100' : 'opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0'
        )}
        style={selected ? { color } : undefined}
        aria-hidden
      />
    </button>
  );
}
