/**
 * Importe con separadores argentinos a partir de su TEXTO ("1234567.8" → "1.234.567,80"). No pasa
 * por `Number` en ningún momento: los importes viajan como string desde la base y así se
 * formatean, en pantalla y en los PDF fiscales.
 */
export function formatAmountText(value: string, decimals = 2): string {
  const negative = value.startsWith('-');
  const [rawInt = '0', rawDec = ''] = value.replace('-', '').split('.');
  const dec = (rawDec + '0'.repeat(decimals)).slice(0, decimals);
  const grouped = rawInt.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${grouped}${decimals > 0 ? `,${dec}` : ''}`;
}
