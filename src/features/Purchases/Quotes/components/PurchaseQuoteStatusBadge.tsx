import { Badge } from '@/components/ui/badge';
import { Ban, CheckCircle2, FilePen, MailCheck, XCircle, type LucideIcon } from 'lucide-react';
import { PURCHASE_QUOTE_STATUS_LABELS, type PurchaseQuoteStatus } from '../../lib/quote-state-machine';

/** Icono por estado: lo comparten la celda, el filtro de la tabla y el detalle. */
export const purchaseQuoteStatusIcons: Record<PurchaseQuoteStatus, LucideIcon> = {
  DRAFT: FilePen,
  SENT: MailCheck,
  RECEIVED: CheckCircle2,
  DECLINED: XCircle,
  CANCELLED: Ban,
};

const VARIANTS: Record<PurchaseQuoteStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  SENT: 'secondary',
  RECEIVED: 'default',
  DECLINED: 'secondary',
  CANCELLED: 'destructive',
};

const CLASSES: Partial<Record<PurchaseQuoteStatus, string>> = {
  DRAFT: 'text-muted-foreground',
  SENT: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  RECEIVED: 'bg-green-600 text-white hover:bg-green-600/90',
  DECLINED: 'text-muted-foreground',
};

export function PurchaseQuoteStatusBadge({ status }: { status: PurchaseQuoteStatus }) {
  const Icon = purchaseQuoteStatusIcons[status];
  return (
    <Badge variant={VARIANTS[status]} className={`gap-1 ${CLASSES[status] ?? ''}`}>
      <Icon className="h-3 w-3" />
      {PURCHASE_QUOTE_STATUS_LABELS[status]}
    </Badge>
  );
}
