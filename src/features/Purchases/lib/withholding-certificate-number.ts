import type { withholding_tax } from '@/generated/prisma/enums';

/** Prefijo del certificado de retencion de cada impuesto (correlativo por empresa e impuesto). */
export const WITHHOLDING_CERTIFICATE_PREFIXES: Record<withholding_tax, string> = {
  GANANCIAS: 'GAN',
  IVA: 'IVA',
  IIBB: 'IIBB',
  SUSS: 'SUSS',
};

/** `GAN-000001`. Pasado 999999 sigue creciendo sin truncar. */
export function formatWithholdingCertificateNumber(tax: withholding_tax, sequence: number): string {
  return `${WITHHOLDING_CERTIFICATE_PREFIXES[tax]}-${String(sequence).padStart(6, '0')}`;
}
