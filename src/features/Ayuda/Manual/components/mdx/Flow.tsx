import type { ReactNode } from 'react';

/**
 * Diagrama de un recorrido entre pantallas o módulos. Es una `<ol>`: el orden es el contenido, y
 * así lo anuncia también el lector de pantalla. En pantallas anchas los pasos van en fila (con
 * scroll horizontal propio si no entran); en móvil, en columna.
 *
 * El contenedor de scroll es enfocable para que se pueda desplazar con el teclado.
 */
export function Flow({ title, children }: { title?: string; children?: ReactNode }) {
  const label = title ?? 'Recorrido del proceso';
  return (
    <figure className="mt-6 first:mt-0">
      {title && <figcaption className="mb-3 text-sm font-semibold text-foreground">{title}</figcaption>}
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        className="overflow-x-auto pb-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ol className="flex flex-col [counter-reset:manual-flow] md:flex-row md:items-stretch">{children}</ol>
      </div>
    </figure>
  );
}
