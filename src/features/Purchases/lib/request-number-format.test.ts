import { describe, expect, it } from 'vitest';
import { formatPurchaseRequestNumber } from './request-number-format';

describe('formatPurchaseRequestNumber', () => {
  it('rellena con ceros a 6 digitos', () => {
    expect(formatPurchaseRequestNumber(1)).toBe('SC-000001');
    expect(formatPurchaseRequestNumber(123456)).toBe('SC-123456');
  });

  it('no trunca pasado el millon', () => {
    expect(formatPurchaseRequestNumber(1234567)).toBe('SC-1234567');
  });
});
