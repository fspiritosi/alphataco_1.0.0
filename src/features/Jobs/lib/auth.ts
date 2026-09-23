import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Autenticación de los endpoints `/api/jobs/*`.
 *
 * El contenedor `cron` del compose manda `Authorization: Bearer $JOBS_TOKEN` (ver
 * `docker/cron/crontab`). No hay sesión: un `curl` desde otro contenedor no trae cookies.
 *
 * **Comparación en tiempo constante.** Con `===` el corte ocurre en el primer byte distinto,
 * y esa diferencia de tiempo permite adivinar el token byte a byte. Se sigue el criterio que
 * ya usa `src/features/ExternalApi/lib/auth.ts`: gastar siempre el mismo cómputo, exista o no
 * la credencial.
 *
 * `timingSafeEqual` exige buffers del MISMO largo y lanza si no lo son — comparar los largos
 * antes filtraría justamente el largo del token. Por eso se comparan los SHA-256, que siempre
 * miden 32 bytes: el hash de un token de 4 caracteres y el de uno de 400 pesan lo mismo.
 */
export type JobAuthResult = 'ok' | 'invalid-token' | 'token-not-configured';

const BEARER_PREFIX = 'Bearer ';

function extractBearerToken(header: string | null): string {
  if (!header || !header.startsWith(BEARER_PREFIX)) return '';
  return header.slice(BEARER_PREFIX.length).trim();
}

/**
 * `ok` sólo si el header trae exactamente el `JOBS_TOKEN` del entorno.
 *
 * Sin `JOBS_TOKEN` configurado NADIE entra (`token-not-configured`): la alternativa —dejar
 * pasar— convertiría un despliegue con la variable vacía en tres endpoints abiertos que
 * mandan correos. El llamador responde 401 en los dos casos, sin decir cuál fue: el que
 * prueba un token no tiene por qué enterarse de que el servidor no tiene ninguno.
 */
export function authorizeJobRequest(request: Request): JobAuthResult {
  const expected = process.env.JOBS_TOKEN?.trim();
  const presented = extractBearerToken(request.headers.get('authorization'));

  // Se hashea y compara SIEMPRE, incluso sin token configurado, para no delatar por tiempo
  // de respuesta la diferencia entre "no hay token" y "el token no coincide".
  const presentedDigest = createHash('sha256').update(presented).digest();
  const expectedDigest = createHash('sha256')
    .update(expected ?? '\u0000jobs-token-no-configurado\u0000')
    .digest();
  const matches = timingSafeEqual(presentedDigest, expectedDigest);

  if (!expected) return 'token-not-configured';
  return matches ? 'ok' : 'invalid-token';
}
