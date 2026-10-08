/**
 * Estados de una solicitud de compra (spec Compras etapa 1 §2.4). La usan las actions (que
 * validan cada transicion con la solicitud lockeada) y la UI (que botones mostrar).
 *
 *   DRAFT --submit--> PENDING_APPROVAL --approve--> APPROVED
 *     |                     \----------reject-----> REJECTED
 *     \--cancel--> CANCELLED <--cancel--/
 */

export const PURCHASE_REQUEST_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

export type PurchaseRequestAction = 'edit' | 'submit' | 'approve' | 'reject' | 'cancel';

const ALLOWED: Record<PurchaseRequestAction, readonly PurchaseRequestStatus[]> = {
  edit: ['DRAFT'],
  submit: ['DRAFT'],
  approve: ['PENDING_APPROVAL'],
  reject: ['PENDING_APPROVAL'],
  cancel: ['DRAFT', 'PENDING_APPROVAL'],
};

const RESULT: Record<Exclude<PurchaseRequestAction, 'edit'>, PurchaseRequestStatus> = {
  submit: 'PENDING_APPROVAL',
  approve: 'APPROVED',
  reject: 'REJECTED',
  cancel: 'CANCELLED',
};

export function canApplyPurchaseRequestAction(status: PurchaseRequestStatus, action: PurchaseRequestAction): boolean {
  return ALLOWED[action].includes(status);
}

/** Estado en que queda la solicitud despues de la accion. */
export function purchaseRequestStatusAfter(action: Exclude<PurchaseRequestAction, 'edit'>): PurchaseRequestStatus {
  return RESULT[action];
}

/** Rechazadas y anuladas se pueden copiar como un borrador nuevo. */
export function canCopyPurchaseRequest(status: PurchaseRequestStatus): boolean {
  return status === 'REJECTED' || status === 'CANCELLED';
}

export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'Borrador',
  PENDING_APPROVAL: 'Pendiente de aprobación',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Anulada',
};

/** Participio para los mensajes "La solicitud SC-000012 ya fue aprobada". */
export const PURCHASE_REQUEST_STATUS_PAST: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'guardada como borrador',
  PENDING_APPROVAL: 'enviada a aprobación',
  APPROVED: 'aprobada',
  REJECTED: 'rechazada',
  CANCELLED: 'anulada',
};
