import { describe, expect, it } from 'vitest';
import { computeOrderLine, computeOrderTotals } from './order-totals';

describe('totales de la orden de compra', () => {
  it('neto de linea redondeado mitad hacia arriba', () => {
    expect(computeOrderLine({ quantity: '3', unitPrice: '0.3333', vatRateId: 5 })).toEqual({ netTotal: '1.00', vatAmount: '0.21' });
  });

  it('IVA de la linea redondeado a 2 decimales', () => {
    expect(computeOrderLine({ quantity: '1', unitPrice: '10.05', vatRateId: 5 })).toEqual({ netTotal: '10.05', vatAmount: '2.11' });
  });

  it('alicuotas 0 y 10,5', () => {
    expect(computeOrderLine({ quantity: '2', unitPrice: '100', vatRateId: 3 })).toEqual({ netTotal: '200.00', vatAmount: '0.00' });
    expect(computeOrderLine({ quantity: '2', unitPrice: '100', vatRateId: 4 })).toEqual({ netTotal: '200.00', vatAmount: '21.00' });
  });

  it('acepta coma decimal', () => {
    expect(computeOrderLine({ quantity: '1.234,5', unitPrice: '2', vatRateId: 3 })?.netTotal).toBe('2469.00');
  });

  it('precio con mas de 4 decimales, alicuota desconocida o cantidad 0: invalido', () => {
    expect(computeOrderLine({ quantity: '1', unitPrice: '1.23456', vatRateId: 5 })).toBeNull();
    expect(computeOrderLine({ quantity: '1', unitPrice: '1', vatRateId: 99 })).toBeNull();
    expect(computeOrderLine({ quantity: '0', unitPrice: '1', vatRateId: 5 })).toBeNull();
  });

  it('suma de varias lineas', () => {
    expect(
      computeOrderTotals([
        { quantity: '3', unitPrice: '0.3333', vatRateId: 5 },
        { quantity: '2', unitPrice: '100', vatRateId: 4 },
      ])
    ).toEqual({ subtotal: '201.00', vatTotal: '21.21', total: '222.21' });
  });

  it('sin lineas: todo en cero', () => {
    expect(computeOrderTotals([])).toEqual({ subtotal: '0.00', vatTotal: '0.00', total: '0.00' });
  });
});

describe('comparacion de precios unitarios', () => {
  it('compara a 4 decimales (no redondea a 2)', async () => {
    const { comparePrices } = await import('./order-totals');
    expect(comparePrices('10.0049', '10.0051')).toBe(-1);
    expect(comparePrices('10.5', '10.5000')).toBe(0);
    expect(comparePrices('11', '10.9999')).toBe(1);
  });
});
