import { describe, expect, it } from 'vitest';
import { amountComma, neuquenRecord, sicoreRecord, sireRecord, type WithholdingTxtRow } from './withholding-txt';

const row = (over: Partial<WithholdingTxtRow> = {}): WithholdingTxtRow => ({
  tax: 'GANANCIAS',
  regimeCode: '078',
  paidOn: '2026-10-15',
  paymentOrderNumber: 'OP-000012',
  paymentTotal: '850000.00',
  base: '500000.00',
  rate: '2',
  amount: '5520.00',
  supplierCuit: '30712345678',
  supplierStatus: 'SUBJECT',
  certificateNumber: 'GAN-000034',
  exclusionPercentage: null,
  ...over,
});

describe('importes con coma decimal', () => {
  it('relleno con ceros a la izquierda', () => {
    expect(amountComma('1234.5', 14)).toBe('00000001234,50');
  });
});

describe('SICORE (Ganancias)', () => {
  it('144 posiciones y campos en su lugar', () => {
    const r = sicoreRecord(row());
    expect(r).toHaveLength(144);
    expect(r.slice(0, 2)).toBe('06');
    expect(r.slice(2, 12)).toBe('15/10/2026');
    expect(r.slice(12, 28)).toBe('0000000000000012');
    expect(r.slice(28, 44)).toBe('0000000850000,00');
    expect(r.slice(44, 47)).toBe('217');
    expect(r.slice(47, 50)).toBe('078');
    expect(r.slice(50, 51)).toBe('1');
    expect(r.slice(51, 65)).toBe('00000500000,00');
    expect(r.slice(65, 75)).toBe('15/10/2026');
    expect(r.slice(75, 77)).toBe('01');
    expect(r.slice(77, 78)).toBe('0');
    expect(r.slice(78, 92)).toBe('00000005520,00');
    expect(r.slice(92, 98)).toBe('000,00');
    expect(r.slice(98, 108)).toBe(' '.repeat(10));
    expect(r.slice(108, 110)).toBe('80');
    expect(r.slice(110, 130)).toBe('30712345678'.padEnd(20));
    expect(r.slice(130, 144)).toBe('00000000000034');
  });

  it('no inscripto: condicion 02; exclusion: porcentaje', () => {
    const r = sicoreRecord(row({ supplierStatus: 'NOT_REGISTERED', exclusionPercentage: '50' }));
    expect(r.slice(75, 77)).toBe('02');
    expect(r.slice(92, 98)).toBe('050,00');
  });
});

describe('SIRE (IVA y SUSS)', () => {
  it('largo fijo, codigo de impuesto por tipo', () => {
    const iva = sireRecord(row({ tax: 'IVA', regimeCode: '499', certificateNumber: 'IVA-000003' }));
    const suss = sireRecord(row({ tax: 'SUSS', regimeCode: '755', certificateNumber: 'SUSS-000001' }));
    expect(iva).toHaveLength(suss.length);
    expect(iva.slice(0, 3)).toBe('767');
    expect(suss.slice(0, 3)).toBe('353');
  });
});

describe('Rentas Neuquen (IIBB)', () => {
  it('largo fijo y CUIT al principio', () => {
    const r = neuquenRecord(row({ tax: 'IIBB', regimeCode: '001', rate: '1.75', certificateNumber: 'IIBB-000009' }));
    expect(r.slice(0, 11)).toBe('30712345678');
    expect(r).toHaveLength(neuquenRecord(row({ tax: 'IIBB', certificateNumber: 'IIBB-123456' })).length);
  });
});
