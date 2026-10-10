import { z } from 'zod';
import {
  AMOUNT_SCALE,
  PRICE_SCALE,
  QUANTITY_SCALE,
  formatScaled,
  parseScaled,
} from '@/features/Comercial/Facturacion/lib/invoice-math';
import { CBTE_TYPES, isCbteTypeId, isVatRateId } from '@/shared/lib/arca/catalogs';
import type { InvoiceTaxKind } from '../lib/invoice-totals';

/**
 * Comprobante de proveedor (spec Compras etapa 4 §3.1). Modulo SIN directiva: lo usan el
 * formulario y la action. Todos los numeros viajan como texto (como los escribe el usuario) y el
 * servidor los normaliza con `toSupplierInvoiceInput`.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Tipos que se pueden cargar: Factura, ND y NC A, B y C (sin FCE MiPyME). */
export const SUPPLIER_INVOICE_CBTE_TYPES = [1, 2, 3, 6, 7, 8, 11, 12, 13] as const;

export const SUPPLIER_INVOICE_TAX_KINDS = [
  'VAT_PERCEPTION',
  'GROSS_INCOME_PERCEPTION',
  'INTERNAL_TAX',
  'OTHER_TAX',
] as const satisfies readonly InvoiceTaxKind[];

export const SUPPLIER_INVOICE_TAX_LABELS: Record<InvoiceTaxKind, string> = {
  VAT_PERCEPTION: 'Percepción de IVA',
  GROSS_INCOME_PERCEPTION: 'Percepción de IIBB',
  INTERNAL_TAX: 'Impuestos internos',
  OTHER_TAX: 'Otro tributo',
};

export const supplierInvoiceLineSchema = z.object({
  kind: z.enum(['order', 'expense']),
  orderLineId: z.string(),
  expenseCategoryId: z.string(),
  description: z.string().max(200, 'Máximo 200 caracteres'),
  quantity: z.string().trim(),
  unitPrice: z.string().trim(),
  net: z.string().trim(),
  /** Id de alicuota como texto; vacio en comprobantes C. */
  vatRateId: z.string(),
});

export const supplierInvoiceFormSchema = z
  .object({
    supplierId: z.string().uuid('Elegí el proveedor'),
    cbteType: z.number().int(),
    salesPoint: z.string().trim(),
    number: z.string().trim(),
    issueDate: z.string().trim().regex(DATE_RE, 'Fecha inválida'),
    dueDate: z.string().trim(),
    vatPeriod: z.string().trim().regex(PERIOD_RE, 'Período inválido (AAAA-MM)'),
    cae: z.string().trim(),
    caeDueDate: z.string().trim(),
    relatedInvoiceId: z.string(),
    notes: z.string().trim().max(1000, 'Máximo 1000 caracteres'),
    lines: z.array(supplierInvoiceLineSchema).min(1, 'Agregá al menos una línea'),
    vat: z.array(z.object({ vatRateId: z.number().int(), amount: z.string().trim() })),
    untaxed: z.string().trim(),
    exempt: z.string().trim(),
    taxes: z.array(
      z.object({
        kind: z.enum(SUPPLIER_INVOICE_TAX_KINDS),
        provinceId: z.string(),
        description: z.string().trim().max(120, 'Máximo 120 caracteres'),
        amount: z.string().trim(),
      })
    ),
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
    const known = (SUPPLIER_INVOICE_CBTE_TYPES as readonly number[]).includes(v.cbteType) && isCbteTypeId(v.cbteType);
    if (!known) {
      issue(['cbteType'], 'Elegí el tipo de comprobante');
      return;
    }
    const { letter, kind } = CBTE_TYPES[v.cbteType as (typeof SUPPLIER_INVOICE_CBTE_TYPES)[number]];

    const salesPoint = Number(v.salesPoint);
    if (!/^\d{1,5}$/.test(v.salesPoint) || salesPoint < 1) issue(['salesPoint'], 'Punto de venta inválido (1 a 99999)');
    if (!/^\d{1,8}$/.test(v.number) || Number(v.number) < 1) issue(['number'], 'Número inválido (1 a 99999999)');
    if (v.dueDate) {
      if (!DATE_RE.test(v.dueDate)) issue(['dueDate'], 'Fecha inválida');
      else if (v.dueDate < v.issueDate) issue(['dueDate'], 'El vencimiento no puede ser anterior a la emisión');
    }
    if (DATE_RE.test(v.issueDate) && PERIOD_RE.test(v.vatPeriod) && v.vatPeriod < v.issueDate.slice(0, 7)) {
      issue(['vatPeriod'], 'El período no puede ser anterior al mes de emisión');
    }
    if (v.cae && !/^\d{14}$/.test(v.cae)) issue(['cae'], 'El CAE tiene 14 dígitos');
    if (v.caeDueDate && !DATE_RE.test(v.caeDueDate)) issue(['caeDueDate'], 'Fecha inválida');
    if (v.relatedInvoiceId && kind === 'invoice') {
      issue(['relatedInvoiceId'], 'Solo una nota de crédito o débito se vincula a una factura');
    }

    v.lines.forEach((line, i) => {
      if (line.kind === 'order') {
        if (!line.orderLineId) issue(['lines', i, 'orderLineId'], 'Falta la línea de OC');
        const quantity = parseScaled(line.quantity, QUANTITY_SCALE);
        if (quantity === null || quantity <= BigInt(0)) issue(['lines', i, 'quantity'], 'Cantidad inválida (hasta 4 decimales)');
        const price = parseScaled(line.unitPrice, PRICE_SCALE);
        if (price === null || price < BigInt(0)) issue(['lines', i, 'unitPrice'], 'Precio inválido (hasta 4 decimales)');
      } else {
        if (!line.expenseCategoryId) issue(['lines', i, 'expenseCategoryId'], 'Elegí el concepto');
        if (!line.description.trim()) issue(['lines', i, 'description'], 'Escribí la descripción');
        const net = parseScaled(line.net, AMOUNT_SCALE);
        if (net === null || net <= BigInt(0)) issue(['lines', i, 'net'], 'Importe inválido');
      }
      if (letter === 'C') {
        if (line.vatRateId) issue(['lines', i, 'vatRateId'], 'Un comprobante C no lleva alícuota');
      } else if (!line.vatRateId || !isVatRateId(Number(line.vatRateId))) {
        issue(['lines', i, 'vatRateId'], 'Elegí la alícuota');
      }
    });

    if (letter === 'C' && v.vat.length > 0) issue(['vat'], 'Un comprobante C no discrimina IVA');
    v.vat.forEach((line, i) => {
      const amount = parseScaled(line.amount || '0', AMOUNT_SCALE);
      if (amount === null || amount < BigInt(0)) issue(['vat', i, 'amount'], 'Importe inválido');
    });
    for (const key of ['untaxed', 'exempt'] as const) {
      const amount = parseScaled(v[key] || '0', AMOUNT_SCALE);
      if (amount === null || amount < BigInt(0)) issue([key], 'Importe inválido');
    }
    v.taxes.forEach((tax, i) => {
      if (tax.kind === 'GROSS_INCOME_PERCEPTION' && !tax.provinceId) issue(['taxes', i, 'provinceId'], 'Elegí la provincia');
      if (tax.kind === 'OTHER_TAX' && !tax.description) issue(['taxes', i, 'description'], 'Describí el tributo');
      const amount = parseScaled(tax.amount, AMOUNT_SCALE);
      if (amount === null || amount <= BigInt(0)) issue(['taxes', i, 'amount'], 'Importe inválido');
    });
  });

