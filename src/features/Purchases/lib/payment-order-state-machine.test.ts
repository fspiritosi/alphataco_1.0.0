import { describe, expect, it } from 'vitest';
import { PAYMENT_ORDER_STATUS_LABELS, canApplyPaymentOrderAction, nextPaymentOrderStatus } from './payment-order-state-machine';

describe('estados de la orden de pago', () => {
  it('circuito: borrador → pendiente → aprobada → pagada', () => {
    expect(nextPaymentOrderStatus('DRAFT', 'submit')).toBe('PENDING_APPROVAL');
    expect(nextPaymentOrderStatus('PENDING_APPROVAL', 'approve')).toBe('APPROVED');
    expect(nextPaymentOrderStatus('APPROVED', 'pay')).toBe('PAID');
  });

  it('rechazar y volver a borrador', () => {
    expect(nextPaymentOrderStatus('PENDING_APPROVAL', 'reject')).toBe('DRAFT');
    expect(nextPaymentOrderStatus('PENDING_APPROVAL', 'backToDraft')).toBe('DRAFT');
    expect(nextPaymentOrderStatus('APPROVED', 'backToDraft')).toBe('DRAFT');
  });

  it('solo se edita el borrador', () => {
    expect(canApplyPaymentOrderAction('DRAFT', 'edit')).toBe(true);
    expect(canApplyPaymentOrderAction('PENDING_APPROVAL', 'edit')).toBe(false);
    expect(canApplyPaymentOrderAction('APPROVED', 'edit')).toBe(false);
  });

  it('pagar solo aprobadas; enviar al proveedor solo pagadas', () => {
    expect(canApplyPaymentOrderAction('PENDING_APPROVAL', 'pay')).toBe(false);
    expect(canApplyPaymentOrderAction('PAID', 'send')).toBe(true);
    expect(canApplyPaymentOrderAction('APPROVED', 'send')).toBe(false);
  });

  it('se anula en cualquier estado salvo anulada', () => {
    for (const status of ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID'] as const) {
      expect(canApplyPaymentOrderAction(status, 'cancel')).toBe(true);
    }
    expect(canApplyPaymentOrderAction('CANCELLED', 'cancel')).toBe(false);
  });

  it('labels', () => {
    expect(PAYMENT_ORDER_STATUS_LABELS.PAID).toBe('Pagada');
  });
});
