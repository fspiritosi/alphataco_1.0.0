import type { clothing_delivery_type } from '@/generated/prisma/enums';

/**
 * Normalización y validación del contenido de una entrega de ropa.
 *
 * El asistente arma las filas en el navegador y manda el array tal cual: acá se decide
 * qué entra a la base. Lógica pura, sin Prisma ni sesión, con test propio.
 */

/** Fila de artículo tal como la manda el asistente. */
export interface RawDeliveryItem {
  clothingItemId: string;
  clothingBrandId?: string | null;
  clothingSizeId?: string | null;
  quantity: number;
  hasCertificate?: boolean;
}

/** Fila lista para el `createMany` de `clothing_delivery_items`. */
export interface NormalizedDeliveryItem {
  clothingItemId: string;
  clothingBrandId: string | null;
  clothingSizeId: string | null;
  quantity: number;
  hasCertificate: boolean;
}

const DELIVERY_TYPES: readonly clothing_delivery_type[] = ['PLANNED_CCT', 'PLANNED_EPP', 'REPLACEMENT'];

/** `true` si el string es uno de los tipos de entrega del enum de la base. */
export function isDeliveryType(value: string): value is clothing_delivery_type {
  return (DELIVERY_TYPES as readonly string[]).includes(value);
}

function normalizeId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Deja sólo las filas utilizables de una entrega:
 * - descarta las que no tienen artículo (el asistente arranca con una fila vacía);
 * - descarta las de cantidad no positiva o no entera;
 * - normaliza marca/talle vacíos a `null` y `hasCertificate` ausente a `false`;
 * - suma las cantidades de las filas repetidas (mismo artículo + marca + talle), porque la
 *   tabla pivote tiene esa combinación como única y un `createMany` duplicado se perdería.
 */
export function normalizeDeliveryItems(items: readonly RawDeliveryItem[]): NormalizedDeliveryItem[] {
  const merged = new Map<string, NormalizedDeliveryItem>();

  for (const item of items) {
    const clothingItemId = normalizeId(item.clothingItemId);
    if (!clothingItemId) continue;
    if (!Number.isInteger(item.quantity) || item.quantity < 1) continue;

    const clothingBrandId = normalizeId(item.clothingBrandId);
    const clothingSizeId = normalizeId(item.clothingSizeId);
    const key = `${clothingItemId}|${clothingBrandId ?? ''}|${clothingSizeId ?? ''}`;

    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      existing.hasCertificate = existing.hasCertificate || item.hasCertificate === true;
      continue;
    }

    merged.set(key, {
      clothingItemId,
      clothingBrandId,
      clothingSizeId,
      quantity: item.quantity,
      hasCertificate: item.hasCertificate === true,
    });
  }

  return [...merged.values()];
}
