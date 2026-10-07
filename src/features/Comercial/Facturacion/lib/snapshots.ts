import { RECEIVER_VAT_CONDITIONS, isReceiverVatConditionId } from '@/shared/lib/arca/catalogs';

/**
 * Copia de los datos de emisor y receptor que se congela al emitir (`issuer_snapshot` /
 * `receiver_snapshot`): el PDF se regenera idéntico aunque la empresa o el cliente cambien después.
 * Módulo puro.
 */

export type IssuerSnapshot = {
  name: string;
  cuit: string;
  taxCondition: 'responsable_inscripto' | 'monotributo' | 'exento';
  grossIncomeNumber: string | null;
  grossIncomeRegime: 'local' | 'convenio_multilateral' | 'exento' | null;
  activityStartDate: string;
  street: string;
  city: string;
  province: string | null;
  postalCode: string;
};

export type ReceiverSnapshot = {
  name: string;
  cuit: string;
  vatConditionId: number;
  vatConditionLabel: string;
  street: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
};

export function receiverVatLabel(id: number | null): string {
  return id !== null && isReceiverVatConditionId(id) ? RECEIVER_VAT_CONDITIONS[id].label : 'Sin informar';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseIssuerSnapshot(value: unknown): IssuerSnapshot | null {
  return isRecord(value) && typeof value.cuit === 'string' ? (value as IssuerSnapshot) : null;
}

export function parseReceiverSnapshot(value: unknown): ReceiverSnapshot | null {
  return isRecord(value) && typeof value.cuit === 'string' ? (value as ReceiverSnapshot) : null;
}

/** "Calle 123, Neuquén (8300), Neuquén" sin partes vacías. */
export function formatAddress(parts: { street: string | null; city: string | null; postalCode: string | null; province: string | null }): string {
  const city = [parts.city, parts.postalCode ? `(${parts.postalCode})` : null].filter(Boolean).join(' ');
  return [parts.street, city || null, parts.province].filter(Boolean).join(', ');
}
