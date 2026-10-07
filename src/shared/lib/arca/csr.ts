import { generateKeyPairSync } from 'node:crypto';
import forge from 'node-forge';

/**
 * Genera la clave privada y el pedido de certificado (CSR) para ARCA. La clave se genera en el
 * servidor y nunca sale de él: el usuario sube solo el CSR al portal de ARCA y nos devuelve el
 * `.crt` firmado.
 *
 * Subject que exige ARCA: `C=AR, O=<razón social>, CN=<alias>, serialNumber=CUIT <cuit>`.
 */

export type GeneratedCsr = {
  /** PKCS#8 PEM. Secreto: se cifra antes de persistir y no se devuelve nunca al cliente. */
  privateKeyPem: string;
  csrPem: string;
};

export function generateKeyAndCsr(input: { cuit: string; organization: string; alias: string }): GeneratedCsr {
  if (!/^\d{11}$/.test(input.cuit)) throw new Error('El CUIT debe tener 11 dígitos');
  if (!/^[A-Za-z0-9._-]{1,50}$/.test(input.alias)) {
    throw new Error('El alias solo admite letras, números, punto, guion y guion bajo');
  }

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = forge.pki.publicKeyFromPem(publicKey);
  csr.setSubject([
    { shortName: 'C', value: 'AR' },
    { shortName: 'O', value: input.organization },
    { shortName: 'CN', value: input.alias },
    { name: 'serialNumber', value: `CUIT ${input.cuit}` },
  ]);
  csr.sign(forge.pki.privateKeyFromPem(privateKey), forge.md.sha256.create());

  return { privateKeyPem: privateKey, csrPem: forge.pki.certificationRequestToPem(csr) };
}
