import { VAT_RATES, isVatRateId, type VatRateId, type VoucherLetter } from '@/shared/lib/arca/catalogs';

/**
 * Cálculo de importes de un comprobante. UNA sola fórmula para todo el sistema: la usan el
 * editor (preview en el navegador), las server actions (lo que se persiste) y el armado del
 * pedido a ARCA. Módulo puro, sin directiva y sin `Prisma.Decimal` (no entra al bundle del
 * cliente) ni `parseFloat`: aritmética de enteros escalados con `BigInt`.
 *
 * Escalas: cantidad y precio unitario a 4 decimales, importes a 2. Redondeo mitad hacia arriba.
 *
 * Reglas (las que valida ARCA y las que hacen que el papel cierre):
 * 1. Neto de línea = cantidad × unitario, redondeado a 2 decimales UNA vez.
 * 2. El IVA se calcula por ALÍCUOTA, no por línea: base = suma de netos ya redondeados de esa
 *    alícuota; IVA = base × tasa, redondeado una vez.
 * 3. Total = neto gravado + IVA (+ no gravado + exento + otros tributos, en 0 en la v1).
 * 4. Comprobante C: no discrimina IVA. Todo es neto y no hay array de alícuotas.
 */

export const QUANTITY_SCALE = 4;
export const PRICE_SCALE = 4;
export const AMOUNT_SCALE = 2;

const TEN = BigInt(10);
const ZERO = BigInt(0);
const TWO = BigInt(2);

function pow10(exp: number): bigint {
  let result = BigInt(1);
  for (let i = 0; i < exp; i++) result *= TEN;
  return result;
}

/** División entera redondeando mitad lejos del cero (equivale a ROUND_HALF_UP para positivos). */
function divRound(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < ZERO !== denominator < ZERO;
  const n = numerator < ZERO ? -numerator : numerator;
  const d = denominator < ZERO ? -denominator : denominator;
  const quotient = (n * TWO + d) / (d * TWO);
  return negative ? -quotient : quotient;
}

/**
 * Texto decimal ("1234,5", "1.234,56", "1234.5") → entero escalado. Acepta coma o punto como
 * separador decimal; si aparecen los dos, el último es el decimal. `null` si no es un número
 * válido o tiene más decimales que `scale`.
 */
export function parseScaled(raw: string, scale: number): bigint | null {
  let value = raw.trim().replace(/\s/g, '');
  if (!value) return null;
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    value = value.split(thousandSep).join('').replace(decimalSep, '.');
  } else if (lastComma >= 0) {
    value = value.replace(',', '.');
  }
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(value);
  if (!match) return null;
  const [, sign, intPart, decPart = ''] = match;
  if (decPart.length > scale) return null;
  const scaled = BigInt(intPart) * pow10(scale) + BigInt((decPart + '0'.repeat(scale)).slice(0, scale) || '0');
  return sign === '-' ? -scaled : scaled;
}

/** Entero escalado → texto decimal con punto ("1234.50"), como lo guardan Postgres y ARCA. */
export function formatScaled(value: bigint, scale: number): string {
  const negative = value < ZERO;
  const abs = negative ? -value : value;
  const base = pow10(scale);
  const intPart = (abs / base).toString();
  const decPart = (abs % base).toString().padStart(scale, '0');
  return `${negative ? '-' : ''}${intPart}${scale > 0 ? `.${decPart}` : ''}`;
}

/** Texto decimal de la base (Decimal serializado) → importe escalado a 2. Lanza si no es válido. */
export function amountOf(value: string): bigint {
  const parsed = parseScaled(value, AMOUNT_SCALE) ?? parseScaled(roundText(value, AMOUNT_SCALE), AMOUNT_SCALE);
  if (parsed === null) throw new Error(`Importe inválido: ${value}`);
  return parsed;
}

/** Redondea un texto decimal con más decimales de los permitidos (p. ej. "1.005" a 2). */
function roundText(value: string, scale: number): string {
  const match = /^(-?)(\d+)\.(\d+)$/.exec(value.trim());
  if (!match) return value;
  const [, sign, intPart, decPart] = match;
  const full = BigInt(`${intPart}${decPart}`) * (sign ? -BigInt(1) : BigInt(1));
  return formatScaled(divRound(full, pow10(decPart.length - scale)), scale);
}

