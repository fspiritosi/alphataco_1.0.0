/** Prefijo de cada documento de Compras. */
export const PURCHASE_DOCUMENT_PREFIXES = {
  request: 'SC',
  quote: 'PC',
  order: 'OC',
} as const;

export type PurchaseDocumentKind = keyof typeof PURCHASE_DOCUMENT_PREFIXES;

/** `SC-000001`, `PC-000001`, `OC-000001`. Pasado 999999 sigue creciendo sin truncar. */
export function formatPurchaseDocumentNumber(kind: PurchaseDocumentKind, sequence: number): string {
  return `${PURCHASE_DOCUMENT_PREFIXES[kind]}-${String(sequence).padStart(6, '0')}`;
}
