import { describe, expect, it } from 'vitest';
import { splitReceived } from './receipt-math';

describe('lo recibido dentro de la OC y el excedente', () => {
  it('sin excedente', () => {
    expect(splitReceived({ remaining: '10', received: '4' })).toEqual({ withinOrder: '4.0000', excess: '0.0000' });
  });
  it('exacto', () => {
    expect(splitReceived({ remaining: '10', received: '10' })).toEqual({ withinOrder: '10.0000', excess: '0.0000' });
  });
  it('con excedente', () => {
    expect(splitReceived({ remaining: '10', received: '12,5' })).toEqual({ withinOrder: '10.0000', excess: '2.5000' });
  });
  it('sin nada pendiente, todo es excedente', () => {
    expect(splitReceived({ remaining: '0', received: '3' })).toEqual({ withinOrder: '0.0000', excess: '3.0000' });
  });
});
