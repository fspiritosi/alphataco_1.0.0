'use client';

import { Button } from '@/components/ui/button';
import { CircleHelp } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { manualHref } from '../../lib/manual-urls';
import { matchGuide, type RouteRule } from '../../lib/route-table';

/**
 * Abre la guía de la pantalla actual (o la portada del manual si ninguna la documenta). Dentro del
 * propio manual no tiene sentido y se oculta.
 */
export function ContextualHelpButton({
  rules,
  manualIsHelpDefault,
}: {
  rules: RouteRule[];
  manualIsHelpDefault: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  const insideManual = pathname === '/dashboard/help' && (tab === 'manual' || (!tab && manualIsHelpDefault));
  if (insideManual) return null;

  const slug = matchGuide(rules, pathname, { tab, subtab: searchParams.get('subtab') });

  return (
    <Button asChild variant="ghost" size="icon" className="!border-0">
      <Link href={manualHref(slug ?? undefined)} aria-label="Ayuda sobre esta pantalla" title="Ayuda sobre esta pantalla">
        <CircleHelp aria-hidden className="size-[1.2rem]" />
      </Link>
    </Button>
  );
}
