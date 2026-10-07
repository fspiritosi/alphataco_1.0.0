import { cn } from '@/lib/utils';

/**
 * El recuadro con la letra del comprobante (A/B/C), la "firma" del módulo: es el mismo gesto en el
 * editor, el detalle y el PDF. Esquinas rectas por `--radius: 0`. La letra es decorativa para el
 * lector de pantalla: el tipo completo ("Factura A") siempre está en el texto de al lado.
 */
export function InvoiceLetterBox({ letter, size = 'md', className }: { letter: string; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'border-foreground inline-flex shrink-0 items-center justify-center border-2 font-semibold leading-none',
        size === 'md' ? 'size-12 text-2xl' : 'size-9 text-lg',
        className
      )}
    >
      {letter}
    </span>
  );
}
