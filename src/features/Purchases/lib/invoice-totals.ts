import {
  AMOUNT_SCALE,
  formatScaled,
  lineNet,
  parseScaled,
  vatFor,
} from '@/features/Comercial/Facturacion/lib/invoice-math';
import { isVatRateId, type VoucherLetter } from '@/shared/lib/arca/catalogs';

/**
 * Importes de un comprobante de proveedor (spec Compras etapa 4 §3.1). Puro y sin directiva: lo
 * usan el formulario (total en vivo) y el servidor (lo que se guarda). Misma aritmetica de enteros
 * escalados que Facturacion y las OC:
 *   neto de linea = cantidad × unitario (OC) o el neto informado (gasto), a 2 decimales;
 *   IVA por alicuota = base × alicuota, a 2 decimales (el usuario puede corregirlo hasta $1);
 *   total = netos + IVA + no gravado + exento + percepciones + otros tributos.
 */

export type InvoiceTaxKind = 'VAT_PERCEPTION' | 'GROSS_INCOME_PERCEPTION' | 'INTERNAL_TAX' | 'OTHER_TAX';

/** Diferencia de IVA que se tolera contra lo calculado (redondeos del proveedor). */
export const VAT_TOLERANCE = '1.00';

const ZERO = BigInt(0);

/** Importe opcional del formulario ("" = 0). `null` si no es valido o es negativo. */
export function parseOptionalAmount(raw: string | null | undefined): bigint | null {
  if (raw == null || raw.trim() === '') return ZERO;
  const value = parseScaled(raw, AMOUNT_SCALE);
  return value === null || value < ZERO ? null : value;
}

function amount(raw: string | null | undefined): bigint {
  return parseOptionalAmount(raw) ?? ZERO;
}

const fmt = (value: bigint) => formatScaled(value, AMOUNT_SCALE);

export type InvoiceLineInput = {
  letter: VoucherLetter;
  /** Linea de OC: cantidad y precio neto unitario. */
  quantity?: string;
  unitPrice?: string;
  /** Linea de gasto: neto. */
  net?: string;
  vatRateId: number | null;
};

/** `null` si la linea no es valida (cantidad ≤ 0, importes invalidos o A/B sin alicuota). */
export function computeInvoiceLine(line: InvoiceLineInput): { netTotal: string; vatAmount: string } | null {
  let net: bigint | null;
  if (line.quantity !== undefined) {
    const quantity = parseScaled(line.quantity, 4);
    if (quantity === null || quantity <= ZERO) return null;
    const text = lineNet(line.quantity, line.unitPrice ?? '');
    net = text === null ? null : parseScaled(text, AMOUNT_SCALE);
  } else {
    net = line.net === undefined || line.net.trim() === '' ? null : parseScaled(line.net, AMOUNT_SCALE);
  }
  if (net === null || net < ZERO) return null;
  if (line.letter === 'C') return { netTotal: fmt(net), vatAmount: fmt(ZERO) };
  if (line.vatRateId === null || !isVatRateId(line.vatRateId)) return null;
  return { netTotal: fmt(net), vatAmount: fmt(vatFor(net, line.vatRateId)) };
}

export type VatLine = { vatRateId: number; base: string; amount: string };

/** IVA calculado por alicuota desde las lineas (vacio en C). Ignora lineas sin alicuota valida. */
export function vatBreakdown(lines: readonly { netTotal: string; vatRateId: number | null }[], letter: VoucherLetter): VatLine[] {
  if (letter === 'C') return [];
  const bases = new Map<number, bigint>();
  for (const line of lines) {
    if (line.vatRateId === null || !isVatRateId(line.vatRateId)) continue;
    bases.set(line.vatRateId, (bases.get(line.vatRateId) ?? ZERO) + amount(line.netTotal));
  }
  return [...bases.entries()]
    .sort(([a], [b]) => a - b)
    .map(([vatRateId, base]) => ({
      vatRateId,
      base: fmt(base),
      amount: isVatRateId(vatRateId) ? fmt(vatFor(base, vatRateId)) : fmt(ZERO),
    }));
}

/** Alicuotas cuyo IVA informado difiere en mas de `VAT_TOLERANCE` de base × alicuota. */
export function vatDifferences(vat: readonly VatLine[]): { vatRateId: number; informed: string; computed: string }[] {
  const tolerance = amount(VAT_TOLERANCE);
  return vat.flatMap((line) => {
    if (!isVatRateId(line.vatRateId)) return [];
    const computed = vatFor(amount(line.base), line.vatRateId);
    const informed = amount(line.amount);
    const diff = informed > computed ? informed - computed : computed - informed;
    return diff > tolerance ? [{ vatRateId: line.vatRateId, informed: fmt(informed), computed: fmt(computed) }] : [];
  });
}

export type SupplierInvoiceTotals = {
  netTaxed: string;
  netUntaxed: string;
  exempt: string;
  vatTotal: string;
  vatPerceptions: string;
  grossIncomePerceptions: string;
  otherTaxes: string;
  total: string;
};

export function computeSupplierInvoiceTotals(input: {
  lines: readonly { netTotal: string }[];
  vat: readonly { amount: string }[];
  untaxed: string | null | undefined;
  exempt: string | null | undefined;
  taxes: readonly { kind: InvoiceTaxKind; amount: string }[];
}): SupplierInvoiceTotals {
  const sum = (values: readonly (string | null | undefined)[]) => values.reduce((acc, v) => acc + amount(v), ZERO);
  const netTaxed = sum(input.lines.map((l) => l.netTotal));
  const netUntaxed = amount(input.untaxed);
  const exempt = amount(input.exempt);
  const vatTotal = sum(input.vat.map((v) => v.amount));
  const byKind = (kinds: InvoiceTaxKind[]) => sum(input.taxes.filter((t) => kinds.includes(t.kind)).map((t) => t.amount));
  const vatPerceptions = byKind(['VAT_PERCEPTION']);
  const grossIncomePerceptions = byKind(['GROSS_INCOME_PERCEPTION']);
  const otherTaxes = byKind(['INTERNAL_TAX', 'OTHER_TAX']);
  return {
    netTaxed: fmt(netTaxed),
    netUntaxed: fmt(netUntaxed),
    exempt: fmt(exempt),
    vatTotal: fmt(vatTotal),
    vatPerceptions: fmt(vatPerceptions),
    grossIncomePerceptions: fmt(grossIncomePerceptions),
    otherTaxes: fmt(otherTaxes),
    total: fmt(netTaxed + netUntaxed + exempt + vatTotal + vatPerceptions + grossIncomePerceptions + otherTaxes),
  };
}
