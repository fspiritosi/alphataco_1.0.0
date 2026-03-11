'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatItem {
  label: string;
  value: number;
  icon?: LucideIcon;
  onClick?: () => void;
}

interface IndicatorStatsProps {
  items: StatItem[];
}

export function IndicatorStats({ items }: IndicatorStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        const isClickable = !!item.onClick;
        return (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            disabled={!isClickable}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors',
              isClickable ? 'cursor-pointer hover:bg-muted/50 hover:border-primary/20' : 'cursor-default'
            )}
          >
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            <span className="text-xl font-bold tabular-nums">{item.value.toLocaleString('es-AR')}</span>
            <span className="text-[11px] text-muted-foreground leading-tight">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
