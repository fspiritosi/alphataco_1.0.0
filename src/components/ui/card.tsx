import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const cardVariants = cva('rounded-xl border bg-card text-card-foreground shadow', {
  variants: {
    variant: {
      default: 'border-border bg-card text-card-foreground',
      outlined: 'border-2 border-border bg-transparent',
      filled: 'border-0 bg-muted text-muted-foreground',
      elevated: 'border-0 shadow-lg bg-card text-card-foreground',
      ghost: 'border-0 shadow-none bg-transparent',
      primary: 'border-primary bg-primary/5 text-primary border-2',
      secondary: 'border-secondary bg-secondary/5 text-secondary border-2',
      success:
        'border-emerald-500 bg-emerald-50 text-emerald-700 border-2 dark:bg-emerald-950 dark:text-emerald-300 [&_*]:text-emerald-700 dark:[&_*]:text-emerald-300 [&_.card-description]:text-emerald-600 dark:[&_.card-description]:text-emerald-400 [&_.card-footer]:text-emerald-600 dark:[&_.card-footer]:text-emerald-400',
      warning:
        'border-yellow-500 bg-yellow-50 text-yellow-700 border-2 dark:bg-yellow-950 dark:text-yellow-300 [&_*]:text-yellow-700 dark:[&_*]:text-yellow-300 [&_.card-description]:text-yellow-600 dark:[&_.card-description]:text-yellow-400 [&_.card-footer]:text-yellow-600 dark:[&_.card-footer]:text-yellow-400',
      destructive:
        'border-destructive bg-destructive/5 text-destructive border-2 [&_*]:text-destructive [&_.card-description]:text-destructive/80 [&_.card-footer]:text-destructive/80',
    },
    size: {
      sm: 'text-sm',
      default: '',
      lg: 'text-lg',
    },
    padding: {
      none: '',
      sm: 'p-3',
      default: 'p-0',
      lg: 'p-6',
      xl: 'p-8',
    },
    text_color: {
      default: 'text-card-foreground',
      success: 'text-emerald-700',
      warning: 'text-yellow-700',
      destructive: 'text-destructive',
    },
    rounded: {
      none: 'rounded-none',
      sm: 'rounded-sm',
      default: 'rounded-xl',
      lg: 'rounded-2xl',
      full: 'rounded-full',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
    padding: 'default',
    rounded: 'default',
  },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, padding, rounded, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      className={cn(cardVariants({ variant, size, padding, rounded }), 'flex flex-col gap-6 py-6', className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-title" className={cn('leading-none font-semibold', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-description" className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 py-4 [.border-t]:pt-6 [.border-t]:mt-4', className)}
      {...props}
    />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
