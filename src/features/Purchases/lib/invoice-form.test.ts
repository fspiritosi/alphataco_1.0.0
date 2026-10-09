import { describe, expect, it } from 'vitest';
import { convertOrderLineForLetter, pendingToInvoice, pickableOrderLines } from './invoice-form';

const line = (over: Partial<{ orderLineId: string; received: string; invoiced: string; unitPrice: string; vatRateId: number }> = {}) => ({
  orderLineId: 'l1',
  label: 'Aceite',
  unitAbbr: 'l',
  unitPrice: '1000.0000',
  vatRateId: 5,
  received: '10.0000',
  invoiced: '0.0000',
  ...over,
});

describe('por facturar sin coma flotante (I-2)', () => {
  it('10,3 recibido − 2,1 facturado = 8,2', () => {
    expect(pendingToInvoice({ received: '10.3000', invoiced: '2.1000' })).toBe('8.2');
  });
  it('0,3 − 0,1 = 0,2', () => {
    expect(pendingToInvoice({ received: '0.3', invoiced: '0.1' })).toBe('0.2');
  });
  it('nunca negativo', () => {
    expect(pendingToInvoice({ received: '1', invoiced: '3' })).toBe('0');
  });
});

describe('lineas que ofrece "Agregar desde OC" (I-1)', () => {
  const orders = [
    { id: 'o1', number: 'OC-000001', lines: [line(), line({ orderLineId: 'l2', invoiced: '10.0000' })] },
    { id: 'o2', number: 'OC-000002', lines: [line({ orderLineId: 'l3', received: '0' })] },
  ];

  it('factura o ND: lo recibido y no facturado, con la cantidad pendiente', () => {
    const result = pickableOrderLines(orders, 'invoice', new Set());
    expect(result.map((o) => o.number)).toEqual(['OC-000001']);
    expect(result[0]!.lines.map((l) => [l.orderLineId, l.quantity])).toEqual([['l1', '10']]);
  });

  it('NC: lo facturado, con la cantidad facturada', () => {
    const result = pickableOrderLines(orders, 'credit_note', new Set());
    expect(result[0]!.lines.map((l) => [l.orderLineId, l.quantity])).toEqual([['l2', '10']]);
  });

  it('no repite las ya agregadas', () => {
    expect(pickableOrderLines(orders, 'invoice', new Set(['l1']))).toEqual([]);
  });
});

describe('cambiar el tipo con lineas de OC cargadas (I-5)', () => {
  const orderLine = { unitPrice: '1000.0000', vatRateId: 4 };

  it('A → C: el precio de la OC pasa a precio final y sin alicuota', () => {
    expect(convertOrderLineForLetter({ unitPrice: '1000', vatRateId: '4' }, orderLine, 'A', 'C')).toEqual({
      unitPrice: '1105',
      vatRateId: '',
    });
  });

  it('C → A: el precio final de la OC vuelve a neto y la alicuota de la OC', () => {
    expect(convertOrderLineForLetter({ unitPrice: '1105', vatRateId: '' }, orderLine, 'C', 'A')).toEqual({
      unitPrice: '1000',
      vatRateId: '4',
    });
  });

  it('A → B: precio y alicuota quedan como estaban', () => {
    expect(convertOrderLineForLetter({ unitPrice: '990', vatRateId: '4' }, orderLine, 'A', 'B')).toEqual({ unitPrice: '990', vatRateId: '4' });
  });

  it('un precio que el usuario cambio no se toca; solo la alicuota', () => {
    expect(convertOrderLineForLetter({ unitPrice: '1200', vatRateId: '4' }, orderLine, 'A', 'C')).toEqual({ unitPrice: '1200', vatRateId: '' });
    expect(convertOrderLineForLetter({ unitPrice: '1200', vatRateId: '' }, orderLine, 'C', 'B')).toEqual({ unitPrice: '1200', vatRateId: '4' });
  });
});