export type SupplierInvoiceFormValues = z.infer<typeof supplierInvoiceFormSchema>;

export type SupplierInvoiceLineInput =
  | { kind: 'order'; orderLineId: string; quantity: string; unitPrice: string; vatRateId: number | null }
  | { kind: 'expense'; expenseCategoryId: string; description: string; net: string; vatRateId: number | null };

export interface SupplierInvoiceInput {
  supplierId: string;
  cbteType: number;
  salesPoint: number;
  number: string;
  issueDate: string;
  dueDate: string | null;
  vatPeriod: string;
  cae: string | null;
  caeDueDate: string | null;
  relatedInvoiceId: string | null;
  notes: string | null;
  lines: SupplierInvoiceLineInput[];
  /** IVA informado por alicuota (las bases las calcula el servidor desde las lineas). */
  vat: { vatRateId: number; amount: string }[];
  untaxed: string;
  exempt: string;
  taxes: { kind: InvoiceTaxKind; provinceId: string | null; description: string | null; amount: string }[];
}

const orNull = (value: string) => (value.trim() ? value.trim() : null);
const scaled = (raw: string, scale: number) => formatScaled(parseScaled(raw || '0', scale) ?? BigInt(0), scale);
const rate = (raw: string) => (raw ? Number(raw) : null);

/** Solo despues de validar. */
export function toSupplierInvoiceInput(v: SupplierInvoiceFormValues): SupplierInvoiceInput {
  return {
    supplierId: v.supplierId,
    cbteType: v.cbteType,
    salesPoint: Number(v.salesPoint),
    number: String(Number(v.number)),
    issueDate: v.issueDate,
    dueDate: orNull(v.dueDate),
    vatPeriod: v.vatPeriod,
    cae: orNull(v.cae),
    caeDueDate: orNull(v.caeDueDate),
    relatedInvoiceId: orNull(v.relatedInvoiceId),
    notes: orNull(v.notes),
    lines: v.lines.map((line): SupplierInvoiceLineInput =>
      line.kind === 'order'
        ? {
            kind: 'order',
            orderLineId: line.orderLineId,
            quantity: scaled(line.quantity, QUANTITY_SCALE),
            unitPrice: scaled(line.unitPrice, PRICE_SCALE),
            vatRateId: rate(line.vatRateId),
          }
        : {
            kind: 'expense',
            expenseCategoryId: line.expenseCategoryId,
            description: line.description.trim(),
            net: scaled(line.net, AMOUNT_SCALE),
            vatRateId: rate(line.vatRateId),
          }
    ),
    vat: v.vat.map((line) => ({ vatRateId: line.vatRateId, amount: scaled(line.amount, AMOUNT_SCALE) })),
    untaxed: scaled(v.untaxed, AMOUNT_SCALE),
    exempt: scaled(v.exempt, AMOUNT_SCALE),
    taxes: v.taxes.map((tax) => ({
      kind: tax.kind,
      provinceId: orNull(tax.provinceId),
      description: orNull(tax.description),
      amount: scaled(tax.amount, AMOUNT_SCALE),
    })),
  };
}

export const INVOICE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const INVOICE_ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
