import { describe, expect, it } from 'vitest';
import { controlSupplierInvoice, type InvoiceControlInput, type InvoiceControlLine } from './invoice-control';

const okLetter = { ok: true as const, letter: 'A' as const, reason: 'Repuestos del Sur es IVA Responsable Inscripto: se espera Factura A.' };

const orderLine = (over: Partial<Extract<InvoiceControlLine, { kind: 'order' }>> = {}): InvoiceControlLine => ({
  kind: 'order',
  lineId: 'l1',
  orderLineId: 'ol1',
  label: 'Filtro de aceite',
  orderNumber: 'OC-000007',
  supplierMatches: true,
  orderStatus: 'SENT',
  quantity: '10',
  unitPrice: '1200',
  vatRateId: 5,
  orderPrice: '1200',
  orderVatRateId: 5,
  invoicedOthers: '0',
  received: '10',
  unit: 'u',
  ...over,
});

const input = (over: Partial<InvoiceControlInput> = {}): InvoiceControlInput => ({
  kind: 'invoice',
  letter: 'A',
  expectedLetter: okLetter,
  vatDifferences: [],
  lines: [orderLine()],
  ...over,
});

describe('control del comprobante contra la OC y lo recibido', () => {
  it('conforme: mismo precio, alicuota y cantidad recibida', () => {
    expect(controlSupplierInvoice(input())).toEqual({ errors: [], observations: [] });
  });

  it('letra distinta de la esperada → LETTER', () => {
    const result = controlSupplierInvoice(input({ letter: 'B' }));
    expect(result.observations).toEqual([
      { code: 'LETTER', message: 'Se cargó una B. Repuestos del Sur es IVA Responsable Inscripto: se espera Factura A.' },
    ]);
  });

  it('letra que no se pudo controlar → LETTER con el motivo', () => {
    const result = controlSupplierInvoice(input({ expectedLetter: { ok: false, error: 'No se pudo controlar la letra: x.' } }));
    expect(result.observations).toEqual([{ code: 'LETTER', message: 'No se pudo controlar la letra: x.' }]);
  });

  it('IVA de una alicuota fuera de tolerancia → VAT', () => {
    const result = controlSupplierInvoice(input({ vatDifferences: [{ vatRateId: 5, informed: '2105.00', computed: '2100.00' }] }));
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.code).toBe('VAT');
    expect(result.observations[0]?.message).toMatch(/^IVA 21%: informado .*2\.105,00, calculado .*2\.100,00$/);
  });

  it('precio distinto del de la OC → PRICE', () => {
    const result = controlSupplierInvoice(input({ lines: [orderLine({ unitPrice: '1250' })] }));
    expect(result.observations.map((o) => o.code)).toEqual(['PRICE']);
    expect(result.observations[0]?.message).toMatch(/^Filtro de aceite: precio .*1\.250,00, en la OC-000007 .*1\.200,00$/);
    expect(result.observations[0]?.lineId).toBe('l1');
  });

  it('alicuota distinta de la de la OC → VAT_RATE', () => {
    const result = controlSupplierInvoice(input({ lines: [orderLine({ vatRateId: 4 })] }));
    expect(result.observations).toEqual([
      { code: 'VAT_RATE', lineId: 'l1', message: 'Filtro de aceite: alícuota 10,5%, en la OC-000007 21%' },
    ]);
  });

  it('facturado de mas contra lo recibido → QUANTITY (cuenta lo de otros comprobantes)', () => {
    const result = controlSupplierInvoice(input({ lines: [orderLine({ quantity: '4', invoicedOthers: '8' })] }));
    expect(result.observations).toEqual([
      { code: 'QUANTITY', lineId: 'l1', message: 'Filtro de aceite: facturado 12 u, recibido 10 u en la OC-000007' },
    ]);
  });

  it('dos lineas del comprobante sobre la misma linea de OC suman', () => {
    const result = controlSupplierInvoice(
      input({ lines: [orderLine({ quantity: '6' }), orderLine({ lineId: 'l2', quantity: '6' })] })
    );
    expect(result.observations.map((o) => o.code)).toEqual(['QUANTITY']);
  });

  it('OC de otro proveedor → error', () => {
    const result = controlSupplierInvoice(input({ lines: [orderLine({ supplierMatches: false })] }));
    expect(result.errors).toEqual(['Filtro de aceite: la OC-000007 es de otro proveedor']);
  });

  it('OC en borrador, pendiente o anulada → error', () => {
    expect(controlSupplierInvoice(input({ lines: [orderLine({ orderStatus: 'DRAFT' })] })).errors).toEqual([
      'La OC-000007 no está aprobada',
    ]);
    expect(controlSupplierInvoice(input({ lines: [orderLine({ orderStatus: 'PENDING_APPROVAL' })] })).errors).toEqual([
      'La OC-000007 no está aprobada',
    ]);
    expect(controlSupplierInvoice(input({ lines: [orderLine({ orderStatus: 'CANCELLED' })] })).errors).toEqual([
      'La OC-000007 está anulada',
    ]);
  });

  it('una NC no se observa por cantidad: libera lo facturado', () => {
    const result = controlSupplierInvoice(
      input({ kind: 'credit_note', lines: [orderLine({ quantity: '2', invoicedOthers: '10' })] })
    );
    expect(result).toEqual({ errors: [], observations: [] });
  });

  it('una NC que deja lo facturado por debajo de 0 → error', () => {
    const result = controlSupplierInvoice(
      input({ kind: 'credit_note', lines: [orderLine({ quantity: '3', invoicedOthers: '2' })] })
    );
    expect(result.errors).toEqual(['Filtro de aceite: la nota de crédito acredita 3 u y en la OC-000007 hay 2 u facturadas']);
  });

  it('una ND controla la cantidad como una factura', () => {
    const result = controlSupplierInvoice(input({ kind: 'debit_note', lines: [orderLine({ quantity: '1', invoicedOthers: '10' })] }));
    expect(result.observations.map((o) => o.code)).toEqual(['QUANTITY']);
  });

  it('en C se compara el precio final contra precio + IVA de la OC, sin controlar alicuota', () => {
    const letterC = { ok: true as const, letter: 'C' as const, reason: 'x' };
    const conform = controlSupplierInvoice(
      input({ letter: 'C', expectedLetter: letterC, lines: [orderLine({ unitPrice: '1452', vatRateId: null })] })
    );
    expect(conform).toEqual({ errors: [], observations: [] });
    const other = controlSupplierInvoice(
      input({ letter: 'C', expectedLetter: letterC, lines: [orderLine({ unitPrice: '1200', vatRateId: null })] })
    );
    expect(other.observations.map((o) => o.code)).toEqual(['PRICE']);
  });

  it('una linea de gasto solo pasa por letra e IVA', () => {
    const result = controlSupplierInvoice(
      input({ letter: 'B', lines: [{ kind: 'expense', lineId: 'g1', label: 'Luz octubre' }] })
    );
    expect(result.observations.map((o) => o.code)).toEqual(['LETTER']);
  });
});
