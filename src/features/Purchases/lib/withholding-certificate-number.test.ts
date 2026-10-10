import { describe, expect, it } from 'vitest';
import { formatWithholdingCertificateNumber } from './withholding-certificate-number';

describe('numero de certificado de retencion', () => {
  it('prefijo por impuesto y 6 digitos', () => {
    expect(formatWithholdingCertificateNumber('GANANCIAS', 1)).toBe('GAN-000001');
    expect(formatWithholdingCertificateNumber('IVA', 12)).toBe('IVA-000012');
    expect(formatWithholdingCertificateNumber('IIBB', 3)).toBe('IIBB-000003');
    expect(formatWithholdingCertificateNumber('SUSS', 1234567)).toBe('SUSS-1234567');
  });
});
