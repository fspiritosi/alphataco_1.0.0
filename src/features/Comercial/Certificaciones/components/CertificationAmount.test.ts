import { describe, expect, it } from 'vitest';

/** Se reimplementa acá lo mismo que el componente para poder probar el formateo puro. */
function formatAmount(value: string): string {
  const negative = value.startsWith('-');
  const [rawInt = '0', rawDec = ''] = value.replace('-', '').split('.');
  const decimals = (rawDec + '00').slice(0, 2);
  const grouped = rawInt.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${grouped},${decimals}`;
}

describe('formato de importes', () => {
  it('agrupa miles y usa coma decimal', () => {
    expect(formatAmount('1234567.89')).toBe('1.234.567,89');
  });

  it('completa los decimales faltantes', () => {
    expect(formatAmount('1000')).toBe('1.000,00');
    expect(formatAmount('1000.5')).toBe('1.000,50');
  });

  it('no pierde precisión en importes que un double redondearía', () => {
    // 9007199254740993 no es representable exactamente como `number`.
    expect(formatAmount('9007199254740993.01')).toBe('9.007.199.254.740.993,01');
  });

  it('maneja el cero y los negativos', () => {
    expect(formatAmount('0')).toBe('0,00');
    expect(formatAmount('-1234.5')).toBe('-1.234,50');
  });
});
