import { formatAmountText } from '@/shared/utils/amount-text';
import { formatScaled, parseScaled } from '../lib/invoice-math';

/**
 * Cantidades y precios como TEXTO (nunca `Number`), en formato argentino.
 * - Para mostrar: `formatDecimalText("120.5000", 0)` → "120,5".
 * - Para editar: `toInputText("1234.5")` → "1234,5" (sin separador de miles, que confunde al tipear).
 * - Para guardar: `normalizeDecimalInput("1.234,5", 4)` → "1234.5000" (lo que acepta Postgres).
 */

/** Muestra un decimal con separadores argentinos y entre `minDecimals` y 4 decimales (sin ceros de más). */
export function formatDecimalText(value: string, minDecimals: number): string {
  const [, dec = ''] = value.split('.');
  const significant = dec.replace(/0+$/, '').length;
  return formatAmountText(value, Math.min(4, Math.max(minDecimals, significant)));
}

/** Valor guardado (punto decimal) → texto editable con coma decimal y sin ceros de más. */
export function toInputText(value: string): string {
  if (!value) return '';
  const [int, dec = ''] = value.split('.');
  const trimmed = dec.replace(/0+$/, '');
  return trimmed ? `${int},${trimmed}` : int;
}

/** Lo tipeado (coma o punto) → texto con punto y `scale` decimales. `null` si no es un número válido. */
export function normalizeDecimalInput(raw: string, scale: number): string | null {
  const parsed = parseScaled(raw, scale);
  return parsed === null ? null : formatScaled(parsed, scale);
}
