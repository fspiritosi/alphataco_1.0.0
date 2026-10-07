import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ManualTree } from '../lib/guide-navigation';
import { manualHref } from '../lib/manual-urls';
import { SECTION_ICONS } from './section-icons';

/**
 * Índice del manual: secciones plegables con sus guías. Sin JavaScript: `<details>` nativo, con la
 * sección de la guía activa abierta desde el servidor.
 *
 * `globals.css` le pone a todo `summary` una flecha de fondo (`summary::after`) y una animación a
 * lo que sigue al `summary` de un `details` abierto. Acá se anulan las dos: la flecha la dibuja el
 * chevron propio y la animación se repetiría en cada navegación sobre la sección activa.
 */
export function ManualIndex({ tree, activeSlug }: { tree: ManualTree; activeSlug: string | null }) {
  return (
    <ul className="space-y-0.5 text-sm">
      {tree.map((section) => {
        const Icon = SECTION_ICONS[section.icon];
        const isActive = section.guides.some((guide) => guide.slug === activeSlug);
        return (
          <li key={section.key}>
            <details open={isActive} className="group/section">
              <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 px-2 py-1.5 font-medium text-foreground outline-none select-none after:hidden hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <ChevronRight
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/section:rotate-90 motion-reduce:transition-none"
                />
                <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                {/* Sin recortar: "Procesos de punta a punta" y "Paneles para el personal de campo"
                    quedaban ilegibles en la columna del índice. */}
                <span className="min-w-0 flex-1 text-pretty leading-snug">{section.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{section.guides.length}</span>
              </summary>
              <ul className="mt-0.5 mb-1.5 ms-[0.9rem] animate-none! border-s ps-2">
                {section.guides.map((guide) => {
                  const current = guide.slug === activeSlug;
                  return (
                    <li key={guide.slug}>
                      <Link
                        href={manualHref(guide.slug)}
                        aria-current={current ? 'page' : undefined}
                        className={cn(
                          'relative -ms-2 flex min-h-8 items-center border-s-2 border-transparent py-1 ps-3 pe-2 leading-snug text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                          current && 'border-primary bg-accent font-medium text-foreground'
                        )}
                      >
                        {guide.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
