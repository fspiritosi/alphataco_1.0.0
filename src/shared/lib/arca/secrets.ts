import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ArcaConfigError } from './errors.ts';

/**
 * Cifrado en reposo de los secretos fiscales (clave privada del certificado y ticket de WSAA):
 * AES-256-GCM con una clave maestra que vive SOLO en el entorno, nunca en la base.
 *
 * Formato: `v<versión>.<iv>.<tag>.<texto cifrado>` (base64url). La versión permite rotar:
 * `FISCAL_SECRETS_KEY` es la clave vigente (`FISCAL_SECRETS_KEY_VERSION`, default 1) y las
 * anteriores siguen leyéndose como `FISCAL_SECRETS_KEY_V<n>`.
 *
 * `aad` (datos asociados) ata el texto cifrado a su fila: un valor copiado a otra empresa o a otro
 * propósito no descifra.
 *
 * Si se pierde la clave maestra no se pierden facturas: hay que generar un certificado nuevo.
 */

const ALGORITHM = 'aes-256-gcm';

function currentVersion(): number {
  const raw = process.env.FISCAL_SECRETS_KEY_VERSION;
  const version = raw ? Number(raw) : 1;
  if (!Number.isInteger(version) || version < 1) throw new ArcaConfigError('FISCAL_SECRETS_KEY_VERSION inválida');
  return version;
}

function keyFor(version: number): Buffer {
  const raw = version === currentVersion() ? process.env.FISCAL_SECRETS_KEY : process.env[`FISCAL_SECRETS_KEY_V${version}`];
  if (!raw) {
    throw new ArcaConfigError(
      'Falta la clave de cifrado de los datos fiscales (FISCAL_SECRETS_KEY). Pedile al administrador del sistema que la configure.'
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new ArcaConfigError('FISCAL_SECRETS_KEY debe ser de 32 bytes en base64');
  return key;
}

export function isFiscalSecretsKeyConfigured(): boolean {
  try {
    keyFor(currentVersion());
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plain: string, aad: string): string {
  const version = currentVersion();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, keyFor(version), iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [`v${version}`, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptSecret(packed: string, aad: string): string {
  const [versionTag, iv, tag, data] = packed.split('.');
  const version = Number(versionTag?.slice(1));
  if (!versionTag?.startsWith('v') || !Number.isInteger(version) || !iv || !tag || data === undefined) {
    throw new ArcaConfigError('Secreto fiscal con formato inválido');
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, keyFor(version), Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch (error) {
    if (error instanceof ArcaConfigError) throw error;
    throw new ArcaConfigError('No se pudo descifrar el secreto fiscal: la clave de cifrado no coincide');
  }
}
