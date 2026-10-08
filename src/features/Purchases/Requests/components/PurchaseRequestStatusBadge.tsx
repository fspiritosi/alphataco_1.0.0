import { Badge } from '@/components/ui/badge';
import { Ban, CheckCircle2, Clock, FilePen, XCircle, type LucideIcon } from 'lucide-react';
import { PURCHASE_REQUEST_STATUS_LABELS, type PurchaseRequestStatus } from '../../lib/request-state-machine';

/** Icono por estado: lo comparten la celda, el filtro de la tabla y el detalle. */
export const purchaseRequestStatusIcons: Record<PurchaseRequestStatus, LucideIcon> = {
  DRAFT: FilePen,
  PENDING_APPROVAL: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: Ban,
};

const VARIANTS: Record<PurchaseRequestStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_APPROVAL: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'destructive',
};

const CLASSES: Partial<Record<PurchaseRequestStatus, string>> = {
  DRAFT: 'text-muted-foreground',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-green-600 text-white hover:bg-green-600/90',
};

export function PurchaseRequestStatusBadge({ status }: { status: PurchaseRequestStatus }) {
  const Icon = purchaseRequestStatusIcons[status];
  return (
    <Badge variant={VARIANTS[status]} className={`gap-1 ${CLASSES[status] ?? ''}`}>
      <Icon className="h-3 w-3" />
      {PURCHASE_REQUEST_STATUS_LABELS[status]}
    </Badge>
  );
}
