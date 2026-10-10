import { describe, expect, it } from 'vitest';
import { trimDecimals } from './quantity-format';

describe('trimDecimals', () => {
  it('recorta solo los ceros decimales', () => {
    expect(trimDecimals('10.0000')).toBe('10');
    expect(trimDecimals('2.5000')).toBe('2.5');
    expect(trimDecimals('100')).toBe('100');
    expect(trimDecimals('0.0001')).toBe('0.0001');
  });
});
