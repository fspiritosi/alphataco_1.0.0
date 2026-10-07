'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { manualHref } from '../../lib/manual-urls';
import { useManualGuide } from '../ManualProvider';

/**
 * Enlace a otra guía (`to="slug"` o `to="slug#ancla"`). Si el usuario no puede abrirla, queda como
 * texto atenuado: el párrafo se sigue entendiendo y no hay un enlace que lleve a "Sin acceso".
 */
export function GuideLink({ to, children }: { to: string; children?: ReactNode }) {
  const [slug, anchor] = to.split('#');
  const guide = useManualGuide(slug);

  if (!guide) {
    return (
      <span className="text-muted-foreground" title="No tenés acceso a esta guía">
        {children}
        <span className="sr-only"> (guía sin acceso)</span>
      </span>
    );
  }

  return (
    <Link
      href={manualHref(guide.slug, anchor || undefined)}
      className="font-medium text-foreground underline decoration-primary/60 decoration-1 underline-offset-4 transition-colors hover:decoration-primary hover:decoration-2"
    >
      {children ?? guide.title}
    </Link>
  );
}
