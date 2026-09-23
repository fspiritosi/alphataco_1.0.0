/**
 * Formato de la constancia de entrega (RG 12-4).
 *
 * Lógica pura del layout del PDF: no depende de `@react-pdf/renderer` ni de Prisma, así
 * que se puede testear sin renderizar nada.
 */

/** Filas fijas del cuerpo del formulario: el resto va en blanco para completar a mano. */
export const RECEIPT_TOTAL_ROWS = 15;

/** Fila del cuerpo del formulario, o `null` si está vacía. */
export interface ReceiptRow {
  producto: string;
  tipoModelo: string;
  talle: string;
  codigo: string;
  marca: string;
  cantidad: number;
  hasCertificate: boolean;
}

/** Artículo entregado, con el shape que devuelve la query del PDF. */
export interface ReceiptItemSource {
  quantity: number;
  has_certificate?: boolean | null;
  clothing_items?: { name?: string | null; code?: string | null; description?: string | null } | null;
  clothing_brands?: { name?: string | null } | null;
  clothing_sizes?: { name?: string | null } | null;
}

/** Formatea un CUIT con guiones: `30709694363` → `30-70969436-3`. */
export function formatCuit(cuit: string): string {
  const clean = cuit.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
  }
  return cuit;
}

/**
 * Arma las filas del formulario: los artículos entregados y `null` en las que sobran hasta
 * `RECEIPT_TOTAL_ROWS`. Los artículos que no entran en la hoja se descartan (el formulario
 * es de tamaño fijo).
 */
export function buildReceiptRows(
  items: readonly ReceiptItemSource[],
  totalRows: number = RECEIPT_TOTAL_ROWS
): (ReceiptRow | null)[] {
  return Array.from({ length: totalRows }, (_, index) => {
    const item = items[index];
    if (!item) return null;

    return {
      producto: item.clothing_items?.name ?? '',
      tipoModelo: item.clothing_items?.description ?? '',
      talle: item.clothing_sizes?.name ?? '',
      codigo: item.clothing_items?.code ?? '',
      marca: item.clothing_brands?.name ?? '',
      cantidad: item.quantity,
      hasCertificate: item.has_certificate ?? false,
    };
  });
}
