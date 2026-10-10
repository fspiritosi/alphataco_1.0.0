import { z } from 'zod';
import {
  DECIMAL_RE,
  DESTINATION_FIELD,
  destinationFieldsSchema,
  normalizeDecimal,
  toDestinationInput,
  type DestinationInput,
} from '@/features/Warehouses/schemas/stock-movement';

/**
 * Schema de la solicitud de compra. Modulo SIN directiva: lo usan el formulario y las actions.
 * El destino es OPCIONAL (sin destino = para stock) y reusa los campos de Almacenes.
 */

export const purchaseRequestLineSchema = z.object({
  kind: z.enum(['MATERIAL', 'FREE_TEXT']),
  materialId: z.string(),
  description: z.string().trim().max(300, 'Máximo 300 caracteres'),
  quantity: z.string().trim(),
  /** Solo texto libre: en una linea de material la unidad es la del material. */
  unitId: z.string(),
  suggestedSupplierId: z.string(),
  notes: z.string().trim().max(500, 'Máximo 500 caracteres'),
});

export const purchaseRequestFormSchema = z
  .object({
    ...destinationFieldsSchema,
    /** `YYYY-MM-DD` o vacio. */
    neededBy: z.string().trim(),
    notes: z.string().trim().max(1000, 'Máximo 1000 caracteres'),
    lines: z.array(purchaseRequestLineSchema).min(1, 'Agregá al menos una línea'),
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
    if (v.destinationType && !v[DESTINATION_FIELD[v.destinationType]]) issue([DESTINATION_FIELD[v.destinationType]], 'Requerido');
    if (v.neededBy && !/^\d{4}-\d{2}-\d{2}$/.test(v.neededBy)) issue(['neededBy'], 'Fecha inválida');
    v.lines.forEach((line, i) => {
      if (line.kind === 'MATERIAL' && !line.materialId) issue(['lines', i, 'materialId'], 'Elegí un material');
      if (line.kind === 'FREE_TEXT') {
        if (!line.description) issue(['lines', i, 'description'], 'Describí qué se compra');
        if (!line.unitId) issue(['lines', i, 'unitId'], 'Elegí la unidad');
      }
      if (!DECIMAL_RE.test(line.quantity)) issue(['lines', i, 'quantity'], 'Cantidad inválida (hasta 4 decimales)');
      else if (Number(normalizeDecimal(line.quantity)) <= 0) issue(['lines', i, 'quantity'], 'Tiene que ser mayor a 0');
    });
  });

export type PurchaseRequestFormValues = z.infer<typeof purchaseRequestFormSchema>;
export type PurchaseRequestLineFormValues = PurchaseRequestFormValues['lines'][number];

export function emptyPurchaseRequestLine(): PurchaseRequestLineFormValues {
  return { kind: 'MATERIAL', materialId: '', description: '', quantity: '', unitId: '', suggestedSupplierId: '', notes: '' };
}

// ── Forma normalizada que reciben las actions ───────────────────────────────

export interface PurchaseRequestLineInput {
  materialId: string | null;
  description: string | null;
  /** Decimal normalizado (con punto). */
  quantity: string;
  /** Solo texto libre; en una linea de material la toma el servidor del material. */
  unitId: string | null;
  suggestedSupplierId: string | null;
  notes: string | null;
}

export interface PurchaseRequestInput {
  destination: DestinationInput;
  neededBy: string | null;
  notes: string | null;
  lines: PurchaseRequestLineInput[];
}

const orNull = (value: string) => (value.trim() ? value.trim() : null);

/** Deja solo lo que corresponde a cada tipo de linea y solo la FK del destino elegido. */
export function toPurchaseRequestInput(v: PurchaseRequestFormValues): PurchaseRequestInput {
  return {
    destination: toDestinationInput(v),
    neededBy: orNull(v.neededBy),
    notes: orNull(v.notes),
    lines: v.lines.map((line) => ({
      materialId: line.kind === 'MATERIAL' ? orNull(line.materialId) : null,
      description: line.kind === 'FREE_TEXT' ? orNull(line.description) : null,
      quantity: normalizeDecimal(line.quantity),
      unitId: line.kind === 'FREE_TEXT' ? orNull(line.unitId) : null,
      suggestedSupplierId: orNull(line.suggestedSupplierId),
      notes: orNull(line.notes),
    })),
  };
}

export const decisionNotesSchema = z.string().trim().max(1000, 'Máximo 1000 caracteres');
export const requiredReasonSchema = z
  .string()
  .trim()
  .min(1, 'Indicá el motivo')
  .max(1000, 'Máximo 1000 caracteres');
