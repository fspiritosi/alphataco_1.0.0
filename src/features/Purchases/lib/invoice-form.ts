import { QUANTITY_SCALE, formatScaled, parseScaled } from '@/features/Comercial/Facturacion/lib/invoice-math';
import type { VoucherKind, VoucherLetter } from '@/shared/lib/arca/catalogs';
import { grossPrice } from './invoice-control';
import { comparePrices } from './order-totals';
import { trimDecimals } from './quantity-format';

/**
 * Reglas puras del formulario del comprobante de proveedor (sin directiva): que lineas de OC se
 * ofrecen, con que cantidad, y como se convierte una linea al cambiar la letra.
 */

const ZERO = BigInt(0);
const quantity = (value: string) => parseScaled(value, QUANTITY_SCALE) ?? ZERO;

/** Recibido − facturado, sin coma flotante y nunca negativo ("8.2"). */
export function pendingToInvoice(line: { received: string; invoiced: string }): string {
  const diff = quantity(line.received) - quantity(line.invoiced);
  return trimDecimals(formatScaled(diff > ZERO ? diff : ZERO, QUANTITY_SCALE));
}

type OrderOption<L> = { id: string; number: string; lines: L[] };

/**
 * Lineas que ofrece "Agregar desde OC": en facturas y ND, lo recibido y no facturado (con la
 * cantidad pendiente); en NC, lo facturado (con la cantidad facturada, que es el maximo a acreditar).
 */
export function pickableOrderLines<L extends { orderLineId: string; received: string; invoiced: string }>(
  orders: readonly OrderOption<L>[],
  kind: VoucherKind,
  alreadyAdded: ReadonlySet<string>
): { id: string; number: string; lines: (L & { orderId: string; orderNumber: string; quantity: string })[] }[] {
  return orders
    .map((order) => ({
      id: order.id,
      number: order.number,
      lines: order.lines.flatMap((line) => {
        if (alreadyAdded.has(line.orderLineId)) return [];
        const available = kind === 'credit_note' ? trimDecimals(formatScaled(quantity(line.invoiced), QUANTITY_SCALE)) : pendingToInvoice(line);
        if (quantity(available) <= ZERO) return [];
        return [{ ...line, orderId: order.id, orderNumber: order.number, quantity: available }];
      }),
    }))
    .filter((order) => order.lines.length > 0);
}

/** Precio que se espera en una linea de OC segun la letra (en C, el final con IVA). */
export function expectedOrderPrice(orderLine: { unitPrice: string; vatRateId: number }, letter: VoucherLetter): string {
  return letter === 'C' ? grossPrice(orderLine.unitPrice, orderLine.vatRateId) : orderLine.unitPrice;
}

/**
 * Al cambiar la letra con lineas de OC cargadas: si el precio es el que se esperaba con la letra
 * anterior, pasa al que se espera con la nueva (neto ↔ final); un precio que el usuario cambio no se
 * toca. La alicuota se vacia al pasar a C y vuelve a la de la OC al salir de C.
 */
export function convertOrderLineForLetter(
  line: { unitPrice: string; vatRateId: string },
  orderLine: { unitPrice: string; vatRateId: number },
  from: VoucherLetter,
  to: VoucherLetter
): { unitPrice: string; vatRateId: string } {
  const wasExpected = line.unitPrice !== '' && comparePrices(line.unitPrice.replace(',', '.'), expectedOrderPrice(orderLine, from)) === 0;
  const unitPrice = wasExpected ? trimDecimals(expectedOrderPrice(orderLine, to)) : line.unitPrice;
  const vatRateId = to === 'C' ? '' : from === 'C' ? String(orderLine.vatRateId) : line.vatRateId;
  return { unitPrice, vatRateId };
}
