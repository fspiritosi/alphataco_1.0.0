import { describe, expect, it } from 'vitest';
import { computeInvoiceLine, computeSupplierInvoiceTotals, vatBreakdown, vatDifferences } from './invoice-totals';

describe('importes de una linea del comprobante', () => {
  it('linea de OC: cantidad × precio e IVA de la alicuota', () => {
    expect(computeInvoiceLine({ letter: 'A', quantity: '10', unitPrice: '1250', vatRateId: 5 })).toEqual({
      netTotal: '12500.00',
      vatAmount: '2625.00',
    });
  });
  it('linea de gasto: el neto informado', () => {
    expect(computeInvoiceLine({ letter: 'A', net: '1000,50', vatRateId: 4 })).toEqual({
      netTotal: '1000.50',
      vatAmount: '105.05',
    });
  });
  it('en un comprobante C no hay IVA', () => {
    expect(computeInvoiceLine({ letter: 'C', net: '5000', vatRateId: null })).toEqual({
      netTotal: '5000.00',
      vatAmount: '0.00',
    });
  });
  it('A sin alicuota, cantidad 0 o neto invalido → null', () => {
    expect(computeInvoiceLine({ letter: 'A', net: '100', vatRateId: null })).toBeNull();
    expect(computeInvoiceLine({ letter: 'A', quantity: '0', unitPrice: '10', vatRateId: 5 })).toBeNull();
    expect(computeInvoiceLine({ letter: 'B', net: 'abc', vatRateId: 5 })).toBeNull();
    expect(computeInvoiceLine({ letter: 'B', net: '-5', vatRateId: 5 })).toBeNull();
  });
});

describe('IVA por alicuota', () => {
  it('suma las bases por alicuota y calcula el IVA, ordenado por id', () => {
    const lines = [
      { netTotal: '100.00', vatRateId: 5 },
      { netTotal: '200.00', vatRateId: 4 },
      { netTotal: '50.00', vatRateId: 5 },
    ];
    expect(vatBreakdown(lines, 'A')).toEqual([
      { vatRateId: 4, base: '200.00', amount: '21.00' },
      { vatRateId: 5, base: '150.00', amount: '31.50' },
    ]);
  });
  it('en C no hay alicuotas', () => {
    expect(vatBreakdown([{ netTotal: '100.00', vatRateId: null }], 'C')).toEqual([]);
  });
  it('la diferencia de hasta $1 contra lo calculado no observa; de mas, si', () => {
    expect(vatDifferences([{ vatRateId: 5, base: '100.00', amount: '21.99' }])).toEqual([]);
    expect(vatDifferences([{ vatRateId: 5, base: '100.00', amount: '20.00' }])).toEqual([]);
    expect(vatDifferences([{ vatRateId: 5, base: '100.00', amount: '22.01' }])).toEqual([
      { vatRateId: 5, informed: '22.01', computed: '21.00' },
    ]);
  });
});

describe('totales del comprobante', () => {
  it('suma netos, IVA informado, no gravado, exento y tributos', () => {
    const totals = computeSupplierInvoiceTotals({
      lines: [{ netTotal: '1000.00' }, { netTotal: '500.00' }],
      vat: [{ amount: '210.00' }, { amount: '52.50' }],
      untaxed: '30',
      exempt: '20,5',
      taxes: [
        { kind: 'VAT_PERCEPTION', amount: '45' },
        { kind: 'GROSS_INCOME_PERCEPTION', amount: '25.30' },
        { kind: 'GROSS_INCOME_PERCEPTION', amount: '10' },
        { kind: 'INTERNAL_TAX', amount: '7' },
        { kind: 'OTHER_TAX', amount: '3' },
      ],
    });
    expect(totals).toEqual({
      netTaxed: '1500.00',
      netUntaxed: '30.00',
      exempt: '20.50',
      vatTotal: '262.50',
      vatPerceptions: '45.00',
      grossIncomePerceptions: '35.30',
      otherTaxes: '10.00',
      total: '1903.30',
    });
  });
  it('un comprobante C: el neto es el total', () => {
    const totals = computeSupplierInvoiceTotals({ lines: [{ netTotal: '800.00' }], vat: [], untaxed: '', exempt: '', taxes: [] });
    expect(totals.total).toBe('800.00');
    expect(totals.vatTotal).toBe('0.00');
  });
});
