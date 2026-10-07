import { DEFAULT_VAT_RATE_ID, type VoucherLetter } from '@/shared/lib/arca/catalogs';
import { z } from 'zod';
import type { InvoiceView } from '../../actions/invoices.server';
import { PRICE_SCALE, QUANTITY_SCALE, computeInvoiceTotals, lineNet, parseScaled, type InvoiceTotals } from '../../lib/invoice-math';
import { invoiceDraftSchema, invoiceLineInputSchema, type InvoiceDraftInput } from '../../schemas/invoice';
import { normalizeDecimalInput, toInputText } from '../../utils/number-text';

/**
 * Form del editor de borradores. Módulo sin directiva (lo usan los componentes del editor y es
 * puro). Extiende el schema del servidor (`invoiceDraftSchema`) con lo que la UI necesita por
 * línea y no se manda: si viene de una certificación (`locked`) y su neto ya calculado.
 */

const editorLineSchema = invoiceLineInputSchema.extend({
  /** Viene de una certificación: cantidad, precio y neto no se editan. */
  locked: z.boolean(),
  certificationId: z.string().nullable(),
  /**
   * Neto de las líneas de certificación: es la SUMA de los importes ya redondeados de la
   * certificación (lo que aprobó el cliente), no cantidad × precio. Por eso viaja aparte.
   */
  lockedNet: z.string().nullable(),
});

const baseEditorSchema = invoiceDraftSchema.extend({
  lines: z.array(editorLineSchema).max(300, 'Máximo 300 líneas'),
});

export type EditorValues = z.infer<typeof baseEditorSchema>;
export type EditorLine = EditorValues['lines'][number];

/**
 * Valida FORMATO (como el servidor), no completitud: se puede guardar a medias. Lo que depende de
 * la letra (alícuota obligatoria salvo en C) se agrega acá.
 */
export function buildEditorSchema(letter: VoucherLetter) {
  return baseEditorSchema.superRefine((values, ctx) => {
    values.lines.forEach((line, index) => {
      if (!line.locked) {
        if (line.quantity && parseScaled(line.quantity, QUANTITY_SCALE) === null) {
          ctx.addIssue({ code: 'custom', path: ['lines', index, 'quantity'], message: 'Ingresá un número (hasta 4 decimales).' });
        }
        if (line.unitPrice && parseScaled(line.unitPrice, PRICE_SCALE) === null) {
          ctx.addIssue({ code: 'custom', path: ['lines', index, 'unitPrice'], message: 'Ingresá un importe (hasta 4 decimales).' });
        }
      }
      if (letter !== 'C' && line.vatRateId === null) {
        ctx.addIssue({ code: 'custom', path: ['lines', index, 'vatRateId'], message: 'Elegí la alícuota de IVA.' });
      }
    });
  });
}

export function toEditorValues(invoice: InvoiceView): EditorValues {
  return {
    salesPointId: invoice.salesPoint.id,
    issueDate: invoice.issueDate,
    concept: invoice.concept,
    serviceFrom: invoice.serviceFrom,
    serviceTo: invoice.serviceTo,
    paymentDueDate: invoice.paymentDueDate,
    notes: invoice.notes,
    lines: invoice.lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.locked ? line.quantity : toInputText(line.quantity),
      unitPrice: line.locked ? line.unitPrice : toInputText(line.unitPrice),
      vatRateId: line.vatRateId,
      serviceItemId: line.serviceItemId,
      locked: line.locked,
      certificationId: line.certificationId,
      lockedNet: line.locked ? line.netAmount : null,
    })),
  };
}

export function newEditorLine(letter: VoucherLetter): EditorLine {
  return {
    description: '',
    quantity: '1',
    unitPrice: '',
    vatRateId: letter === 'C' ? null : DEFAULT_VAT_RATE_ID,
    serviceItemId: null,
    locked: false,
    certificationId: null,
    lockedNet: null,
  };
}

/**
 * Valores del form → lo que recibe `saveInvoiceDraft`. Cantidades y precios se normalizan a punto
 * decimal (el servidor los guarda tal cual en columnas Decimal). Las líneas de certificación las
 * reconstruye el servidor con sus valores: solo importan su `id`, descripción y alícuota.
 */
export function toDraftInput(values: EditorValues): InvoiceDraftInput {
  return {
    salesPointId: values.salesPointId,
    issueDate: values.issueDate,
    concept: values.concept,
    serviceFrom: values.serviceFrom || null,
    serviceTo: values.serviceTo || null,
    paymentDueDate: values.paymentDueDate || null,
    notes: values.notes?.trim() ? values.notes.trim() : null,
    lines: values.lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.locked ? line.quantity : (normalizeDecimalInput(line.quantity || '0', QUANTITY_SCALE) ?? line.quantity),
      unitPrice: line.locked ? line.unitPrice : (normalizeDecimalInput(line.unitPrice || '0', PRICE_SCALE) ?? line.unitPrice),
      vatRateId: line.vatRateId,
      serviceItemId: line.serviceItemId ?? null,
    })),
  };
}

/** Neto de una línea para el preview: el guardado si viene de certificación; si no, cantidad × precio. */
export function editorLineNet(line: Pick<EditorLine, 'locked' | 'lockedNet' | 'quantity' | 'unitPrice'>): string | null {
  if (line.locked) return line.lockedNet;
  return lineNet(line.quantity || '0', line.unitPrice || '0');
}

/**
 * Totales del preview con la MISMA fórmula que el servidor (`computeInvoiceTotals`). Las líneas
 * todavía incompletas (número inválido o sin alícuota) no suman y se informan aparte.
 */
export function previewTotals(
  lines: Pick<EditorLine, 'locked' | 'lockedNet' | 'quantity' | 'unitPrice' | 'vatRateId'>[],
  letter: VoucherLetter
): { totals: InvoiceTotals; skipped: number } {
  const valid: { netAmount: string; vatRateId: number | null }[] = [];
  let skipped = 0;
  for (const line of lines) {
    const net = editorLineNet(line);
    if (net === null || (letter !== 'C' && line.vatRateId === null)) {
      skipped += 1;
      continue;
    }
    valid.push({ netAmount: net, vatRateId: line.vatRateId });
  }
  return { totals: computeInvoiceTotals(valid, letter), skipped };
}

/**
 * Lleva el foco al campo que nombra un problema de emisión (`issueDate`, `lines.2.quantity`, …).
 * Cada campo del editor tiene un `data-field`; si el exacto no existe (p. ej. la cantidad de una
 * línea bloqueada) se prueba con la línea entera.
 */
export function focusEditorField(field: string): void {
  const candidates = [field];
  const lineMatch = /^lines\.(\d+)\./.exec(field);
  if (lineMatch) candidates.push(`lines.${lineMatch[1]}`);
  if (field === 'serviceTo') candidates.push('serviceFrom');
  for (const name of candidates) {
    const container = document.querySelector<HTMLElement>(`[data-field="${name}"]`);
    if (!container) continue;
    const target =
      container.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, button, [tabindex]') ?? container;
    container.scrollIntoView({ block: 'center' });
    target.focus({ preventScroll: true });
    return;
  }
}
