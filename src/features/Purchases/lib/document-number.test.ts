import { describe, expect, it } from 'vitest';
import { formatPurchaseDocumentNumber } from './document-number-format';

describe('numeracion de compras', () => {
  it('formatea los tres prefijos con 6 digitos', () => {
    expect(formatPurchaseDocumentNumber('request', 12)).toBe('SC-000012');
    expect(formatPurchaseDocumentNumber('quote', 3)).toBe('PC-000003');
    expect(formatPurchaseDocumentNumber('order', 1234567)).toBe('OC-1234567');
    expect(formatPurchaseDocumentNumber('receipt', 3)).toBe('RC-000003');
  });
});
