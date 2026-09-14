import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'crypto';

/**
 * Generacion y verificacion del secreto de las credenciales de API externa.
 *
 * El secreto se guarda SOLO hasheado. El formato del hash es autodescriptivo
 * (`scrypt$N$r$p$salt$hash`) para poder subir el costo mas adelante sin
 * invalidar los hashes ya emitidos: cada hash sabe con que parametros se creo.
 */

/**
 * `promisify` pierde la firma que acepta opciones de costo, asi que se envuelve
 * a mano para poder pasar N, r y p.
 */
function scrypt(secret: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(secret, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

const SCRYPT_COST = 16384; // N
const SCRYPT_BLOCK_SIZE = 8; // r
const SCRYPT_PARALLELIZATION = 1; // p
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Caracteres del secreto que se guardan en claro para identificarlo en pantalla */
const SECRET_PREFIX_LENGTH = 8;

export type GeneratedCredentials = {
  clientId: string;
  /** Solo existe en memoria: se muestra una unica vez y nunca se persiste */
  secret: string;
  secretPrefix: string;
};

/**
 * Genera el par de credenciales de un sistema externo.
 *
 * El `clientId` es publico (viaja como usuario del Basic Auth) y lleva prefijo
 * `ext_` para que sea reconocible en logs y configuraciones del tercero.
 */
export function generateClientCredentials(): GeneratedCredentials {
  const clientId = `ext_${randomBytes(8).toString('hex')}`;
  // 256 bits: no es una contrasena elegida por una persona, no hace falta
  // politica de complejidad ni rotacion forzada por debilidad
  const secret = randomBytes(32).toString('base64url');

  return { clientId, secret, secretPrefix: secret.slice(0, SECRET_PREFIX_LENGTH) };
}

/** Hashea el secreto con scrypt y un salt aleatorio por credencial */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(secret, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });

  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString('hex'),
    derived.toString('hex'),
  ].join('$');
}

/**
 * Verifica el secreto contra el hash almacenado.
 *
 * La comparacion es en tiempo constante: comparar con `===` filtra por timing
 * cuantos caracteres iniciales coincidieron.
 */
export async function verifySecret(secret: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, cost, blockSize, parallelization, saltHex, hashHex] = parts;
  const expected = Buffer.from(hashHex, 'hex');
  if (expected.length === 0) return false;

  try {
    const derived = await scrypt(secret, Buffer.from(saltHex, 'hex'), expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
    });

    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    // Parametros corruptos en la fila: se trata como credencial invalida
    return false;
  }
}
