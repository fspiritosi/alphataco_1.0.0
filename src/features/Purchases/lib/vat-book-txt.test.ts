import { describe, expect, it } from 'vitest';
import { amount15, cbteRecord, vatBookTxtFiles, vatRecords, type VatBookTxtRow } from './vat-book-txt';

const row = (over: Partial<VatBookTxtRow> = {}): VatBookTxtRow => ({
  issueDate: '2026-10-03',
  cbteType: 1,
  salesPoint: 3,
  number: '12345',
  supplierCuit: '30712345678',
  supplierName: 'Repuestos del Sur',
  total: '1234.50',
  netTaxed: '1000.00',
  netUntaxed: '0.00',
  exempt: '0.00',
  vatTotal: '210.00',
  vatPerceptions: '24.50',
  grossIncomePerceptions: '0.00',
  internalTaxes: '0.00',
  otherTaxes: '0.00',
  vat: [{ vatRateId: 5, base: '1000.00', amount: '210.00' }],
  ...over,
});

describe('importes del Libro IVA Digital', () => {
  it('15 posiciones, sin punto, 2 decimales implicitos', () => {
    expect(amount15('1234.5')).toBe('000000000123450');
    expect(amount15('0')).toBe('000000000000000');
    expect(amount15('-50.25')).toBe('000000000005025');
  });
});

describe('registro de comprobantes (325)', () => {
  it('largo exacto y campos en su lugar', () => {
    const record = cbteRecord(row());
    expect(record).toHaveLength(325);
    expect(record.slice(0, 8)).toBe('20261003');
    expect(record.slice(8, 11)).toBe('001');
    expect(record.slice(11, 16)).toBe('00003');
    expect(record.slice(16, 36)).toBe('00000000000000012345');
    expect(record.slice(36, 52)).toBe(' '.repeat(16));
    expect(record.slice(52, 54)).toBe('80');
    expect(record.slice(54, 74)).toBe('00000000030712345678');
    expect(record.slice(74, 104)).toBe('Repuestos del Sur'.padEnd(30));
    expect(record.slice(104, 119)).toBe('000000000123450');
    expect(record.slice(149, 164)).toBe('000000000002450');
    expect(record.slice(224, 227)).toBe('PES');
    expect(record.slice(227, 237)).toBe('0001000000');
    expect(record.slice(237, 238)).toBe('1');
    expect(record.slice(238, 239)).toBe('0');
    expect(record.slice(239, 254)).toBe('000000000021000');
    expect(record.slice(254, 269)).toBe('000000000000000');
    expect(record.slice(269, 280)).toBe('00000000000');
    expect(record.slice(280, 310)).toBe(' '.repeat(30));
    expect(record.slice(310, 325)).toBe('000000000000000');
  });

  it('nombre con tildes y largo: sin diacriticos y recortado a 30', () => {
    const record = cbteRecord(row({ supplierName: 'Compañía Eléctrica del Neuquén Sociedad Anónima' }));
    expect(record).toHaveLength(325);
    expect(record.slice(74, 104)).toBe('Compania Electrica del Neuquen');
  });

  it('comprobante C: sin alicuotas ni credito fiscal', () => {
    const record = cbteRecord(row({ cbteType: 11, vat: [], vatTotal: '0.00', netTaxed: '1234.50' }));
    expect(record.slice(237, 238)).toBe('0');
    expect(record.slice(238, 239)).toBe('0');
    expect(record.slice(239, 254)).toBe('000000000000000');
    expect(vatRecords(row({ cbteType: 11, vat: [] }))).toEqual([]);
  });

  it('sin neto gravado: codigo de operacion E (exento) o N (no gravado)', () => {
    expect(cbteRecord(row({ netTaxed: '0', vat: [], vatTotal: '0', exempt: '100' })).slice(238, 239)).toBe('E');
    expect(cbteRecord(row({ netTaxed: '0', vat: [], vatTotal: '0', netUntaxed: '100' })).slice(238, 239)).toBe('N');
  });

  it('una NC va con importes positivos y su tipo', () => {
    const record = cbteRecord(row({ cbteType: 3, total: '-1234.50' }));
    expect(record.slice(8, 11)).toBe('003');
    expect(record.slice(104, 119)).toBe('000000000123450');
  });
});

describe('registro de alicuotas (84)', () => {
  it('uno por alicuota, con largo exacto', () => {
    const records = vatRecords(
      row({
        vat: [
          { vatRateId: 4, base: '200.00', amount: '21.00' },
          { vatRateId: 5, base: '1000.00', amount: '210.00' },
        ],
      })
    );
    expect(records).toHaveLength(2);
    for (const record of records) expect(record).toHaveLength(84);
    expect(records[0]).toBe(
      '001' + '00003' + '00000000000000012345' + '80' + '00000000030712345678' + '000000000020000' + '0004' + '000000000002100'
    );
  });
});

describe('archivos del periodo', () => {
  it('registros separados por CRLF', () => {
    const files = vatBookTxtFiles([row(), row({ number: '12346', cbteType: 11, vat: [] })]);
    expect(files.cbte.split('\r\n')).toHaveLength(2);
    expect(files.alicuotas.split('\r\n')).toHaveLength(1);
  });
});
