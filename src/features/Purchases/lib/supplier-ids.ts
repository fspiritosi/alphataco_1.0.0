import { isValidCuit, normalizeCuit } from '@/features/Empresa/General/lib/company-form';

/**
 * Identificadores del proveedor: CUIT y CBU. Logica pura (sin base), la usan el formulario y las
 * actions. El CUIT reusa la validacion del alta de empresa.
 */

/** Solo digitos (el input admite "30-71234567-8" o con espacios). */
export function normalizeSupplierCuit(raw: string): string {
  return normalizeCuit(raw.trim()).replace(/\./g, '');
}

export function isValidSupplierCuit(raw: string): boolean {
  return isValidCuit(normalizeSupplierCuit(raw));
}

/** "30712345678" -> "30-71234567-8". Si no son 11 digitos, lo devuelve como vino. */
export function formatCuit(value: string | number | bigint): string {
  const digits = String(value);
  return /^\d{11}$/.test(digits) ? `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}` : digits;
}

export function normalizeCbu(raw: string): string {
  return raw.replace(/[\s-]/g, '');
}

function checkDigit(digits: string, weights: readonly number[]): number {
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  return (10 - (sum % 10)) % 10;
}

/**
 * CBU de 22 digitos con sus dos digitos verificadores (BCRA): el primer bloque (banco + sucursal,
 * 7 digitos) verifica con el 8vo; el segundo (13 digitos de cuenta) con el 22do.
 */
export function isValidCbu(raw: string): boolean {
  const cbu = normalizeCbu(raw);
  if (!/^\d{22}$/.test(cbu)) return false;
  const block1 = cbu.slice(0, 8);
  const block2 = cbu.slice(8);
  return (
    checkDigit(block1, [7, 1, 3, 9, 7, 1, 3]) === Number(block1[7]) &&
    checkDigit(block2, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) === Number(block2[13])
  );
}
