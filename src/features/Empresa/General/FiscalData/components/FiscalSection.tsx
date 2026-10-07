import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * Sección de la página de Datos fiscales: encabezado `h3` + bajada + acción a la derecha, como el
 * panel de Certificaciones. El `id` es el destino de los links del resumen "Listo para facturar".
 */
export function FiscalSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={headingId} className={cn('flex scroll-mt-24 flex-col gap-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 id={headingId} className="text-lg font-semibold text-balance">
            {title}
          </h3>
          {description && <p className="text-muted-foreground text-sm text-pretty">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
