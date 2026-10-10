import { QUANTITY_SCALE, parseScaled } from '@/features/Comercial/Facturacion/lib/invoice-math';

/**
 * Estados de una solicitud de compra (spec Compras etapa 1 §2.4). La usan las actions (que
 * validan cada transicion con la solicitud lockeada) y la UI (que botones mostrar).
 *
 *   DRAFT --submit--> PENDING_APPROVAL --approve--> APPROVED
 *     |                     \----------reject-----> REJECTED
 *     \--cancel--> CANCELLED <--cancel--/
 *
 * Etapa 2: una aprobada avanza sola segun lo pedido en OC no anuladas (APPROVED <->
 * PARTIALLY_ORDERED <-> ORDERED, ver `progressStatus`) y se puede cerrar a mano (CLOSED).
 */

export const PURCHASE_REQUEST_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'PARTIALLY_ORDERED',
  'ORDERED',
  'CLOSED',
  'REJECTED',
  'CANCELLED',
] as const;

export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

export type PurchaseRequestAction = 'edit' | 'submit' | 'approve' | 'reject' | 'cancel' | 'close';

/** Estados desde los que sus lineas se pueden cotizar y pedir en una OC. */
export const ORDERABLE_REQUEST_STATUSES = ['APPROVED', 'PARTIALLY_ORDERED'] as const satisfies readonly PurchaseRequestStatus[];

/** Estados que recalcula `progressStatus` (CLOSED y los previos a la aprobacion no se tocan). */
export const PROGRESS_REQUEST_STATUSES = ['APPROVED', 'PARTIALLY_ORDERED', 'ORDERED'] as const satisfies readonly PurchaseRequestStatus[];

export type ProgressRequestStatus = (typeof PROGRESS_REQUEST_STATUSES)[number];

const ALLOWED: Record<PurchaseRequestAction, readonly PurchaseRequestStatus[]> = {
  edit: ['DRAFT'],
  submit: ['DRAFT'],
  approve: ['PENDING_APPROVAL'],
  reject: ['PENDING_APPROVAL'],
  cancel: ['DRAFT', 'PENDING_APPROVAL'],
  close: ['APPROVED', 'PARTIALLY_ORDERED'],
};

const RESULT: Record<Exclude<PurchaseRequestAction, 'edit'>, PurchaseRequestStatus> = {
  submit: 'PENDING_APPROVAL',
  approve: 'APPROVED',
  reject: 'REJECTED',
  cancel: 'CANCELLED',
  close: 'CLOSED',
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

/**
 * Avance de una solicitud aprobada segun lo pedido en OC no anuladas, por linea. Cantidades como
 * texto decimal (como salen de la base), comparadas en enteros escalados.
 */
export function progressStatus(lines: readonly { requested: string; ordered: string }[]): ProgressRequestStatus {
  const scaled = lines.map((line) => ({
    requested: parseScaled(line.requested, QUANTITY_SCALE) ?? BigInt(0),
    ordered: parseScaled(line.ordered, QUANTITY_SCALE) ?? BigInt(0),
  }));
  if (scaled.every((line) => line.ordered <= BigInt(0))) return 'APPROVED';
  if (scaled.every((line) => line.ordered >= line.requested)) return 'ORDERED';
  return 'PARTIALLY_ORDERED';
}

export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'Borrador',
  PENDING_APPROVAL: 'Pendiente de aprobación',
  APPROVED: 'Aprobada',
  PARTIALLY_ORDERED: 'Pedida en parte',
  ORDERED: 'Pedida',
  CLOSED: 'Cerrada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Anulada',
};

/** Participio para los mensajes "La solicitud SC-000012 ya fue aprobada". */
export const PURCHASE_REQUEST_STATUS_PAST: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'guardada como borrador',
  PENDING_APPROVAL: 'enviada a aprobación',
  APPROVED: 'aprobada',
  PARTIALLY_ORDERED: 'pedida en parte',
  ORDERED: 'pedida',
  CLOSED: 'cerrada',
  REJECTED: 'rechazada',
  CANCELLED: 'anulada',
};
