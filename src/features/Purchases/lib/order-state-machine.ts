/**
 * Estados de una orden de compra (spec Compras etapa 2 §2.2).
 *
 *   DRAFT --submit--> PENDING_APPROVAL --approve--> APPROVED --send/markSent--> SENT
 *     ^                     |
 *     \------reject---------/
 *
 * Etapa 3: SENT <-> PARTIALLY_RECEIVED <-> RECEIVED se recalcula con lo recibido (`receiptStatus`);
 * `close` cierra con faltante desde SENT o PARTIALLY_RECEIVED. Anular solo antes de recibir (que
 * SENT no tenga recepciones vigentes lo valida el servidor).
 */

import { QUANTITY_SCALE, parseScaled } from '@/features/Comercial/Facturacion/lib/invoice-math';

export const PURCHASE_ORDER_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SENT',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CLOSED',
  'CANCELLED',
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export type PurchaseOrderAction = 'edit' | 'submit' | 'approve' | 'reject' | 'send' | 'markSent' | 'cancel' | 'receive' | 'close';

/** Estados que recalcula `receiptStatus` (una OC enviada que empezo a recibirse). */
export const RECEIVING_ORDER_STATUSES = ['SENT', 'PARTIALLY_RECEIVED', 'RECEIVED'] as const satisfies readonly PurchaseOrderStatus[];

export type ReceivingOrderStatus = (typeof RECEIVING_ORDER_STATUSES)[number];

const ALLOWED: Record<PurchaseOrderAction, readonly PurchaseOrderStatus[]> = {
  edit: ['DRAFT'],
  submit: ['DRAFT'],
  approve: ['PENDING_APPROVAL'],
  reject: ['PENDING_APPROVAL'],
  send: ['APPROVED'],
  markSent: ['APPROVED'],
  cancel: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT'],
  receive: ['SENT', 'PARTIALLY_RECEIVED'],
  close: ['SENT', 'PARTIALLY_RECEIVED'],
};

const RESULT: Record<Exclude<PurchaseOrderAction, 'edit'>, PurchaseOrderStatus> = {
  submit: 'PENDING_APPROVAL',
  approve: 'APPROVED',
  reject: 'DRAFT',
  send: 'SENT',
  markSent: 'SENT',
  cancel: 'CANCELLED',
  receive: 'PARTIALLY_RECEIVED',
  close: 'CLOSED',
};

export function canApplyPurchaseOrderAction(status: PurchaseOrderStatus, action: PurchaseOrderAction): boolean {
  return ALLOWED[action].includes(status);
}

export function purchaseOrderStatusAfter(action: Exclude<PurchaseOrderAction, 'edit'>): PurchaseOrderStatus {
  return RESULT[action];
}

/** Estado de recepcion de una OC enviada segun lo recibido por linea (cantidades como texto). */
export function receiptStatus(lines: readonly { ordered: string; received: string }[]): ReceivingOrderStatus {
  const scaled = lines.map((line) => ({
    ordered: parseScaled(line.ordered, QUANTITY_SCALE) ?? BigInt(0),
    received: parseScaled(line.received, QUANTITY_SCALE) ?? BigInt(0),
  }));
  if (scaled.every((line) => line.received <= BigInt(0))) return 'SENT';
  if (scaled.every((line) => line.received >= line.ordered)) return 'RECEIVED';
  return 'PARTIALLY_RECEIVED';
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
  PARTIALLY_RECEIVED: 'Recibida en parte',
  RECEIVED: 'Recibida',
  CLOSED: 'Cerrada',
  CANCELLED: 'Anulada',
};

/** Para "La orden OC-000007 ya fue aprobada". */
export const PURCHASE_ORDER_STATUS_PAST: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'devuelta a borrador',
  PENDING_APPROVAL: 'enviada a aprobación',
  APPROVED: 'aprobada',
  SENT: 'enviada al proveedor',
  PARTIALLY_RECEIVED: 'recibida en parte',
  RECEIVED: 'recibida',
  CLOSED: 'cerrada',
  CANCELLED: 'anulada',
};
