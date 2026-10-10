import type { payment_order_status } from '@/generated/prisma/enums';

/**
 * Estados de una orden de pago (spec Compras etapa 5 §3.3).
 *
 *   DRAFT --submit--> PENDING_APPROVAL --approve--> APPROVED --pay--> PAID
 *     ^                     |                           |
 *     \---reject/backToDraft/------------backToDraft----/
 *
 * Se anula en cualquier estado (pagada incluida: sus certificados quedan anulados).
 */

export type PaymentOrderStatus = payment_order_status;

export type PaymentOrderAction = 'edit' | 'submit' | 'approve' | 'reject' | 'backToDraft' | 'pay' | 'send' | 'cancel';

const TRANSITIONS: Record<PaymentOrderAction, { from: PaymentOrderStatus[]; to: PaymentOrderStatus | null }> = {
  edit: { from: ['DRAFT'], to: null },
  submit: { from: ['DRAFT'], to: 'PENDING_APPROVAL' },
  approve: { from: ['PENDING_APPROVAL'], to: 'APPROVED' },
  reject: { from: ['PENDING_APPROVAL'], to: 'DRAFT' },
  backToDraft: { from: ['PENDING_APPROVAL', 'APPROVED'], to: 'DRAFT' },
  pay: { from: ['APPROVED'], to: 'PAID' },
  send: { from: ['PAID'], to: null },
  cancel: { from: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID'], to: 'CANCELLED' },
};

export function canApplyPaymentOrderAction(status: PaymentOrderStatus, action: PaymentOrderAction): boolean {
  return TRANSITIONS[action].from.includes(status);
}

/** Estado que deja la accion (el mismo si la accion no cambia el estado). */
export function nextPaymentOrderStatus(status: PaymentOrderStatus, action: PaymentOrderAction): PaymentOrderStatus {
  return TRANSITIONS[action].to ?? status;
}

export const PAYMENT_ORDER_STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  DRAFT: 'Borrador',
  PENDING_APPROVAL: 'Pendiente de aprobación',
  APPROVED: 'Aprobada',
  PAID: 'Pagada',
  CANCELLED: 'Anulada',
};

/** Para "La orden OP-000007 ya fue pagada". */
export const PAYMENT_ORDER_STATUS_PAST: Record<PaymentOrderStatus, string> = {
  DRAFT: 'devuelta a borrador',
  PENDING_APPROVAL: 'enviada a aprobación',
  APPROVED: 'aprobada',
  PAID: 'pagada',
  CANCELLED: 'anulada',
};
