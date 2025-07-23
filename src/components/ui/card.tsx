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
      success: 'border-emerald-500 bg-emerald-50 text-emerald-700 border-2 dark:bg-emerald-950 dark:text-emerald-300',
      warning: 'border-yellow-500 bg-yellow-50 text-yellow-700 border-2 dark:bg-yellow-950 dark:text-yellow-300',
      destructive: 'border-destructive bg-destructive/5 text-destructive border-2',
    },
    size: {
      sm: 'text-sm',
      default: '',
      lg: 'text-lg',
    },
    padding: {
      none: '',
      sm: 'p-3',
      default: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
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
    <div ref={ref} className={cn(cardVariants({ variant, size, padding, rounded, className }))} {...props} />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-4', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('flex items-center p-4 pt-0', className)} {...props} />
);
CardFooter.displayName = 'CardFooter';

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants };
