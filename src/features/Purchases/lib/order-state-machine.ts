/**
 * Estados de una orden de compra (spec Compras etapa 2 §2.2).
 *
 *   DRAFT --submit--> PENDING_APPROVAL --approve--> APPROVED --send/markSent--> SENT
 *     ^                     |
 *     \------reject---------/            (cancel desde cualquiera menos CANCELLED)
 */

export const PURCHASE_ORDER_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'CANCELLED'] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export type PurchaseOrderAction = 'edit' | 'submit' | 'approve' | 'reject' | 'send' | 'markSent' | 'cancel';

const ALLOWED: Record<PurchaseOrderAction, readonly PurchaseOrderStatus[]> = {
  edit: ['DRAFT'],
  submit: ['DRAFT'],
  approve: ['PENDING_APPROVAL'],
  reject: ['PENDING_APPROVAL'],
  send: ['APPROVED'],
  markSent: ['APPROVED'],
  cancel: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT'],
};

const RESULT: Record<Exclude<PurchaseOrderAction, 'edit'>, PurchaseOrderStatus> = {
  submit: 'PENDING_APPROVAL',
  approve: 'APPROVED',
  reject: 'DRAFT',
  send: 'SENT',
  markSent: 'SENT',
  cancel: 'CANCELLED',
};

export function canApplyPurchaseOrderAction(status: PurchaseOrderStatus, action: PurchaseOrderAction): boolean {
  return ALLOWED[action].includes(status);
}

export function purchaseOrderStatusAfter(action: Exclude<PurchaseOrderAction, 'edit'>): PurchaseOrderStatus {
  return RESULT[action];
}

/** Marca de agua del PDF: una OC no aprobada no es valida para el proveedor. */
export function purchaseOrderWatermark(order: { status: PurchaseOrderStatus; approvedAt: Date | string | null }): string | null {
  if (order.status === 'CANCELLED') return 'ANULADA';
  if (order.status === 'DRAFT' || order.status === 'PENDING_APPROVAL') return 'BORRADOR — NO VÁLIDA';
  return null;
}

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Borrador',
  PENDING_APPROVAL: 'Pendiente de aprobación',
  APPROVED: 'Aprobada',
  SENT: 'Enviada',
  CANCELLED: 'Anulada',
};

/** Para "La orden OC-000007 ya fue aprobada". */
export const PURCHASE_ORDER_STATUS_PAST: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'devuelta a borrador',
  PENDING_APPROVAL: 'enviada a aprobación',
  APPROVED: 'aprobada',
  SENT: 'enviada al proveedor',
  CANCELLED: 'anulada',
};
