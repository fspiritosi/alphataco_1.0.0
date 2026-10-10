import { Badge } from '@/components/ui/badge';
import type { payment_order_status } from '@/generated/prisma/enums';
import { Ban, Banknote, CheckCircle2, Clock, FilePen, type LucideIcon } from 'lucide-react';
import { PAYMENT_ORDER_STATUS_LABELS } from '../../lib/payment-order-state-machine';

/** Icono por estado: lo comparten la celda, el filtro de la tabla y el detalle. */
export const paymentOrderStatusIcons: Record<payment_order_status, LucideIcon> = {
  DRAFT: FilePen,
  PENDING_APPROVAL: Clock,
  APPROVED: CheckCircle2,
  PAID: Banknote,
  CANCELLED: Ban,
};

const VARIANTS: Record<payment_order_status, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_APPROVAL: 'secondary',
  APPROVED: 'default',
  PAID: 'default',
  CANCELLED: 'outline',
};

const CLASSES: Record<payment_order_status, string> = {
  DRAFT: '',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-green-600 text-white hover:bg-green-600/90',
  PAID: 'bg-blue-600 text-white hover:bg-blue-600/90',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function PaymentOrderStatusBadge({ status }: { status: payment_order_status }) {
  const Icon = paymentOrderStatusIcons[status];
  return (
    <Badge variant={VARIANTS[status]} className={`gap-1 ${CLASSES[status]}`}>
      <Icon className="h-3 w-3" />
      {PAYMENT_ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
