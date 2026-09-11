'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import { useState } from 'react';

// ============================================================================
// UMBRAL
// ============================================================================

/**
 * Con 1 o 2 recursos la celda los sigue mostrando inline.
 * De 3 en adelante se reemplazan por un botón que abre el modal con scroll.
 */
export const INLINE_RESOURCES_LIMIT = 2;

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  /** Badges ya renderizados (conservan tooltips, colores de desvío y legajo). */
  items: React.ReactNode[];
  /** Título del modal, ej. "Empleados". */
  title: string;
  /** Texto del botón, ej. "Ver empleados". */
  buttonLabel: string;
  /** Contexto de la fila para ubicar al usuario dentro del modal. */
  description?: string;
}

// ============================================================================
// COMPONENTE
// ============================================================================

/**
 * Celda de recursos del parte diario.
 *
 * Las filas con muchos recursos (típicamente contenedores) volvían la tabla
 * ilegible, así que a partir de 3 recursos los badges se reemplazan por un
 * botón "Ver ..." que abre un modal chico con scroll y el mismo contenido.
 */
export function ResourceCell({ items, title, buttonLabel, description }: Props) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  if (items.length <= INLINE_RESOURCES_LIMIT) {
    return <div className="flex flex-col items-start gap-1">{items}</div>;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs font-normal"
        onClick={() => setOpen(true)}
      >
        <Eye className="h-3.5 w-3.5 shrink-0" />
        <span className="text-nowrap">{buttonLabel}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {items.length}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {title}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </DialogTitle>
            <DialogDescription>{description ?? `Recursos asignados a esta fila del parte diario.`}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto overscroll-contain pr-1">
            <div className="flex flex-col items-start gap-1.5">{items}</div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
