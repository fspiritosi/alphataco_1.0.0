import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { TONE_CLASSES, toTone } from './tones';

/**
 * Ciclo de vida de una entidad: una tarjeta por estado con sus salidas posibles. Es una lista
 * (`<ul>`) y no un grafo dibujado: con más de tres o cuatro estados las flechas cruzadas se
 * vuelven ilegibles, y el texto "Pasa a" se lee igual en pantalla y con lector de pantalla.
 */
export function States({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <section aria-label={title ?? 'Estados'} className="mt-6 first:mt-0">
      {title && <p className="mb-3 text-sm font-semibold text-foreground">{title}</p>}
      <ul className="grid gap-3 sm:grid-cols-2">{children}</ul>
    </section>
  );
}

export function State({
  name,
  tone,
  next,
  children,
}: {
  name: string;
  tone?: string;
  next?: string;
  children?: ReactNode;
}) {
  const classes = TONE_CLASSES[toTone(tone)];
  const transitions = (next ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <li className={cn('relative flex flex-col overflow-hidden border p-4 pt-5', classes.surface)}>
      <span aria-hidden className={cn('absolute inset-x-0 top-0 h-1', classes.bar)} />
      <p className={cn('font-semibold text-balance', classes.label)}>{name}</p>
      <div className="mt-1.5 flex-1 text-sm leading-relaxed text-foreground [&_p]:mt-2 [&_p]:max-w-none [&_p]:text-sm [&_p:first-child]:mt-0">
        {children}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-foreground">
        {transitions.length > 0 ? (
          <>
            <ArrowRight aria-hidden className={cn('size-3.5 shrink-0', classes.label)} />
            <span className="font-medium">Pasa a:</span>
            <span>{transitions.join(', ')}</span>
          </>
        ) : (
          <span className="font-medium">Estado final</span>
        )}
      </p>
    </li>
  );
}
