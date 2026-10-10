import { describe, expect, it } from 'vitest';
import {
  PURCHASE_REQUEST_STATUSES,
  canApplyPurchaseRequestAction,
  canCopyPurchaseRequest,
  progressStatus,
  purchaseRequestStatusAfter,
  type PurchaseRequestAction,
  type PurchaseRequestStatus,
} from './request-state-machine';

const allowed: Record<PurchaseRequestAction, PurchaseRequestStatus[]> = {
  edit: ['DRAFT'],
  submit: ['DRAFT'],
  approve: ['PENDING_APPROVAL'],
  reject: ['PENDING_APPROVAL'],
  cancel: ['DRAFT', 'PENDING_APPROVAL'],
  close: ['APPROVED', 'PARTIALLY_ORDERED'],
};

describe('maquina de estados de la solicitud de compra', () => {
  for (const [action, statuses] of Object.entries(allowed) as [PurchaseRequestAction, PurchaseRequestStatus[]][]) {
    for (const status of PURCHASE_REQUEST_STATUSES) {
      it(`${action} desde ${status}: ${statuses.includes(status) ? 'permitido' : 'rechazado'}`, () => {
        expect(canApplyPurchaseRequestAction(status, action)).toBe(statuses.includes(status));
      });
    }
  }

  it('cada accion deja el estado esperado', () => {
    expect(purchaseRequestStatusAfter('submit')).toBe('PENDING_APPROVAL');
    expect(purchaseRequestStatusAfter('approve')).toBe('APPROVED');
    expect(purchaseRequestStatusAfter('reject')).toBe('REJECTED');
    expect(purchaseRequestStatusAfter('cancel')).toBe('CANCELLED');
    expect(purchaseRequestStatusAfter('close')).toBe('CLOSED');
  });

  it('solo rechazadas y anuladas se copian', () => {
    expect(PURCHASE_REQUEST_STATUSES.filter(canCopyPurchaseRequest)).toEqual(['REJECTED', 'CANCELLED']);
  });

  describe('avance segun lo pedido en OC', () => {
    it('nada pedido: sigue aprobada', () => {
      expect(progressStatus([{ requested: '10', ordered: '0' }, { requested: '2.5', ordered: '0' }])).toBe('APPROVED');
    });

    it('todo pedido (o de mas): ordenada', () => {
      expect(progressStatus([{ requested: '10', ordered: '10.0000' }, { requested: '2.5', ordered: '3' }])).toBe('ORDERED');
    });

    it('algo pedido: en parte', () => {
      expect(progressStatus([{ requested: '10', ordered: '9.9999' }, { requested: '2.5', ordered: '0' }])).toBe(
        'PARTIALLY_ORDERED'
      );
      expect(progressStatus([{ requested: '10', ordered: '10' }, { requested: '2.5', ordered: '0' }])).toBe('PARTIALLY_ORDERED');
    });
  });
});
