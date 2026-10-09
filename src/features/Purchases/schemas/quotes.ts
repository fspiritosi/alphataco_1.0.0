import { z } from 'zod';
import { PRICE_SCALE, formatScaled, parseScaled } from '@/features/Comercial/Facturacion/lib/invoice-math';
import { isVatRateId } from '@/shared/lib/arca/catalogs';
import { MAX_UNIT_PRICE_SCALED } from './orders';

/**
 * Schemas del pedido de cotizacion. Modulo SIN directiva: lo usan los dialogos y las actions.
 */

const uuidList = (message: string) =>
  z
    .array(z.string().uuid(message))
    .min(1, message)
    .transform((list) => [...new Set(list)]);

/** Pedir cotizacion desde una solicitud: lineas + uno o varios proveedores (un pedido por proveedor). */
export const requestQuotesSchema = z.object({
  requestLineIds: uuidList('Elegí al menos una línea'),
  supplierIds: uuidList('Elegí al menos un proveedor'),
  notes: z.string().trim().max(2000, 'Máximo 2000 caracteres'),
});

export type RequestQuotesValues = z.input<typeof requestQuotesSchema>;

/** Alta desde la tab: un proveedor y lineas de cualquier solicitud con faltante. */
export const purchaseQuoteFormSchema = z.object({
  supplierId: z.string().uuid('Elegí el proveedor'),
  requestLineIds: uuidList('Elegí al menos una línea'),
  notes: z.string().trim().max(2000, 'Máximo 2000 caracteres'),
});

export type PurchaseQuoteFormValues = z.input<typeof purchaseQuoteFormSchema>;

export const quoteResponseLineSchema = z.object({
  lineId: z.string().uuid(),
  notQuoted: z.boolean(),
  unitPrice: z.string().trim(),
  vatRateId: z.number().int().nullable(),
});

/** Respuesta del proveedor que carga el comprador: precio + alicuota por linea, o "no cotiza". */
export const quoteResponseSchema = z
  .object({
    /** `YYYY-MM-DD`. */
    receivedAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    validUntil: z.string().trim(),
    deliveryDays: z.string().trim(),
    supplierNotes: z.string().trim().max(2000, 'Máximo 2000 caracteres'),
    lines: z.array(quoteResponseLineSchema).min(1),
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
    if (v.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(v.validUntil)) issue(['validUntil'], 'Fecha inválida');
    if (v.deliveryDays && (!/^\d+$/.test(v.deliveryDays) || Number(v.deliveryDays) > 365)) {
      issue(['deliveryDays'], 'Entre 0 y 365 días');
    }
    v.lines.forEach((line, i) => {
      if (line.notQuoted) return;
      const price = parseScaled(line.unitPrice, PRICE_SCALE);
      if (price === null) issue(['lines', i, 'unitPrice'], 'Precio inválido (hasta 4 decimales)');
      else if (price < BigInt(0)) issue(['lines', i, 'unitPrice'], 'No puede ser negativo');
      else if (price >= MAX_UNIT_PRICE_SCALED) issue(['lines', i, 'unitPrice'], 'Precio demasiado grande');
      if (line.vatRateId === null || !isVatRateId(line.vatRateId)) issue(['lines', i, 'vatRateId'], 'Elegí la alícuota');
    });
    if (v.lines.every((line) => line.notQuoted)) {
      issue(['lines'], 'Si no cotiza ningún ítem, usá "No cotiza"');
    }
  });

export type QuoteResponseValues = z.infer<typeof quoteResponseSchema>;

/** Precio normalizado con punto, a 4 decimales (solo despues de validar). */
export function normalizePrice(raw: string): string {
  return formatScaled(parseScaled(raw, PRICE_SCALE) ?? BigInt(0), PRICE_SCALE);
}

export const QUOTE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const QUOTE_ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
