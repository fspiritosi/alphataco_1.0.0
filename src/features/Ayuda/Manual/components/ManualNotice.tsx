import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

/**
 * Estado de la vista de contenido cuando no hay guía para mostrar (no existe, no hay acceso, el
 * manual está vacío, la guía no se pudo mostrar). Siempre con una salida concreta.
 */
export function ManualNotice({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <section aria-labelledby="manual-notice-title" className="flex max-w-prose flex-col items-start gap-3 border bg-card p-6 sm:p-8">
      <span className="flex size-10 items-center justify-center bg-muted text-muted-foreground">
        <Icon aria-hidden className="size-5" />
      </span>
      <h2 id="manual-notice-title" className="text-lg font-semibold text-balance text-foreground">
        {title}
      </h2>
      <p className="leading-relaxed text-pretty text-muted-foreground">{description}</p>
      {action && (
        <Button asChild variant="outline" size="sm" className="mt-1">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </section>
  );
}
