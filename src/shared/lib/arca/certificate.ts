import { X509Certificate, createPrivateKey } from 'node:crypto';

/**
 * Lectura y validación del certificado que devuelve ARCA, antes de aceptarlo: que sea un X.509
 * válido, que corresponda a NUESTRA clave privada, que sea del CUIT del emisor y que esté vigente.
 */

export type CertificateInfo = {
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  /** CUIT del `serialNumber` del subject (`CUIT 20123456789`), si lo trae. */
  cuit: string | null;
};

export function inspectCertificate(pem: string): CertificateInfo {
  let cert: X509Certificate;
  try {
    cert = new X509Certificate(pem);
  } catch {
    throw new Error('El archivo no es un certificado X.509 válido');
  }
  return {
    subject: cert.subject,
    issuer: cert.issuer,
    serialNumber: cert.serialNumber,
    notBefore: new Date(cert.validFrom),
    notAfter: new Date(cert.validTo),
    cuit: cert.subject.match(/CUIT\s*(\d{11})/)?.[1] ?? null,
  };
}

export function certificateMatchesKey(certPem: string, privateKeyPem: string): boolean {
  return new X509Certificate(certPem).checkPrivateKey(createPrivateKey(privateKeyPem));
}

/** Problemas que impiden usar el certificado (vacío = utilizable). */
export function certificateProblems(
  info: CertificateInfo,
  expected: { cuit: string; now: Date }
): string[] {
  const problems: string[] = [];
  if (info.cuit && info.cuit !== expected.cuit) {
    problems.push(`El certificado es del CUIT ${info.cuit}, no del ${expected.cuit}`);
  }
  if (info.notAfter <= expected.now) problems.push('El certificado está vencido');
  if (info.notBefore > expected.now) problems.push('El certificado todavía no es válido');
  return problems;
}
