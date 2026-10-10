import { describe, expect, it } from 'vitest';
import { computePaymentTotals, invoiceShares, withholdingBases } from './payment-totals';

const invoice = { total: '1210.00', netTaxed: '1000.00', netUntaxed: '0.00', exempt: '0.00', vatTotal: '210.00' };

describe('parte neta y de IVA de lo que se paga de un comprobante', () => {
  it('pago total', () => {
    expect(invoiceShares('1210', invoice)).toEqual({ net: '1000.00', vat: '210.00' });
  });
  it('pago parcial proporcional', () => {
    expect(invoiceShares('605', invoice)).toEqual({ net: '500.00', vat: '105.00' });
  });
  it('con percepciones: no son base', () => {
    const withPerceptions = { ...invoice, total: '1240.00' };
    expect(invoiceShares('1240', withPerceptions)).toEqual({ net: '1000.00', vat: '210.00' });
  });
});

describe('bases de retencion de la orden', () => {
  it('facturas menos NC, mas anticipo nuevo; lo cubierto por anticipos aplicados no vuelve a retener', () => {
    const bases = withholdingBases({
      invoices: [{ net: '1000.00', vat: '210.00', amount: '1210.00' }],
      credits: [{ net: '100.00', vat: '21.00' }],
      advancesApplied: ['121.00'],
      advance: '500.00',
    });
    // 1000 − 100 − 121 × (1000/1210) + 500 = 1300
    expect(bases).toEqual({ net: '1300.00', vat: '189.00' });
  });
  it('nunca negativas', () => {
    expect(withholdingBases({ invoices: [], credits: [{ net: '100.00', vat: '21.00' }], advancesApplied: [], advance: '0' })).toEqual({
      net: '0.00',
      vat: '0.00',
    });
  });
});

describe('totales de la orden', () => {
  it('neto = facturas + anticipo − NC − anticipos aplicados − retenciones', () => {
    expect(
      computePaymentTotals({
        invoices: ['1210.00', '500.00'],
        credits: ['100.00'],
        advancesApplied: ['200.00'],
        advance: '300',
        withholdings: ['20.00', '5.50'],
      })
    ).toEqual({
      invoicesTotal: '1710.00',
      creditsTotal: '300.00',
      advanceTotal: '300.00',
      withholdingsTotal: '25.50',
      netTotal: '1684.50',
    });
  });
  it('el neto puede dar negativo (lo rechaza el servidor)', () => {
    expect(computePaymentTotals({ invoices: [], credits: ['10'], advancesApplied: [], advance: '0', withholdings: [] }).netTotal).toBe('-10.00');
  });
});
