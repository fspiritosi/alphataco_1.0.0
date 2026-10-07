'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import type { TocItem } from '../lib/mdx-scan';

/** Un título cuenta como "el que se está leyendo" cuando pasó por debajo del header fijo. */
const ACTIVE_OFFSET_PX = 120;

/**
 * "En esta guía" con scroll-spy. Marca el título de la parte que se está leyendo; nunca mueve el
 * foco ni hace scroll por su cuenta.
 */
export function GuideToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Suscripción al scroll de la ventana (sistema externo a React): uso válido de un efecto.
  useEffect(() => {
    if (items.length === 0) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      let current: string | null = null;
      for (const item of items) {
        const element = document.getElementById(item.id);
        if (!element) continue;
        if (element.getBoundingClientRect().top - ACTIVE_OFFSET_PX <= 0) current = item.id;
        else break;
      }
      // Al fondo de la página el último título puede no llegar nunca arriba: se marca igual.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setActiveId(atBottom ? items[items.length - 1].id : (current ?? items[0].id));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [items]);

  return (
    <ul className="space-y-0.5 border-s text-sm">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active ? 'location' : undefined}
              className={cn(
                '-ms-px block border-s-2 border-transparent py-1 pe-1 leading-snug text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                item.depth === 3 ? 'ps-6' : 'ps-3',
                active && 'border-primary font-medium text-foreground'
              )}
            >
              {item.text}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
