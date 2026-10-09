import { Badge } from '@/components/ui/badge';
import { Ban, CheckCircle2, CircleDashed, Clock, FilePen, Lock, PackageCheck, XCircle, type LucideIcon } from 'lucide-react';
import { PURCHASE_REQUEST_STATUS_LABELS, type PurchaseRequestStatus } from '../../lib/request-state-machine';

/** Icono por estado: lo comparten la celda, el filtro de la tabla y el detalle. */
export const purchaseRequestStatusIcons: Record<PurchaseRequestStatus, LucideIcon> = {
  DRAFT: FilePen,
  PENDING_APPROVAL: Clock,
  APPROVED: CheckCircle2,
  PARTIALLY_ORDERED: CircleDashed,
  ORDERED: PackageCheck,
  CLOSED: Lock,
  REJECTED: XCircle,
  CANCELLED: Ban,
};

const VARIANTS: Record<PurchaseRequestStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_APPROVAL: 'secondary',
  APPROVED: 'default',
  PARTIALLY_ORDERED: 'secondary',
  ORDERED: 'default',
  CLOSED: 'secondary',
  REJECTED: 'destructive',
  CANCELLED: 'destructive',
};

const CLASSES: Partial<Record<PurchaseRequestStatus, string>> = {
  DRAFT: 'text-muted-foreground',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-green-600 text-white hover:bg-green-600/90',
  PARTIALLY_ORDERED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  ORDERED: 'bg-blue-600 text-white hover:bg-blue-600/90',
  CLOSED: 'text-muted-foreground',
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
