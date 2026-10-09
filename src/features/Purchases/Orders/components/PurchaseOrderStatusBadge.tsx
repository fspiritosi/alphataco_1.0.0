import { Badge } from '@/components/ui/badge';
import { Ban, CheckCircle2, Clock, FilePen, Lock, PackageCheck, PackageOpen, Send, type LucideIcon } from 'lucide-react';
import { PURCHASE_ORDER_STATUS_LABELS, type PurchaseOrderStatus } from '../../lib/order-state-machine';

/** Icono por estado: lo comparten la celda, el filtro de la tabla y el detalle. */
export const purchaseOrderStatusIcons: Record<PurchaseOrderStatus, LucideIcon> = {
  DRAFT: FilePen,
  PENDING_APPROVAL: Clock,
  APPROVED: CheckCircle2,
  SENT: Send,
  PARTIALLY_RECEIVED: PackageOpen,
  RECEIVED: PackageCheck,
  CLOSED: Lock,
  CANCELLED: Ban,
};

const VARIANTS: Record<PurchaseOrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_APPROVAL: 'secondary',
  APPROVED: 'default',
  SENT: 'default',
  PARTIALLY_RECEIVED: 'secondary',
  RECEIVED: 'default',
  CLOSED: 'secondary',
  CANCELLED: 'destructive',
};

const CLASSES: Partial<Record<PurchaseOrderStatus, string>> = {
  DRAFT: 'text-muted-foreground',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-green-600 text-white hover:bg-green-600/90',
  SENT: 'bg-blue-600 text-white hover:bg-blue-600/90',
  PARTIALLY_RECEIVED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  RECEIVED: 'bg-emerald-700 text-white hover:bg-emerald-700/90',
  CLOSED: 'text-muted-foreground',
};

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const Icon = purchaseOrderStatusIcons[status];
  return (
    <Badge variant={VARIANTS[status]} className={`gap-1 ${CLASSES[status] ?? ''}`}>
      <Icon className="h-3 w-3" />
      {PURCHASE_ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
