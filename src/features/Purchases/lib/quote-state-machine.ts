/**
 * Estados de un pedido de cotizacion (spec Compras etapa 2 §2.1).
 *
 *   DRAFT --send/markSent--> SENT --receive--> RECEIVED (--receive--> RECEIVED: corregir)
 *     |                        |---decline---> DECLINED
 *     \--cancel--> CANCELLED <-/cancel
 *
 * "Corregir una respondida solo si no tiene OC" depende de la base: lo valida el servidor.
 */

export const PURCHASE_QUOTE_STATUSES = ['DRAFT', 'SENT', 'RECEIVED', 'DECLINED', 'CANCELLED'] as const;

export type PurchaseQuoteStatus = (typeof PURCHASE_QUOTE_STATUSES)[number];

export type PurchaseQuoteAction = 'edit' | 'send' | 'markSent' | 'receive' | 'decline' | 'cancel' | 'order';

const ALLOWED: Record<PurchaseQuoteAction, readonly PurchaseQuoteStatus[]> = {
  edit: ['DRAFT'],
  send: ['DRAFT'],
  markSent: ['DRAFT'],
  receive: ['SENT', 'RECEIVED'],
  decline: ['SENT'],
  cancel: ['DRAFT', 'SENT'],
  order: ['RECEIVED'],
};

export function canApplyPurchaseQuoteAction(status: PurchaseQuoteStatus, action: PurchaseQuoteAction): boolean {
  return ALLOWED[action].includes(status);
}

export const PURCHASE_QUOTE_STATUS_LABELS: Record<PurchaseQuoteStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  RECEIVED: 'Respondida',
  DECLINED: 'No cotiza',
  CANCELLED: 'Anulada',
};

/** Para "La cotización PC-000003 ya fue enviada". */
export const PURCHASE_QUOTE_STATUS_PAST: Record<PurchaseQuoteStatus, string> = {
  DRAFT: 'guardada como borrador',
  SENT: 'enviada',
  RECEIVED: 'respondida',
  DECLINED: 'marcada como "no cotiza"',
  CANCELLED: 'anulada',
};
