import type { withholding_status, withholding_tax } from '@/generated/prisma/enums';
import { cents } from './payment-totals';

/**
 * Archivos de importacion de las retenciones practicadas (spec Compras etapa 5 §4). Ancho fijo,
 * importes con coma decimal y ceros a la izquierda.
 *
 * - SICORE (Ganancias): diseño de importacion de retenciones de 144 posiciones.
 * - SIRE F.2003 (IVA) y F.2004 (SUSS) y Rentas Neuquen (IIBB): armados con el diseño publicado que
 *   se conoce; A VALIDAR importandolos una vez en el aplicativo (no hay instructivo a mano). Cada
 *   registro va en su propia funcion para corregir un diseño sin tocar los otros.
 */

export type WithholdingTxtRow = {
  tax: withholding_tax;
  regimeCode: string;
  /** YYYY-MM-DD */
  paidOn: string;
  paymentOrderNumber: string;
  paymentTotal: string;
  base: string;
  /** Porcentaje (hasta 4 decimales). */
  rate: string;
  amount: string;
  supplierCuit: string;
  supplierStatus: withholding_status;
  certificateNumber: string;
  exclusionPercentage: string | null;
};

const ORDER_OF_PAYMENT = '06';
const CUIT_DOC_TYPE = '80';
const TAX_CODES: Record<withholding_tax, string> = { GANANCIAS: '217', IVA: '767', SUSS: '353', IIBB: '' };

const digits = (value: string, width: number) => value.replace(/\D/g, '').padStart(width, '0').slice(-width);
const ddmmyyyy = (date: string) => date.split('-').reverse().join('/');

/** Importe con 2 decimales y coma ("00000001234,50"), positivo, de `width` posiciones. */
export function amountComma(value: string, width: number): string {
  const scaled = cents(value);
  const abs = scaled < BigInt(0) ? -scaled : scaled;
  const text = `${abs / BigInt(100)},${String(abs % BigInt(100)).padStart(2, '0')}`;
  return text.padStart(width, '0').slice(-width);
}

/** SICORE: 144 posiciones. */
export function sicoreRecord(row: WithholdingTxtRow): string {
  return (
    ORDER_OF_PAYMENT +
    ddmmyyyy(row.paidOn) +
    digits(row.paymentOrderNumber, 16) +
    amountComma(row.paymentTotal, 16) +
    TAX_CODES.GANANCIAS +
    digits(row.regimeCode, 3) +
    '1' +
    amountComma(row.base, 14) +
    ddmmyyyy(row.paidOn) +
    (row.supplierStatus === 'NOT_REGISTERED' ? '02' : '01') +
    '0' +
    amountComma(row.amount, 14) +
    amountComma(row.exclusionPercentage ?? '0', 6) +
    ' '.repeat(10) +
    CUIT_DOC_TYPE +
    row.supplierCuit.replace(/\D/g, '').padEnd(20, ' ').slice(0, 20) +
    digits(row.certificateNumber, 14)
  );
}

/** SIRE F.2003 (IVA) / F.2004 (SUSS). A validar con el aplicativo. */
export function sireRecord(row: WithholdingTxtRow): string {
  return (
    TAX_CODES[row.tax] +
    digits(row.regimeCode, 3) +
    digits(row.supplierCuit, 11) +
    ddmmyyyy(row.paidOn) +
    ORDER_OF_PAYMENT +
    ddmmyyyy(row.paidOn) +
    digits(row.paymentOrderNumber, 16) +
    amountComma(row.paymentTotal, 14) +
    amountComma(row.base, 14) +
    amountComma(row.rate, 6) +
    amountComma(row.amount, 14) +
    row.certificateNumber.padEnd(25, ' ').slice(0, 25)
  );
}

/** Rentas Neuquen (IIBB, agente de retencion). A validar con el aplicativo. */
export function neuquenRecord(row: WithholdingTxtRow): string {
  return (
    digits(row.supplierCuit, 11) +
    ddmmyyyy(row.paidOn) +
    ORDER_OF_PAYMENT +
    digits(row.paymentOrderNumber, 16) +
    amountComma(row.base, 15) +
    amountComma(row.rate, 6) +
    amountComma(row.amount, 15) +
    digits(row.certificateNumber, 14)
  );
}

/** Registros de un impuesto separados por CRLF. */
export function withholdingTxtFile(tax: withholding_tax, rows: readonly WithholdingTxtRow[]): string {
  const record = tax === 'GANANCIAS' ? sicoreRecord : tax === 'IIBB' ? neuquenRecord : sireRecord;
  return rows.map(record).join('\r\n');
}

export const WITHHOLDING_TXT_FILE_NAMES: Record<withholding_tax, string> = {
  GANANCIAS: 'SICORE_RETENCIONES_GANANCIAS',
  IVA: 'SIRE_F2003_RETENCIONES_IVA',
  SUSS: 'SIRE_F2004_RETENCIONES_SUSS',
  IIBB: 'NEUQUEN_RETENCIONES_IIBB',
};
