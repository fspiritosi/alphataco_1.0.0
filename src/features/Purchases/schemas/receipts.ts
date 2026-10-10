import { z } from 'zod';
import { QUANTITY_SCALE, formatScaled, parseScaled } from '@/features/Comercial/Facturacion/lib/invoice-math';
import { parseSerialNumbers } from '@/features/Warehouses/schemas/stock-movement';

/**
 * Recepcion de una OC (spec Compras etapa 3). Modulo SIN directiva: lo usan el formulario y la
 * action. Una cantidad vacia o 0 = no llego esa linea.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const purchaseReceiptLineSchema = z.object({
  orderLineId: z.string().uuid(),
  quantity: z.string().trim(),
  batchNumber: z.string().trim().max(60, 'Máximo 60 caracteres'),
  /** `YYYY-MM-DD` o vacio. */
  batchExpiresOn: z.string().trim(),
  /** Una serie por linea (o separadas por coma). */
  serialNumbers: z.string(),
});

export const purchaseReceiptFormSchema = z
  .object({
    orderId: z.string().uuid(),
    /** Vacio si la recepcion es solo de servicios. */
    warehouseId: z.string(),
    receivedOn: z.string().trim().regex(DATE_RE, 'Fecha inválida'),
    deliveryNote: z.string().trim().max(60, 'Máximo 60 caracteres'),
    notes: z.string().trim().max(1000, 'Máximo 1000 caracteres'),
    lines: z.array(purchaseReceiptLineSchema).min(1),
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
    let any = false;
    v.lines.forEach((line, i) => {
      if (line.quantity) {
        const quantity = parseScaled(line.quantity, QUANTITY_SCALE);
        if (quantity === null || quantity < BigInt(0)) issue(['lines', i, 'quantity'], 'Cantidad inválida (hasta 4 decimales)');
        else if (quantity > BigInt(0)) any = true;
      }
      if (line.batchExpiresOn && !DATE_RE.test(line.batchExpiresOn)) issue(['lines', i, 'batchExpiresOn'], 'Fecha inválida');
    });
    if (!any) issue(['lines'], 'Indicá la cantidad recibida de al menos una línea');
  });

export type PurchaseReceiptFormValues = z.infer<typeof purchaseReceiptFormSchema>;

export interface PurchaseReceiptLineInput {
  orderLineId: string;
  /** Decimal normalizado (punto, 4 decimales). */
  quantity: string;
  batchNumber: string | null;
  batchExpiresOn: string | null;
  serialNumbers: string[];
}

export interface PurchaseReceiptInput {
  orderId: string;
  warehouseId: string | null;
  receivedOn: string;
  deliveryNote: string | null;
  notes: string | null;
  lines: PurchaseReceiptLineInput[];
}

const orNull = (value: string) => (value.trim() ? value.trim() : null);

/** Solo despues de validar. Deja solo las lineas con cantidad > 0. */
export function toPurchaseReceiptInput(v: PurchaseReceiptFormValues): PurchaseReceiptInput {
  return {
    orderId: v.orderId,
    warehouseId: orNull(v.warehouseId),
    receivedOn: v.receivedOn,
    deliveryNote: orNull(v.deliveryNote),
    notes: orNull(v.notes),
    lines: v.lines.flatMap((line) => {
      const quantity = parseScaled(line.quantity || '0', QUANTITY_SCALE) ?? BigInt(0);
      if (quantity <= BigInt(0)) return [];
      return [
        {
          orderLineId: line.orderLineId,
          quantity: formatScaled(quantity, QUANTITY_SCALE),
          batchNumber: orNull(line.batchNumber),
          batchExpiresOn: orNull(line.batchExpiresOn),
          serialNumbers: parseSerialNumbers(line.serialNumbers),
        },
      ];
    }),
  };
}

export const RECEIPT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const RECEIPT_ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
