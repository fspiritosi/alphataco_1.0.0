import { describe, expect, it } from 'vitest';
import { supplierInvoiceFormSchema, toSupplierInvoiceInput, type SupplierInvoiceFormValues } from './invoices';

const SUPPLIER = '11111111-1111-4111-8111-111111111111';
const ORDER_LINE = '22222222-2222-4222-8222-222222222222';
const CATEGORY = '33333333-3333-4333-8333-333333333333';

const base = (over: Partial<SupplierInvoiceFormValues> = {}): SupplierInvoiceFormValues => ({
  supplierId: SUPPLIER,
  cbteType: 1,
  salesPoint: '3',
  number: '12345',
  issueDate: '2026-10-03',
  dueDate: '',
  vatPeriod: '2026-10',
  cae: '',
  caeDueDate: '',
  relatedInvoiceId: '',
  notes: '',
  lines: [
    {
      kind: 'order',
      orderLineId: ORDER_LINE,
      expenseCategoryId: '',
      description: '',
      quantity: '10',
      unitPrice: '1200',
      net: '',
      vatRateId: '5',
    },
  ],
  vat: [{ vatRateId: 5, amount: '2520' }],
  untaxed: '',
  exempt: '',
  taxes: [],
  ...over,
});

const issues = (values: SupplierInvoiceFormValues) => {
  const result = supplierInvoiceFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('schema del comprobante de proveedor', () => {
  it('una factura A contra OC valida', () => {
    expect(issues(base())).toEqual([]);
  });

  it('un C con IVA → error con mensaje', () => {
    expect(issues(base({ cbteType: 11, lines: [{ ...base().lines[0]!, vatRateId: '' }] }))).toEqual([
      'vat: Un comprobante C no discrimina IVA',
    ]);
    expect(issues(base({ cbteType: 11, vat: [] }))).toEqual(['lines.0.vatRateId: Un comprobante C no lleva alícuota']);
  });

  it('un A sin alicuota en una linea → error', () => {
    expect(issues(base({ lines: [{ ...base().lines[0]!, vatRateId: '' }] }))).toEqual([
      'lines.0.vatRateId: Elegí la alícuota',
    ]);
  });

  it('periodo anterior al mes de emision → error', () => {
    expect(issues(base({ vatPeriod: '2026-09' }))).toEqual(['vatPeriod: El período no puede ser anterior al mes de emisión']);
  });

  it('vencimiento anterior a la emision → error', () => {
    expect(issues(base({ dueDate: '2026-10-01' }))).toEqual(['dueDate: El vencimiento no puede ser anterior a la emisión']);
  });

  it('comprobante vinculado solo en NC o ND', () => {
    expect(issues(base({ relatedInvoiceId: SUPPLIER }))).toEqual([
      'relatedInvoiceId: Solo una nota de crédito o débito se vincula a una factura',
    ]);
    expect(issues(base({ cbteType: 3, relatedInvoiceId: SUPPLIER }))).toEqual([]);
  });

  it('linea de gasto sin concepto o sin descripcion → error', () => {
    const expense = { kind: 'expense' as const, orderLineId: '', expenseCategoryId: '', description: '', quantity: '', unitPrice: '', net: '100', vatRateId: '5' };
    expect(issues(base({ lines: [expense], vat: [{ vatRateId: 5, amount: '21' }] }))).toEqual([
      'lines.0.expenseCategoryId: Elegí el concepto',
      'lines.0.description: Escribí la descripción',
    ]);
  });

  it('IIBB sin provincia y otro tributo sin descripcion → error', () => {
    expect(
      issues(
        base({
          taxes: [
            { kind: 'GROSS_INCOME_PERCEPTION', provinceId: '', description: '', amount: '10' },
            { kind: 'OTHER_TAX', provinceId: '', description: '', amount: '5' },
            { kind: 'VAT_PERCEPTION', provinceId: '', description: '', amount: '0' },
          ],
        })
      )
    ).toEqual([
      'taxes.0.provinceId: Elegí la provincia',
      'taxes.1.description: Describí el tributo',
      'taxes.2.amount: Importe inválido',
    ]);
  });

  it('CAE de 14 digitos', () => {
    expect(issues(base({ cae: '123' }))).toEqual(['cae: El CAE tiene 14 dígitos']);
  });

  it('normaliza al input del servidor', () => {
    const input = toSupplierInvoiceInput(
      base({
        lines: [
          base().lines[0]!,
          { kind: 'expense', orderLineId: '', expenseCategoryId: CATEGORY, description: ' Flete ', quantity: '', unitPrice: '', net: '100,5', vatRateId: '5' },
        ],
        exempt: '20',
        taxes: [{ kind: 'GROSS_INCOME_PERCEPTION', provinceId: '15', description: '', amount: '10' }],
      })
    );
    expect(input).toMatchObject({
      supplierId: SUPPLIER,
      cbteType: 1,
      salesPoint: 3,
      number: '12345',
      dueDate: null,
      cae: null,
      relatedInvoiceId: null,
      lines: [
        { kind: 'order', orderLineId: ORDER_LINE, quantity: '10.0000', unitPrice: '1200.0000', vatRateId: 5 },
        { kind: 'expense', expenseCategoryId: CATEGORY, description: 'Flete', net: '100.50', vatRateId: 5 },
      ],
      untaxed: '0.00',
      exempt: '20.00',
      taxes: [{ kind: 'GROSS_INCOME_PERCEPTION', provinceId: '15', description: null, amount: '10.00' }],
    });
  });
});