/** Neto de una línea: cantidad (4 dec) × unitario (4 dec), redondeado a 2. `null` si algo es inválido. */
export function lineNet(quantity: string, unitPrice: string): string | null {
  const q = parseScaled(quantity, QUANTITY_SCALE);
  const p = parseScaled(unitPrice, PRICE_SCALE);
  if (q === null || p === null) return null;
  return formatScaled(divRound(q * p, pow10(QUANTITY_SCALE + PRICE_SCALE - AMOUNT_SCALE)), AMOUNT_SCALE);
}

/** IVA de una base (2 dec) a una alícuota de ARCA, redondeado a 2. */
export function vatFor(base: bigint, vatRateId: VatRateId): bigint {
  // Tasa escalada a 2 decimales: 21 → 2100, 10.5 → 1050, 2.5 → 250.
  const rate = parseScaled(VAT_RATES[vatRateId], 2);
  if (rate === null) throw new Error(`Alícuota inválida: ${vatRateId}`);
  // base (escala 2) × tasa (escala 2) / 100 (porcentaje) = escala 4 → a escala 2.
  return divRound(base * rate, pow10(4));
}

export type InvoiceMathLine = {
  /** Neto de la línea con 2 decimales ("1234.50"). */
  netAmount: string;
  /** Alícuota de ARCA. Se ignora en comprobantes C. */
  vatRateId: number | null;
};

export type InvoiceTotals = {
  netTaxed: string;
  netUntaxed: string;
  exempt: string;
  otherTaxes: string;
  vatTotal: string;
  total: string;
  /** Una entrada por alícuota presente, ordenadas por id. Vacío en comprobantes C. */
  vatBreakdown: { vatRateId: VatRateId; base: string; amount: string }[];
};

export function computeInvoiceTotals(lines: InvoiceMathLine[], letter: VoucherLetter): InvoiceTotals {
  const zero = formatScaled(ZERO, AMOUNT_SCALE);
  let net = ZERO;
  const bases = new Map<VatRateId, bigint>();

  for (const line of lines) {
    const amount = amountOf(line.netAmount);
    net += amount;
    if (letter === 'C') continue;
    if (line.vatRateId === null || !isVatRateId(line.vatRateId)) {
      throw new Error('Falta la alícuota de IVA de una línea');
    }
    bases.set(line.vatRateId, (bases.get(line.vatRateId) ?? ZERO) + amount);
  }

  const vatBreakdown = [...bases.entries()]
    .sort(([a], [b]) => a - b)
    .map(([vatRateId, base]) => ({ vatRateId, base, amount: vatFor(base, vatRateId) }));
  const vatTotal = vatBreakdown.reduce((acc, v) => acc + v.amount, ZERO);

  return {
    netTaxed: formatScaled(net, AMOUNT_SCALE),
    netUntaxed: zero,
    exempt: zero,
    otherTaxes: zero,
    vatTotal: formatScaled(vatTotal, AMOUNT_SCALE),
    total: formatScaled(net + vatTotal, AMOUNT_SCALE),
    vatBreakdown: vatBreakdown.map((v) => ({
      vatRateId: v.vatRateId,
      base: formatScaled(v.base, AMOUNT_SCALE),
      amount: formatScaled(v.amount, AMOUNT_SCALE),
    })),
  };
}

/** Suma de importes de 2 decimales (texto) → texto. */
export function sumAmounts(values: string[]): string {
  return formatScaled(
    values.reduce((acc, v) => acc + amountOf(v), ZERO),
    AMOUNT_SCALE
  );
}

/** Suma de cantidades de hasta 4 decimales (texto) → texto con 4 decimales. */
export function sumQuantities(values: string[]): string {
  const total = values.reduce((acc, v) => {
    const parsed = parseScaled(v, QUANTITY_SCALE);
    if (parsed === null) throw new Error(`Cantidad inválida: ${v}`);
    return acc + parsed;
  }, ZERO);
  return formatScaled(total, QUANTITY_SCALE);
}

/** Compara importes de 2 decimales en texto: -1, 0 o 1. */
export function compareAmounts(a: string, b: string): number {
  const x = amountOf(a);
  const y = amountOf(b);
  return x === y ? 0 : x < y ? -1 : 1;
}
