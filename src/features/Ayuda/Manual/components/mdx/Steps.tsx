import type { ReactNode } from 'react';

/**
 * Procedimiento numerado. Es una `<ol>` real (el lector de pantalla anuncia "lista, 5 elementos")
 * y el número lo pone un contador CSS: el redactor no numera a mano y reordenar no rompe nada.
 */
export function Steps({ children }: { children?: ReactNode }) {
  return <ol className="mt-6 space-y-6 [counter-reset:manual-step] first:mt-0">{children}</ol>;
}

export function Step({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <li className="group/step relative ps-11 [counter-increment:manual-step]">
      {/* Número y línea guía: decorativos, el orden ya lo da la lista. */}
      <span
        aria-hidden
        className="absolute start-0 top-0 flex size-7 items-center justify-center border border-border bg-muted text-sm font-semibold tabular-nums text-foreground before:content-[counter(manual-step)]"
      />
      <span aria-hidden className="absolute start-3.5 top-8 -bottom-4 w-px bg-border group-last/step:hidden" />
      <p className="pt-0.5 font-semibold text-balance text-foreground">{title}</p>
      <div className="mt-2 [&>*:first-child]:mt-0">
        {children}
      </div>
    </li>
  );
}
