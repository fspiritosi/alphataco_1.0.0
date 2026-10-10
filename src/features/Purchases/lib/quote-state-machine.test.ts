import { describe, expect, it } from 'vitest';
import {
  PURCHASE_QUOTE_STATUSES,
  canApplyPurchaseQuoteAction,
  type PurchaseQuoteAction,
  type PurchaseQuoteStatus,
} from './quote-state-machine';

const allowed: Record<PurchaseQuoteAction, PurchaseQuoteStatus[]> = {
  edit: ['DRAFT'],
  send: ['DRAFT'],
  markSent: ['DRAFT'],
  receive: ['SENT', 'RECEIVED'],
  decline: ['SENT'],
  cancel: ['DRAFT', 'SENT'],
  order: ['RECEIVED'],
};

describe('maquina de estados del pedido de cotizacion', () => {
  for (const [action, statuses] of Object.entries(allowed) as [PurchaseQuoteAction, PurchaseQuoteStatus[]][]) {
    for (const status of PURCHASE_QUOTE_STATUSES) {
      it(`${action} desde ${status}: ${statuses.includes(status) ? 'permitido' : 'rechazado'}`, () => {
        expect(canApplyPurchaseQuoteAction(status, action)).toBe(statuses.includes(status));
      });
    }
  }
});
