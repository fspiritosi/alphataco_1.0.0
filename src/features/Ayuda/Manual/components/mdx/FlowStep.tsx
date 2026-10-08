'use client';

import { cn } from '@/lib/utils';
import { ArrowDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { manualHref } from '../../lib/manual-urls';
import { useManualGuide } from '../ManualProvider';
import { TONE_CLASSES, toTone } from './tones';

/**
 * Un paso del diagrama. Si `to` apunta a una guía que el usuario puede abrir, el título enlaza a
 * ella; si no la puede abrir, el paso se muestra igual (el recorrido sigue siendo información útil)
 * pero sin enlace.
 */
export function FlowStep({
  title,
  module,
  tone,
  to,
  children,
}: {
  title: string;
  module?: string;
  tone?: string;
  to?: string;
  children?: ReactNode;
}) {
  const classes = TONE_CLASSES[toTone(tone)];
  const target = useManualGuide(to);
  const linked = to ? target : null;

  return (
    <li className="group/flow flex flex-col items-stretch [counter-increment:manual-flow] md:min-w-44 md:flex-1 md:flex-row md:items-center">
      <div
        className={cn(
          'relative flex flex-col overflow-hidden border p-3 pt-4 md:min-w-0 md:flex-1 md:self-stretch',
          classes.surface,
          linked && 'focus-within:ring-[3px] focus-within:ring-ring/50'
        )}
      >
        <span aria-hidden className={cn('absolute inset-x-0 top-0 h-1', classes.bar)} />
        <p className="flex items-baseline gap-2 text-xs">
          <span
            aria-hidden
            className={cn('font-semibold tabular-nums before:content-[counter(manual-flow)]', classes.label)}
          />
          {module && <span className={cn('font-medium', classes.label)}>{module}</span>}
        </p>
        <p className="mt-1 text-sm font-semibold text-balance break-words text-foreground">
          {linked ? (
            <Link
              href={manualHref(linked.slug)}
              className="underline decoration-1 underline-offset-4 outline-none hover:decoration-2 after:absolute after:inset-0"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </p>
        {children && (
          <div className="mt-1 text-sm leading-snug break-words text-foreground [&_p]:mt-1 [&_p]:max-w-none [&_p]:text-sm [&_p:first-child]:mt-0">
            {children}
          </div>
        )}
      </div>
      {/* Conector: decorativo, el orden ya lo dice la lista. Se oculta después del último paso. */}
      <span aria-hidden className="flex justify-center py-1 text-muted-foreground group-last/flow:hidden md:px-1.5 md:py-0">
        <ArrowDown className="size-4 md:hidden" />
        <ArrowRight className="hidden size-4 md:block" />
      </span>
    </li>
  );
}
