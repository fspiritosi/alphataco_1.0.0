import { Badge } from '@/components/ui/badge';
import { Ban, BadgeCheck, CircleCheck, CircleX, TriangleAlert, type LucideIcon } from 'lucide-react';
import { SUPPLIER_INVOICE_STATUS_LABELS, type SupplierInvoiceStatus } from '../../lib/invoice-status';

/** Icono por estado: lo comparten la celda, el filtro de la tabla y el detalle. */
export const supplierInvoiceStatusIcons: Record<SupplierInvoiceStatus, LucideIcon> = {
  CONFORMING: CircleCheck,
  OBSERVED: TriangleAlert,
  APPROVED: BadgeCheck,
  REJECTED: CircleX,
  CANCELLED: Ban,
};

const VARIANTS: Record<SupplierInvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  CONFORMING: 'default',
  OBSERVED: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
};

const CLASSES: Record<SupplierInvoiceStatus, string> = {
  CONFORMING: 'bg-green-600 text-white hover:bg-green-600/90',
  OBSERVED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-blue-600 text-white hover:bg-blue-600/90',
  REJECTED: '',
  CANCELLED: 'text-muted-foreground',
};

export function SupplierInvoiceStatusBadge({ status }: { status: SupplierInvoiceStatus }) {
  const Icon = supplierInvoiceStatusIcons[status];
  return (
    <Badge variant={VARIANTS[status]} className={`gap-1 ${CLASSES[status]}`}>
      <Icon className="h-3 w-3" />
      {SUPPLIER_INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}
