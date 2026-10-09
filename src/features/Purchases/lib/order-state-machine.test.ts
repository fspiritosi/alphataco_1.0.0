import { describe, expect, it } from 'vitest';
import {
  PURCHASE_ORDER_STATUSES,
  canApplyPurchaseOrderAction,
  purchaseOrderStatusAfter,
  purchaseOrderWatermark,
  type PurchaseOrderAction,
  type PurchaseOrderStatus,
} from './order-state-machine';

const allowed: Record<PurchaseOrderAction, PurchaseOrderStatus[]> = {
  edit: ['DRAFT'],
  submit: ['DRAFT'],
  approve: ['PENDING_APPROVAL'],
  reject: ['PENDING_APPROVAL'],
  send: ['APPROVED'],
  markSent: ['APPROVED'],
  cancel: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT'],
};

describe('maquina de estados de la orden de compra', () => {
  for (const [action, statuses] of Object.entries(allowed) as [PurchaseOrderAction, PurchaseOrderStatus[]][]) {
    for (const status of PURCHASE_ORDER_STATUSES) {
      it(`${action} desde ${status}: ${statuses.includes(status) ? 'permitido' : 'rechazado'}`, () => {
        expect(canApplyPurchaseOrderAction(status, action)).toBe(statuses.includes(status));
      });
    }
  }

  it('cada accion deja el estado esperado (rechazar vuelve a borrador)', () => {
    expect(purchaseOrderStatusAfter('submit')).toBe('PENDING_APPROVAL');
    expect(purchaseOrderStatusAfter('approve')).toBe('APPROVED');
    expect(purchaseOrderStatusAfter('reject')).toBe('DRAFT');
    expect(purchaseOrderStatusAfter('send')).toBe('SENT');
    expect(purchaseOrderStatusAfter('markSent')).toBe('SENT');
    expect(purchaseOrderStatusAfter('cancel')).toBe('CANCELLED');
  });

  it('marca de agua del PDF segun el estado', () => {
    expect(purchaseOrderWatermark({ status: 'DRAFT', approvedAt: null })).toBe('BORRADOR — NO VÁLIDA');
    expect(purchaseOrderWatermark({ status: 'PENDING_APPROVAL', approvedAt: null })).toBe('BORRADOR — NO VÁLIDA');
    expect(purchaseOrderWatermark({ status: 'APPROVED', approvedAt: new Date() })).toBeNull();
    expect(purchaseOrderWatermark({ status: 'SENT', approvedAt: new Date() })).toBeNull();
    expect(purchaseOrderWatermark({ status: 'CANCELLED', approvedAt: new Date() })).toBe('ANULADA');
  });
});
