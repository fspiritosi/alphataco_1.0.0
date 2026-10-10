import {
  AMOUNT_SCALE,
  PRICE_SCALE,
  QUANTITY_SCALE,
  formatScaled,
  lineNet,
  parseScaled,
  sumAmounts,
  vatFor,
} from '@/features/Comercial/Facturacion/lib/invoice-math';
import { isVatRateId } from '@/shared/lib/arca/catalogs';

/**
 * Importes de una orden de compra (spec Compras etapa 2 §3). Puro y sin directiva: lo usan el
 * formulario (vista previa) y el servidor (lo que se guarda). Reusa la aritmetica de enteros
 * escalados de Facturacion para que haya una sola regla de redondeo en el sistema:
 *   neto de linea = cantidad × unitario, a 2 decimales;
 *   IVA de linea = neto × alicuota, a 2 decimales;
 *   totales = suma de las lineas.
 */

export type OrderLineInput = { quantity: string; unitPrice: string; vatRateId: number };

export type OrderLineAmounts = { netTotal: string; vatAmount: string };

export type OrderTotals = { subtotal: string; vatTotal: string; total: string };

/** `null` si la cantidad no es > 0, el precio es invalido o excede 4 decimales, o la alicuota no existe. */
export function computeOrderLine(line: OrderLineInput): OrderLineAmounts | null {
  const quantity = parseScaled(line.quantity, QUANTITY_SCALE);
  if (quantity === null || quantity <= BigInt(0)) return null;
  if (!isVatRateId(line.vatRateId)) return null;
  const net = lineNet(line.quantity, line.unitPrice);
  if (net === null || net.startsWith('-')) return null;
  const netScaled = parseScaled(net, AMOUNT_SCALE);
  if (netScaled === null) return null;
  return { netTotal: net, vatAmount: formatScaled(vatFor(netScaled, line.vatRateId), AMOUNT_SCALE) };
}

/** Suma de las lineas validas (las invalidas no suman: el formulario las marca con su error). */
export function computeOrderTotals(lines: readonly OrderLineInput[]): OrderTotals {
  const amounts = lines.map(computeOrderLine).filter((line): line is OrderLineAmounts => line !== null);
  const subtotal = sumAmounts(amounts.map((line) => line.netTotal));
  const vatTotal = sumAmounts(amounts.map((line) => line.vatAmount));
  return { subtotal, vatTotal, total: sumAmounts([subtotal, vatTotal]) };
}

/** Compara dos precios unitarios a 4 decimales (`compareAmounts` de Facturacion redondea a 2). */
export function comparePrices(a: string, b: string): number {
  const x = parseScaled(a, PRICE_SCALE) ?? BigInt(0);
  const y = parseScaled(b, PRICE_SCALE) ?? BigInt(0);
  return x === y ? 0 : x < y ? -1 : 1;
}
