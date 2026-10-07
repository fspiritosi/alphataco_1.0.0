/** Número de punto de venta como lo muestra ARCA: 5 dígitos con ceros (`3` → `00003`). */
export function formatSalesPointNumber(value: number): string {
  return String(value).padStart(5, '0');
}

/** Lista en castellano: `['a', 'b', 'c']` → `'a, b y c'`. */
export function joinList(items: string[]): string {
  return new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(items);
}
