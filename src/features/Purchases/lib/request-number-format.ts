import { formatPurchaseDocumentNumber } from './document-number-format';

/** `SC-000001`. Mas de 999999 solicitudes sigue creciendo sin truncar. */
export function formatPurchaseRequestNumber(sequence: number): string {
  return formatPurchaseDocumentNumber('request', sequence);
}
