import { Badge } from '@/components/ui/badge';
import type { arca_environment, invoice_status } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, FlaskConical, MonitorPlay, PencilLine, SearchCheck, XCircle } from 'lucide-react';
import { INVOICE_STATUS_LABELS } from '../lib/invoice-state-machine';

/**
 * Estado de un comprobante + marcas derivadas (no son estados de la máquina).
 *
 * Clases escritas completas: Tailwind v4 escanea el código como texto plano y una clase armada por
 * concatenación no se genera. Precedente: `CertificationStatusBadge` (borrador muted, autorizada con
 * relleno de marca como "Confirmada", rechazada como "Anulada"). El ámbar no tiene token: sigue el
 * precedente de `SectorTimeline` (`bg-*-100 … dark:bg-*-950`).
 */
const STATUS_STYLES: Record<invoice_status, string> = {
  borrador: 'bg-muted text-muted-foreground',
  emitiendo: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800',
  pendiente: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800',
  autorizada: 'bg-brand text-brand-foreground',
  rechazada: 'bg-destructive/10 text-destructive border-destructive/30',
};

/** Mismos iconos que el filtro de Estado del listado (`list/columns.tsx`): un estado, un icono. */
export const INVOICE_STATUS_ICONS: Record<invoice_status, LucideIcon> = {
  borrador: PencilLine,
  emitiendo: Clock,
  pendiente: AlertCircle,
  rechazada: XCircle,
  autorizada: CheckCircle2,
};

type Mark = 'test' | 'simulated' | 'observations' | 'review';

const MARKS: Record<Mark, { label: string; Icon: LucideIcon; className: string }> = {
  test: {
    label: 'Prueba (homologación)',
    Icon: FlaskConical,
    className: 'border-dashed border-border text-muted-foreground',
  },
  simulated: {
    label: 'Simulado',
    Icon: MonitorPlay,
    className: 'border-dashed border-amber-500/50 text-amber-800 dark:text-amber-300',
  },
  observations: {
    label: 'Con observaciones',
    Icon: AlertTriangle,
    className: 'border-amber-300 text-amber-900 dark:border-amber-800 dark:text-amber-200',
  },
  review: {
    label: 'Revisar',
    Icon: SearchCheck,
    className: 'border-destructive/40 text-destructive',
  },
};

type Props = {
  status: invoice_status;
  simulated: boolean;
  environment: arca_environment;
  /** Autorizada con observaciones de ARCA (no es un rechazo). */
  hasObservations?: boolean;
  /** Quedó marcada para revisar a mano (`needs_review`). */
  needsReview?: boolean;
  className?: string;
};

/**
 * Badge del estado + marcas "Simulado" / "Prueba (homologación)" / "Con observaciones" / "Revisar".
 * Ícono + texto siempre: el estado nunca depende solo del color.
 */
export function InvoiceStatusBadge({ status, simulated, environment, hasObservations, needsReview, className }: Props) {
  const StatusIcon = INVOICE_STATUS_ICONS[status];
  const marks: Mark[] = [];
  if (simulated) marks.push('simulated');
  else if (environment === 'homologacion') marks.push('test');
  if (hasObservations && status === 'autorizada') marks.push('observations');
  if (needsReview) marks.push('review');

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      <Badge variant="outline" className={cn('whitespace-nowrap', STATUS_STYLES[status])}>
        <StatusIcon aria-hidden />
        {INVOICE_STATUS_LABELS[status]}
      </Badge>
      {marks.map((mark) => {
        const { label, Icon, className: markClass } = MARKS[mark];
        return (
          <Badge key={mark} variant="outline" className={cn('whitespace-nowrap font-normal', markClass)}>
            <Icon aria-hidden />
            {label}
          </Badge>
        );
      })}
    </span>
  );
}
