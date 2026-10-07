'use client';

import { Button } from '@/components/ui/button';
import { AppWindow, Lock } from 'lucide-react';
import Link from 'next/link';
import { useManualGuide } from '../ManualProvider';

/**
 * Botón a la pantalla que documenta la guía (o la de otra guía con `to`). Si el usuario no ve esa
 * guía, el botón aparece deshabilitado y dice por qué: un botón que lleva a "Sin acceso" es peor
 * que uno que avisa antes.
 */
export function OpenScreen({ to, label }: { to?: string; label?: string }) {
  const guide = useManualGuide(to);
  const text = label ?? (to && guide ? `Abrir ${guide.title}` : 'Abrir pantalla');

  if (!guide?.screenHref) {
    return (
      <span className="mt-4 flex flex-wrap items-center gap-2 first:mt-0">
        <Button type="button" variant="outline" size="sm" disabled>
          <Lock aria-hidden />
          {text}
        </Button>
        <span className="text-sm text-muted-foreground">Tu rol no tiene acceso a esa pantalla.</span>
      </span>
    );
  }

  return (
    <span className="mt-4 flex first:mt-0">
      <Button asChild variant="outline" size="sm">
        <Link href={guide.screenHref}>
          <AppWindow aria-hidden />
          {text}
        </Link>
      </Button>
    </span>
  );
}
