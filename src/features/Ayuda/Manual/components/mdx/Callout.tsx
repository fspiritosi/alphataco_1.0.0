import { cn } from '@/lib/utils';
import { CircleAlert, Info, Lightbulb, OctagonAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { TONE_CLASSES, type Tone } from './tones';

type CalloutType = 'info' | 'tip' | 'warning' | 'danger';

/**
 * El tipo se lee por color, ícono Y rótulo: el color solo no alcanza (daltonismo, alto contraste).
 * Si el redactor no pone `title`, el rótulo por defecto dice qué clase de aviso es.
 */
const CALLOUT_CONFIG: Record<CalloutType, { tone: Tone; icon: LucideIcon; label: string }> = {
  info: { tone: 'info', icon: Info, label: 'Para tener en cuenta' },
  tip: { tone: 'success', icon: Lightbulb, label: 'Consejo' },
  warning: { tone: 'warning', icon: CircleAlert, label: 'Atención' },
  danger: { tone: 'danger', icon: OctagonAlert, label: 'Cuidado' },
};

export function Callout({ type = 'info', title, children }: { type?: string; title?: string; children?: ReactNode }) {
  const config = CALLOUT_CONFIG[type as CalloutType] ?? CALLOUT_CONFIG.info;
  const tone = TONE_CLASSES[config.tone];
  const Icon = config.icon;

  return (
    <aside
      aria-label={title ?? config.label}
      className={cn('relative mt-5 overflow-hidden border py-3 ps-5 pe-4 first:mt-0', tone.surface)}
    >
      <span aria-hidden className={cn('absolute inset-y-0 start-0 w-1', tone.bar)} />
      <p className={cn('flex items-center gap-2 text-sm font-semibold', tone.label)}>
        <Icon aria-hidden className="size-4 shrink-0" />
        {title ?? config.label}
      </p>
      <div className="mt-1.5 text-[0.9375rem] leading-relaxed text-foreground [&_p]:mt-2 [&_p:first-child]:mt-0">
        {children}
      </div>
    </aside>
  );
}
