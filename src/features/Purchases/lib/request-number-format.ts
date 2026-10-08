/** `SC-000001`. Mas de 999999 solicitudes sigue creciendo sin truncar. */
export function formatPurchaseRequestNumber(sequence: number): string {
  return `SC-${String(sequence).padStart(6, '0')}`;
}
