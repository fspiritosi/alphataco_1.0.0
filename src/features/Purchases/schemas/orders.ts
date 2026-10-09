import { z } from 'zod';
import {
  PRICE_SCALE,
  QUANTITY_SCALE,
  formatScaled,
  parseScaled,
} from '@/features/Comercial/Facturacion/lib/invoice-math';
import { DEFAULT_VAT_RATE_ID, isVatRateId } from '@/shared/lib/arca/catalogs';

/**
 * Schema de la orden de compra. Modulo SIN directiva: lo usan el formulario y las actions.
 * Cantidades y precios viajan como texto ("1.234,5" o "1234.5") y se validan con la misma
 * aritmetica que los totales (enteros escalados): nada de `parseFloat`.
 */

const UUID_MESSAGE = 'Elegí una opción válida';

/** `unit_price` es DECIMAL(15,4): el maximo es menor a 10^11 (escalado a 4 decimales: 10^15). */
export const MAX_UNIT_PRICE_SCALED = BigInt(10) ** BigInt(15);

export const purchaseOrderLineSchema = z.object({
  requestLineId: z.string().uuid('Elegí la línea de solicitud'),
  /** Linea de cotizacion de la que salio el precio, o vacio. */
  quoteLineId: z.string(),
  quantity: z.string().trim(),
  unitPrice: z.string().trim(),
  vatRateId: z.number().int(),
});

export const purchaseOrderFormSchema = z
  .object({
    supplierId: z.string().uuid(UUID_MESSAGE),
    /** `YYYY-MM-DD` o vacio. */
    deliveryDate: z.string().trim(),
    deliveryPlace: z.string().trim().max(200, 'Máximo 200 caracteres'),
    /** Dias, como texto del input; vacio = sin plazo. */
    paymentTermDays: z.string().trim(),
    notes: z.string().trim().max(2000, 'Máximo 2000 caracteres'),
    lines: z.array(purchaseOrderLineSchema).min(1, 'Agregá al menos una línea'),
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
    if (v.deliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(v.deliveryDate)) issue(['deliveryDate'], 'Fecha inválida');
    if (v.paymentTermDays) {
      const days = Number(v.paymentTermDays);
      if (!/^\d+$/.test(v.paymentTermDays) || days > 365) issue(['paymentTermDays'], 'Entre 0 y 365 días');
    }
    v.lines.forEach((line, i) => {
      const quantity = parseScaled(line.quantity, QUANTITY_SCALE);
      if (quantity === null) issue(['lines', i, 'quantity'], 'Cantidad inválida (hasta 4 decimales)');
      else if (quantity <= BigInt(0)) issue(['lines', i, 'quantity'], 'Tiene que ser mayor a 0');
      const price = parseScaled(line.unitPrice, PRICE_SCALE);
      if (price === null) issue(['lines', i, 'unitPrice'], 'Precio inválido (hasta 4 decimales)');
      else if (price < BigInt(0)) issue(['lines', i, 'unitPrice'], 'No puede ser negativo');
      else if (price >= MAX_UNIT_PRICE_SCALED) issue(['lines', i, 'unitPrice'], 'Precio demasiado grande');
      if (!isVatRateId(line.vatRateId)) issue(['lines', i, 'vatRateId'], 'Elegí la alícuota');
    });
  });

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;
export type PurchaseOrderLineFormValues = PurchaseOrderFormValues['lines'][number];

export function emptyPurchaseOrderLine(): PurchaseOrderLineFormValues {
  return { requestLineId: '', quoteLineId: '', quantity: '', unitPrice: '', vatRateId: DEFAULT_VAT_RATE_ID };
}

// ── Forma normalizada que reciben las libs del servidor ─────────────────────

export interface PurchaseOrderLineInput {
  requestLineId: string;
  quoteLineId: string | null;
  /** Decimal normalizado con punto, a 4 decimales. */
  quantity: string;
  unitPrice: string;
  vatRateId: number;
}

export interface PurchaseOrderInput {
  supplierId: string;
  deliveryDate: string | null;
  deliveryPlace: string | null;
  paymentTermDays: number | null;
  notes: string | null;
  lines: PurchaseOrderLineInput[];
}

const orNull = (value: string) => (value.trim() ? value.trim() : null);

/** Solo despues de `purchaseOrderFormSchema.parse`: asume los decimales validos. */
export function toPurchaseOrderInput(v: PurchaseOrderFormValues): PurchaseOrderInput {
  return {
    supplierId: v.supplierId,
    deliveryDate: orNull(v.deliveryDate),
    deliveryPlace: orNull(v.deliveryPlace),
    paymentTermDays: v.paymentTermDays ? Number(v.paymentTermDays) : null,
    notes: orNull(v.notes),
    lines: v.lines.map((line) => ({
      requestLineId: line.requestLineId,
      quoteLineId: line.quoteLineId || null,
      quantity: formatScaled(parseScaled(line.quantity, QUANTITY_SCALE) ?? BigInt(0), QUANTITY_SCALE),
      unitPrice: formatScaled(parseScaled(line.unitPrice, PRICE_SCALE) ?? BigInt(0), PRICE_SCALE),
      vatRateId: line.vatRateId,
    })),
  };
}
