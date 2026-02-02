'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
  className?: string;
}

export function ActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  variant = 'outline',
  disabled = false,
  className,
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full h-auto py-4 px-4 flex items-center gap-4 justify-start text-left',
        'active:scale-[0.98] transition-all duration-150',
        variant === 'default' && 'bg-primary hover:bg-primary/90',
        className
      )}
    >
      <div
        className={cn(
          'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
          variant === 'default' ? 'bg-primary-foreground/20' : 'bg-primary/10'
        )}
      >
        <Icon className={cn('h-6 w-6', variant === 'default' ? 'text-primary-foreground' : 'text-primary')} />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span
          className={cn(
            'font-semibold text-base',
            variant === 'default' ? 'text-primary-foreground' : 'text-foreground'
          )}
        >
          {label}
        </span>
        {description && (
          <span
            className={cn('text-sm', variant === 'default' ? 'text-primary-foreground/70' : 'text-muted-foreground')}
          >
            {description}
          </span>
        )}
      </div>
    </Button>
  );
}
