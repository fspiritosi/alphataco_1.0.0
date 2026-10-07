'use client';

import { cn } from '@/lib/utils';
import { useCallback, type ReactNode } from 'react';

/**
 * `h2` que recibe el foco al montarse cuando la página viene de una acción (emitir, consultar):
 * el lector de pantalla lee el resultado y el teclado sigue desde ahí. Además actualiza el título
 * de la pestaña con el resultado.
 */
export function FocusOnMountHeading({
  id,
  focus,
  documentTitle,
  className,
  children,
}: {
  id: string;
  focus: boolean;
  documentTitle?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useCallback(
    (node: HTMLHeadingElement | null) => {
      if (!node || !focus) return;
      node.focus();
      if (documentTitle) document.title = documentTitle;
    },
    [focus, documentTitle]
  );
  return (
    <h2
      id={id}
      ref={ref}
      tabIndex={-1}
      className={cn('outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', className)}
    >
      {children}
    </h2>
  );
}
