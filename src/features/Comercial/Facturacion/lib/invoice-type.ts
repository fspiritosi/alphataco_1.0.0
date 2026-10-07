import {
  CBTE_TYPES,
  RECEIVER_VAT_CONDITIONS,
  cbteTypeFor,
  isCbteTypeId,
  isReceiverVatConditionId,
  type CbteTypeId,
  type VoucherKind,
  type VoucherLetter,
} from '@/shared/lib/arca/catalogs';
import type { fiscal_tax_condition } from '@/generated/prisma/enums';

/**
 * Letra del comprobante (A/B/C) a partir de la condición frente al IVA del emisor y del receptor.
 * Módulo puro: lo usan el editor (para mostrar y explicar la letra) y el servidor (al crear y al
 * emitir).
 *
 * - Emisor Monotributo o Exento → C, a cualquier receptor.
 * - Emisor Responsable Inscripto → A si el receptor es RI o monotributista (RG 5003), B si no.
 */

export type LetterResult = { ok: true; letter: VoucherLetter; reason: string } | { ok: false; error: string };

const EMITTER_LABELS: Record<fiscal_tax_condition, string> = {
  responsable_inscripto: 'Responsable Inscripto',
  monotributo: 'Monotributista',
  exento: 'IVA Exento',
};

export function resolveLetter(
  emitter: fiscal_tax_condition | null,
  receiverVatConditionId: number | null,
  receiverName: string
): LetterResult {
  if (!emitter) return { ok: false, error: 'Faltan los datos fiscales de la empresa (Configuración → Datos fiscales).' };
  if (receiverVatConditionId === null || !isReceiverVatConditionId(receiverVatConditionId)) {
    return { ok: false, error: `No se puede determinar el tipo: falta la condición frente al IVA de ${receiverName}.` };
  }
  const receiverLabel = RECEIVER_VAT_CONDITIONS[receiverVatConditionId].label;

  if (emitter !== 'responsable_inscripto') {
    return { ok: true, letter: 'C', reason: `Vos sos ${EMITTER_LABELS[emitter]}: emitís Factura C.` };
  }
  // Una sola fuente de verdad: las letras que admite cada condición en el catálogo de ARCA.
  const admitsA = (RECEIVER_VAT_CONDITIONS[receiverVatConditionId].letters as readonly VoucherLetter[]).includes('A');
  const letter: VoucherLetter = admitsA ? 'A' : 'B';
  return {
    ok: true,
    letter,
    reason: `Vos sos Responsable Inscripto y ${receiverName} es ${receiverLabel}.`,
  };
}

export function cbteTypeOf(letter: VoucherLetter, kind: VoucherKind): CbteTypeId {
  return cbteTypeFor(letter, kind);
}

export function letterOf(cbteType: number): VoucherLetter {
  if (!isCbteTypeId(cbteType)) throw new Error(`Tipo de comprobante desconocido: ${cbteType}`);
  return CBTE_TYPES[cbteType].letter;
}

export function kindOf(cbteType: number): VoucherKind {
  if (!isCbteTypeId(cbteType)) throw new Error(`Tipo de comprobante desconocido: ${cbteType}`);
  return CBTE_TYPES[cbteType].kind;
}

export function cbteLabel(cbteType: number): string {
  return isCbteTypeId(cbteType) ? CBTE_TYPES[cbteType].label : `Comprobante ${cbteType}`;
}

/** "00003" */
export function formatSalesPoint(salesPoint: number): string {
  return String(salesPoint).padStart(5, '0');
}

/** "00003-00000124" (o "00003-—" si todavía no tiene número). */
export function formatVoucherNumber(salesPoint: number, number: number | null): string {
  const pv = formatSalesPoint(salesPoint);
  return number === null ? `${pv}-—` : `${pv}-${String(number).padStart(8, '0')}`;
}

/** "Factura A 00003-00000124" */
export function formatVoucherLabel(cbteType: number, salesPoint: number, number: number | null): string {
  return `${cbteLabel(cbteType)} ${formatVoucherNumber(salesPoint, number)}`;
}
