import type { ReactNode } from 'react';

/** Tecla. `whitespace-nowrap` para que "Ctrl" no quede partido al final de un renglón. */
export function Kbd({ children }: { children?: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center border border-b-2 border-border bg-muted px-1.5 py-px font-mono text-[0.8125em] whitespace-nowrap text-foreground">
      {children}
    </kbd>
  );
}
