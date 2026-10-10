import { AMOUNT_SCALE, formatScaled, parseScaled } from '@/features/Comercial/Facturacion/lib/invoice-math';

/**
 * Importes de una orden de pago (spec Compras etapa 5 §3.1 y §3.2). Puro y sin directiva: lo usan
 * el formulario y el servidor. Aritmetica de enteros escalados a 2 decimales, como el resto de
 * Compras.
 */

const ZERO = BigInt(0);

/** Texto decimal → centavos (acepta coma o punto; "" = 0). */
export function cents(value: string | null | undefined): bigint {
  if (value == null || value.trim() === '') return ZERO;
  const exact = parseScaled(value, AMOUNT_SCALE);
  if (exact !== null) return exact;
  // Mas de 2 decimales (p. ej. un Decimal de la base): se redondea.
  const wide = parseScaled(value, 8);
  return wide === null ? ZERO : divRound(wide, BigInt(1_000_000));
}

export const money = (value: bigint) => formatScaled(value, AMOUNT_SCALE);

/** Division entera redondeando la mitad hacia arriba (en valor absoluto). */
export function divRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator === ZERO) return ZERO;
  const negative = numerator < ZERO !== denominator < ZERO;
  const n = numerator < ZERO ? -numerator : numerator;
  const d = denominator < ZERO ? -denominator : denominator;
  const q = (n + d / BigInt(2)) / d;
  return negative ? -q : q;
}

const sum = (values: readonly (string | null | undefined)[]) => values.reduce((acc, v) => acc + cents(v), ZERO);

export type InvoiceAmounts = { total: string; netTaxed: string; netUntaxed: string; exempt: string; vatTotal: string };

/**
 * Parte neta (sin IVA ni percepciones) y parte de IVA de lo que se paga de un comprobante,
 * proporcional al importe pagado.
 */
export function invoiceShares(amount: string, invoice: InvoiceAmounts): { net: string; vat: string } {
  const total = cents(invoice.total);
  const paid = cents(amount);
  const net = cents(invoice.netTaxed) + cents(invoice.netUntaxed) + cents(invoice.exempt);
  const vat = cents(invoice.vatTotal);
  if (total === ZERO) return { net: money(ZERO), vat: money(ZERO) };
  return { net: money(divRound(paid * net, total)), vat: money(divRound(paid * vat, total)) };
}

/**
 * Bases de retencion de la orden: neta (Ganancias, IIBB, SUSS) e IVA. Las NC restan. Lo cubierto por
 * un anticipo aplicado ya sufrio retencion al pagarse: resta de la base neta en la proporcion neta de
 * los comprobantes. El anticipo nuevo suma a la base neta (no tiene IVA discriminado).
 */
export function withholdingBases(input: {
  invoices: readonly { net: string; vat: string; amount: string }[];
  credits: readonly { net: string; vat: string }[];
  advancesApplied: readonly string[];
  advance: string;
}): { net: string; vat: string } {
  const invoiceNet = sum(input.invoices.map((i) => i.net));
  const invoiceGross = sum(input.invoices.map((i) => i.amount));
  const applied = sum(input.advancesApplied);
  const appliedNet = invoiceGross === ZERO ? applied : divRound(applied * invoiceNet, invoiceGross);
  const net = invoiceNet - sum(input.credits.map((c) => c.net)) - appliedNet + cents(input.advance);
  const vat = sum(input.invoices.map((i) => i.vat)) - sum(input.credits.map((c) => c.vat));
  return { net: money(net > ZERO ? net : ZERO), vat: money(vat > ZERO ? vat : ZERO) };
}

export type PaymentTotals = {
  invoicesTotal: string;
  creditsTotal: string;
  advanceTotal: string;
  withholdingsTotal: string;
  netTotal: string;
};

/** Neto = facturas + anticipo nuevo − NC − anticipos aplicados − retenciones (puede dar < 0). */
export function computePaymentTotals(input: {
  invoices: readonly string[];
  credits: readonly string[];
  advancesApplied: readonly string[];
  advance: string;
  withholdings: readonly string[];
}): PaymentTotals {
  const invoices = sum(input.invoices);
  const credits = sum(input.credits) + sum(input.advancesApplied);
  const advance = cents(input.advance);
  const withholdings = sum(input.withholdings);
  return {
    invoicesTotal: money(invoices),
    creditsTotal: money(credits),
    advanceTotal: money(advance),
    withholdingsTotal: money(withholdings),
    netTotal: money(invoices + advance - credits - withholdings),
  };
}
