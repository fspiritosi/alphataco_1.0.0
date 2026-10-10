import { AMOUNT_SCALE, parseScaled } from '@/features/Comercial/Facturacion/lib/invoice-math';
import { CBTE_TYPES, isCbteTypeId } from '@/shared/lib/arca/catalogs';

/**
 * Archivos del Libro IVA Digital, compras (RG 4597), de ancho fijo (spec Compras etapa 4 §3.6):
 * - LIBRO_IVA_DIGITAL_COMPRAS_CBTE: un registro de 325 posiciones por comprobante;
 * - LIBRO_IVA_DIGITAL_COMPRAS_ALICUOTAS: uno de 84 por alicuota de cada comprobante A o B.
 * Importes siempre positivos (el tipo dice si es NC), sin separador y con 2 decimales implicitos.
 * Puro: lo usa la action de exportacion y lo prueba el test sin base.
 */

export type VatBookTxtRow = {
  /** YYYY-MM-DD */
  issueDate: string;
  cbteType: number;
  salesPoint: number;
  number: string;
  /** CUIT, solo digitos. */
  supplierCuit: string;
  supplierName: string;
  total: string;
  netTaxed: string;
  netUntaxed: string;
  exempt: string;
  vatTotal: string;
  vatPerceptions: string;
  grossIncomePerceptions: string;
  internalTaxes: string;
  otherTaxes: string;
  vat: readonly { vatRateId: number; base: string; amount: string }[];
};

const CUIT_DOC_TYPE = '80';

const digits = (value: string | number, width: number) => String(value).replace(/\D/g, '').padStart(width, '0').slice(-width);

/** Texto ASCII sin diacriticos, recortado y relleno con espacios a la derecha. */
function text(value: string, width: number): string {
  const ascii = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');
  return ascii.slice(0, width).padEnd(width, ' ');
}

/** Importe en 15 posiciones, positivo, sin punto y con 2 decimales implicitos. */
export function amount15(value: string): string {
  const scaled = parseScaled(value, AMOUNT_SCALE) ?? BigInt(0);
  const abs = scaled < BigInt(0) ? -scaled : scaled;
  return abs.toString().padStart(15, '0').slice(-15);
}

function letterOf(cbteType: number): 'A' | 'B' | 'C' {
  return isCbteTypeId(cbteType) ? CBTE_TYPES[cbteType].letter : 'C';
}

const isZero = (value: string) => (parseScaled(value, AMOUNT_SCALE) ?? BigInt(0)) === BigInt(0);

function operationCode(row: VatBookTxtRow): string {
  if (letterOf(row.cbteType) === 'C' || !isZero(row.netTaxed)) return '0';
  if (!isZero(row.exempt)) return 'E';
  if (!isZero(row.netUntaxed)) return 'N';
  return '0';
}

function voucherKey(row: VatBookTxtRow): string {
  return digits(row.cbteType, 3) + digits(row.salesPoint, 5) + digits(row.number, 20);
}

export function cbteRecord(row: VatBookTxtRow): string {
  const letter = letterOf(row.cbteType);
  const vatCount = letter === 'C' ? 0 : row.vat.length;
  const fiscalCredit = letter === 'A' ? row.vatTotal : '0';
  return (
    row.issueDate.replace(/-/g, '') +
    voucherKey(row) +
    ' '.repeat(16) +
    CUIT_DOC_TYPE +
    digits(row.supplierCuit, 20) +
    text(row.supplierName, 30) +
    amount15(row.total) +
    amount15(row.netUntaxed) +
    amount15(row.exempt) +
    amount15(row.vatPerceptions) +
    amount15('0') +
    amount15(row.grossIncomePerceptions) +
    amount15('0') +
    amount15(row.internalTaxes) +
    'PES' +
    '0001000000' +
    String(Math.min(vatCount, 9)) +
    operationCode(row) +
    amount15(fiscalCredit) +
    amount15(row.otherTaxes) +
    '0'.repeat(11) +
    ' '.repeat(30) +
    amount15('0')
  );
}

export function vatRecords(row: VatBookTxtRow): string[] {
  if (letterOf(row.cbteType) === 'C') return [];
  return row.vat.map(
    (v) =>
      voucherKey(row) +
      CUIT_DOC_TYPE +
      digits(row.supplierCuit, 20) +
      amount15(v.base) +
      digits(v.vatRateId, 4) +
      amount15(v.amount)
  );
}

export function vatBookTxtFiles(rows: readonly VatBookTxtRow[]): { cbte: string; alicuotas: string } {
  return {
    cbte: rows.map(cbteRecord).join('\r\n'),
    alicuotas: rows.flatMap(vatRecords).join('\r\n'),
  };
}
